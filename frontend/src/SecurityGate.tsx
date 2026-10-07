import { useEffect, useState } from 'react';
import { api, type CriterionState, type GateQuestion, type GateReviewItem, type GateState, type MessageTier, type WeakestCriterion } from './api/client';
import { formatCountdown } from './time';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';
import { interpolate } from './i18n/translations';

type Screen = 'loading' | 'locked' | 'list' | 'quiz' | 'result' | 'review';
type CriterionKey = 'tension' | 'screen_time' | 'phone' | 'macro' | 'alignment';

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

function CriterionIcon({ criterionKey }: { criterionKey: CriterionKey }) {
  switch (criterionKey) {
    case 'tension':
      return (
        <svg {...ICON_PROPS}>
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
        </svg>
      );
    case 'screen_time':
      return (
        <svg {...ICON_PROPS}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...ICON_PROPS}>
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <path d="M11 18h2" />
        </svg>
      );
    case 'macro':
      return (
        <svg {...ICON_PROPS}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      );
    case 'alignment':
      return (
        <svg {...ICON_PROPS}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

interface ResultData {
  tier: MessageTier;
  overallScore: number;
  streak?: number;
  weakestCriterion?: WeakestCriterion | null;
}

export default function SecurityGate({ onDone }: { onDone: () => void }) {
  const { dict } = useLanguage();
  const [screen, setScreen] = useState<Screen>('loading');
  const [criteria, setCriteria] = useState<CriterionState[]>([]);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [activeCriterion, setActiveCriterion] = useState<CriterionKey | null>(null);
  const [questions, setQuestions] = useState<GateQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewItems, setReviewItems] = useState<GateReviewItem[]>([]);

  function applyState(state: GateState) {
    setCriteria(state.criteria);
    if (state.status === 'locked') {
      setLockedUntil(state.locked_until);
      setScreen('locked');
    } else if (state.status === 'passed_today') {
      onDone();
    } else {
      setScreen('list');
    }
  }

  useEffect(() => {
    api.gate.current().then(applyState).catch(() => setError('Error loading the Security Gate.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (screen !== 'locked' || !lockedUntil) {
      setRemainingMs(null);
      return;
    }

    function tick() {
      const remaining = new Date(lockedUntil as string).getTime() - Date.now();
      if (remaining <= 0) {
        api.gate.current().then(applyState);
        return;
      }
      setRemainingMs(remaining);
    }

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, lockedUntil]);

  async function openCriterion(key: CriterionKey) {
    setError('');
    try {
      const qs = await api.gate.questions(key);
      setQuestions(qs);
      setQuestionIndex(0);
      setActiveCriterion(key);
      setScreen('quiz');
    } catch {
      setError('Error loading the questions.');
    }
  }

  async function openReview(key: CriterionKey) {
    setError('');
    try {
      const items = await api.gate.review(key);
      setReviewItems(items);
      setActiveCriterion(key);
      setScreen('review');
    } catch {
      setError('Error loading the review.');
    }
  }

  async function answer(value: boolean) {
    if (!activeCriterion || submitting) return;
    const question = questions[questionIndex];
    if (!question) return;

    setSubmitting(true);
    try {
      const response = await api.gate.answer(activeCriterion, question.id, value);

      if (!response.criterion_complete) {
        setQuestionIndex((i) => Math.min(i + 1, questions.length - 1));
        return;
      }

      if (response.gate_complete && response.gate_result) {
        setResult({
          tier: response.gate_result.message_tier,
          overallScore: response.gate_result.overall_score,
          streak: response.gate_result.streak,
          weakestCriterion: response.gate_result.weakest_criterion,
        });
        setScreen('result');
        return;
      }

      const state = await api.gate.current();
      applyState(state);
    } catch {
      setError('Error saving the answer.');
    } finally {
      setSubmitting(false);
    }
  }

  if (screen === 'loading') {
    return (
      <AppShell title={dict.gate.title}>
        <p className="kriyo-dim">{dict.common.loading}</p>
      </AppShell>
    );
  }

  if (screen === 'locked') {
    const copy = dict.gate.messages.locked;
    return (
      <AppShell title={dict.gate.title} subtitle={dict.gate.lockedTitle}>
        <span className="kriyo-badge">{dict.gate.lockedBadge}</span>
        {remainingMs != null ? <p className="kriyo-countdown">{formatCountdown(remainingMs)}</p> : null}
        <p className="kriyo-dim">{copy.body}</p>
        <button className="kriyo-btn kriyo-btn--secondary" onClick={onDone}>
          {dict.common.back}
        </button>
      </AppShell>
    );
  }

  if (screen === 'result' && result) {
    const copy = dict.gate.messages[result.tier];
    return (
      <AppShell title={dict.gate.title} subtitle={`${Math.round(result.overallScore * 100)}%`}>
        <div className="kriyo-result-card" data-tier={result.tier}>
          <p className="kriyo-result-title">{copy.title}</p>
          <p className="kriyo-result-body">{copy.body}</p>
        </div>
        {result.streak != null && result.streak > 0 ? (
          <div className="kriyo-palier" style={{ borderColor: 'rgba(232,163,61,0.35)' }}>
            <p className="kriyo-palier-eyebrow" style={{ color: 'var(--kriyo-amber)' }}>{dict.gate.streakResultLabel}</p>
            <p className="kriyo-palier-title">🔥 {interpolate(dict.dashboard.streakDays, { n: String(result.streak) })}</p>
          </div>
        ) : null}
        {result.weakestCriterion ? (
          <div className="kriyo-palier">
            <p className="kriyo-palier-eyebrow">{dict.gate.weakestCriterionLabel}</p>
            <p className="kriyo-palier-title">
              {dict.gate.categories[result.weakestCriterion.key as CriterionKey] ?? result.weakestCriterion.label}
            </p>
            <p className="kriyo-palier-note">{Math.round(result.weakestCriterion.avg_score * 100)}%</p>
          </div>
        ) : null}
        <button className="kriyo-btn kriyo-btn--primary" onClick={onDone}>
          {dict.gate.continueLabel}
        </button>
      </AppShell>
    );
  }

  if (screen === 'quiz' && activeCriterion) {
    const question = questions[questionIndex];
    const questionText = question ? dict.gate.questions[activeCriterion][question.order - 1] : '';
    return (
      <AppShell title={dict.gate.categories[activeCriterion]} subtitle={`${questionIndex + 1} / 6`}>
        <div className="kriyo-progress-track">
          <div className="kriyo-progress-fill" style={{ width: `${((questionIndex + 1) / 6) * 100}%` }} />
        </div>
        {question ? (
          <>
            <p className="kriyo-quiz-question">{questionText}</p>
            <div className="kriyo-btn-row">
              <button className="kriyo-btn kriyo-btn--secondary" onClick={() => answer(false)} disabled={submitting}>
                {dict.common.no}
              </button>
              <button className="kriyo-btn kriyo-btn--primary" onClick={() => answer(true)} disabled={submitting}>
                {dict.common.yes}
              </button>
            </div>
          </>
        ) : null}
        {error ? <p className="kriyo-error">{error}</p> : null}
      </AppShell>
    );
  }

  if (screen === 'review' && activeCriterion) {
    return (
      <AppShell title={dict.gate.reviewTitle} subtitle={dict.gate.reviewSubtitle}>
        <div className="kriyo-stack">
          {reviewItems.map((item) => (
            <div key={item.id} className="kriyo-palier">
              <p className="kriyo-palier-title">{dict.gate.questions[activeCriterion][item.order - 1]}</p>
              <p className="kriyo-palier-note">{item.answer ? dict.common.yes : dict.common.no}</p>
            </div>
          ))}
        </div>
        {error ? <p className="kriyo-error">{error}</p> : null}
        <button className="kriyo-btn kriyo-btn--secondary" onClick={() => setScreen('list')}>
          {dict.common.back}
        </button>
      </AppShell>
    );
  }

  const validatedCount = criteria.filter((c) => c.validated).length;
  const psychCriteria = criteria.filter((c) => c.category === 'psych');
  const techCriteria = criteria.filter((c) => c.category === 'tech');

  function renderCriterionRow(criterion: CriterionState) {
    const key = criterion.key as CriterionKey;
    const state = !criterion.attempted ? 'pending' : criterion.validated ? 'validated' : 'invalidated';
    return (
      <button
        key={criterion.key}
        type="button"
        className="kriyo-criterion-row"
        data-state={state}
        onClick={() => (criterion.attempted ? openReview(key) : openCriterion(key))}
      >
        <span className="kriyo-icon-chip">
          <CriterionIcon criterionKey={key} />
        </span>
        <p className="kriyo-palier-title" style={{ margin: 0, flex: 1 }}>
          {dict.gate.categories[key]}
        </p>
        <span
          className={`kriyo-badge ${state === 'validated' ? 'kriyo-badge--success' : ''}`}
          style={state === 'invalidated' ? { borderColor: 'rgba(229,72,77,0.3)', background: 'rgba(229,72,77,0.1)', color: 'var(--kriyo-danger)' } : undefined}
        >
          {state === 'pending' ? dict.gate.todo : `${Math.round((criterion.score ?? 0) * 100)}%`}
        </span>
      </button>
    );
  }

  return (
    <AppShell title={dict.gate.title} subtitle={dict.gate.listSubtitle}>
      <div className="kriyo-overall">
        <span className="kriyo-overall-count">{interpolate(dict.gate.progressLabel, { count: String(validatedCount) })}</span>
        <div className="kriyo-progress-track">
          <div className="kriyo-progress-fill" style={{ width: `${(validatedCount / 5) * 100}%` }} />
        </div>
      </div>

      <p className="kriyo-section-head">{dict.gate.psych}</p>
      <div className="kriyo-stack">{psychCriteria.map(renderCriterionRow)}</div>

      <p className="kriyo-section-head">{dict.gate.tech}</p>
      <div className="kriyo-stack">{techCriteria.map(renderCriterionRow)}</div>

      {error ? <p className="kriyo-error">{error}</p> : null}
    </AppShell>
  );
}
