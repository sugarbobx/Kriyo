from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone


def user_timezone(user):
    try:
        return ZoneInfo(user.timezone)
    except (ZoneInfoNotFoundError, TypeError):
        return ZoneInfo('UTC')


def local_date(dt, user):
    return timezone.localtime(dt, user_timezone(user)).date()
