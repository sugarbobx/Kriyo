"use client";

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getActiveUserId } from '@/lib/auth/client-user';
import { getKriyoDb, type KriyoComptePropRecord, type KriyoEngineDraftRecord, type KriyoTradeRecord } from '@/lib/db';
import { enqueueMutation } from '@/lib/sync/queue';
import { syncQueuedMutations } from '@/lib/sync/client';
import { APP_BASE_PATH } from '@/lib/app-config';

const questions = [
  { id: 'vr-structure', group: 'VR', label: 'Structure validée ?', description: 'La structure de marché est claire et validée.' },
  { id: 'vr-liquidity', group: 'VR', label: 'Liquidité prise ?', description: 'Le setup cible une zone de liquidité identifiable.' },
  { id: 'vr-trend', group: 'VR', label: 'Tendance alignée ?', description: 'Le trade suit la tendance dominante.' },
  { id: 'ep-fomo', group: 'EP', label: 'Zéro FOMO ?', description: 'La décision n’est pas dictée par l’urgence.' },
  { id: 'ep-crowd', group: 'EP', label: 'Biais de foule identifié ?', description: 'L’analyse n’est pas copiée du consensus.' },
  { id: 'ep-loss', group: 'EP', label: 'Perte acceptée ?', description: 'La perte éventuelle est mentalement acceptée.' },
  { id: 'vp-rr', group: 'VP', label: 'Ratio R/R >= 2 ?', description: 'Le ratio risque/récompense est suffisant.' },
  { id: 'vp-invalid', group: 'VP', label: 'Invalidation claire ?', description: 'Le stop est défini techniquement.' },
  { id: 'vp-a', group: 'VP', label: 'Setup A ou A+ ?', description: 'Le setup respecte la classe d’excellence.' }
] as const;

type QuestionId = (typeof questions)[number]['id'];

type Answers = Record<QuestionId, boolean>;

const defaultAnswers: Answers = Object.fromEntries(questions.map((question) => [question.id, false])) as Answers;
const DRAFT_ID = 'engine-draft';

function groupScore(answers: Answers, group: 'VR' | 'EP' | 'VP') {
  return questions.filter((question) => question.group === group && answers[question.id]).length;
}

function scoreTotal(answers: Answers) {
  return questions.filter((question) => answers[question.id]).length;
}

export default function EnginePage() {
  const [userId, setUserId] = useState('local-user');
  const [accounts, setAccounts] = useState<KriyoComptePropRecord[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>(defaultAnswers);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [message, setMessage] = useState('Chargement du moteur...');

  const vr = useMemo(() => groupScore(answers, 'VR'), [answers]);
  const ep = useMemo(() => groupScore(answers, 'EP'), [answers]);
  const vp = useMemo(() => groupScore(answers, 'VP'), [answers]);
  const total = useMemo(() => scoreTotal(answers), [answers]);
  const canExecute = total === 9 && selectedAccountIds.length > 0;

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus('loading');
      setMessage('Chargement du moteur...');

      try {
        const activeUserId = await getActiveUserId();
        if (cancelled) return;

        setUserId(activeUserId);
        const db = await getKriyoDb();
        const [savedAccounts, draft] = await Promise.all([db.getAll('comptesProp'), db.get('engineDrafts', DRAFT_ID)]);
        if (cancelled) return;

        const userAccounts = savedAccounts.filter((account) => account.userId === activeUserId);
        setAccounts(userAccounts);
        setSelectedAccountIds(draft?.selectedAccountIds?.length ? draft.selectedAccountIds : userAccounts.map((account) => account.id));
        if (draft?.answers) {
          setAnswers((current) => ({ ...current, ...draft.answers }));
        }
        setStatus('ready');
        setMessage(userAccounts.length > 0 ? 'Sélectionne les comptes puis évalue le setup.' : 'Ajoute d’abord au moins un compte dans Comptes & Onboarding.');
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage('Impossible de charger le moteur localement.');
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;

    const timeout = window.setTimeout(async () => {
      try {
        const db = await getKriyoDb();
        const draft: KriyoEngineDraftRecord = {
          id: DRAFT_ID,
          userId,
          selectedAccountIds,
          answers: { ...answers },
          scoreVR: vr,
          scoreEP: ep,
          scoreVP: vp,
          riskReward: vp === 3 ? 2 : null,
          updatedAt: new Date().toISOString()
        };
        await db.put('engineDrafts', draft);
      } catch {
        // Ignore draft persistence errors in Sprint 2.
      }
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [answers, ep, selectedAccountIds, status, userId, vp, vr]);

  function updateAnswer(id: QuestionId, value: boolean) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((current) =>
      current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId]
    );
  }

  async function executeTrade() {
    if (!canExecute || status === 'saving') return;

    try {
      setStatus('saving');
      setMessage('Création du trade local...');

      const db = await getKriyoDb();
      const openedAt = new Date().toISOString();
      const trades: KriyoTradeRecord[] = selectedAccountIds.map((accountId) => ({
        id: `trade-${crypto.randomUUID()}`,
        comptePropId: accountId,
        scoreVR: vr,
        scoreEP: ep,
        scoreVP: vp,
        scoreTotal: total,
        riskReward: 2,
        pnl: null,
        statut: 'EN_COURS',
        dateOuverture: openedAt,
        dateCloture: null
      }));

      for (const trade of trades) {
        await db.put('trades', trade);
        await enqueueMutation('trade_opened', trade);
      }

      await db.put('engineDrafts', {
        id: DRAFT_ID,
        userId,
        selectedAccountIds,
        answers: { ...answers },
        scoreVR: vr,
        scoreEP: ep,
        scoreVP: vp,
        riskReward: 2,
        updatedAt: openedAt
      });

      try {
        await syncQueuedMutations();
        setMessage('Trade approuvé localement et synchronisé sur Supabase. Redirection vers le suivi...');
      } catch {
        setMessage('Trade approuvé localement. Synchronisation Supabase en attente. Redirection vers le suivi...');
      }

      setStatus('ready');
      window.location.assign(`${APP_BASE_PATH}/tracking`);
    } catch {
      setStatus('error');
      setMessage('Impossible de créer le trade localement.');
    }
  }

  return (
    <AppShell title="Moteur Kriyo" subtitle="Confluence 9/9, sélection des comptes et score temps réel.">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-kriyo-text">Sélection des comptes</p>
              <p className="mt-1 text-sm text-kriyo-dim">Choisis les comptes actifs sur lesquels tu veux exécuter le setup.</p>
            </div>
            <Badge className="border-kriyo-cyan/30 bg-kriyo-cyan/10 text-kriyo-cyan">{selectedAccountIds.length} actifs</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-kriyo-dim">Aucun compte disponible. Va d’abord dans Comptes & Onboarding.</p>
            ) : (
              accounts.map((account) => {
                const selected = selectedAccountIds.includes(account.id);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => toggleAccount(account.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      selected ? 'border-kriyo-cyan/40 bg-kriyo-cyan/10' : 'border-kriyo-borderSoft bg-kriyo-bg hover:bg-kriyo-surfaceHover'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-kriyo-text">{account.nom}</p>
                      <p className="mt-1 text-xs text-kriyo-dim">Capital {account.capital.toLocaleString('fr-FR')} · {account.typePayout}</p>
                    </div>
                    <span className={`text-xs font-medium ${selected ? 'text-kriyo-cyan' : 'text-kriyo-dim'}`}>{selected ? 'Sélectionné' : 'Activer'}</span>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-kriyo-text">Score de décision</p>
              <p className="mt-1 text-sm text-kriyo-dim">Le bouton d’exécution s’active uniquement à 9/9 avec au moins un compte sélectionné.</p>
            </div>
            <Badge className="border-kriyo-amber/30 bg-kriyo-amber/10 text-kriyo-amber">{total}/9</Badge>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-kriyo-borderSoft">
            <div className="h-full rounded-full bg-gradient-to-r from-kriyo-cyan via-kriyo-amber to-kriyo-success" style={{ width: `${(total / 9) * 100}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-kriyo-dim">
            <span>VR {vr}/3</span>
            <span>EP {ep}/3</span>
            <span>VP {vp}/3</span>
          </div>
        </Card>

        {(['VR', 'EP', 'VP'] as const).map((group) => (
          <Card key={group} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`font-mono text-[11px] uppercase tracking-[0.16em] ${group === 'VR' ? 'text-kriyo-cyan' : group === 'EP' ? 'text-kriyo-amber' : 'text-kriyo-success'}`}>{group}</p>
                <p className="mt-1 text-sm text-kriyo-dim">{group === 'VR' ? 'Valeur Réelle' : group === 'EP' ? 'Effet Perçu' : 'Valeur Projetée'}</p>
              </div>
              <Badge className="border-kriyo-borderSoft bg-kriyo-elevated text-kriyo-dim">
                {group === 'VR' ? vr : group === 'EP' ? ep : vp}/3
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              {questions.filter((question) => question.group === group).map((question) => {
                const checked = answers[question.id];
                return (
                  <div key={question.id} className="rounded-2xl border border-kriyo-borderSoft bg-kriyo-bg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-kriyo-text">{question.label}</p>
                        <p className="mt-1 text-xs text-kriyo-dim">{question.description}</p>
                      </div>
                      <Badge className={checked ? 'border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success' : 'border-kriyo-borderSoft bg-kriyo-elevated text-kriyo-dim'}>
                        {checked ? 'Oui' : 'Non'}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant={checked ? 'default' : 'secondary'}
                        onClick={() => updateAnswer(question.id, true)}
                        type="button"
                      >
                        Oui
                      </Button>
                      <Button
                        variant={!checked ? 'default' : 'secondary'}
                        onClick={() => updateAnswer(question.id, false)}
                        type="button"
                      >
                        Non
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <Button className="w-full" disabled={!canExecute || status === 'saving'} onClick={executeTrade} type="button">
          {status === 'saving' ? 'Exécution...' : canExecute ? 'Exécuter le Trade' : 'Score incomplet'}
        </Button>

        <p className={status === 'error' ? 'text-xs leading-5 text-kriyo-danger' : 'text-xs leading-5 text-kriyo-dim'}>
          {message}
        </p>
      </div>
    </AppShell>
  );
}
