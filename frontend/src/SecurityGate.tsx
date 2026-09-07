import { useEffect, useState } from 'react';
import { api, type CriterionState, type GateQuestion, type GateState, type MessageTier } from './api/client';
import { formatCountdown } from './time';
import AppShell from './AppShell';

const MESSAGE_COPY: Record<MessageTier, { title: string; body: string }> = {
  locked: {
    title: 'Not cleared for this session.',
    body: "Your current state isn't where it needs to be to trade well right now — and that's the whole point of this gate. It's not here to punish you, it's here to catch you before the market does. Step away for 30 minutes. Breathe, reset, come back when your head is clearer. The trade will still be there."
  },
  pass_tight: {
    title: 'Cleared, but margins are tight.',
    body: "You're through, but a few areas were shakier than they should be. Trade smaller than usual today, and don't force anything. Watch the criteria that came in weak — they're telling you something."
  },
  pass_good: {
    title: "You're in the right mindset.",
    body: 'Keep your head up, stay focused, and make sure you are aligning with the market and your structure before opening trades.'
  },
  pass_excellent: {
    title: 'Fully aligned.',
    body: 'Mind clear, discipline high, no red flags anywhere. This is the state you want to trade from every time — not just today. Go execute your plan.'
  }
};

type Screen = 'loading' | 'locked' | 'list' | 'quiz' | 'result';

interface ResultData {
  tier: MessageTier;
  overallScore: number;
}

export default function SecurityGate({ onDone }: { onDone: () => void }) {
  const [screen, setScreen] = useState<Screen>('loading');
  const [criteria, setCriteria] = useState<CriterionState[]>([]);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [activeCriterion, setActiveCriterion] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GateQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState('');

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
    api.gate.current().then(applyState).catch(() => setError('Impossible de charger le Security Gate.'));
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

  async function openCriterion(key: string) {
    setError('');
    try {
      const qs = await api.gate.questions(key);
      setQuestions(qs);
      setQuestionIndex(0);
      setActiveCriterion(key);
      setScreen('quiz');
    } catch {
      setError('Impossible de charger les questions.');
    }
  }

  async function answer(value: boolean) {
    if (!activeCriterion) return;
    const question = questions[questionIndex];
    try {
      const response = await api.gate.answer(activeCriterion, question.id, value);

      if (!response.criterion_complete) {
        setQuestionIndex((i) => i + 1);
        return;
      }

      if (response.gate_complete && response.gate_result) {
        setResult({ tier: response.gate_result.message_tier, overallScore: response.gate_result.overall_score });
        setScreen('result');
        return;
      }

      const state = await api.gate.current();
      applyState(state);
    } catch {
      setError("Impossible d'enregistrer la réponse.");
    }
  }

  if (screen === 'loading') {
    return (
      <AppShell title="Security Gate">
        <p className="kriyo-dim">Chargement...</p>
      </AppShell>
    );
  }

  if (screen === 'locked') {
    return (
      <AppShell title="Security Gate" subtitle="Session bloquée">
        <span className="kriyo-badge">Verrouillé</span>
        {remainingMs != null ? <p className="kriyo-countdown">{formatCountdown(remainingMs)}</p> : null}
        <p className="kriyo-dim">{MESSAGE_COPY.locked.body}</p>
        <button className="kriyo-btn kriyo-btn--secondary" onClick={onDone}>
          Retour au dashboard
        </button>
      </AppShell>
    );
  }

  if (screen === 'result' && result) {
    const copy = MESSAGE_COPY[result.tier];
    return (
      <AppShell title="Security Gate" subtitle={`Score global: ${Math.round(result.overallScore * 100)}%`}>
        <div className="kriyo-result-card" data-tier={result.tier}>
          <p className="kriyo-result-title">{copy.title}</p>
          <p className="kriyo-result-body">{copy.body}</p>
        </div>
        <button className="kriyo-btn kriyo-btn--primary" onClick={onDone}>
          Continuer
        </button>
      </AppShell>
    );
  }

  if (screen === 'quiz') {
    const question = questions[questionIndex];
    return (
      <AppShell title={criteria.find((c) => c.key === activeCriterion)?.label ?? ''} subtitle={`Question ${questionIndex + 1} / 6`}>
        <div className="kriyo-progress-track">
          <div className="kriyo-progress-fill" style={{ width: `${((questionIndex + 1) / 6) * 100}%` }} />
        </div>
        {question ? (
          <>
            <p className="kriyo-quiz-question">{question.text}</p>
            <div className="kriyo-btn-row">
              <button className="kriyo-btn kriyo-btn--secondary" onClick={() => answer(false)}>
                No
              </button>
              <button className="kriyo-btn kriyo-btn--primary" onClick={() => answer(true)}>
                Yes
              </button>
            </div>
          </>
        ) : null}
        {error ? <p className="kriyo-error">{error}</p> : null}
      </AppShell>
    );
  }

  return (
    <AppShell title="Security Gate" subtitle="Complète les 5 critères pour accéder au dashboard.">
      <div className="kriyo-stack">
        {criteria.map((criterion) => {
          const state = !criterion.attempted ? 'pending' : criterion.validated ? 'validated' : 'invalidated';
          return (
            <button
              key={criterion.key}
              type="button"
              className="kriyo-criterion-row"
              data-state={state}
              onClick={() => openCriterion(criterion.key)}
            >
              <div>
                <p className="kriyo-palier-title" style={{ margin: 0 }}>
                  {criterion.label}
                </p>
                <p className="kriyo-dim" style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  {criterion.category === 'psych' ? 'Psych' : 'Tech'}
                </p>
              </div>
              <span
                className={`kriyo-badge ${state === 'validated' ? 'kriyo-badge--success' : ''}`}
                style={state === 'invalidated' ? { borderColor: 'rgba(229,72,77,0.3)', background: 'rgba(229,72,77,0.1)', color: 'var(--kriyo-danger)' } : undefined}
              >
                {state === 'pending' ? 'À faire' : `${Math.round((criterion.score ?? 0) * 100)}%`}
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="kriyo-error">{error}</p> : null}
    </AppShell>
  );
}
