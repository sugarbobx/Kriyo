from rest_framework.test import APITestCase

from accounts.models import User

from .models import EngagementLog


class HealthTests(APITestCase):
    def test_health_is_public_and_ok(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'status': 'ok'})


class AcceptEngagementTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='core-test@kriyo.local', password='TestPass123!')

    def test_requires_authentication(self):
        response = self.client.post('/api/engagement/accept/')
        self.assertEqual(response.status_code, 403)

    def test_accept_creates_a_log_entry_for_the_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/engagement/accept/')
        self.assertEqual(response.status_code, 201)
        self.assertIn('accepted_at', response.data)
        self.assertEqual(EngagementLog.objects.filter(user=self.user).count(), 1)

    def test_accepting_twice_creates_two_log_entries(self):
        # No "already accepted" guard by design -- it's logged every login,
        # per the engagement screen's own UX (dashboard/UX spec: "a chaque
        # connexion").
        self.client.force_authenticate(user=self.user)
        self.client.post('/api/engagement/accept/')
        self.client.post('/api/engagement/accept/')
        self.assertEqual(EngagementLog.objects.filter(user=self.user).count(), 2)
