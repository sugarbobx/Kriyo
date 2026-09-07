OVERALL_PASS_THRESHOLD = 0.75
CRITERION_VALIDATED_THRESHOLD = 0.80
CRITERION_WEIGHT = 0.20
LOCK_DURATION_MINUTES = 30

MESSAGE_TIERS = {
    'locked': {
        'title': 'Not cleared for this session.',
        'body': (
            "Your current state isn't where it needs to be to trade well right now — and that's the whole "
            "point of this gate. It's not here to punish you, it's here to catch you before the market does. "
            'Step away for 30 minutes. Breathe, reset, come back when your head is clearer. The trade will '
            'still be there.'
        ),
    },
    'pass_tight': {
        'title': 'Cleared, but margins are tight.',
        'body': (
            "You're through, but a few areas were shakier than they should be. Trade smaller than usual "
            "today, and don't force anything. Watch the criteria that came in weak — they're telling you "
            'something.'
        ),
    },
    'pass_good': {
        'title': "You're in the right mindset.",
        'body': (
            'Keep your head up, stay focused, and make sure you are aligning with the market and your '
            'structure before opening trades.'
        ),
    },
    'pass_excellent': {
        'title': 'Fully aligned.',
        'body': (
            'Mind clear, discipline high, no red flags anywhere. This is the state you want to trade from '
            'every time — not just today. Go execute your plan.'
        ),
    },
}


def calculate_criterion_score(answers):
    """answers: iterable of booleans (True = Yes). Assumes exactly 6 answers."""
    answers = list(answers)
    return sum(1 for a in answers if a) / len(answers)


def is_criterion_validated(criterion_score):
    return criterion_score >= CRITERION_VALIDATED_THRESHOLD


def calculate_overall_score(criterion_scores):
    """criterion_scores: iterable of the 5 criterion scores (0..1 each), equal 20% weight."""
    return sum(score * CRITERION_WEIGHT for score in criterion_scores)


def get_message_tier(overall_score):
    if overall_score < OVERALL_PASS_THRESHOLD:
        return 'locked'
    if overall_score < 0.85:
        return 'pass_tight'
    if overall_score < 0.95:
        return 'pass_good'
    return 'pass_excellent'


def gate_passed(overall_score):
    return overall_score >= OVERALL_PASS_THRESHOLD
