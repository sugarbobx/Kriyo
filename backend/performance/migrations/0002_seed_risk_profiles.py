from django.db import migrations

PROFILES = [
    {
        'type': 'AGRESSIF',
        'label': 'Agressif',
        'plafond_tp': 40,
        'note': 'Take Profit forcé à 40% de l’objectif',
    },
    {
        'type': 'MODERE',
        'label': 'Modéré',
        'daily_dd': 5,
        'max_dd': 10,
        'note': 'Suivi du Daily DD',
    },
    {
        'type': 'CONSERVATEUR',
        'label': 'Conservateur',
        'daily_dd': 4,
        'max_dd': 8,
        'note': 'Suivi du Max DD',
    },
]


def seed(apps, schema_editor):
    RiskProfile = apps.get_model('performance', 'RiskProfile')
    for entry in PROFILES:
        RiskProfile.objects.update_or_create(type=entry['type'], defaults=entry)


def unseed(apps, schema_editor):
    RiskProfile = apps.get_model('performance', 'RiskProfile')
    RiskProfile.objects.filter(type__in=[entry['type'] for entry in PROFILES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('performance', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
