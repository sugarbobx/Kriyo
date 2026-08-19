import type { KriyoComptePropRecord, KriyoProfilRisqueRecord } from '@/lib/db';

export type TradeClosureStatus = 'CLOTURE' | 'VERROUILLE';

export interface TradeClosureOutcome {
  status: TradeClosureStatus;
  label: string;
  reason: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
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
      label: 'Take Profit force',
      reason: `Take Profit force atteint a ${formatCurrency(takeProfitTarget)}.`
    };
  }

  if (dailyDrawdown != null && pnl <= -dailyDrawdown) {
    return {
      status: 'VERROUILLE',
      label: 'Stop-Day actif',
      reason: `Daily DD atteint a ${formatCurrency(dailyDrawdown)}.`
    };
  }

  if (maxDrawdown != null && pnl <= -maxDrawdown) {
    return {
      status: 'VERROUILLE',
      label: 'Max DD atteint',
      reason: `Max DD atteint a ${formatCurrency(maxDrawdown)}.`
    };
  }

  return {
    status: 'CLOTURE',
    label: 'Resultat journalise',
    reason: `PnL journalise: ${formatCurrency(pnl)}.`
  };
}
