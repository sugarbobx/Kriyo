from django.core.cache import cache
from rest_framework.test import APITestCase

from .models import User


class TimezoneSyncTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='tz-sync@kriyo.local', password='TestPass123!', timezone='UTC')
        self.client.force_authenticate(user=self.user)

    def test_updates_timezone_when_changed(self):
        response = self.client.post('/api/auth/timezone/', {'timezone': 'America/New_York'}, format='json')
        self.assertEqual(response.status_code, 204)
        self.user.refresh_from_db()
        self.assertEqual(self.user.timezone, 'America/New_York')

    def test_no_op_when_timezone_unchanged(self):
        response = self.client.post('/api/auth/timezone/', {'timezone': 'UTC'}, format='json')
        self.assertEqual(response.status_code, 204)
        self.user.refresh_from_db()
        self.assertEqual(self.user.timezone, 'UTC')

    def test_requires_authentication(self):
        # DRF's default permission_denied() returns 403, not 401, when no
        # registered authenticator supports a WWW-Authenticate challenge --
        # true here since this API only uses SessionAuthentication.
        self.client.force_authenticate(user=None)
        response = self.client.post('/api/auth/timezone/', {'timezone': 'UTC'}, format='json')
        self.assertEqual(response.status_code, 403)


class DeleteAccountTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='delete-me@kriyo.local', password='TestPass123!', timezone='UTC')
        self.client.force_authenticate(user=self.user)

    def test_deletes_the_authenticated_user(self):
        response = self.client.delete('/api/auth/me/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(email='delete-me@kriyo.local').exists())

    def test_session_is_invalidated_after_delete(self):
        # force_authenticate attaches a Python user object directly and
        # skips real auth resolution, so it would still "work" against a
        # deleted user -- login for real here to exercise the actual
        # session-cookie path a browser would hit.
        self.client.force_authenticate(user=None)
        self.client.post('/api/auth/login/', {'email': 'delete-me@kriyo.local', 'password': 'TestPass123!'}, format='json')
        self.client.delete('/api/auth/me/')
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 403)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.delete('/api/auth/me/')
        self.assertEqual(response.status_code, 403)


class LoginThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        User.objects.create_user(email='throttle@kriyo.local', password='CorrectPass123!', timezone='UTC')

    def test_wrong_password_is_rejected_until_the_rate_limit_kicks_in(self):
        for _ in range(5):
            response = self.client.post(
                '/api/auth/login/', {'email': 'throttle@kriyo.local', 'password': 'wrong'}, format='json'
            )
            self.assertEqual(response.status_code, 401)

        response = self.client.post(
            '/api/auth/login/', {'email': 'throttle@kriyo.local', 'password': 'wrong'}, format='json'
        )
        self.assertEqual(response.status_code, 429)

    def test_correct_password_still_counts_toward_the_limit(self):
        # The 6th call is throttled even with the right password -- the limit is
        # per-IP on the endpoint, not keyed to failed attempts only.
        for _ in range(5):
            self.client.post('/api/auth/login/', {'email': 'throttle@kriyo.local', 'password': 'wrong'}, format='json')

        response = self.client.post(
            '/api/auth/login/', {'email': 'throttle@kriyo.local', 'password': 'CorrectPass123!'}, format='json'
        )
        self.assertEqual(response.status_code, 429)

    def test_signup_has_its_own_independent_limit(self):
        for _ in range(5):
            self.client.post('/api/auth/login/', {'email': 'throttle@kriyo.local', 'password': 'wrong'}, format='json')

        response = self.client.post(
            '/api/auth/signup/', {'email': 'new-user@kriyo.local', 'password': 'AnotherPass123!'}, format='json'
        )
        self.assertNotEqual(response.status_code, 429)
