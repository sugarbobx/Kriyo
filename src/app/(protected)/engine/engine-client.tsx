"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getActiveUserId } from '@/lib/auth/client-user';
import { getKriyoDb, type KriyoComptePropRecord, type KriyoEngineDraftRecord, type KriyoTradeRecord } from '@/lib/db';
import { enqueueMutation } from '@/lib/sync/queue';
import { syncQueuedMutations } from '@/lib/sync/client';
import { APP_BASE_PATH } from '@/lib/app-config';
import { useLanguage } from '@/lib/i18n/context';
import {
  getGamificationStats,
  getLevelForXp,
  getRankForSetupCount,
  recordPerfectSetupExecuted,
  XP_PER_LEVEL,
  type RankKey
} from '@/lib/gamification';
import type { KriyoGamificationRecord } from '@/lib/db';

const questionKeys = ['vrStructure', 'vrLiquidity', 'vrTrend', 'epFomo', 'epCrowd', 'epLoss', 'vpRr', 'vpInvalid', 'vpA'] as const;
const questionGroup: Record<(typeof questionKeys)[number], 'VR' | 'EP' | 'VP'> = {
  vrStructure: 'VR',
  vrLiquidity: 'VR',
  vrTrend: 'VR',
  epFomo: 'EP',
  epCrowd: 'EP',
  epLoss: 'EP',
  vpRr: 'VP',
  vpInvalid: 'VP',
  vpA: 'VP'
};

type QuestionId = (typeof questionKeys)[number];
type Answers = Record<QuestionId, boolean>;

const defaultAnswers: Answers = Object.fromEntries(questionKeys.map((id) => [id, false])) as Answers;
const DRAFT_ID = 'engine-draft';

function groupScore(answers: Answers, group: 'VR' | 'EP' | 'VP') {
  return questionKeys.filter((id) => questionGroup[id] === group && answers[id]).length;
}

function scoreTotal(answers: Answers) {
  return questionKeys.filter((id) => answers[id]).length;
}

export default function EnginePage() {
  const { dict } = useLanguage();
  const [userId, setUserId] = useState('local-user');
  const [accounts, setAccounts] = useState<KriyoComptePropRecord[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>(defaultAnswers);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [message, setMessage] = useState(dict.engine.loadingMsg);
  const [gamification, setGamification] = useState<KriyoGamificationRecord | null>(null);
  const [groupToast, setGroupToast] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const vr = useMemo(() => groupScore(answers, 'VR'), [answers]);
  const ep = useMemo(() => groupScore(answers, 'EP'), [answers]);
  const vp = useMemo(() => groupScore(answers, 'VP'), [answers]);
  const total = useMemo(() => scoreTotal(answers), [answers]);
  const canExecute = total === 9 && selectedAccountIds.length > 0;

  const prevScores = useRef({ vr: 0, ep: 0, vp: 0 });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus('loading');
      setMessage(dict.engine.loadingMsg);

      try {
        const activeUserId = await getActiveUserId();
        if (cancelled) return;

        setUserId(activeUserId);
        const db = await getKriyoDb();
        const [savedAccounts, draft, stats] = await Promise.all([
          db.getAll('comptesProp'),
          db.get('engineDrafts', DRAFT_ID),
          getGamificationStats(activeUserId)
        ]);
        if (cancelled) return;

        const userAccounts = savedAccounts.filter((account) => account.userId === activeUserId);
        setAccounts(userAccounts);
        setSelectedAccountIds(draft?.selectedAccountIds?.length ? draft.selectedAccountIds : userAccounts.map((account) => account.id));
        if (draft?.answers) {
          setAnswers((current) => ({ ...current, ...draft.answers }));
        }
        setGamification(stats);
        setStatus('ready');
        setMessage(userAccounts.length > 0 ? dict.engine.readyWithAccountsMsg : dict.engine.readyNoAccountsMsg);
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage(dict.engine.errorLoadMsg);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    const previous = prevScores.current;
    if (previous.vr < 3 && vr === 3) setGroupToast(dict.engine.groupVR);
    else if (previous.ep < 3 && ep === 3) setGroupToast(dict.engine.groupEP);
    else if (previous.vp < 3 && vp === 3) setGroupToast(dict.engine.groupVP);
    prevScores.current = { vr, ep, vp };

    if (previous.vr === 3 && vr === 3 && previous.ep === 3 && ep === 3 && previous.vp === 3 && vp === 3) return;
  }, [vr, ep, vp, dict.engine.groupVR, dict.engine.groupEP, dict.engine.groupVP]);

  useEffect(() => {
    if (!groupToast) return;
    const timeout = window.setTimeout(() => setGroupToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [groupToast]);

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
      setMessage(dict.engine.executingMsg);

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

      const updatedStats = await recordPerfectSetupExecuted(userId);
      setGamification(updatedStats);
      setCelebrate(true);

      try {
        await syncQueuedMutations();
        setMessage(dict.engine.syncedMsg);
      } catch {
        setMessage(dict.engine.pendingSyncMsg);
      }

      setStatus('ready');
      window.setTimeout(() => {
        window.location.assign(`${APP_BASE_PATH}/tracking`);
      }, 900);
    } catch {
      setStatus('error');
      setMessage(dict.engine.errorSaveMsg);
    }
  }

  const rankInfo = gamification ? getRankForSetupCount(gamification.perfectSetupsCount) : null;
  const level = gamification ? getLevelForXp(gamification.xp) : 1;
  const xpIntoLevel = gamification ? gamification.xp % XP_PER_LEVEL : 0;
  const rankLabel = (key: RankKey) => dict.gamification.ranks[key];

  return (
    <AppShell title={dict.engine.title} subtitle={dict.engine.subtitle}>
      <div className="space-y-4">
        {gamification && rankInfo ? (
          <Card className="relative overflow-hidden border-kriyo-cyan/20 bg-[radial-gradient(circle_at_top_right,rgba(79,209,197,0.14),transparent_45%)] p-4">
            {celebrate ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="animate-ping rounded-full bg-kriyo-success/20 px-10 py-10" />
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-cyan">{dict.gamification.progressTitle}</p>
                <p className="mt-2 text-lg font-semibold text-kriyo-text">{rankLabel(rankInfo.rank)}</p>
                <p className="mt-1 text-xs text-kriyo-dim">{dict.gamification.progressDescription}</p>
              </div>
              <Badge className="border-kriyo-amber/30 bg-kriyo-amber/10 text-kriyo-amber">
                {dict.gamification.levelLabel} {level}
              </Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-kriyo-borderSoft">
              <div
                className="h-full rounded-full bg-gradient-to-r from-kriyo-cyan to-kriyo-amber transition-all duration-500"
                style={{ width: `${(xpIntoLevel / XP_PER_LEVEL) * 100}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-kriyo-dim">
              <div>
                <p className="text-base font-semibold text-kriyo-text">{gamification.currentStreak}</p>
                <p>{dict.gamification.streakLabel}</p>
              </div>
              <div>
                <p className="text-base font-semibold text-kriyo-text">{gamification.bestStreak}</p>
                <p>{dict.gamification.bestStreakLabel}</p>
              </div>
              <div>
                <p className="text-base font-semibold text-kriyo-text">{gamification.perfectSetupsCount}</p>
                <p>{dict.gamification.perfectSetupsLabel}</p>
              </div>
            </div>
            {rankInfo.nextThreshold != null ? (
              <p className="mt-3 text-center text-[11px] text-kriyo-dim">
                {dict.gamification.nextRankPrefix} {rankInfo.nextThreshold} {dict.gamification.perfectSetupsLabel.toLowerCase()}
              </p>
            ) : null}
          </Card>
        ) : null}

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-kriyo-text">{dict.engine.selectionTitle}</p>
              <p className="mt-1 text-sm text-kriyo-dim">{dict.engine.selectionDescription}</p>
            </div>
            <Badge className="border-kriyo-cyan/30 bg-kriyo-cyan/10 text-kriyo-cyan">
              {selectedAccountIds.length} {dict.engine.activeBadge}
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-kriyo-dim">{dict.engine.noAccounts}</p>
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
                      <p className="mt-1 text-xs text-kriyo-dim">Capital {account.capital.toLocaleString()} · {account.typePayout}</p>
                    </div>
                    <span className={`text-xs font-medium ${selected ? 'text-kriyo-cyan' : 'text-kriyo-dim'}`}>
                      {selected ? dict.engine.selectedLabel : dict.engine.activateLabel}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="relative p-4">
          {groupToast ? (
            <div className="absolute right-4 top-4 rounded-full border border-kriyo-success/30 bg-kriyo-success/10 px-3 py-1 text-[11px] font-semibold text-kriyo-success transition">
              {groupToast} {dict.engine.groupComplete}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-kriyo-text">{dict.engine.scoreCardTitle}</p>
              <p className="mt-1 text-sm text-kriyo-dim">{dict.engine.scoreCardDescription}</p>
            </div>
            <Badge className="border-kriyo-amber/30 bg-kriyo-amber/10 text-kriyo-amber">{total}/9</Badge>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-kriyo-borderSoft">
            <div
              className="h-full rounded-full bg-gradient-to-r from-kriyo-cyan via-kriyo-amber to-kriyo-success transition-all duration-300"
              style={{ width: `${(total / 9) * 100}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-kriyo-dim">
            <span>{dict.engine.groupVR} {vr}/3</span>
            <span>{dict.engine.groupEP} {ep}/3</span>
            <span>{dict.engine.groupVP} {vp}/3</span>
          </div>
        </Card>

        {(['VR', 'EP', 'VP'] as const).map((group) => {
          const groupScoreValue = group === 'VR' ? vr : group === 'EP' ? ep : vp;
          const groupComplete = groupScoreValue === 3;
          return (
            <Card key={group} className={`p-4 transition ${groupComplete ? 'border-kriyo-success/40' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`font-mono text-[11px] uppercase tracking-[0.16em] ${group === 'VR' ? 'text-kriyo-cyan' : group === 'EP' ? 'text-kriyo-amber' : 'text-kriyo-success'}`}>
                    {group === 'VR' ? dict.engine.groupVR : group === 'EP' ? dict.engine.groupEP : dict.engine.groupVP}
                  </p>
                  <p className="mt-1 text-sm text-kriyo-dim">
                    {group === 'VR' ? dict.engine.groupVRFull : group === 'EP' ? dict.engine.groupEPFull : dict.engine.groupVPFull}
                  </p>
                </div>
                <Badge className={groupComplete ? 'border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success' : 'border-kriyo-borderSoft bg-kriyo-elevated text-kriyo-dim'}>
                  {groupComplete ? dict.engine.groupComplete : `${groupScoreValue}/3`}
                </Badge>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-kriyo-borderSoft">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${groupComplete ? 'bg-kriyo-success' : 'bg-kriyo-cyan'}`}
                  style={{ width: `${(groupScoreValue / 3) * 100}%` }}
                />
              </div>
              <div className="mt-4 space-y-3">
                {questionKeys.filter((id) => questionGroup[id] === group).map((id) => {
                  const checked = answers[id];
                  const question = dict.engine.questions[id];
                  return (
                    <div key={id} className={`rounded-2xl border px-4 py-3 transition ${checked ? 'border-kriyo-success/30 bg-kriyo-success/5' : 'border-kriyo-borderSoft bg-kriyo-bg'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-kriyo-text">{question.label}</p>
                          <p className="mt-1 text-xs text-kriyo-dim">{question.description}</p>
                        </div>
                        <Badge className={checked ? 'border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success' : 'border-kriyo-borderSoft bg-kriyo-elevated text-kriyo-dim'}>
                          {checked ? dict.engine.answerYes : dict.engine.answerNo}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button variant={checked ? 'default' : 'secondary'} onClick={() => updateAnswer(id, true)} type="button">
                          {dict.engine.answerYes}
                        </Button>
                        <Button variant={!checked ? 'default' : 'secondary'} onClick={() => updateAnswer(id, false)} type="button">
                          {dict.engine.answerNo}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}

        <Button className="w-full" disabled={!canExecute || status === 'saving'} onClick={executeTrade} type="button">
          {status === 'saving' ? dict.engine.executingButton : canExecute ? dict.engine.executeButton : dict.engine.incompleteButton}
        </Button>

        <p className={status === 'error' ? 'text-xs leading-5 text-kriyo-danger' : 'text-xs leading-5 text-kriyo-dim'}>{message}</p>
      </div>
    </AppShell>
  );
}
