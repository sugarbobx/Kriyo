from django.core.cache import cache
from rest_framework.test import APITestCase

from .models import User


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
