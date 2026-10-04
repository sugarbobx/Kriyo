from django.db import migrations

# One question per criterion, reverse-phrased so "No" is the correct/positive
# answer. Breaks the "answer Yes to everything -> always 100%" shortcut while
# keeping the same underlying check, just asked the other way around.
FLIPS = [
    {
        'criterion_key': 'tension',
        'order': 5,
        'old_text': 'Do you feel calm rather than anxious or overly excited about this session?',
        'new_text': 'Are you feeling anxious or overly excited about this session?',
    },
    {
        'criterion_key': 'screen_time',
        'order': 3,
        'old_text': 'Did you avoid checking trading apps outside your planned hours?',
        'new_text': 'Did you check trading apps outside your planned hours?',
    },
    {
        'criterion_key': 'phone',
        'order': 6,
        'old_text': 'Are you free of the urge to check your phone right now?',
        'new_text': 'Do you feel the urge to check your phone right now?',
    },
    {
        'criterion_key': 'macro',
        'order': 2,
        'old_text': 'Are there no major news releases in the next 30 minutes?',
        'new_text': 'Are there major news releases in the next 30 minutes?',
    },
    {
        'criterion_key': 'alignment',
        'order': 6,
        'old_text': "Are you avoiding chasing a move that’s already extended?",
        'new_text': "Are you chasing a move that’s already extended?",
    },
]


def flip(apps, schema_editor):
    Question = apps.get_model('gate', 'Question')
    for entry in FLIPS:
        Question.objects.filter(
            criterion__key=entry['criterion_key'], order=entry['order']
        ).update(text=entry['new_text'], positive_answer=False)


def unflip(apps, schema_editor):
    Question = apps.get_model('gate', 'Question')
    for entry in FLIPS:
        Question.objects.filter(
            criterion__key=entry['criterion_key'], order=entry['order']
        ).update(text=entry['old_text'], positive_answer=True)


class Migration(migrations.Migration):

    dependencies = [
        ('gate', '0003_question_positive_answer'),
    ]

    operations = [
        migrations.RunPython(flip, unflip),
    ]
