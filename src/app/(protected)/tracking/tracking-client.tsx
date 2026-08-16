"use client";

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getActiveUserId } from '@/lib/auth/client-user';
import { getKriyoDb, type KriyoComptePropRecord, type KriyoTradeRecord } from '@/lib/db';
import { formatLocalTimestamp } from '@/lib/time';

export default function TrackingPage() {
  const [userId, setUserId] = useState('local-user');
  const [accounts, setAccounts] = useState<KriyoComptePropRecord[]>([]);
  const [trades, setTrades] = useState<KriyoTradeRecord[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Chargement du suivi...');

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const activeUserId = await getActiveUserId();
        if (cancelled) return;

        setUserId(activeUserId);
        const db = await getKriyoDb();
        const [savedAccounts, savedTrades] = await Promise.all([db.getAll('comptesProp'), db.getAll('trades')]);
        if (cancelled) return;

        const userAccounts = savedAccounts.filter((account) => account.userId === activeUserId);
        const userTrades = savedTrades.filter((trade) => userAccounts.some((account) => account.id === trade.comptePropId));

        setAccounts(userAccounts);
        setTrades(userTrades);
        setStatus('ready');
        setMessage(userTrades.length > 0 ? 'Trades actifs chargés.' : 'Aucun trade ouvert pour le moment.');
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

  const tradesByAccount = useMemo(
    () => Object.fromEntries(trades.map((trade) => [trade.comptePropId, trade])) as Record<string, KriyoTradeRecord | undefined>,
    [trades]
  );

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
                return (
                  <div key={account.id} className="rounded-2xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-kriyo-text">{account.nom}</p>
                        <p className="mt-1 text-xs text-kriyo-dim">{account.typePayout} · {account.capital.toLocaleString('fr-FR')} USD</p>
                      </div>
                      <Badge className="border-kriyo-borderSoft bg-kriyo-elevated text-kriyo-dim">{trade ? trade.statut : 'Aucun trade'}</Badge>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-kriyo-borderSoft">
                      <div className={`h-full rounded-full ${index === 0 ? 'bg-kriyo-coral' : index === 1 ? 'bg-kriyo-cyan' : 'bg-kriyo-success'}`} style={{ width: trade ? `${Math.min(40 + trade.scoreTotal * 6, 100)}%` : '12%' }} />
                    </div>
                    {trade ? (
                      <p className="mt-3 text-xs text-kriyo-dim">
                        Trade ouvert le {formatLocalTimestamp(trade.dateOuverture)} · Score {trade.scoreTotal}/9
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-kriyo-dim">En attente d’un trade validé.</p>
                    )}
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
            <Badge className="border-kriyo-cyan/30 bg-kriyo-cyan/10 text-kriyo-cyan">{trades.length}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {trades.length === 0 ? (
              <p className="text-sm text-kriyo-dim">Aucun trade actif pour le moment.</p>
            ) : (
              trades.map((trade) => (
                <div key={trade.id} className="rounded-2xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-kriyo-text">Trade {trade.comptePropId.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-kriyo-dim">Ouvert le {formatLocalTimestamp(trade.dateOuverture)}</p>
                    </div>
                    <Badge className="border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success">{trade.scoreTotal}/9</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-kriyo-dim">
                    <span>VR {trade.scoreVR}/3 · EP {trade.scoreEP}/3 · VP {trade.scoreVP}/3</span>
                    <span>{trade.statut}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <p className={status === 'error' ? 'text-xs leading-5 text-kriyo-danger' : 'text-xs leading-5 text-kriyo-dim'}>{message}</p>
        <Button className="w-full" variant="secondary" onClick={() => window.location.reload()} type="button">
          Rafraîchir le suivi
        </Button>
      </div>
    </AppShell>
  );
}
