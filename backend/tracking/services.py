from core.exceptions import KriyoApiError


def _pct(capital, percent):
    return None if percent is None else capital * (percent / 100)


def evaluate_trade_closure(capital, risk_profile, pnl):
    """Pure function: given an account's capital, its risk profile (needs
    .plafond_tp / .daily_dd / .max_dd), and the PnL being logged, decides the
    resulting trade status. Checked in this order — take-profit cap first,
    then daily drawdown, then max drawdown — matching the original app."""
    take_profit_target = _pct(capital, risk_profile.plafond_tp)
    daily_drawdown = _pct(capital, risk_profile.daily_dd)
    max_drawdown = _pct(capital, risk_profile.max_dd)

    if take_profit_target is not None and pnl >= take_profit_target:
        return {'status': 'VERROUILLE', 'reason_key': 'take_profit_forced', 'amount': take_profit_target}

    if daily_drawdown is not None and pnl <= -daily_drawdown:
        return {'status': 'VERROUILLE', 'reason_key': 'daily_drawdown', 'amount': daily_drawdown}

    if max_drawdown is not None and pnl <= -max_drawdown:
        return {'status': 'VERROUILLE', 'reason_key': 'max_drawdown', 'amount': max_drawdown}

    return {'status': 'CLOTURE', 'reason_key': 'logged', 'amount': pnl}


class TradeNotFoundError(KriyoApiError):
    status_code = 404
    detail = 'Trade introuvable.'


class TradeAlreadyClosedError(KriyoApiError):
    status_code = 409
    detail = 'Ce trade est déjà clôturé.'


def close_trade(user, trade_id, pnl):
    from performance.models import Trade

    try:
        trade = Trade.objects.select_related('account', 'account__risk_profile').get(id=trade_id, account__user=user)
    except Trade.DoesNotExist:
        raise TradeNotFoundError()

    if trade.status != 'EN_COURS':
        raise TradeAlreadyClosedError()

    from django.utils import timezone

    outcome = evaluate_trade_closure(trade.account.capital, trade.account.risk_profile, pnl)
    trade.pnl = pnl
    trade.status = outcome['status']
    trade.closed_at = timezone.now()
    trade.save(update_fields=['pnl', 'status', 'closed_at'])

    account = trade.account
    account.current_balance = account.current_balance + pnl
    account.save(update_fields=['current_balance'])

    return trade, outcome
