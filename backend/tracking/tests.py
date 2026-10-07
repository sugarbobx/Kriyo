from types import SimpleNamespace

from django.core.cache import cache
from rest_framework.test import APITestCase

from accounts.models import User
from performance.models import RiskProfile, Trade, TradingAccount

from .services import evaluate_trade_closure


def profile(**kwargs):
    defaults = {'plafond_tp': None, 'daily_dd': None, 'max_dd': None}
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class EvaluateTradeClosureTests(APITestCase):
    """capital, current_balance, profile, pnl[, daily_pnl_before]. Unless a
    test is specifically about cumulative behavior, current_balance==capital
    and daily_pnl_before==0, which reduces every check to the single-trade
    math the old signature tested directly."""

    def test_take_profit_forced_when_pnl_meets_target(self):
        outcome = evaluate_trade_closure(1000, 1000, profile(plafond_tp=40), 400)
        self.assertEqual(outcome['status'], 'VERROUILLE')
        self.assertEqual(outcome['reason_key'], 'take_profit_forced')
        self.assertEqual(outcome['amount'], 400)

    def test_just_below_take_profit_does_not_lock(self):
        outcome = evaluate_trade_closure(1000, 1000, profile(plafond_tp=40), 399)
        self.assertEqual(outcome['status'], 'CLOTURE')

    def test_daily_drawdown_forces_lock(self):
        outcome = evaluate_trade_closure(1000, 1000, profile(daily_dd=5), -50)
        self.assertEqual(outcome['status'], 'VERROUILLE')
        self.assertEqual(outcome['reason_key'], 'daily_drawdown')

    def test_just_above_daily_drawdown_does_not_lock(self):
        outcome = evaluate_trade_closure(1000, 1000, profile(daily_dd=5), -49)
        self.assertEqual(outcome['status'], 'CLOTURE')

    def test_max_drawdown_forces_lock(self):
        outcome = evaluate_trade_closure(1000, 1000, profile(max_dd=8), -80)
        self.assertEqual(outcome['status'], 'VERROUILLE')
        self.assertEqual(outcome['reason_key'], 'max_drawdown')

    def test_normal_pnl_just_logs(self):
        outcome = evaluate_trade_closure(1000, 1000, profile(daily_dd=5, max_dd=10), 20)
        self.assertEqual(outcome['status'], 'CLOTURE')
        self.assertEqual(outcome['reason_key'], 'logged')
        self.assertEqual(outcome['amount'], 20)

    def test_take_profit_checked_before_drawdown(self):
        # A profile with both set — a positive pnl that clears TP should hit
        # the take-profit branch, not fall through to drawdown checks.
        outcome = evaluate_trade_closure(1000, 1000, profile(plafond_tp=40, daily_dd=5), 500)
        self.assertEqual(outcome['reason_key'], 'take_profit_forced')

    def test_daily_drawdown_is_cumulative_across_several_trades(self):
        # Two losses this trading day, each individually under the 5%/$50
        # threshold ($30 then $25), together exceed it ($55) -- this is the
        # whole point of a *daily* limit, not a per-trade one.
        outcome = evaluate_trade_closure(1000, 1000, profile(daily_dd=5), -25, daily_pnl_before=-30)
        self.assertEqual(outcome['status'], 'VERROUILLE')
        self.assertEqual(outcome['reason_key'], 'daily_drawdown')

    def test_daily_drawdown_resets_the_next_day(self):
        # Yesterday's losses don't count toward today's cumulative check --
        # daily_pnl_before is the caller's job to scope to "today" (see
        # close_trade), this just verifies the function trusts what it's given.
        outcome = evaluate_trade_closure(1000, 1000, profile(daily_dd=5), -25, daily_pnl_before=0)
        self.assertEqual(outcome['status'], 'CLOTURE')

    def test_max_drawdown_is_measured_against_current_balance_not_just_this_trade(self):
        # Account already down to 940 (6% drawdown from 1000) from earlier
        # days; today's small -30 loss pushes total drawdown to 9.3%, over
        # an 8% max -- even though -30 alone is nowhere near 8% of capital.
        outcome = evaluate_trade_closure(1000, 940, profile(max_dd=8), -30, daily_pnl_before=0)
        self.assertEqual(outcome['status'], 'VERROUILLE')
        self.assertEqual(outcome['reason_key'], 'max_drawdown')

    def test_max_drawdown_not_yet_breached_still_logs(self):
        outcome = evaluate_trade_closure(1000, 940, profile(max_dd=8), -10, daily_pnl_before=0)
        self.assertEqual(outcome['status'], 'CLOTURE')


class CloseTradeApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='tracking-test@kriyo.local', password='TestPass123!')
        self.other_user = User.objects.create_user(email='tracking-other@kriyo.local', password='TestPass123!')
        self.client.force_authenticate(user=self.user)
        self.moderate_profile = RiskProfile.objects.get(type='MODERE')
        self.account = TradingAccount.objects.create(
            user=self.user, name='Test', capital=1000, current_balance=1000, payout_type='DEUX_SEMAINES', risk_profile=self.moderate_profile
        )
        self.trade = Trade.objects.create(
            account=self.account, score_vr=3, score_ep=3, score_vp=3, score_total=9, status='EN_COURS'
        )

    def test_close_trade_with_normal_pnl(self):
        response = self.client.post(f'/api/tracking/trades/{self.trade.id}/close/', {'pnl': 30}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['outcome']['status'], 'CLOTURE')
        self.trade.refresh_from_db()
        self.assertEqual(self.trade.status, 'CLOTURE')
        self.assertEqual(self.trade.pnl, 30)
        self.assertIsNotNone(self.trade.closed_at)

    def test_close_trade_updates_account_current_balance(self):
        self.account.current_balance = 1000
        self.account.save(update_fields=['current_balance'])

        self.client.post(f'/api/tracking/trades/{self.trade.id}/close/', {'pnl': 30}, format='json')
        self.account.refresh_from_db()
        self.assertEqual(self.account.current_balance, 1030)

    def test_close_trade_with_loss_decreases_current_balance(self):
        self.account.current_balance = 1000
        self.account.save(update_fields=['current_balance'])

        self.client.post(f'/api/tracking/trades/{self.trade.id}/close/', {'pnl': -60}, format='json')
        self.account.refresh_from_db()
        self.assertEqual(self.account.current_balance, 940)

    def test_close_trade_hitting_daily_dd_locks(self):
        # MODERE: daily_dd=5% of 1000 = 50
        response = self.client.post(f'/api/tracking/trades/{self.trade.id}/close/', {'pnl': -60}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['outcome']['status'], 'VERROUILLE')
        self.trade.refresh_from_db()
        self.assertEqual(self.trade.status, 'VERROUILLE')
        self.assertEqual(self.trade.close_reason, 'daily_drawdown')

    def test_close_trade_persists_the_normal_close_reason(self):
        response = self.client.post(f'/api/tracking/trades/{self.trade.id}/close/', {'pnl': 10}, format='json')
        self.assertEqual(response.status_code, 200)
        self.trade.refresh_from_db()
        self.assertEqual(self.trade.close_reason, 'logged')

    def test_two_small_same_day_losses_cumulatively_trip_daily_dd(self):
        # MODERE: daily_dd=5% of 1000 = 50. Neither loss alone reaches it.
        first_close = self.client.post(f'/api/tracking/trades/{self.trade.id}/close/', {'pnl': -30}, format='json')
        self.assertEqual(first_close.data['outcome']['status'], 'CLOTURE')

        second_trade = Trade.objects.create(
            account=self.account, score_vr=3, score_ep=3, score_vp=3, score_total=9, status='EN_COURS'
        )
        second_close = self.client.post(f'/api/tracking/trades/{second_trade.id}/close/', {'pnl': -25}, format='json')
        self.assertEqual(second_close.data['outcome']['status'], 'VERROUILLE')
        self.assertEqual(second_close.data['outcome']['reason_key'], 'daily_drawdown')

    def test_cannot_close_already_closed_trade(self):
        self.client.post(f'/api/tracking/trades/{self.trade.id}/close/', {'pnl': 10}, format='json')
        response = self.client.post(f'/api/tracking/trades/{self.trade.id}/close/', {'pnl': 10}, format='json')
        self.assertEqual(response.status_code, 409)

    def test_cannot_close_someone_elses_trade(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post(f'/api/tracking/trades/{self.trade.id}/close/', {'pnl': 10}, format='json')
        self.assertEqual(response.status_code, 404)


class CloseTradeThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='tracking-throttle@kriyo.local', password='TestPass123!')
        self.client.force_authenticate(user=self.user)
        self.account = TradingAccount.objects.create(
            user=self.user, name='Test', capital=1000, current_balance=1000, payout_type='DEUX_SEMAINES',
            risk_profile=RiskProfile.objects.get(type='MODERE'),
        )

    def test_close_trade_is_rate_limited_per_user(self):
        # One EN_COURS trade per account max (unique constraint) -- a
        # separate account per trade here, since this test is about the
        # close-trade throttle, not account/trade pairing.
        profile = RiskProfile.objects.get(type='MODERE')
        trades = []
        for i in range(31):
            account = TradingAccount.objects.create(
                user=self.user, name=f'Test {i}', capital=1000, current_balance=1000,
                payout_type='DEUX_SEMAINES', risk_profile=profile,
            )
            trades.append(
                Trade.objects.create(account=account, score_vr=3, score_ep=3, score_vp=3, score_total=9, status='EN_COURS')
            )
        for trade in trades[:30]:
            response = self.client.post(f'/api/tracking/trades/{trade.id}/close/', {'pnl': 10}, format='json')
            self.assertNotEqual(response.status_code, 429)

        response = self.client.post(f'/api/tracking/trades/{trades[30].id}/close/', {'pnl': 10}, format='json')
        self.assertEqual(response.status_code, 429)
