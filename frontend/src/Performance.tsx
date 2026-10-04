import { useEffect, useMemo, useState } from 'react';
import { api, type TradingAccount } from './api/client';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';
import { interpolate } from './i18n/translations';

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
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Answers>(defaultAnswers);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [groupIndex, setGroupIndex] = useState(0);

  const vr = useMemo(() => groupScore(answers, 'VR'), [answers]);
  const ep = useMemo(() => groupScore(answers, 'EP'), [answers]);
  const vp = useMemo(() => groupScore(answers, 'VP'), [answers]);
  const total = vr + ep + vp;
  const canExecute = total === 9 && selectedIds.length > 0;

  useEffect(() => {
    api.performance
      .accounts()
      .then((data) => {
        setAccounts(data);
        setStatus('ready');
        setMessage(data.length > 0 ? '' : dict.performance.noAccountsMsg);
      })
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAccount(id: number) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function updateAnswer(id: QuestionId, value: boolean) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  async function executeTrade() {
    if (!canExecute || status === 'saving') return;
    setStatus('saving');
    setMessage(dict.performance.executingButton);
    try {
      await api.performance.executeTrade(selectedIds, vr, ep, vp);
      setAnswers(defaultAnswers);
      setGroupIndex(0);
      setStatus('ready');
      setMessage(dict.performance.executedMsg);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : dict.performance.errorMsg);
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
        {accounts.length === 0 ? (
          <p className="kriyo-dim">{dict.performance.noAccounts}</p>
        ) : (
          accounts.map((account) => {
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
        )}
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

      <button className="kriyo-btn kriyo-btn--primary" disabled={!canExecute || status === 'saving'} onClick={executeTrade}>
        {status === 'saving' ? dict.performance.executingButton : canExecute ? dict.performance.executeButton : dict.performance.incompleteButton}
      </button>
      {message ? <p className={status === 'error' ? 'kriyo-error' : 'kriyo-dim'}>{message}</p> : null}

      <button className="kriyo-btn kriyo-btn--secondary" onClick={onBack}>
        {dict.common.back}
      </button>
    </AppShell>
  );
}
