from core.exceptions import KriyoApiError


def _pct(capital, percent):
    return None if percent is None else capital * (percent / 100)


def evaluate_trade_closure(capital, current_balance, risk_profile, pnl, daily_pnl_before=0):
    """Pure function: given an account's initial capital, its current balance
    (before this trade's pnl), its risk profile (needs .plafond_tp /
    .daily_dd / .max_dd), the PnL being logged, and the account's realized
    PnL so far today (daily_pnl_before, excluding this trade), decides the
    resulting trade status. Checked in this order — take-profit cap first,
    then daily drawdown, then max drawdown — matching the original app.

    take-profit is a per-trade cap (a single trade isn't allowed to earn more
    than the cap, regardless of the rest of the day). daily drawdown is
    cumulative over the calendar day -- several small losses that each clear
    the threshold individually must still trip it once they add up. max
    drawdown is cumulative over the account's whole life, measured against
    the current balance, not this trade in isolation."""
    take_profit_target = _pct(capital, risk_profile.plafond_tp)
    daily_drawdown_target = _pct(capital, risk_profile.daily_dd)
    max_drawdown_target = _pct(capital, risk_profile.max_dd)

    if take_profit_target is not None and pnl >= take_profit_target:
        return {'status': 'VERROUILLE', 'reason_key': 'take_profit_forced', 'amount': take_profit_target}

    cumulative_daily_pnl = daily_pnl_before + pnl
    if daily_drawdown_target is not None and cumulative_daily_pnl <= -daily_drawdown_target:
        return {'status': 'VERROUILLE', 'reason_key': 'daily_drawdown', 'amount': daily_drawdown_target}

    total_drawdown = capital - (current_balance + pnl)
    if max_drawdown_target is not None and total_drawdown >= max_drawdown_target:
        return {'status': 'VERROUILLE', 'reason_key': 'max_drawdown', 'amount': max_drawdown_target}

    return {'status': 'CLOTURE', 'reason_key': 'logged', 'amount': pnl}


class TradeNotFoundError(KriyoApiError):
    status_code = 404
    detail = 'Trade introuvable.'


class TradeAlreadyClosedError(KriyoApiError):
    status_code = 409
    detail = 'Ce trade est déjà clôturé.'


def close_trade(user, trade_id, pnl):
    from performance.models import Trade

    from core.timeutils import local_date

    try:
        trade = Trade.objects.select_related('account', 'account__risk_profile').get(id=trade_id, account__user=user)
    except Trade.DoesNotExist:
        raise TradeNotFoundError()

    if trade.status != 'EN_COURS':
        raise TradeAlreadyClosedError()

    from django.utils import timezone

    now = timezone.now()
    today = local_date(now, user)
    # Filtered to today's local date in Python (not the DB query), since
    # comparing against the user's local day needs the same tz conversion
    # used everywhere else -- this account's trade volume per day is small
    # enough that this isn't a real cost.
    daily_pnl_before = sum(
        t.pnl or 0
        for t in Trade.objects.filter(account=trade.account, status__in=['CLOTURE', 'VERROUILLE'], closed_at__isnull=False).exclude(id=trade.id)
        if local_date(t.closed_at, user) == today
    )

    outcome = evaluate_trade_closure(
        trade.account.capital, trade.account.current_balance, trade.account.risk_profile, pnl,
        daily_pnl_before=daily_pnl_before,
    )
    trade.pnl = pnl
    trade.status = outcome['status']
    trade.close_reason = outcome['reason_key']
    trade.closed_at = now
    trade.save(update_fields=['pnl', 'status', 'close_reason', 'closed_at'])

    account = trade.account
    account.current_balance = account.current_balance + pnl
    account.save(update_fields=['current_balance'])

    return trade, outcome
