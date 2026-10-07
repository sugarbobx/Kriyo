from django.core.cache import cache
from rest_framework.test import APITestCase

from accounts.models import User

from .models import EducationProgress


class EducationProgressTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='edu-test@kriyo.local', password='TestPass123!')
        self.other_user = User.objects.create_user(email='edu-other@kriyo.local', password='TestPass123!')
        self.client.force_authenticate(user=self.user)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/education/progress/')
        self.assertEqual(response.status_code, 403)

    def test_empty_by_default(self):
        response = self.client.get('/api/education/progress/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['read_module_keys'], [])

    def test_mark_read_then_list_includes_it(self):
        response = self.client.post('/api/education/progress/', {'module_key': 'loss_aversion'}, format='json')
        self.assertEqual(response.status_code, 204)

        response = self.client.get('/api/education/progress/')
        self.assertEqual(response.data['read_module_keys'], ['loss_aversion'])

    def test_marking_the_same_module_twice_is_idempotent(self):
        self.client.post('/api/education/progress/', {'module_key': 'fomo'}, format='json')
        self.client.post('/api/education/progress/', {'module_key': 'fomo'}, format='json')
        self.assertEqual(EducationProgress.objects.filter(user=self.user, module_key='fomo').count(), 1)

    def test_progress_is_scoped_per_user(self):
        EducationProgress.objects.create(user=self.other_user, module_key='routine_recovery')
        response = self.client.get('/api/education/progress/')
        self.assertEqual(response.data['read_module_keys'], [])
