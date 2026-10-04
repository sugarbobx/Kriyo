from django.db import migrations, models


def backfill_current_balance(apps, schema_editor):
    TradingAccount = apps.get_model('performance', 'TradingAccount')
    # Existing accounts (created before this field existed) start tracked
    # from their initial capital.
    for account in TradingAccount.objects.all():
        account.current_balance = account.capital
        account.save(update_fields=['current_balance'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('performance', '0002_seed_risk_profiles'),
    ]

    operations = [
        migrations.AddField(
            model_name='tradingaccount',
            name='current_balance',
            field=models.FloatField(default=0),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_current_balance, noop),
    ]
