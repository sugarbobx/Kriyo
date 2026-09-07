export interface User {
  id: number;
  email: string;
  timezone: string;
  date_joined: string;
}

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) headers.set('X-CSRFToken', csrfToken);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include'
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (data && typeof data === 'object' && 'detail' in data) {
      throw new Error(String(data.detail));
    }
    if (data && typeof data === 'object') {
      throw new ApiValidationError(data as Record<string, string[]>);
    }
    throw new Error(response.statusText);
  }

  return data as T;
}

export class ApiValidationError extends Error {
  fieldErrors: Record<string, string[]>;

  constructor(fieldErrors: Record<string, string[]>) {
    super(Object.values(fieldErrors).flat().join(' '));
    this.fieldErrors = fieldErrors;
  }
}

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export type GateStatus = 'in_progress' | 'passed_today' | 'locked';
export type MessageTier = 'locked' | 'pass_tight' | 'pass_good' | 'pass_excellent';

export interface CriterionState {
  key: string;
  label: string;
  category: 'psych' | 'tech';
  attempted: boolean;
  validated: boolean | null;
  score: number | null;
}

export interface GateState {
  status: GateStatus;
  locked_until: string | null;
  overall_score: number | null;
  message_tier: MessageTier | null;
  criteria: CriterionState[];
}

export interface GateQuestion {
  id: number;
  order: number;
  text: string;
}

export interface AnswerResult {
  criterion_complete: boolean;
  criterion?: { key: string; label: string; score: number; validated: boolean };
  gate_complete: boolean;
  gate_result?: {
    status: 'passed' | 'locked';
    overall_score: number;
    message_tier: MessageTier;
    locked_until?: string;
  } | null;
}

export type PayoutType = 'ON_DEMAND' | 'DEUX_SEMAINES' | 'UN_MOIS';
export type RiskProfileType = 'AGRESSIF' | 'MODERE' | 'CONSERVATEUR';

export interface RiskProfile {
  type: RiskProfileType;
  label: string;
  daily_dd: number | null;
  max_dd: number | null;
  plafond_tp: number | null;
  note: string;
}

export interface TradingAccount {
  id: number;
  name: string;
  capital: number;
  payout_type: PayoutType;
  risk_profile: RiskProfile;
  created_at: string;
}

export interface Trade {
  id: number;
  account: number;
  score_vr: number;
  score_ep: number;
  score_vp: number;
  score_total: number;
  risk_reward: number | null;
  pnl: number | null;
  status: 'EN_COURS' | 'CLOTURE' | 'VERROUILLE';
  opened_at: string;
  closed_at: string | null;
}

export type TradeReasonKey = 'take_profit_forced' | 'daily_drawdown' | 'max_drawdown' | 'logged';

export interface TradeOutcome {
  status: 'CLOTURE' | 'VERROUILLE';
  reason_key: TradeReasonKey;
  amount: number;
}

export const api = {
  health: () => request<{ status: string }>('/health/'),
  csrf: () => request<void>('/auth/csrf/'),
  signup: (email: string, password: string) =>
    request<User>('/auth/signup/', {
      method: 'POST',
      body: JSON.stringify({ email, password, timezone: detectTimezone() })
    }),
  login: (email: string, password: string) =>
    request<User>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password, timezone: detectTimezone() })
    }),
  logout: () => request<void>('/auth/logout/', { method: 'POST' }),
  me: () => request<User>('/auth/me/'),
  acceptEngagement: () => request<{ accepted_at: string }>('/engagement/accept/', { method: 'POST' }),
  gate: {
    current: () => request<GateState>('/gate/current/'),
    questions: (criterionKey: string) => request<GateQuestion[]>(`/gate/criteria/${criterionKey}/questions/`),
    answer: (criterionKey: string, questionId: number, answer: boolean) =>
      request<AnswerResult>(`/gate/criteria/${criterionKey}/answers/`, {
        method: 'POST',
        body: JSON.stringify({ question_id: questionId, answer })
      })
  },
  performance: {
    riskProfiles: () => request<RiskProfile[]>('/performance/risk-profiles/'),
    accounts: () => request<TradingAccount[]>('/performance/accounts/'),
    createAccount: (name: string, capital: number, payoutType: PayoutType) =>
      request<TradingAccount>('/performance/accounts/', {
        method: 'POST',
        body: JSON.stringify({ name, capital, payout_type: payoutType })
      }),
    trades: () => request<Trade[]>('/performance/trades/'),
    executeTrade: (accountIds: number[], scoreVr: number, scoreEp: number, scoreVp: number) =>
      request<Trade[]>('/performance/trades/', {
        method: 'POST',
        body: JSON.stringify({ account_ids: accountIds, score_vr: scoreVr, score_ep: scoreEp, score_vp: scoreVp })
      })
  },
  tracking: {
    closeTrade: (tradeId: number, pnl: number) =>
      request<{ trade: Trade; outcome: TradeOutcome }>(`/tracking/trades/${tradeId}/close/`, {
        method: 'POST',
        body: JSON.stringify({ pnl })
      })
  }
};
