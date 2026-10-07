from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from .models import RiskProfile, Trade, TradingAccount


class PerformanceApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='perf-test@kriyo.local', password='TestPass123!')
        self.other_user = User.objects.create_user(email='other@kriyo.local', password='TestPass123!')
        self.client.force_authenticate(user=self.user)
        self.agressif_profile = RiskProfile.objects.get(type='AGRESSIF')

    def test_create_account_assigns_risk_profile_from_payout(self):
        response = self.client.post(
            '/api/performance/accounts/',
            {'name': 'FTMO 5K', 'capital': 5000, 'current_balance': 5000, 'payout_type': 'ON_DEMAND'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['risk_profile']['type'], 'AGRESSIF')

        account = TradingAccount.objects.get(user=self.user)
        self.assertEqual(account.risk_profile.type, 'AGRESSIF')

    def test_list_accounts_only_returns_own(self):
        TradingAccount.objects.create(
            user=self.other_user, name='Not mine', capital=1000, current_balance=1000, payout_type='ON_DEMAND',
            risk_profile=self.agressif_profile,
        )
        response = self.client.get('/api/performance/accounts/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_execute_trade_requires_perfect_score(self):
        account = self._create_account()
        response = self.client.post(
            '/api/performance/trades/',
            {'account_ids': [account.id], 'score_vr': 3, 'score_ep': 2, 'score_vp': 3},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Trade.objects.count(), 0)

    def test_execute_trade_at_9_9_creates_trade(self):
        account = self._create_account()
        response = self.client.post(
            '/api/performance/trades/',
            {'account_ids': [account.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['status'], 'EN_COURS')
        self.assertEqual(response.data[0]['score_total'], 9)

    def test_execute_trade_on_multiple_accounts_creates_one_trade_each(self):
        account_a = self._create_account(name='A')
        account_b = self._create_account(name='B')
        response = self.client.post(
            '/api/performance/trades/',
            {'account_ids': [account_a.id, account_b.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(Trade.objects.count(), 2)

    def test_cannot_execute_trade_on_an_account_that_already_has_one_open(self):
        account = self._create_account()
        first = self.client.post(
            '/api/performance/trades/',
            {'account_ids': [account.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
            format='json',
        )
        self.assertEqual(first.status_code, 201)

        second = self.client.post(
            '/api/performance/trades/',
            {'account_ids': [account.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
            format='json',
        )
        self.assertEqual(second.status_code, 409)
        self.assertEqual(Trade.objects.filter(account=account).count(), 1)

    def test_one_account_with_open_trade_blocks_the_whole_multi_account_request(self):
        account_a = self._create_account(name='A')
        account_b = self._create_account(name='B')
        self.client.post(
            '/api/performance/trades/',
            {'account_ids': [account_a.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
            format='json',
        )

        response = self.client.post(
            '/api/performance/trades/',
            {'account_ids': [account_a.id, account_b.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
            format='json',
        )
        self.assertEqual(response.status_code, 409)
        # Atomic: account_b must not get a trade either, even though it was free.
        self.assertEqual(Trade.objects.filter(account=account_b).count(), 0)

    def test_cannot_execute_trade_on_someone_elses_account(self):
        foreign_account = TradingAccount.objects.create(
            user=self.other_user, name='Not mine', capital=1000, current_balance=1000, payout_type='ON_DEMAND',
            risk_profile=self.agressif_profile,
        )
        response = self.client.post(
            '/api/performance/trades/',
            {'account_ids': [foreign_account.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
            format='json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Trade.objects.count(), 0)

    def _create_account(self, name='FTMO 5K'):
        response = self.client.post(
            '/api/performance/accounts/',
            {'name': name, 'capital': 5000, 'current_balance': 5000, 'payout_type': 'ON_DEMAND'},
            format='json',
        )
        return TradingAccount.objects.get(id=response.data['id'])


class ExecuteTradeStopDayTests(APITestCase):
    """A VERROUILLE closure is supposed to stop trading on that account --
    daily_drawdown/take_profit_forced until the next local day,
    max_drawdown permanently. Without these checks execute_trade only knew
    about EN_COURS trades, so nothing stopped reopening immediately."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='perf-stopday@kriyo.local', password='TestPass123!', timezone='UTC')
        self.client.force_authenticate(user=self.user)
        # MODERE: daily_dd=5% ($50 of $1000), max_dd=10% ($100) -- a $60
        # single-trade loss trips daily_dd without reaching max_dd.
        self.daily_dd_profile = RiskProfile.objects.get(type='MODERE')
        # CONSERVATEUR: daily_dd=4% ($40), max_dd=8% ($80).
        self.max_dd_profile = RiskProfile.objects.get(type='CONSERVATEUR')

    def _account(self, risk_profile, current_balance=1000):
        return TradingAccount.objects.create(
            user=self.user, name='Test', capital=1000, current_balance=current_balance,
            payout_type='DEUX_SEMAINES', risk_profile=risk_profile,
        )

    def _open_and_close(self, account, pnl):
        trade = Trade.objects.create(
            account=account, score_vr=3, score_ep=3, score_vp=3, score_total=9, status='EN_COURS'
        )
        from tracking.services import close_trade
        return close_trade(self.user, trade.id, pnl)

    def _execute(self, account):
        return self.client.post(
            '/api/performance/trades/',
            {'account_ids': [account.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
            format='json',
        )

    def test_cannot_execute_after_daily_drawdown_lock_same_day(self):
        account = self._account(self.daily_dd_profile)
        _, outcome = self._open_and_close(account, -60)
        self.assertEqual(outcome['reason_key'], 'daily_drawdown')

        response = self._execute(account)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(Trade.objects.filter(account=account, status='EN_COURS').count(), 0)

    def test_can_execute_again_the_next_local_day(self):
        account = self._account(self.daily_dd_profile)
        self._open_and_close(account, -60)
        locked_trade = Trade.objects.get(account=account)
        locked_trade.closed_at = timezone.now() - timezone.timedelta(days=1)
        locked_trade.save(update_fields=['closed_at'])

        response = self._execute(account)
        self.assertEqual(response.status_code, 201)

    def test_max_drawdown_blocks_permanently_even_the_next_day(self):
        # Already down $50 (5%) from prior days; today's -$35 (under the 4%
        # / $40 daily limit on its own) pushes total drawdown to $85, over
        # the $80 max -- isolates max_drawdown from daily_drawdown.
        account = self._account(self.max_dd_profile, current_balance=950)
        _, outcome = self._open_and_close(account, -35)
        self.assertEqual(outcome['reason_key'], 'max_drawdown')
        breached_trade = Trade.objects.get(account=account)
        breached_trade.closed_at = timezone.now() - timezone.timedelta(days=30)
        breached_trade.save(update_fields=['closed_at'])

        response = self._execute(account)
        self.assertEqual(response.status_code, 409)

    def test_normal_close_does_not_block_the_next_trade(self):
        account = self._account(self.daily_dd_profile)
        self._open_and_close(account, 20)

        response = self._execute(account)
        self.assertEqual(response.status_code, 201)

    def test_locked_account_blocks_a_multi_account_request_atomically(self):
        locked_account = self._account(self.daily_dd_profile)
        other_account = self._account(self.daily_dd_profile)
        self._open_and_close(locked_account, -60)

        response = self.client.post(
            '/api/performance/trades/',
            {'account_ids': [locked_account.id, other_account.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
            format='json',
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(Trade.objects.filter(account=other_account, status='EN_COURS').count(), 0)


class PerformanceThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='perf-throttle@kriyo.local', password='TestPass123!')
        self.client.force_authenticate(user=self.user)

    def test_account_creation_is_rate_limited_per_user(self):
        for _ in range(30):
            response = self.client.post(
                '/api/performance/accounts/',
                {'name': 'FTMO 5K', 'capital': 5000, 'current_balance': 5000, 'payout_type': 'ON_DEMAND'},
                format='json',
            )
            self.assertNotEqual(response.status_code, 429)

        response = self.client.post(
            '/api/performance/accounts/',
            {'name': 'FTMO 5K', 'capital': 5000, 'current_balance': 5000, 'payout_type': 'ON_DEMAND'},
            format='json',
        )
        self.assertEqual(response.status_code, 429)

    def test_trade_execution_has_its_own_independent_limit(self):
        account = TradingAccount.objects.create(
            user=self.user, name='FTMO 5K', capital=5000, current_balance=5000, payout_type='ON_DEMAND',
            risk_profile=RiskProfile.objects.get(type='AGRESSIF'),
        )
        for _ in range(30):
            self.client.post(
                '/api/performance/trades/',
                {'account_ids': [account.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
                format='json',
            )
        response = self.client.post(
            '/api/performance/trades/',
            {'account_ids': [account.id], 'score_vr': 3, 'score_ep': 3, 'score_vp': 3},
            format='json',
        )
        self.assertEqual(response.status_code, 429)
