from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone

from core.exceptions import KriyoApiError

from . import scoring
from .models import Criterion, CriterionResult, GateAttempt, Question


class GateLockedError(KriyoApiError):
    status_code = 409
    detail = 'Gate is locked or already completed.'


class InvalidCriterionError(KriyoApiError):
    status_code = 404
    detail = 'Unknown criterion.'


class InvalidQuestionError(KriyoApiError):
    status_code = 404
    detail = 'Unknown question for this criterion.'


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


def compute_streak(user):
    """Consecutive local-calendar days with a passed attempt, counted back
    from the most recent one. 0 if the user has never passed, or if their
    last pass was before yesterday (streak broken) -- loss-aversion framing:
    showing 0 the day after a miss is the point, not a bug to round away."""
    passed_dates = sorted(
        {_local_date(dt, user) for dt in GateAttempt.objects.filter(user=user, status='passed').values_list('completed_at', flat=True) if dt},
        reverse=True,
    )
    if not passed_dates:
        return 0

    today = _local_date(timezone.now(), user)
    if passed_dates[0] not in (today, today - timezone.timedelta(days=1)):
        return 0

    streak = 1
    for i in range(1, len(passed_dates)):
        if passed_dates[i - 1] - passed_dates[i] == timezone.timedelta(days=1):
            streak += 1
        else:
            break
    return streak


def compute_weakest_criterion(user, days=7):
    """Average score per criterion across recent attempts (passed or locked)
    in the last `days` days, lowest average returned. None unless there's
    data on at least 2 different criteria to compare -- one data point isn't
    a pattern worth telling someone about (self-monitoring feedback should
    feel evidence-based, not random).

    Deliberately includes locked attempts, not just passed ones: someone
    stuck failing repeatedly is exactly who needs this feedback most, and a
    passed-only filter went silent for precisely that person."""
    from django.db.models import Avg

    since = timezone.now() - timezone.timedelta(days=days)
    results = (
        CriterionResult.objects.filter(
            gate_attempt__user=user, gate_attempt__status__in=['passed', 'locked'], gate_attempt__completed_at__gte=since,
            score__isnull=False,
        )
        .values('criterion__key', 'criterion__label')
        .annotate(avg_score=Avg('score'))
    )
    results = list(results)
    if len(results) < 2:
        return None

    weakest = min(results, key=lambda r: r['avg_score'])
    return {'key': weakest['criterion__key'], 'label': weakest['criterion__label'], 'avg_score': weakest['avg_score']}


def build_gate_state(attempt):
    now = timezone.now()
    streak = compute_streak(attempt.user)

    if attempt.status == 'locked' and attempt.locked_until and now < attempt.locked_until:
        return {
            'status': 'locked',
            'locked_until': attempt.locked_until,
            'overall_score': None,
            'message_tier': 'locked',
            'criteria': [],
            'streak': streak,
        }

    if attempt.status == 'passed':
        return {
            'status': 'passed_today',
            'locked_until': None,
            'overall_score': attempt.overall_score,
            'message_tier': scoring.get_message_tier(attempt.overall_score),
            'criteria': _criteria_summary(attempt),
            'streak': streak,
            'passed_at': attempt.completed_at,
        }

    return {
        'status': 'in_progress',
        'locked_until': None,
        'overall_score': None,
        'message_tier': None,
        'criteria': _criteria_summary(attempt),
        'streak': streak,
    }


def get_questions(criterion_key):
    try:
        criterion = Criterion.objects.get(key=criterion_key)
    except Criterion.DoesNotExist:
        raise InvalidCriterionError()
    return criterion.questions.all()


class CriterionNotAnsweredError(KriyoApiError):
    status_code = 409
    detail = 'This criterion has not been completed yet.'


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

    if scoring.gate_passed(overall_score) and scoring.all_criteria_above_floor(scores):
        attempt.status = 'passed'
        attempt.save(update_fields=['overall_score', 'completed_at', 'status'])
        gate_result = {
            'status': 'passed',
            'overall_score': overall_score,
            'message_tier': scoring.get_message_tier(overall_score),
            'streak': compute_streak(user),
            'weakest_criterion': compute_weakest_criterion(user),
        }
    else:
        attempt.status = 'locked'
        attempt.locked_until = timezone.now() + timezone.timedelta(minutes=scoring.LOCK_DURATION_MINUTES)
        attempt.save(update_fields=['overall_score', 'completed_at', 'status', 'locked_until'])
        # CriterionResults are kept (not deleted): a retry always gets a fresh
        # GateAttempt from get_current_attempt regardless, so nothing about
        # the "start over" behavior depends on wiping this attempt's rows --
        # and compute_weakest_criterion needs this history to say anything
        # useful to someone failing repeatedly.
        gate_result = {
            'status': 'locked',
            'overall_score': overall_score,
            'message_tier': 'locked',
            'locked_until': attempt.locked_until,
            'weakest_criterion': compute_weakest_criterion(user),
        }

    result['gate_complete'] = True
    result['gate_result'] = gate_result
    return result
