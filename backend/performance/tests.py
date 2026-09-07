from rest_framework.test import APITestCase

from accounts.models import User
from .models import RiskProfile, Trade, TradingAccount


class PerformanceApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='perf-test@kriyo.local', password='TestPass123!')
        self.other_user = User.objects.create_user(email='other@kriyo.local', password='TestPass123!')
        self.client.force_authenticate(user=self.user)
        self.agressif_profile = RiskProfile.objects.get(type='AGRESSIF')

    def test_create_account_assigns_risk_profile_from_payout(self):
        response = self.client.post(
            '/api/performance/accounts/',
            {'name': 'FTMO 5K', 'capital': 5000, 'payout_type': 'ON_DEMAND'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['risk_profile']['type'], 'AGRESSIF')

        account = TradingAccount.objects.get(user=self.user)
        self.assertEqual(account.risk_profile.type, 'AGRESSIF')

    def test_list_accounts_only_returns_own(self):
        TradingAccount.objects.create(
            user=self.other_user, name='Not mine', capital=1000, payout_type='ON_DEMAND',
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

    def test_cannot_execute_trade_on_someone_elses_account(self):
        foreign_account = TradingAccount.objects.create(
            user=self.other_user, name='Not mine', capital=1000, payout_type='ON_DEMAND',
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
            {'name': name, 'capital': 5000, 'payout_type': 'ON_DEMAND'},
            format='json',
        )
        return TradingAccount.objects.get(id=response.data['id'])
