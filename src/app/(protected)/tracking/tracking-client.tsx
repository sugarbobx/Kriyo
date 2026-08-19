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
import { evaluateTradeClosure } from '@/lib/rules/trade';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

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

export default function TrackingPage() {
  const [userId, setUserId] = useState('local-user');
  const [accounts, setAccounts] = useState<KriyoComptePropRecord[]>([]);
  const [profiles, setProfiles] = useState<KriyoProfilRisqueRecord[]>([]);
  const [trades, setTrades] = useState<KriyoTradeRecord[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'saving'>('loading');
  const [message, setMessage] = useState('Chargement du suivi...');
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
        setMessage('Chargement du suivi...');

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
        setMessage(userTrades.length > 0 ? 'Trades locaux chargés.' : 'Aucun trade ouvert pour le moment.');
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage('Impossible de charger le suivi localement.');
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCloseTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!closingTrade || !closingAccount || !closingProfile || status === 'saving') {
      return;
    }

    const pnl = Number(closingPnl);
    if (!Number.isFinite(pnl)) {
      setClosingError('Renseigne un PnL valide.');
      return;
    }

    try {
      setStatus('saving');
      setClosingError('');
      setMessage('Cloture du trade et calcul des regles...');

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

      try {
        await syncQueuedMutations();
        setMessage(`${outcome.reason} Trade synchronise sur Supabase.`);
      } catch {
        setMessage(`${outcome.reason} Synchronisation Supabase en attente.`);
      }

      setTrades((current) => current.map((trade) => (trade.id === closedTrade.id ? closedTrade : trade)));
      setClosingTradeId(null);
      setClosingPnl('');
      setStatus('ready');
    } catch {
      setStatus('error');
      setMessage('Impossible de cloturer le trade localement.');
    }
  }

  return (
    <AppShell title="Suivi des Positions" subtitle="Jauges de santé, trades ouverts et clôture PnL.">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-kriyo-text">Vue de santé</p>
              <p className="mt-1 text-sm text-kriyo-dim">Chaque compte affiche son état de risque et ses trades ouverts.</p>
            </div>
            <Badge className={status === 'error' ? 'border-kriyo-danger/30 bg-kriyo-danger/10 text-kriyo-danger' : 'border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success'}>
              {accounts.length} comptes
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-kriyo-dim">Aucun compte lié. Crée un compte dans Comptes & Onboarding, puis exécute un trade depuis le moteur.</p>
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
                          {account.typePayout} · {account.capital.toLocaleString('fr-FR')} USD · {profile?.type ?? '—'}
                        </p>
                      </div>
                      <Badge className={trade ? tradeBadgeClass(trade.statut) : 'border-kriyo-borderSoft bg-kriyo-elevated text-kriyo-dim'}>
                        {trade ? trade.statut : 'Aucun trade'}
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-kriyo-borderSoft">
                      <div
                        className={`h-full rounded-full ${index === 0 ? 'bg-kriyo-coral' : index === 1 ? 'bg-kriyo-cyan' : 'bg-kriyo-success'}`}
                        style={{ width: trade ? `${Math.min(40 + trade.scoreTotal * 6, 100)}%` : '12%' }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-kriyo-dim">
                      {trade ? `Trade ${trade.statut.toLowerCase()} le ${formatLocalTimestamp(trade.dateOuverture)}` : 'En attente d’un trade validé.'}
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
              <p className="font-medium text-kriyo-text">Trades actifs</p>
              <p className="mt-1 text-sm text-kriyo-dim">Les positions créées par le moteur apparaissent ici.</p>
            </div>
            <Badge className="border-kriyo-cyan/30 bg-kriyo-cyan/10 text-kriyo-cyan">{openTrades.length}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {trades.length === 0 ? (
              <p className="text-sm text-kriyo-dim">Aucun trade actif pour le moment.</p>
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
                          Ouvert le {formatLocalTimestamp(trade.dateOuverture)} · {profile?.type ?? '—'}
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
                        {trade.pnl == null ? 'PnL en attente' : `PnL ${formatCurrency(trade.pnl)}`}
                      </p>
                      {trade.statut === 'EN_COURS' ? (
                        <Button type="button" variant="secondary" onClick={() => setClosingTradeId(trade.id)}>
                          Fermer la position
                        </Button>
                      ) : (
                        <span className="text-xs text-kriyo-dim">Cloture enregistree</span>
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
          Rafraîchir le suivi
        </Button>
      </div>

      {closingTrade && closingAccount && closingProfile ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-10">
          <div className="w-full max-w-md rounded-3xl border border-kriyo-borderSoft bg-kriyo-elevated p-4 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-cyan">Cloture PnL</p>
                <h3 className="mt-2 text-lg font-semibold text-kriyo-text">{closingAccount.nom}</h3>
                <p className="mt-1 text-sm text-kriyo-dim">{closingProfile.type} · {closingAccount.capital.toLocaleString('fr-FR')} USD</p>
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
                Fermer
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleCloseTrade}>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.14em] text-kriyo-dim" htmlFor="pnl">
                  PnL final
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
                  <p className="font-medium">{closingOutcome.label}</p>
                  <p className="mt-1 text-xs opacity-90">{closingOutcome.reason}</p>
                </div>
              ) : (
                <p className="text-xs text-kriyo-dim">Saisis un PnL pour calculer le statut final.</p>
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
                  Annuler
                </Button>
                <Button type="submit" disabled={status === 'saving'}>
                  {status === 'saving' ? 'Cloture...' : 'Valider le résultat'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
