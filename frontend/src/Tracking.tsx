import { useEffect, useMemo, useState } from 'react';
import { api, type Trade, type TradeOutcome, type TradingAccount } from './api/client';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';
import { interpolate } from './i18n/translations';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function Tracking({ onBack }: { onBack: () => void }) {
  const { dict } = useLanguage();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [closingTradeId, setClosingTradeId] = useState<number | null>(null);
  const [pnlInput, setPnlInput] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');
  const [lastOutcome, setLastOutcome] = useState<{ tradeId: number; outcome: TradeOutcome } | null>(null);

  useEffect(() => {
    Promise.all([api.performance.accounts(), api.performance.trades()])
      .then(([acc, trd]) => {
        setAccounts(acc);
        setTrades(trd);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const accountsById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const openTrades = trades.filter((t) => t.status === 'EN_COURS');
  const closingTrade = closingTradeId != null ? trades.find((t) => t.id === closingTradeId) ?? null : null;

  function outcomeText(outcome: TradeOutcome) {
    const copy = dict.tracking.reasons[outcome.reason_key];
    return { label: copy.label, reason: interpolate(copy.reason, { amount: formatCurrency(outcome.amount) }) };
  }

  async function handleClose() {
    if (!closingTrade) return;
    const pnl = Number(pnlInput);
    if (!Number.isFinite(pnl)) {
      setCloseError(dict.tracking.invalidPnl);
      return;
    }
    setClosing(true);
    setCloseError('');
    try {
      const { trade, outcome } = await api.tracking.closeTrade(closingTrade.id, pnl);
      setTrades((current) => current.map((t) => (t.id === trade.id ? trade : t)));
      setLastOutcome({ tradeId: trade.id, outcome });
      setClosingTradeId(null);
      setPnlInput('');
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : dict.tracking.errorClose);
    } finally {
      setClosing(false);
    }
  }

  if (status === 'loading') {
    return (
      <AppShell title={dict.tracking.title}>
        <p className="kriyo-dim">{dict.common.loading}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={dict.tracking.title} subtitle={dict.tracking.subtitle}>
      <div className="kriyo-stack">
        <p className="kriyo-dim">
          {dict.tracking.activeTrades} ({openTrades.length})
        </p>
        {openTrades.length === 0 ? (
          <p className="kriyo-dim">{dict.tracking.noActiveTrades}</p>
        ) : (
          openTrades.map((trade) => {
            const account = accountsById[trade.account];
            return (
              <div key={trade.id} className="kriyo-palier">
                <p className="kriyo-palier-title">{account?.name ?? `#${trade.account}`}</p>
                <p className="kriyo-palier-note">
                  {dict.tracking.score} {trade.score_total}/9 · {dict.tracking.openedOn}{' '}
                  {new Date(trade.opened_at).toLocaleString()}
                </p>
                <button
                  className="kriyo-btn kriyo-btn--secondary"
                  style={{ marginTop: '0.6rem' }}
                  onClick={() => {
                    setClosingTradeId(trade.id);
                    setPnlInput('');
                    setCloseError('');
                  }}
                >
                  {dict.tracking.closePosition}
                </button>
              </div>
            );
          })
        )}
      </div>

      {lastOutcome ? (
        <div className="kriyo-result-card" data-tier={lastOutcome.outcome.status === 'VERROUILLE' ? 'locked' : 'pass_good'}>
          {(() => {
            const { label, reason } = outcomeText(lastOutcome.outcome);
            return (
              <>
                <p className="kriyo-result-title">{label}</p>
                <p className="kriyo-result-body">{reason}</p>
              </>
            );
          })()}
        </div>
      ) : null}

      <div className="kriyo-stack">
        <p className="kriyo-dim">{dict.tracking.history}</p>
        {trades.filter((t) => t.status !== 'EN_COURS').length === 0 ? (
          <p className="kriyo-dim">{dict.tracking.noHistory}</p>
        ) : (
          trades
            .filter((t) => t.status !== 'EN_COURS')
            .map((trade) => {
              const account = accountsById[trade.account];
              return (
                <div key={trade.id} className="kriyo-palier">
                  <p className="kriyo-palier-title">{account?.name ?? `#${trade.account}`}</p>
                  <p className="kriyo-palier-note">
                    {trade.status} · PnL {trade.pnl != null ? formatCurrency(trade.pnl) : '—'}
                  </p>
                </div>
              );
            })
        )}
      </div>

      <button className="kriyo-btn kriyo-btn--secondary" onClick={onBack}>
        {dict.common.back}
      </button>

      {closingTrade ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', zIndex: 50 }}>
          <div className="kriyo-card" style={{ width: '100%', maxWidth: 420 }}>
            <p className="kriyo-palier-title">{dict.tracking.modalTitle}</p>
            <input
              className="kriyo-input"
              type="number"
              placeholder={dict.tracking.pnlPlaceholder}
              value={pnlInput}
              onChange={(e) => setPnlInput(e.target.value)}
              style={{ marginTop: '0.75rem' }}
            />
            {closeError ? <p className="kriyo-error">{closeError}</p> : null}
            <div className="kriyo-btn-row" style={{ marginTop: '0.75rem' }}>
              <button className="kriyo-btn kriyo-btn--secondary" onClick={() => setClosingTradeId(null)} disabled={closing}>
                {dict.common.cancel}
              </button>
              <button className="kriyo-btn kriyo-btn--primary" onClick={handleClose} disabled={closing}>
                {closing ? dict.tracking.closingButton : dict.tracking.validateResult}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
