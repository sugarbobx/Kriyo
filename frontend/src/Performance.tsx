import { useMemo, useState } from 'react';
import { api } from './api/client';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';
import { interpolate } from './i18n/translations';
import { useAsyncResource } from './hooks/useAsyncResource';

const questionIds = [
  'vr-structure', 'vr-liquidity', 'vr-trend',
  'ep-fomo', 'ep-crowd', 'ep-loss',
  'vp-rr', 'vp-invalid', 'vp-a'
] as const;

type QuestionId = (typeof questionIds)[number];
type Answers = Record<QuestionId, boolean>;

const questionGroup: Record<QuestionId, 'VR' | 'EP' | 'VP'> = {
  'vr-structure': 'VR', 'vr-liquidity': 'VR', 'vr-trend': 'VR',
  'ep-fomo': 'EP', 'ep-crowd': 'EP', 'ep-loss': 'EP',
  'vp-rr': 'VP', 'vp-invalid': 'VP', 'vp-a': 'VP'
};

const defaultAnswers: Answers = Object.fromEntries(questionIds.map((id) => [id, false])) as Answers;

function groupScore(answers: Answers, group: 'VR' | 'EP' | 'VP') {
  return questionIds.filter((id) => questionGroup[id] === group && answers[id]).length;
}

const groups = ['VR', 'EP', 'VP'] as const;

export default function Performance({ onOpenAccounts, onBack }: { onOpenAccounts: () => void; onBack: () => void }) {
  const { dict } = useLanguage();
  const { data: accounts, status: loadStatus, error: loadError, reload } = useAsyncResource(
    () => api.performance.accounts(),
    []
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Answers>(defaultAnswers);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);

  const vr = useMemo(() => groupScore(answers, 'VR'), [answers]);
  const ep = useMemo(() => groupScore(answers, 'EP'), [answers]);
  const vp = useMemo(() => groupScore(answers, 'VP'), [answers]);
  const total = vr + ep + vp;
  const canExecute = total === 9 && selectedIds.length > 0;

  function toggleAccount(id: number) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function updateAnswer(id: QuestionId, value: boolean) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  async function executeTrade() {
    if (!canExecute || saving) return;
    setSaving(true);
    setMessage(dict.performance.executingButton);
    setMessageIsError(false);
    try {
      await api.performance.executeTrade(selectedIds, vr, ep, vp);
      setAnswers(defaultAnswers);
      setGroupIndex(0);
      setMessage(dict.performance.executedMsg);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : dict.performance.errorMsg);
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title={dict.performance.title} subtitle={dict.performance.subtitle}>
      <div className="kriyo-stack">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="kriyo-dim" style={{ margin: 0 }}>
            {dict.performance.activeAccounts}
          </p>
          <button className="kriyo-btn kriyo-btn--secondary" onClick={onOpenAccounts}>
            {dict.performance.manageAccounts}
          </button>
        </div>
        {loadStatus === 'loading' ? <p className="kriyo-dim">{dict.common.loading}</p> : null}
        {loadStatus === 'error' ? (
          <div className="kriyo-stack">
            <p className="kriyo-error">{loadError}</p>
            <button className="kriyo-btn kriyo-btn--secondary" onClick={reload}>
              {dict.common.retry}
            </button>
          </div>
        ) : null}
        {loadStatus === 'ready' && accounts && accounts.length === 0 ? (
          <p className="kriyo-dim">{dict.performance.noAccounts}</p>
        ) : null}
        {loadStatus === 'ready' && accounts
          ? accounts.map((account) => {
              const selected = selectedIds.includes(account.id);
              return (
                <button
                  key={account.id}
                  type="button"
                  className="kriyo-criterion-row"
                  data-state={selected ? 'validated' : undefined}
                  onClick={() => toggleAccount(account.id)}
                >
                  <p style={{ margin: 0 }}>{account.name}</p>
                  <span className={`kriyo-badge ${selected ? 'kriyo-badge--success' : ''}`}>
                    {selected ? dict.performance.selected : dict.performance.activate}
                  </span>
                </button>
              );
            })
          : null}
      </div>

      <div>
        <div className="kriyo-progress-track">
          <div className="kriyo-progress-fill" style={{ width: `${(total / 9) * 100}%` }} />
        </div>
        <p className="kriyo-dim" style={{ marginTop: '0.5rem' }}>
          VR {vr}/3 · EP {ep}/3 · VP {vp}/3 · {total}/9
        </p>
      </div>

      {(() => {
        const group = groups[groupIndex];
        return (
          <div className="kriyo-stack">
            <p className="kriyo-palier-eyebrow">{dict.performance.groupLabels[group]}</p>
            {questionIds
              .filter((id) => questionGroup[id] === group)
              .map((id) => {
                const checked = answers[id];
                const question = dict.performance.questions[id];
                return (
                  <div key={id} className="kriyo-palier">
                    <p className="kriyo-palier-title">{question.label}</p>
                    <p className="kriyo-palier-note">{question.description}</p>
                    <div className="kriyo-btn-row" style={{ marginTop: '0.6rem' }}>
                      <button
                        type="button"
                        className="kriyo-btn kriyo-btn--secondary"
                        data-active={!checked}
                        onClick={() => updateAnswer(id, false)}
                      >
                        {dict.common.no}
                      </button>
                      <button
                        type="button"
                        className="kriyo-btn kriyo-btn--secondary"
                        data-active={checked}
                        onClick={() => updateAnswer(id, true)}
                      >
                        {dict.common.yes}
                      </button>
                    </div>
                  </div>
                );
              })}
            <div className="kriyo-btn-row">
              <button
                type="button"
                className="kriyo-btn kriyo-btn--secondary"
                disabled={groupIndex === 0}
                onClick={() => setGroupIndex((i) => Math.max(0, i - 1))}
              >
                {dict.performance.previousSection}
              </button>
              <button
                type="button"
                className="kriyo-btn kriyo-btn--secondary"
                disabled={groupIndex === groups.length - 1}
                onClick={() => setGroupIndex((i) => Math.min(groups.length - 1, i + 1))}
              >
                {dict.performance.nextSection}
              </button>
            </div>
            <p className="kriyo-dim">{interpolate(dict.performance.sectionProgress, { current: String(groupIndex + 1), total: String(groups.length) })}</p>
          </div>
        );
      })()}

      <button className="kriyo-btn kriyo-btn--primary" disabled={!canExecute || saving} onClick={executeTrade}>
        {saving ? dict.performance.executingButton : canExecute ? dict.performance.executeButton : dict.performance.incompleteButton}
      </button>
      {message ? <p className={messageIsError ? 'kriyo-error' : 'kriyo-dim'}>{message}</p> : null}

      <button className="kriyo-btn kriyo-btn--secondary" onClick={onBack}>
        {dict.common.back}
      </button>
    </AppShell>
  );
}
