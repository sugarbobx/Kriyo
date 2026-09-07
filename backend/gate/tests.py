from django.test import TestCase
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Criterion, GateAttempt
from .scoring import (
    calculate_criterion_score,
    calculate_overall_score,
    gate_passed,
    get_message_tier,
    is_criterion_validated,
)


class CriterionScoreTests(TestCase):
    def test_all_yes(self):
        self.assertEqual(calculate_criterion_score([True] * 6), 1.0)

    def test_all_no(self):
        self.assertEqual(calculate_criterion_score([False] * 6), 0.0)

    def test_five_of_six(self):
        self.assertAlmostEqual(calculate_criterion_score([True] * 5 + [False]), 5 / 6)

    def test_five_of_six_is_validated(self):
        # 5/6 = 0.8333.. >= 0.80
        self.assertTrue(is_criterion_validated(5 / 6))

    def test_validated_just_below_threshold(self):
        self.assertFalse(is_criterion_validated(0.799))

    def test_validated_just_above_threshold(self):
        self.assertTrue(is_criterion_validated(0.80))

    def test_invalidated_but_nonzero_still_counts(self):
        # 4/6 = 0.6667 -> not validated, but score is not zeroed
        score = calculate_criterion_score([True, True, True, True, False, False])
        self.assertAlmostEqual(score, 4 / 6)
        self.assertFalse(is_criterion_validated(score))


class OverallScoreTests(TestCase):
    def test_all_perfect(self):
        self.assertAlmostEqual(calculate_overall_score([1.0] * 5), 1.0)

    def test_all_zero(self):
        self.assertEqual(calculate_overall_score([0.0] * 5), 0.0)

    def test_invalidated_criterion_still_contributes(self):
        # One criterion at 0 (all "No"), four perfect -> 4 * 0.20 = 0.80
        self.assertAlmostEqual(calculate_overall_score([1.0, 1.0, 1.0, 1.0, 0.0]), 0.80)

    def test_mixed_scores(self):
        scores = [5 / 6, 5 / 6, 5 / 6, 5 / 6, 5 / 6]
        self.assertAlmostEqual(calculate_overall_score(scores), 5 / 6 * 5 * 0.20)


class MessageTierBoundaryTests(TestCase):
    def test_74_9_percent_is_locked(self):
        self.assertEqual(get_message_tier(0.749), 'locked')
        self.assertFalse(gate_passed(0.749))

    def test_75_percent_exactly_passes_tight(self):
        self.assertEqual(get_message_tier(0.75), 'pass_tight')
        self.assertTrue(gate_passed(0.75))

    def test_79_9_percent_is_pass_tight(self):
        self.assertEqual(get_message_tier(0.799), 'pass_tight')

    def test_80_percent_is_pass_tight(self):
        # 80% is still within the 75-84% "tight margins" band, not a separate cutoff
        self.assertEqual(get_message_tier(0.80), 'pass_tight')

    def test_84_9_percent_is_pass_tight(self):
        self.assertEqual(get_message_tier(0.849), 'pass_tight')

    def test_85_percent_is_pass_good(self):
        self.assertEqual(get_message_tier(0.85), 'pass_good')

    def test_94_9_percent_is_pass_good(self):
        self.assertEqual(get_message_tier(0.949), 'pass_good')

    def test_95_percent_is_pass_excellent(self):
        self.assertEqual(get_message_tier(0.95), 'pass_excellent')

    def test_100_percent_is_pass_excellent(self):
        self.assertEqual(get_message_tier(1.0), 'pass_excellent')

    def test_0_percent_is_locked(self):
        self.assertEqual(get_message_tier(0.0), 'locked')


class GateApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='gate-test@kriyo.local', password='TestPass123!', timezone='UTC')
        self.client.force_authenticate(user=self.user)

    def _answer_criterion(self, key, values):
        question_ids = list(Criterion.objects.get(key=key).questions.order_by('order').values_list('id', flat=True))
        last_response = None
        for question_id, value in zip(question_ids, values):
            last_response = self.client.post(
                f'/api/gate/criteria/{key}/answers/', {'question_id': question_id, 'answer': value}, format='json'
            )
        return last_response

    def test_current_creates_attempt_on_first_visit(self):
        response = self.client.get('/api/gate/current/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'in_progress')
        self.assertEqual(len(response.data['criteria']), 5)
        self.assertEqual(GateAttempt.objects.filter(user=self.user).count(), 1)

    def test_full_pass_flow(self):
        self._answer_criterion('tension', [True, True, True, True, True, False])  # 5/6, validated
        self._answer_criterion('screen_time', [True] * 6)
        self._answer_criterion('phone', [True] * 6)
        self._answer_criterion('macro', [True] * 6)
        final = self._answer_criterion('alignment', [True] * 6)

        self.assertTrue(final.data['gate_complete'])
        self.assertEqual(final.data['gate_result']['status'], 'passed')
        self.assertAlmostEqual(final.data['gate_result']['overall_score'], 0.9666666666666668)
        self.assertEqual(final.data['gate_result']['message_tier'], 'pass_excellent')

        state = self.client.get('/api/gate/current/').data
        self.assertEqual(state['status'], 'passed_today')

        # Revisiting the same local day must not spawn a second attempt.
        self.client.get('/api/gate/current/')
        self.assertEqual(GateAttempt.objects.filter(user=self.user).count(), 1)

    def test_full_fail_flow_locks_and_clears_results(self):
        for key in ['tension', 'screen_time', 'phone', 'macro']:
            self._answer_criterion(key, [False] * 6)
        final = self._answer_criterion('alignment', [False] * 6)

        self.assertTrue(final.data['gate_complete'])
        self.assertEqual(final.data['gate_result']['status'], 'locked')
        self.assertEqual(final.data['gate_result']['overall_score'], 0.0)

        attempt = GateAttempt.objects.get(user=self.user)
        self.assertEqual(attempt.status, 'locked')
        self.assertIsNotNone(attempt.locked_until)
        self.assertEqual(attempt.criterion_results.count(), 0)

        state = self.client.get('/api/gate/current/').data
        self.assertEqual(state['status'], 'locked')
        self.assertEqual(state['criteria'], [])

    def test_answering_while_locked_is_rejected(self):
        for key in ['tension', 'screen_time', 'phone', 'macro', 'alignment']:
            self._answer_criterion(key, [False] * 6)

        question_id = Criterion.objects.get(key='tension').questions.first().id
        response = self.client.post(
            '/api/gate/criteria/tension/answers/', {'question_id': question_id, 'answer': True}, format='json'
        )
        self.assertEqual(response.status_code, 409)

    def test_invalidated_criterion_still_contributes_its_real_score(self):
        # 4/6 on one criterion (not zeroed for being "invalidated"), perfect on the rest.
        self._answer_criterion('tension', [True, True, True, True, False, False])
        self._answer_criterion('screen_time', [True] * 6)
        self._answer_criterion('phone', [True] * 6)
        self._answer_criterion('macro', [True] * 6)
        final = self._answer_criterion('alignment', [True] * 6)

        expected = (4 / 6 + 1 + 1 + 1 + 1) * 0.20
        self.assertAlmostEqual(final.data['gate_result']['overall_score'], expected)
