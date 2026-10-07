from django.db import transaction
from django.utils import timezone

from core.exceptions import KriyoApiError
from core.timeutils import local_date

from .models import PAYOUT_TO_RISK_PROFILE, RiskProfile, Trade, TradingAccount


class AccountNotOwnedError(KriyoApiError):
    status_code = 403
    detail = 'One or more accounts do not belong to you.'


class AccountHasOpenTradeError(KriyoApiError):
    """Raised when execute_trade is asked to open a trade on an account that
    already has one EN_COURS (one open trade per account, per the product spec)."""
    status_code = 409
    detail = 'One or more accounts already have an open trade.'

    def __init__(self, account_ids):
        super().__init__(account_ids=account_ids)


class AccountLockedForTodayError(KriyoApiError):
    """Raised when an account hit its take-profit cap or daily drawdown
    limit earlier today -- the whole point of that lock is a stop-day, so
    nothing should be able to open a new trade on the account again before
    the user's next local calendar day."""
    status_code = 409
    detail = 'One or more accounts are locked for the rest of today.'

    def __init__(self, account_ids):
        super().__init__(account_ids=account_ids)


class AccountBreachedError(KriyoApiError):
    """Raised when an account has ever hit its max drawdown -- unlike a
    daily-DD or take-profit lock, a max-drawdown breach means the account
    itself is blown (prop-firm challenge failed), not just "done for today"."""
    status_code = 409
    detail = 'One or more accounts have breached max drawdown and are permanently locked.'

    def __init__(self, account_ids):
        super().__init__(account_ids=account_ids)


def create_account(user, name, capital, current_balance, payout_type):
    risk_profile_type = PAYOUT_TO_RISK_PROFILE[payout_type]
    risk_profile = RiskProfile.objects.get(type=risk_profile_type)
    return TradingAccount.objects.create(
        user=user, name=name, capital=capital, current_balance=current_balance,
        payout_type=payout_type, risk_profile=risk_profile,
    )


@transaction.atomic
def execute_trade(user, account_ids, score_vr, score_ep, score_vp, score_total):
    accounts = list(TradingAccount.objects.filter(id__in=account_ids, user=user))
    if len(accounts) != len(set(account_ids)):
        raise AccountNotOwnedError()

    already_open = list(
        Trade.objects.filter(account_id__in=account_ids, status='EN_COURS').values_list('account_id', flat=True)
    )
    if already_open:
        raise AccountHasOpenTradeError(already_open)

    breached = list(
        Trade.objects.filter(account_id__in=account_ids, close_reason='max_drawdown')
        .values_list('account_id', flat=True).distinct()
    )
    if breached:
        raise AccountBreachedError(breached)

    today = local_date(timezone.now(), user)
    locked_today = sorted({
        t.account_id
        for t in Trade.objects.filter(
            account_id__in=account_ids, close_reason__in=['daily_drawdown', 'take_profit_forced'],
            closed_at__isnull=False,
        )
        if local_date(t.closed_at, user) == today
    })
    if locked_today:
        raise AccountLockedForTodayError(locked_today)

    trades = [
        Trade.objects.create(
            account=account,
            score_vr=score_vr,
            score_ep=score_ep,
            score_vp=score_vp,
            score_total=score_total,
            risk_reward=2 if score_vp == 3 else None,
            status='EN_COURS',
        )
        for account in accounts
    ]
    return trades
