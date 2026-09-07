"use client";

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getActiveUserId } from '@/lib/auth/client-user';
import { getKriyoDb, type KriyoComptePropRecord, type KriyoProfilRisqueRecord, type KriyoTradeRecord } from '@/lib/db';
import { enqueueMutation } from '@/lib/sync/queue';
import { syncQueuedMutations } from '@/lib/sync/client';
import { formatLocalTimestamp } from '@/lib/time';
import { formatCurrency } from '@/lib/format';
import { evaluateTradeClosure, type TradeClosureOutcome } from '@/lib/rules/trade';
import { useLanguage } from '@/lib/i18n/context';
import { interpolate, type Dictionary } from '@/lib/i18n/translations';

function tradeBadgeClass(status: KriyoTradeRecord['statut']) {
  switch (status) {
    case 'VERROUILLE':
      return 'border-kriyo-danger/30 bg-kriyo-danger/10 text-kriyo-danger';
    case 'CLOTURE':
      return 'border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success';
    default:
      return 'border-kriyo-cyan/30 bg-kriyo-cyan/10 text-kriyo-cyan';
  }
}

function outcomeText(outcome: TradeClosureOutcome, dict: Dictionary, intlLocale: string) {
  const amount = formatCurrency(outcome.amount, intlLocale);
  switch (outcome.reasonKey) {
    case 'takeProfitForced':
      return { label: dict.tradeClosure.takeProfitForcedLabel, reason: interpolate(dict.tradeClosure.takeProfitForcedReason, { amount }) };
    case 'dailyDrawdown':
      return { label: dict.tradeClosure.dailyDrawdownLabel, reason: interpolate(dict.tradeClosure.dailyDrawdownReason, { amount }) };
    case 'maxDrawdown':
      return { label: dict.tradeClosure.maxDrawdownLabel, reason: interpolate(dict.tradeClosure.maxDrawdownReason, { amount }) };
    default:
      return { label: dict.tradeClosure.loggedLabel, reason: interpolate(dict.tradeClosure.loggedReason, { amount }) };
  }
}

export default function TrackingPage() {
  const { dict, intlLocale } = useLanguage();
  const [userId, setUserId] = useState('local-user');
  const [accounts, setAccounts] = useState<KriyoComptePropRecord[]>([]);
  const [profiles, setProfiles] = useState<KriyoProfilRisqueRecord[]>([]);
  const [trades, setTrades] = useState<KriyoTradeRecord[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'saving'>('loading');
  const [message, setMessage] = useState(dict.tracking.loadingMsg);
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closingPnl, setClosingPnl] = useState('');
  const [closingError, setClosingError] = useState('');

  const profilesById = useMemo(
    () => Object.fromEntries(profiles.map((profile) => [profile.id, profile])) as Record<string, KriyoProfilRisqueRecord>,
    [profiles]
  );

  const tradesByAccount = useMemo(
    () => Object.fromEntries(trades.map((trade) => [trade.comptePropId, trade])) as Record<string, KriyoTradeRecord | undefined>,
    [trades]
  );

  const openTrades = useMemo(() => trades.filter((trade) => trade.statut === 'EN_COURS'), [trades]);
  const closingTrade = closingTradeId ? trades.find((trade) => trade.id === closingTradeId) ?? null : null;
  const closingAccount = closingTrade ? accounts.find((account) => account.id === closingTrade.comptePropId) ?? null : null;
  const closingProfile = closingAccount ? profilesById[closingAccount.profilRisqueId] ?? null : null;
  const closingOutcome =
    closingTrade && closingAccount && closingProfile && Number.isFinite(Number(closingPnl))
      ? evaluateTradeClosure(closingAccount, closingProfile, Number(closingPnl))
      : null;

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setStatus('loading');
        setMessage(dict.tracking.loadingMsg);

        const activeUserId = await getActiveUserId();
        if (cancelled) return;

        setUserId(activeUserId);
        const db = await getKriyoDb();
        const [savedProfiles, savedAccounts, savedTrades] = await Promise.all([
          db.getAll('profilRisque'),
          db.getAll('comptesProp'),
          db.getAll('trades')
        ]);
        if (cancelled) return;

        const userAccounts = savedAccounts.filter((account) => account.userId === activeUserId);
        const userTrades = savedTrades.filter((trade) => userAccounts.some((account) => account.id === trade.comptePropId));

        setProfiles(savedProfiles);
        setAccounts(userAccounts);
        setTrades(userTrades);
        setStatus('ready');
        setMessage(userTrades.length > 0 ? dict.tracking.loadedMsg : dict.tracking.noneOpenMsg);
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage(dict.tracking.errorLoadMsg);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCloseTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!closingTrade || !closingAccount || !closingProfile || status === 'saving') {
      return;
    }

    const pnl = Number(closingPnl);
    if (!Number.isFinite(pnl)) {
      setClosingError(dict.tracking.invalidPnlMsg);
      return;
    }

    try {
      setStatus('saving');
      setClosingError('');
      setMessage(dict.tracking.closingMsg);

      const db = await getKriyoDb();
      const closedAt = new Date().toISOString();
      const outcome = evaluateTradeClosure(closingAccount, closingProfile, pnl);
      const closedTrade: KriyoTradeRecord = {
        ...closingTrade,
        pnl,
        statut: outcome.status,
        dateCloture: closedAt
      };

      await db.put('trades', closedTrade);
      await enqueueMutation('trade_closed', closedTrade);

      const { reason } = outcomeText(outcome, dict, intlLocale);

      try {
        await syncQueuedMutations();
        setMessage(`${reason} ${dict.tracking.syncedSuffix}`);
      } catch {
        setMessage(`${reason} ${dict.tracking.pendingSyncSuffix}`);
      }

      setTrades((current) => current.map((trade) => (trade.id === closedTrade.id ? closedTrade : trade)));
      setClosingTradeId(null);
      setClosingPnl('');
      setStatus('ready');
    } catch {
      setStatus('error');
      setMessage(dict.tracking.errorCloseMsg);
    }
  }

  return (
    <AppShell title={dict.tracking.title} subtitle={dict.tracking.subtitle}>
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-kriyo-text">{dict.tracking.healthViewTitle}</p>
              <p className="mt-1 text-sm text-kriyo-dim">{dict.tracking.healthViewDescription}</p>
            </div>
            <Badge className={status === 'error' ? 'border-kriyo-danger/30 bg-kriyo-danger/10 text-kriyo-danger' : 'border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success'}>
              {accounts.length} {dict.tracking.accountsSuffix}
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-kriyo-dim">{dict.tracking.noLinkedAccounts}</p>
            ) : (
              accounts.map((account, index) => {
                const trade = tradesByAccount[account.id];
                const profile = profilesById[account.profilRisqueId];
                return (
                  <div key={account.id} className="rounded-2xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-kriyo-text">{account.nom}</p>
                        <p className="mt-1 text-xs text-kriyo-dim">
                          {account.typePayout} · {formatCurrency(account.capital, intlLocale)} · {profile?.type ?? '—'}
                        </p>
                      </div>
                      <Badge className={trade ? tradeBadgeClass(trade.statut) : 'border-kriyo-borderSoft bg-kriyo-elevated text-kriyo-dim'}>
                        {trade ? trade.statut : dict.tracking.noTradeBadge}
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-kriyo-borderSoft">
                      <div
                        className={`h-full rounded-full ${index === 0 ? 'bg-kriyo-coral' : index === 1 ? 'bg-kriyo-cyan' : 'bg-kriyo-success'}`}
                        style={{ width: trade ? `${Math.min(40 + trade.scoreTotal * 6, 100)}%` : '12%' }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-kriyo-dim">
                      {trade
                        ? `${dict.tracking.tradeOpenedOnPrefix} ${trade.statut.toLowerCase()} ${dict.tracking.onDate} ${formatLocalTimestamp(trade.dateOuverture, intlLocale)}`
                        : dict.tracking.waitingForValidTrade}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-kriyo-text">{dict.tracking.activeTradesTitle}</p>
              <p className="mt-1 text-sm text-kriyo-dim">{dict.tracking.activeTradesDescription}</p>
            </div>
            <Badge className="border-kriyo-cyan/30 bg-kriyo-cyan/10 text-kriyo-cyan">{openTrades.length}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {trades.length === 0 ? (
              <p className="text-sm text-kriyo-dim">{dict.tracking.noActiveTrades}</p>
            ) : (
              trades.map((trade) => {
                const account = accounts.find((item) => item.id === trade.comptePropId);
                const profile = account ? profilesById[account.profilRisqueId] : null;
                return (
                  <div key={trade.id} className="rounded-2xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-kriyo-text">{account?.nom ?? `Trade ${trade.comptePropId.slice(0, 8)}`}</p>
                        <p className="mt-1 text-xs text-kriyo-dim">
                          {dict.tracking.openedOnPrefix} {formatLocalTimestamp(trade.dateOuverture, intlLocale)} · {profile?.type ?? '—'}
                        </p>
                      </div>
                      <Badge className={tradeBadgeClass(trade.statut)}>{trade.scoreTotal}/9</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-kriyo-dim">
                      <span>VR {trade.scoreVR}/3 · EP {trade.scoreEP}/3 · VP {trade.scoreVP}/3</span>
                      <span>{trade.statut}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-kriyo-dim">
                        {trade.pnl == null ? dict.tracking.pnlPending : `${dict.tracking.pnlPrefix} ${formatCurrency(trade.pnl, intlLocale)}`}
                      </p>
                      {trade.statut === 'EN_COURS' ? (
                        <Button type="button" variant="secondary" onClick={() => setClosingTradeId(trade.id)}>
                          {dict.tracking.closePositionButton}
                        </Button>
                      ) : (
                        <span className="text-xs text-kriyo-dim">{dict.tracking.closureRecorded}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <p className={status === 'error' ? 'text-xs leading-5 text-kriyo-danger' : 'text-xs leading-5 text-kriyo-dim'}>{message}</p>
        <Button className="w-full" variant="secondary" onClick={() => window.location.reload()} type="button">
          {dict.tracking.refreshButton}
        </Button>
      </div>

      {closingTrade && closingAccount && closingProfile ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-10">
          <div className="w-full max-w-md rounded-3xl border border-kriyo-borderSoft bg-kriyo-elevated p-4 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-cyan">{dict.tracking.modalTitle}</p>
                <h3 className="mt-2 text-lg font-semibold text-kriyo-text">{closingAccount.nom}</h3>
                <p className="mt-1 text-sm text-kriyo-dim">{closingProfile.type} · {formatCurrency(closingAccount.capital, intlLocale)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setClosingTradeId(null);
                  setClosingPnl('');
                  setClosingError('');
                }}
                className="rounded-full border border-kriyo-borderSoft px-3 py-1 text-xs text-kriyo-dim"
              >
                {dict.common.close}
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleCloseTrade}>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.14em] text-kriyo-dim" htmlFor="pnl">
                  {dict.tracking.finalPnlLabel}
                </label>
                <input
                  id="pnl"
                  type="number"
                  step="1"
                  value={closingPnl}
                  onChange={(event) => setClosingPnl(event.target.value)}
                  className="w-full rounded-xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3 text-sm text-kriyo-text outline-none transition placeholder:text-kriyo-faint focus:border-kriyo-cyan"
                  placeholder="250"
                />
              </div>

              {closingOutcome ? (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${closingOutcome.status === 'VERROUILLE' ? 'border-kriyo-danger/30 bg-kriyo-danger/10 text-kriyo-danger' : 'border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success'}`}>
                  {(() => {
                    const { label, reason } = outcomeText(closingOutcome, dict, intlLocale);
                    return (
                      <>
                        <p className="font-medium">{label}</p>
                        <p className="mt-1 text-xs opacity-90">{reason}</p>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-xs text-kriyo-dim">{dict.tracking.typeToConfirm}</p>
              )}

              {closingError ? <p className="text-xs leading-5 text-kriyo-danger">{closingError}</p> : null}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setClosingTradeId(null);
                    setClosingPnl('');
                    setClosingError('');
                  }}
                >
                  {dict.tracking.cancelButton}
                </Button>
                <Button type="submit" disabled={status === 'saving'}>
                  {status === 'saving' ? dict.tracking.closingButton : dict.tracking.validateResultButton}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
