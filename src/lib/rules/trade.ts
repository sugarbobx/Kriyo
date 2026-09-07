import type { KriyoComptePropRecord, KriyoProfilRisqueRecord } from '@/lib/db';

export type TradeClosureStatus = 'CLOTURE' | 'VERROUILLE';
export type TradeClosureReasonKey = 'takeProfitForced' | 'dailyDrawdown' | 'maxDrawdown' | 'logged';

export interface TradeClosureOutcome {
  status: TradeClosureStatus;
  reasonKey: TradeClosureReasonKey;
  amount: number;
}

function percentThreshold(capital: number, percent?: number | null) {
  return percent == null ? null : capital * (percent / 100);
}

export function evaluateTradeClosure(
  account: KriyoComptePropRecord,
  profile: KriyoProfilRisqueRecord,
  pnl: number
): TradeClosureOutcome {
  const takeProfitTarget = percentThreshold(account.capital, profile.plafondTP);
  const dailyDrawdown = percentThreshold(account.capital, profile.dailyDD);
  const maxDrawdown = percentThreshold(account.capital, profile.maxDD);

  if (takeProfitTarget != null && pnl >= takeProfitTarget) {
    return {
      status: 'VERROUILLE',
      reasonKey: 'takeProfitForced',
      amount: takeProfitTarget
    };
  }

  if (dailyDrawdown != null && pnl <= -dailyDrawdown) {
    return {
      status: 'VERROUILLE',
      reasonKey: 'dailyDrawdown',
      amount: dailyDrawdown
    };
  }

  if (maxDrawdown != null && pnl <= -maxDrawdown) {
    return {
      status: 'VERROUILLE',
      reasonKey: 'maxDrawdown',
      amount: maxDrawdown
    };
  }

  return {
    status: 'CLOTURE',
    reasonKey: 'logged',
    amount: pnl
  };
}
