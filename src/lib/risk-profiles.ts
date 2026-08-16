export type PayoutType = 'ON_DEMAND' | 'DEUX_SEMAINES' | 'UN_MOIS';
export type RiskProfileType = 'AGRESSIF' | 'MODERE' | 'CONSERVATEUR';

export interface RiskProfilePreset {
  id: string;
  type: RiskProfileType;
  label: string;
  dailyDD?: number | null;
  maxDD?: number | null;
  plafondTP?: number | null;
  note: string;
}

export const PAYOUT_OPTIONS: Array<{ value: PayoutType; label: string; note: string }> = [
  { value: 'ON_DEMAND', label: 'On-Demand', note: 'Extraction immédiate' },
  { value: 'DEUX_SEMAINES', label: '2 Semaines', note: 'Challenge avec DD journalier' },
  { value: 'UN_MOIS', label: '1 Mois', note: 'Capitalisation et DD global' }
];

export const RISK_PROFILE_PRESETS: Record<RiskProfileType, RiskProfilePreset> = {
  AGRESSIF: {
    id: 'profil-agressif',
    type: 'AGRESSIF',
    label: 'Agressif',
    plafondTP: 40,
    note: 'Take Profit forcé à 40% de l’objectif'
  },
  MODERE: {
    id: 'profil-modere',
    type: 'MODERE',
    label: 'Modéré',
    dailyDD: 5,
    maxDD: 10,
    note: 'Suivi du Daily DD'
  },
  CONSERVATEUR: {
    id: 'profil-conservateur',
    type: 'CONSERVATEUR',
    label: 'Conservateur',
    dailyDD: 4,
    maxDD: 8,
    note: 'Suivi du Max DD'
  }
};

export const PayoutToRiskProfile: Record<PayoutType, RiskProfileType> = {
  ON_DEMAND: 'AGRESSIF',
  DEUX_SEMAINES: 'MODERE',
  UN_MOIS: 'CONSERVATEUR'
};

export function getRiskProfilePresetForPayout(payout: PayoutType) {
  return RISK_PROFILE_PRESETS[PayoutToRiskProfile[payout]];
}
