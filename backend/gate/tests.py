from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Criterion, CriterionResult, GateAttempt
from .scoring import (
    calculate_criterion_score,
    calculate_overall_score,
    gate_passed,
    get_message_tier,
    is_criterion_validated,
)


def _equal_weight(answers):
    """Pairs each answer with the default 1/6 per-question weight."""
    return [(a, 1 / 6) for a in answers]


class CriterionScoreTests(TestCase):
    def test_all_yes(self):
        self.assertEqual(calculate_criterion_score(_equal_weight([True] * 6)), 1.0)

    def test_all_no(self):
        self.assertEqual(calculate_criterion_score(_equal_weight([False] * 6)), 0.0)

    def test_five_of_six(self):
        self.assertAlmostEqual(calculate_criterion_score(_equal_weight([True] * 5 + [False])), 5 / 6)

    def test_five_of_six_is_validated(self):
        # 5/6 = 0.8333.. >= 0.80
        self.assertTrue(is_criterion_validated(5 / 6))

    def test_validated_just_below_threshold(self):
        self.assertFalse(is_criterion_validated(0.799))

    def test_validated_just_above_threshold(self):
        self.assertTrue(is_criterion_validated(0.80))

    def test_invalidated_but_nonzero_still_counts(self):
        # 4/6 = 0.6667 -> not validated, but score is not zeroed
        score = calculate_criterion_score(_equal_weight([True, True, True, True, False, False]))
        self.assertAlmostEqual(score, 4 / 6)
        self.assertFalse(is_criterion_validated(score))

    def test_unequal_weights_actually_shift_the_score(self):
        # One heavy "No" (weight 0.5) among five light "Yes" (weight 0.1 each)
        # should pull the score well below the unweighted 5/6.
        answers = [(True, 0.1)] * 5 + [(False, 0.5)]
        self.assertAlmostEqual(calculate_criterion_score(answers), 0.5 / 1.0)

    def test_zero_total_weight_returns_zero(self):
        self.assertEqual(calculate_criterion_score([(True, 0.0)] * 6), 0.0)


class OverallScoreTests(TestCase):
    def test_all_perfect(self):
        self.assertAlmostEqual(calculate_overall_score([(1.0, 0.20)] * 5), 1.0)

    def test_all_zero(self):
        self.assertEqual(calculate_overall_score([(0.0, 0.20)] * 5), 0.0)

    def test_invalidated_criterion_still_contributes(self):
        # One criterion at 0 (all "No"), four perfect -> 4 * 0.20 = 0.80
        self.assertAlmostEqual(
            calculate_overall_score([(1.0, 0.20), (1.0, 0.20), (1.0, 0.20), (1.0, 0.20), (0.0, 0.20)]), 0.80
        )

    def test_mixed_scores(self):
        scores = [(5 / 6, 0.20)] * 5
        self.assertAlmostEqual(calculate_overall_score(scores), 5 / 6)

    def test_unequal_criteria_weights_are_normalized(self):
        # Weights don't sum to 1 (0.4 + 0.1*3) -> result must still be normalized to 0..1.
        scores = [(1.0, 0.40), (0.0, 0.10), (0.0, 0.10), (0.0, 0.10)]
        self.assertAlmostEqual(calculate_overall_score(scores), 0.40 / 0.70)

    def test_zero_total_weight_returns_zero(self):
        self.assertEqual(calculate_overall_score([(1.0, 0.0)] * 5), 0.0)


class CriteriaFloorTests(TestCase):
    def test_all_above_floor_passes(self):
        from .scoring import all_criteria_above_floor
        self.assertTrue(all_criteria_above_floor([(4 / 6, 0.20)] * 5))

    def test_one_below_floor_fails(self):
        from .scoring import all_criteria_above_floor
        self.assertFalse(all_criteria_above_floor([(1.0, 0.20)] * 4 + [(3 / 6, 0.20)]))

    def test_exactly_at_floor_passes(self):
        from .scoring import all_criteria_above_floor
        self.assertTrue(all_criteria_above_floor([(1.0, 0.20)] * 4 + [(4 / 6, 0.20)]))


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
        cache.clear()  # each test posts up to 30 answers; must not count toward another test's throttle window
        self.user = User.objects.create_user(email='gate-test@kriyo.local', password='TestPass123!', timezone='UTC')
        self.client.force_authenticate(user=self.user)

    def _answer_criterion(self, key, values):
        """values[i] means "answer correctly (True) or incorrectly (False) to
        question i" -- translated to the actual raw answer sent via each
        question's positive_answer, so callers don't need to care which
        questions are reverse-phrased."""
        questions = list(Criterion.objects.get(key=key).questions.order_by('order'))
        last_response = None
        for question, value in zip(questions, values):
            raw_answer = value if question.positive_answer else not value
            last_response = self.client.post(
                f'/api/gate/criteria/{key}/answers/',
                {'question_id': question.id, 'answer': raw_answer},
                format='json',
            )
        return last_response

    def test_questions_lists_the_6_questions_in_order(self):
        response = self.client.get('/api/gate/criteria/tension/questions/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 6)
        self.assertEqual([q['order'] for q in response.data], [1, 2, 3, 4, 5, 6])
        self.assertIn('text', response.data[0])

    def test_questions_unknown_criterion_404(self):
        response = self.client.get('/api/gate/criteria/not-a-real-key/questions/')
        self.assertEqual(response.status_code, 404)

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
        # Kept, not deleted: this attempt's per-criterion breakdown is the
        # only evidence compute_weakest_criterion has for a repeatedly
        # failing user (see WeakestCriterionTests.test_includes_locked_attempts).
        self.assertEqual(attempt.criterion_results.count(), 5)

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

    def test_one_criterion_below_floor_locks_even_though_overall_would_pass(self):
        # 3/6 on tension (below the 4/6 floor), perfect on the rest ->
        # overall = (0.5 + 1 + 1 + 1 + 1) * 0.20 = 0.90, well above the 75%
        # pass threshold, but the floor rule must still lock the gate.
        self._answer_criterion('tension', [True, True, True, False, False, False])
        self._answer_criterion('screen_time', [True] * 6)
        self._answer_criterion('phone', [True] * 6)
        self._answer_criterion('macro', [True] * 6)
        final = self._answer_criterion('alignment', [True] * 6)

        self.assertTrue(final.data['gate_complete'])
        self.assertEqual(final.data['gate_result']['status'], 'locked')
        self.assertAlmostEqual(final.data['gate_result']['overall_score'], 0.90)

        attempt = GateAttempt.objects.get(user=self.user)
        self.assertEqual(attempt.status, 'locked')
        self.assertIsNotNone(attempt.locked_until)


class CriterionReviewTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='gate-review@kriyo.local', password='TestPass123!', timezone='UTC')
        self.client.force_authenticate(user=self.user)

    def _answer_criterion(self, key, values):
        questions = list(Criterion.objects.get(key=key).questions.order_by('order'))
        for question, value in zip(questions, values):
            raw_answer = value if question.positive_answer else not value
            self.client.post(
                f'/api/gate/criteria/{key}/answers/', {'question_id': question.id, 'answer': raw_answer}, format='json'
            )

    def test_review_is_rejected_before_criterion_is_completed(self):
        response = self.client.get('/api/gate/criteria/tension/review/')
        self.assertEqual(response.status_code, 409)

    def test_review_returns_recorded_answers_after_completion(self):
        self._answer_criterion('tension', [True, False, True, True, True, False])
        response = self.client.get('/api/gate/criteria/tension/review/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 6)
        self.assertEqual([a['order'] for a in response.data], [1, 2, 3, 4, 5, 6])
        self.assertIn('text', response.data[0])
        self.assertIn('answer', response.data[0])

    def test_review_unknown_criterion_404(self):
        response = self.client.get('/api/gate/criteria/not-a-real-key/review/')
        self.assertEqual(response.status_code, 404)


class ReversePhrasedQuestionTests(APITestCase):
    """One question per criterion has positive_answer=False (migration 0004) --
    answering "yes" to everything must not score 100% on that criterion."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='gate-polarity@kriyo.local', password='TestPass123!', timezone='UTC')
        self.client.force_authenticate(user=self.user)

    def _answer_all_raw_true(self, key):
        question_ids = list(Criterion.objects.get(key=key).questions.order_by('order').values_list('id', flat=True))
        last_response = None
        for question_id in question_ids:
            last_response = self.client.post(
                f'/api/gate/criteria/{key}/answers/', {'question_id': question_id, 'answer': True}, format='json'
            )
        return last_response

    def test_answering_yes_to_the_reverse_phrased_question_does_not_score_it_correct(self):
        response = self._answer_all_raw_true('tension')
        # 5/6 correct: the reverse-phrased question (positive_answer=False) was
        # answered True (raw "yes"), which is wrong for that one.
        self.assertAlmostEqual(response.data['criterion']['score'], 5 / 6)

    def test_answering_the_reverse_phrased_question_correctly_still_allows_6_6(self):
        questions = list(Criterion.objects.get(key='tension').questions.order_by('order'))
        last_response = None
        for question in questions:
            raw_answer = question.positive_answer  # True everywhere except the flipped one
            last_response = self.client.post(
                f'/api/gate/criteria/tension/answers/', {'question_id': question.id, 'answer': raw_answer}, format='json'
            )
        self.assertAlmostEqual(last_response.data['criterion']['score'], 1.0)


class StreakTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='gate-streak@kriyo.local', password='TestPass123!', timezone='UTC')
        self.client.force_authenticate(user=self.user)

    def _pass_gate_days_ago(self, days_ago):
        return GateAttempt.objects.create(
            user=self.user,
            status='passed',
            overall_score=1.0,
            completed_at=timezone.now() - timezone.timedelta(days=days_ago),
        )

    def test_no_history_is_zero(self):
        from gate.services import compute_streak
        self.assertEqual(compute_streak(self.user), 0)

    def test_three_consecutive_days_counts_three(self):
        from gate.services import compute_streak
        self._pass_gate_days_ago(0)
        self._pass_gate_days_ago(1)
        self._pass_gate_days_ago(2)
        self.assertEqual(compute_streak(self.user), 3)

    def test_gap_breaks_the_streak_count(self):
        from gate.services import compute_streak
        self._pass_gate_days_ago(0)
        self._pass_gate_days_ago(1)
        self._pass_gate_days_ago(3)  # gap at day -2
        self.assertEqual(compute_streak(self.user), 2)

    def test_missed_today_and_yesterday_resets_to_zero(self):
        from gate.services import compute_streak
        self._pass_gate_days_ago(5)
        self._pass_gate_days_ago(6)
        self.assertEqual(compute_streak(self.user), 0)

    def test_passed_yesterday_not_yet_today_keeps_streak_alive(self):
        from gate.services import compute_streak
        self._pass_gate_days_ago(1)
        self._pass_gate_days_ago(2)
        self.assertEqual(compute_streak(self.user), 2)


class WeakestCriterionTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='gate-weakest@kriyo.local', password='TestPass123!', timezone='UTC')

    def _create_passed_attempt_with_scores(self, scores_by_key, days_ago=0):
        """scores_by_key: {criterion_key: score}. Builds a 'passed' GateAttempt
        with one finalized CriterionResult per entry, directly via the ORM --
        the normal API flow only allows one pass per local day, which would
        make a two-attempt test impossible to set up through the endpoints."""
        completed_at = timezone.now() - timezone.timedelta(days=days_ago)
        attempt = GateAttempt.objects.create(
            user=self.user, status='passed', overall_score=1.0, completed_at=completed_at,
        )
        for key, score in scores_by_key.items():
            CriterionResult.objects.create(
                gate_attempt=attempt, criterion=Criterion.objects.get(key=key),
                score=score, validated=score >= 0.80, completed_at=completed_at,
            )
        return attempt

    def test_none_with_data_on_only_one_criterion(self):
        from gate.services import compute_weakest_criterion
        self._create_passed_attempt_with_scores({'tension': 5 / 6})
        self.assertIsNone(compute_weakest_criterion(self.user))

    def test_identifies_the_lowest_average_criterion(self):
        from gate.services import compute_weakest_criterion
        # Two passes, tension always weaker (5/6) than everything else (6/6).
        self._create_passed_attempt_with_scores({'tension': 5 / 6, 'screen_time': 1.0}, days_ago=1)
        self._create_passed_attempt_with_scores({'tension': 5 / 6, 'screen_time': 1.0}, days_ago=0)
        result = compute_weakest_criterion(self.user)
        self.assertIsNotNone(result)
        self.assertEqual(result['key'], 'tension')

    def _create_locked_attempt_with_scores(self, scores_by_key, days_ago=0):
        completed_at = timezone.now() - timezone.timedelta(days=days_ago)
        attempt = GateAttempt.objects.create(
            user=self.user, status='locked', overall_score=0.5, completed_at=completed_at,
        )
        for key, score in scores_by_key.items():
            CriterionResult.objects.create(
                gate_attempt=attempt, criterion=Criterion.objects.get(key=key),
                score=score, validated=score >= 0.80, completed_at=completed_at,
            )
        return attempt

    def test_includes_locked_attempts(self):
        # A user stuck failing is exactly who this feedback is for -- a
        # passed-only filter would return None here forever.
        from gate.services import compute_weakest_criterion
        self._create_locked_attempt_with_scores({'tension': 2 / 6, 'screen_time': 1.0}, days_ago=1)
        self._create_locked_attempt_with_scores({'tension': 2 / 6, 'screen_time': 1.0}, days_ago=0)
        result = compute_weakest_criterion(self.user)
        self.assertIsNotNone(result)
        self.assertEqual(result['key'], 'tension')

    def test_ignores_attempts_older_than_the_window(self):
        from gate.services import compute_weakest_criterion
        self._create_passed_attempt_with_scores({'tension': 0.0, 'screen_time': 1.0}, days_ago=30)
        self._create_passed_attempt_with_scores({'tension': 1.0, 'screen_time': 5 / 6}, days_ago=1)
        result = compute_weakest_criterion(self.user, days=7)
        # Only the recent attempt counts -> screen_time (5/6) is weaker than
        # tension (1.0), not the 30-day-old 0.0 on tension.
        self.assertEqual(result['key'], 'screen_time')


class GateAnswerThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(email='gate-throttle@kriyo.local', password='TestPass123!', timezone='UTC')
        self.client.force_authenticate(user=self.user)
        self.question_id = Criterion.objects.get(key='tension').questions.first().id

    def test_submit_answer_is_rate_limited_per_user(self):
        for _ in range(60):
            response = self.client.post(
                '/api/gate/criteria/tension/answers/', {'question_id': self.question_id, 'answer': True}, format='json'
            )
            self.assertNotEqual(response.status_code, 429)

        response = self.client.post(
            '/api/gate/criteria/tension/answers/', {'question_id': self.question_id, 'answer': True}, format='json'
        )
        self.assertEqual(response.status_code, 429)
