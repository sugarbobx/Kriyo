import { useEffect, useMemo, useState } from 'react';
import { api, type TradingAccount } from './api/client';
import AppShell from './AppShell';

const questions = [
  { id: 'vr-structure', group: 'VR', label: 'Structure validée ?', description: 'La structure de marché est claire et validée.' },
  { id: 'vr-liquidity', group: 'VR', label: 'Liquidité prise ?', description: 'Le setup cible une zone de liquidité identifiable.' },
  { id: 'vr-trend', group: 'VR', label: 'Tendance alignée ?', description: 'Le trade suit la tendance dominante.' },
  { id: 'ep-fomo', group: 'EP', label: 'Zéro FOMO ?', description: "La décision n'est pas dictée par l'urgence." },
  { id: 'ep-crowd', group: 'EP', label: 'Biais de foule identifié ?', description: "L'analyse n'est pas copiée du consensus." },
  { id: 'ep-loss', group: 'EP', label: 'Perte acceptée ?', description: 'La perte éventuelle est mentalement acceptée.' },
  { id: 'vp-rr', group: 'VP', label: 'Ratio R/R >= 2 ?', description: 'Le ratio risque/récompense est suffisant.' },
  { id: 'vp-invalid', group: 'VP', label: 'Invalidation claire ?', description: 'Le stop est défini techniquement.' },
  { id: 'vp-a', group: 'VP', label: 'Setup A ou A+ ?', description: "Le setup respecte la classe d'excellence." }
] as const;

type QuestionId = (typeof questions)[number]['id'];
type Answers = Record<QuestionId, boolean>;

const defaultAnswers: Answers = Object.fromEntries(questions.map((q) => [q.id, false])) as Answers;

function groupScore(answers: Answers, group: 'VR' | 'EP' | 'VP') {
  return questions.filter((q) => q.group === group && answers[q.id]).length;
}

export default function Performance({ onOpenAccounts, onBack }: { onOpenAccounts: () => void; onBack: () => void }) {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Answers>(defaultAnswers);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [message, setMessage] = useState('');

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
        setSelectedIds(data.map((a) => a.id));
        setStatus('ready');
        setMessage(data.length > 0 ? '' : 'Ajoute d’abord un compte dans Comptes & Onboarding.');
      })
      .catch(() => setStatus('error'));
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
    setMessage('Exécution...');
    try {
      await api.performance.executeTrade(selectedIds, vr, ep, vp);
      setAnswers(defaultAnswers);
      setStatus('ready');
      setMessage('Trade approuvé et enregistré. Va sur le suivi pour le voir (bientôt disponible).');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : "Impossible d'exécuter le trade.");
    }
  }

  return (
    <AppShell title="Score de Performance" subtitle="Confluence 9/9, sélection des comptes et score temps réel.">
      <div className="kriyo-stack">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="kriyo-dim" style={{ margin: 0 }}>
            Comptes actifs
          </p>
          <button className="kriyo-btn kriyo-btn--secondary" onClick={onOpenAccounts}>
            Gérer les comptes
          </button>
        </div>
        {accounts.length === 0 ? (
          <p className="kriyo-dim">Aucun compte disponible. Ajoute-en un pour continuer.</p>
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
                  {selected ? 'Sélectionné' : 'Activer'}
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
          VR {vr}/3 · EP {ep}/3 · VP {vp}/3 · Total {total}/9
        </p>
      </div>

      {(['VR', 'EP', 'VP'] as const).map((group) => (
        <div key={group} className="kriyo-stack">
          <p className="kriyo-palier-eyebrow">{group}</p>
          {questions
            .filter((q) => q.group === group)
            .map((question) => {
              const checked = answers[question.id];
              return (
                <div key={question.id} className="kriyo-palier">
                  <p className="kriyo-palier-title">{question.label}</p>
                  <p className="kriyo-palier-note">{question.description}</p>
                  <div className="kriyo-btn-row" style={{ marginTop: '0.6rem' }}>
                    <button
                      type="button"
                      className="kriyo-btn kriyo-btn--secondary"
                      data-active={!checked}
                      onClick={() => updateAnswer(question.id, false)}
                    >
                      Non
                    </button>
                    <button
                      type="button"
                      className="kriyo-btn kriyo-btn--secondary"
                      data-active={checked}
                      onClick={() => updateAnswer(question.id, true)}
                    >
                      Oui
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      ))}

      <button className="kriyo-btn kriyo-btn--primary" disabled={!canExecute || status === 'saving'} onClick={executeTrade}>
        {status === 'saving' ? 'Exécution...' : canExecute ? 'Exécuter le Trade' : 'Score incomplet'}
      </button>
      {message ? <p className={status === 'error' ? 'kriyo-error' : 'kriyo-dim'}>{message}</p> : null}

      <button className="kriyo-btn kriyo-btn--secondary" onClick={onBack}>
        Retour au dashboard
      </button>
    </AppShell>
  );
}
