from django.db import migrations

CRITERIA = [
    {
        'key': 'tension',
        'label': 'Tension',
        'category': 'psych',
        'order': 1,
        'questions': [
            'Did you sleep at least 7 hours last night?',
            'Are you free of significant personal or emotional stress right now?',
            'Have you eaten in the last few hours (not trading hungry)?',
            'Are you free of any alcohol or substance influence?',
            'Do you feel calm rather than anxious or overly excited about this session?',
            'Are you mentally alert, not fatigued or exhausted?',
        ],
    },
    {
        'key': 'screen_time',
        'label': 'Screen time',
        'category': 'psych',
        'order': 2,
        'questions': [
            'Did you take a break at least once per hour during your last session?',
            'Has your total screen time today stayed under your set limit?',
            'Did you avoid checking trading apps outside your planned hours?',
            'Have you taken a 10+ minute break in the last 2 hours?',
            'Are you free of eye strain or physical fatigue from screen use?',
            'Did you start and stop your last session at the planned times?',
        ],
    },
    {
        'key': 'phone',
        'label': 'Phone',
        'category': 'psych',
        'order': 3,
        'questions': [
            'Is your phone on Do Not Disturb / Silent?',
            'Is your phone out of arm’s reach or in another room?',
            'Have you closed all non-trading apps and browser tabs?',
            'Are social media notifications disabled for this session?',
            'Have you told others not to disturb you during this session?',
            'Are you free of the urge to check your phone right now?',
        ],
    },
    {
        'key': 'macro',
        'label': 'Macro',
        'category': 'tech',
        'order': 4,
        'questions': [
            'Have you checked today’s economic calendar for high-impact events?',
            'Are there no major news releases in the next 30 minutes?',
            'Are you avoiding trading through a scheduled central bank announcement?',
            'Are you aware of any earnings/data releases affecting your instrument today?',
            'Have you adjusted position sizing for today’s volatility, if elevated?',
            'Is there no unexpected breaking news currently affecting your market?',
        ],
    },
    {
        'key': 'alignment',
        'label': 'Alignment',
        'category': 'tech',
        'order': 5,
        'questions': [
            'Does your trade idea align with the higher-timeframe trend?',
            'Have you confirmed key support/resistance levels for today?',
            'Is current volatility within your acceptable trading range?',
            'Have you checked correlated markets/instruments for confirmation?',
            'Does the planned trade fit your predefined strategy rules?',
            'Are you avoiding chasing a move that’s already extended?',
        ],
    },
]


def seed(apps, schema_editor):
    Criterion = apps.get_model('gate', 'Criterion')
    Question = apps.get_model('gate', 'Question')

    for entry in CRITERIA:
        criterion, _ = Criterion.objects.update_or_create(
            key=entry['key'],
            defaults={
                'label': entry['label'],
                'category': entry['category'],
                'order': entry['order'],
                'weight_in_gate': 0.20,
            },
        )
        for index, text in enumerate(entry['questions'], start=1):
            Question.objects.update_or_create(
                criterion=criterion,
                order=index,
                defaults={'text': text, 'weight': 1 / 6},
            )


def unseed(apps, schema_editor):
    Criterion = apps.get_model('gate', 'Criterion')
    Criterion.objects.filter(key__in=[entry['key'] for entry in CRITERIA]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('gate', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
