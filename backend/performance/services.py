from .models import PAYOUT_TO_RISK_PROFILE, RiskProfile, Trade, TradingAccount


class AccountNotOwnedError(Exception):
    pass


def create_account(user, name, capital, current_balance, payout_type):
    risk_profile_type = PAYOUT_TO_RISK_PROFILE[payout_type]
    risk_profile = RiskProfile.objects.get(type=risk_profile_type)
    return TradingAccount.objects.create(
        user=user, name=name, capital=capital, current_balance=current_balance,
        payout_type=payout_type, risk_profile=risk_profile,
    )


def execute_trade(user, account_ids, score_vr, score_ep, score_vp, score_total):
    accounts = list(TradingAccount.objects.filter(id__in=account_ids, user=user))
    if len(accounts) != len(set(account_ids)):
        raise AccountNotOwnedError()

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
