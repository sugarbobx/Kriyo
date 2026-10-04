from django.contrib.auth.hashers import make_password
from django.db import migrations

# NOTE: plaintext credential committed to source control at the explicit,
# informed request of the project owner (flagged as a risk beforehand).
# make_password() hashes it before it ever touches the database -- only this
# migration file carries the plaintext, not the DB. Historical models (via
# apps.get_model) don't carry AbstractBaseUser's set_password()/save() auth
# helpers, so the hash is computed directly with make_password instead.
ADMIN_EMAIL = 'jznguetsa@afriksys.com'
ADMIN_PASSWORD = 'Godwill237@'


def seed_admin(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.update_or_create(
        email=ADMIN_EMAIL,
        defaults={
            'password': make_password(ADMIN_PASSWORD),
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
        },
    )


def unseed_admin(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(email=ADMIN_EMAIL).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_admin, unseed_admin),
    ]
