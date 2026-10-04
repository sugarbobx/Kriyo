from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone

from . import scoring
from .models import Criterion, CriterionResult, GateAttempt, Question


class GateLockedError(Exception):
    pass


class InvalidCriterionError(Exception):
    pass


class InvalidQuestionError(Exception):
    pass


def _user_tz(user):
    try:
        return ZoneInfo(user.timezone)
    except (ZoneInfoNotFoundError, TypeError):
        return ZoneInfo('UTC')


def _local_date(dt, user):
    return timezone.localtime(dt, _user_tz(user)).date()


def get_current_attempt(user):
    """Returns the GateAttempt that represents the user's current state, creating
    a fresh one when: there is none yet, the previous lock has expired, or the
    previous pass happened on an earlier local calendar day."""
    latest = GateAttempt.objects.filter(user=user).order_by('-started_at').first()
    now = timezone.now()

    if latest is None:
        return GateAttempt.objects.create(user=user)

    if latest.status == 'locked':
        if latest.locked_until and now >= latest.locked_until:
            return GateAttempt.objects.create(user=user)
        return latest

    if latest.status == 'passed':
        if latest.completed_at and _local_date(latest.completed_at, user) == _local_date(now, user):
            return latest
        return GateAttempt.objects.create(user=user)

    return latest


def _criteria_summary(attempt):
    results_by_criterion = {r.criterion_id: r for r in attempt.criterion_results.all()}
    summary = []
    for criterion in Criterion.objects.all():
        result = results_by_criterion.get(criterion.id)
        finalized = result is not None and result.score is not None
        summary.append({
            'key': criterion.key,
            'label': criterion.label,
            'category': criterion.category,
            'attempted': finalized,
            'validated': result.validated if finalized else None,
            'score': result.score if finalized else None,
        })
    return summary


def build_gate_state(attempt):
    now = timezone.now()

    if attempt.status == 'locked' and attempt.locked_until and now < attempt.locked_until:
        return {
            'status': 'locked',
            'locked_until': attempt.locked_until,
            'overall_score': None,
            'message_tier': 'locked',
            'criteria': [],
        }

    if attempt.status == 'passed':
        return {
            'status': 'passed_today',
            'locked_until': None,
            'overall_score': attempt.overall_score,
            'message_tier': scoring.get_message_tier(attempt.overall_score),
            'criteria': _criteria_summary(attempt),
        }

    return {
        'status': 'in_progress',
        'locked_until': None,
        'overall_score': None,
        'message_tier': None,
        'criteria': _criteria_summary(attempt),
    }


def get_questions(criterion_key):
    try:
        criterion = Criterion.objects.get(key=criterion_key)
    except Criterion.DoesNotExist:
        raise InvalidCriterionError()
    return criterion.questions.all()


class CriterionNotAnsweredError(Exception):
    pass


def get_criterion_review(user, criterion_key):
    """Returns this attempt's recorded answers for an already-finalized
    criterion, so the user can review what they answered instead of
    re-entering the quiz."""
    try:
        criterion = Criterion.objects.get(key=criterion_key)
    except Criterion.DoesNotExist:
        raise InvalidCriterionError()

    attempt = get_current_attempt(user)
    try:
        criterion_result = attempt.criterion_results.get(criterion=criterion)
    except CriterionResult.DoesNotExist:
        raise CriterionNotAnsweredError()

    if criterion_result.score is None:
        raise CriterionNotAnsweredError()

    answers = criterion_result.answers.select_related('question').order_by('question__order')
    return [
        {'id': a.question.id, 'order': a.question.order, 'text': a.question.text, 'answer': a.answer}
        for a in answers
    ]


def record_answer(user, criterion_key, question_id, answer_value):
    """Saves one answer, finalizing the criterion on its 6th distinct answer and
    the whole gate attempt once all 5 criteria are finalized. Returns a dict
    describing what just happened for the frontend to branch on."""
    attempt = get_current_attempt(user)
    if attempt.status != 'in_progress':
        raise GateLockedError()

    try:
        criterion = Criterion.objects.get(key=criterion_key)
    except Criterion.DoesNotExist:
        raise InvalidCriterionError()

    try:
        question = Question.objects.get(id=question_id, criterion=criterion)
    except Question.DoesNotExist:
        raise InvalidQuestionError()

    criterion_result, _ = CriterionResult.objects.get_or_create(gate_attempt=attempt, criterion=criterion)
    criterion_result.answers.update_or_create(question=question, defaults={'answer': answer_value})

    answered_count = criterion_result.answers.count()
    if answered_count < 6:
        return {'criterion_complete': False, 'gate_complete': False}

    raw_answers = criterion_result.answers.values_list('answer', 'question__positive_answer', 'question__weight')
    answers = [(answer == positive_answer, weight) for answer, positive_answer, weight in raw_answers]
    score = scoring.calculate_criterion_score(answers)
    validated = scoring.is_criterion_validated(score)
    criterion_result.score = score
    criterion_result.validated = validated
    criterion_result.completed_at = timezone.now()
    criterion_result.save(update_fields=['score', 'validated', 'completed_at'])

    result = {
        'criterion_complete': True,
        'criterion': {'key': criterion.key, 'label': criterion.label, 'score': score, 'validated': validated},
        'gate_complete': False,
        'gate_result': None,
    }

    finalized_count = attempt.criterion_results.exclude(score__isnull=True).count()
    if finalized_count < 5:
        return result

    scores = list(
        attempt.criterion_results.exclude(score__isnull=True).values_list('score', 'criterion__weight_in_gate')
    )
    overall_score = scoring.calculate_overall_score(scores)
    attempt.overall_score = overall_score
    attempt.completed_at = timezone.now()

    if scoring.gate_passed(overall_score):
        attempt.status = 'passed'
        attempt.save(update_fields=['overall_score', 'completed_at', 'status'])
        gate_result = {
            'status': 'passed',
            'overall_score': overall_score,
            'message_tier': scoring.get_message_tier(overall_score),
        }
    else:
        attempt.status = 'locked'
        attempt.locked_until = timezone.now() + timezone.timedelta(minutes=scoring.LOCK_DURATION_MINUTES)
        attempt.save(update_fields=['overall_score', 'completed_at', 'status', 'locked_until'])
        attempt.criterion_results.all().delete()
        gate_result = {
            'status': 'locked',
            'overall_score': overall_score,
            'message_tier': 'locked',
            'locked_until': attempt.locked_until,
        }

    result['gate_complete'] = True
    result['gate_result'] = gate_result
    return result
