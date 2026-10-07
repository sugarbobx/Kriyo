import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type Trade, type TradeOutcome, type TradingAccount } from './api/client';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';
import { interpolate } from './i18n/translations';
import { useAsyncResource } from './hooks/useAsyncResource';
import { formatCurrency } from './formatters';

interface TrackingData {
  accounts: TradingAccount[];
  trades: Trade[];
}

export default function Tracking({ onBack }: { onBack: () => void }) {
  const { dict } = useLanguage();
  const { data, status: loadStatus, error: loadError, reload, setData } = useAsyncResource<TrackingData>(
    () => Promise.all([api.performance.accounts(), api.performance.trades()]).then(([accounts, trades]) => ({ accounts, trades })),
    []
  );
  const accounts = data?.accounts ?? [];
  const trades = data?.trades ?? [];

  const [closingTradeId, setClosingTradeId] = useState<number | null>(null);
  const [pnlInput, setPnlInput] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');
  const [lastOutcome, setLastOutcome] = useState<{ tradeId: number; outcome: TradeOutcome } | null>(null);
  const pnlInputRef = useRef<HTMLInputElement>(null);

  const accountsById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const openTrades = trades.filter((t) => t.status === 'EN_COURS');
  const closingTrade = closingTradeId != null ? trades.find((t) => t.id === closingTradeId) ?? null : null;

  function isToday(isoDate: string) {
    const d = new Date(isoDate);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  const dailyPnl = useMemo(
    () =>
      trades
        .filter((t) => t.status !== 'EN_COURS' && t.closed_at && isToday(t.closed_at) && t.pnl != null)
        .reduce((sum, t) => sum + (t.pnl ?? 0), 0),
    [trades]
  );
  const hasClosedToday = trades.some((t) => t.status !== 'EN_COURS' && t.closed_at && isToday(t.closed_at));

  function outcomeText(outcome: TradeOutcome) {
    const copy = dict.tracking.reasons[outcome.reason_key];
    return { label: copy.label, reason: interpolate(copy.reason, { amount: formatCurrency(outcome.amount) }) };
  }

  // Surface the one existing psychology module most relevant to *why* this
  // trade just got locked, right when it's emotionally relevant -- instead
  // of leaving it buried in Education for the user to stumble on later.
  const RELEVANT_MODULE_INDEX: Partial<Record<TradeOutcome['reason_key'], number>> = {
    daily_drawdown: 2, // Casser le revenge trading
    max_drawdown: 0, // L'aversion à la perte
    take_profit_forced: 3, // Le processus plutôt que le résultat
  };

  function closeModal() {
    if (closing) return;
    setClosingTradeId(null);
  }

  useEffect(() => {
    if (!closingTrade) return;
    pnlInputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closingTrade]);

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
      setData((current) =>
        current ? { ...current, trades: current.trades.map((t) => (t.id === trade.id ? trade : t)) } : current
      );
      setLastOutcome({ tradeId: trade.id, outcome });
      setClosingTradeId(null);
      setPnlInput('');
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : dict.tracking.errorClose);
    } finally {
      setClosing(false);
    }
  }

  if (loadStatus === 'loading') {
    return (
      <AppShell title={dict.tracking.title}>
        <p className="kriyo-dim">{dict.common.loading}</p>
      </AppShell>
    );
  }

  if (loadStatus === 'error') {
    return (
      <AppShell title={dict.tracking.title}>
        <p className="kriyo-error">{loadError}</p>
        <button className="kriyo-btn kriyo-btn--secondary" onClick={reload}>
          {dict.common.retry}
        </button>
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

      {hasClosedToday ? (
        <div className="kriyo-result-card" data-tier={dailyPnl < 0 ? 'locked' : 'pass_good'}>
          <p className="kriyo-result-title">{dict.tracking.dailyPnlLabel}</p>
          <p className="kriyo-result-body">{formatCurrency(dailyPnl)}</p>
        </div>
      ) : null}

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

      {lastOutcome && RELEVANT_MODULE_INDEX[lastOutcome.outcome.reason_key] != null
        ? (() => {
            const module = dict.education.modules[RELEVANT_MODULE_INDEX[lastOutcome.outcome.reason_key]!];
            return (
              <div className="kriyo-palier">
                <p className="kriyo-palier-eyebrow">{dict.education.title}</p>
                <p className="kriyo-palier-title">{module.title}</p>
                <p className="kriyo-palier-note">{module.summary}</p>
              </div>
            );
          })()
        : null}

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
        <div
          role="presentation"
          onClick={closeModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', zIndex: 50 }}
        >
          <div
            className="kriyo-card"
            role="dialog"
            aria-modal="true"
            aria-label={dict.tracking.modalTitle}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 420 }}
          >
            <p className="kriyo-palier-title">{dict.tracking.modalTitle}</p>
            <div className="kriyo-field" style={{ marginTop: '0.75rem' }}>
              <label className="kriyo-field-label" htmlFor="pnl-input">{dict.tracking.pnlPlaceholder}</label>
              <input
                id="pnl-input"
                ref={pnlInputRef}
                className="kriyo-input"
                type="number"
                placeholder={dict.tracking.pnlPlaceholder}
                value={pnlInput}
                onChange={(e) => setPnlInput(e.target.value)}
              />
            </div>
            {closeError ? <p className="kriyo-error">{closeError}</p> : null}
            <div className="kriyo-btn-row" style={{ marginTop: '0.75rem' }}>
              <button className="kriyo-btn kriyo-btn--secondary" onClick={closeModal} disabled={closing}>
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
