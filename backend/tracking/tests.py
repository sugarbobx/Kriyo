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
    def test_take_profit_forced_when_pnl_meets_target(self):
        outcome = evaluate_trade_closure(1000, profile(plafond_tp=40), 400)
        self.assertEqual(outcome['status'], 'VERROUILLE')
        self.assertEqual(outcome['reason_key'], 'take_profit_forced')
        self.assertEqual(outcome['amount'], 400)

    def test_just_below_take_profit_does_not_lock(self):
        outcome = evaluate_trade_closure(1000, profile(plafond_tp=40), 399)
        self.assertEqual(outcome['status'], 'CLOTURE')

    def test_daily_drawdown_forces_lock(self):
        outcome = evaluate_trade_closure(1000, profile(daily_dd=5), -50)
        self.assertEqual(outcome['status'], 'VERROUILLE')
        self.assertEqual(outcome['reason_key'], 'daily_drawdown')

    def test_just_above_daily_drawdown_does_not_lock(self):
        outcome = evaluate_trade_closure(1000, profile(daily_dd=5), -49)
        self.assertEqual(outcome['status'], 'CLOTURE')

    def test_max_drawdown_forces_lock(self):
        outcome = evaluate_trade_closure(1000, profile(max_dd=8), -80)
        self.assertEqual(outcome['status'], 'VERROUILLE')
        self.assertEqual(outcome['reason_key'], 'max_drawdown')

    def test_normal_pnl_just_logs(self):
        outcome = evaluate_trade_closure(1000, profile(daily_dd=5, max_dd=10), 20)
        self.assertEqual(outcome['status'], 'CLOTURE')
        self.assertEqual(outcome['reason_key'], 'logged')
        self.assertEqual(outcome['amount'], 20)

    def test_take_profit_checked_before_drawdown(self):
        # A profile with both set — a positive pnl that clears TP should hit
        # the take-profit branch, not fall through to drawdown checks.
        outcome = evaluate_trade_closure(1000, profile(plafond_tp=40, daily_dd=5), 500)
        self.assertEqual(outcome['reason_key'], 'take_profit_forced')


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

    def test_close_trade_hitting_daily_dd_locks(self):
        # MODERE: daily_dd=5% of 1000 = 50
        response = self.client.post(f'/api/tracking/trades/{self.trade.id}/close/', {'pnl': -60}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['outcome']['status'], 'VERROUILLE')
        self.trade.refresh_from_db()
        self.assertEqual(self.trade.status, 'VERROUILLE')

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
        trades = [
            Trade.objects.create(account=self.account, score_vr=3, score_ep=3, score_vp=3, score_total=9, status='EN_COURS')
            for _ in range(31)
        ]
        for trade in trades[:30]:
            response = self.client.post(f'/api/tracking/trades/{trade.id}/close/', {'pnl': 10}, format='json')
            self.assertNotEqual(response.status_code, 429)

        response = self.client.post(f'/api/tracking/trades/{trades[30].id}/close/', {'pnl': 10}, format='json')
        self.assertEqual(response.status_code, 429)
