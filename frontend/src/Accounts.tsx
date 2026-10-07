import { useState, type FormEvent } from 'react';
import { api, type PayoutType } from './api/client';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';
import { useAsyncResource } from './hooks/useAsyncResource';
import { formatCurrency } from './formatters';

const PAYOUT_TYPES: PayoutType[] = ['ON_DEMAND', 'DEUX_SEMAINES', 'UN_MOIS'];

export default function Accounts({ onBack }: { onBack: () => void }) {
  const { dict } = useLanguage();
  const { data: accounts, status: loadStatus, error: loadError, reload, setData: setAccounts } = useAsyncResource(
    () => api.performance.accounts(),
    []
  );
  const [name, setName] = useState('');
  const [capital, setCapital] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [payoutType, setPayoutType] = useState<PayoutType>('ON_DEMAND');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const capitalValue = Number(capital);
    const currentBalanceValue = Number(currentBalance);
    if (
      !name.trim() ||
      !Number.isFinite(capitalValue) ||
      capitalValue <= 0 ||
      !Number.isFinite(currentBalanceValue) ||
      currentBalanceValue < 0
    ) {
      setMessage(dict.accounts.invalidForm);
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const account = await api.performance.createAccount(name.trim(), capitalValue, currentBalanceValue, payoutType);
      setAccounts((current) => [account, ...(current ?? [])]);
      setName('');
      setCapital('');
      setCurrentBalance('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : dict.accounts.errorSave);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title={dict.accounts.title} subtitle={dict.accounts.subtitle}>
      <form onSubmit={handleSubmit} className="kriyo-stack">
        <div className="kriyo-field">
          <label className="kriyo-field-label" htmlFor="account-name">{dict.accounts.namePlaceholder}</label>
          <input
            id="account-name"
            className="kriyo-input"
            placeholder={dict.accounts.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="kriyo-field">
          <label className="kriyo-field-label" htmlFor="account-capital">{dict.accounts.capitalPlaceholder}</label>
          <input
            id="account-capital"
            className="kriyo-input"
            type="number"
            min="0"
            step="any"
            placeholder={dict.accounts.capitalPlaceholder}
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
          />
        </div>
        <div className="kriyo-field">
          <label className="kriyo-field-label" htmlFor="account-balance">{dict.accounts.balancePlaceholder}</label>
          <input
            id="account-balance"
            className="kriyo-input"
            type="number"
            min="0"
            step="any"
            placeholder={dict.accounts.balancePlaceholder}
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
          />
        </div>
        <select className="kriyo-input" value={payoutType} onChange={(e) => setPayoutType(e.target.value as PayoutType)}>
          {PAYOUT_TYPES.map((value) => (
            <option key={value} value={value}>
              {dict.accounts.payoutOptions[value]}
            </option>
          ))}
        </select>
        <button className="kriyo-btn kriyo-btn--primary" type="submit" disabled={saving}>
          {saving ? dict.accounts.savingButton : dict.accounts.addButton}
        </button>
        {message ? <p className="kriyo-error">{message}</p> : null}
      </form>

      <div className="kriyo-stack">
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
          <p className="kriyo-dim">{dict.accounts.noAccountsYet}</p>
        ) : null}
        {loadStatus === 'ready' && accounts
          ? accounts.map((account) => (
              <div key={account.id} className="kriyo-palier">
                <p className="kriyo-palier-title">{account.name}</p>
                <p className="kriyo-palier-note">
                  {formatCurrency(account.capital)} → {formatCurrency(account.current_balance)} · {account.payout_type} ·{' '}
                  {account.risk_profile.label}
                </p>
              </div>
            ))
          : null}
      </div>

      <button className="kriyo-btn kriyo-btn--secondary" onClick={onBack}>
        {dict.common.back}
      </button>
    </AppShell>
  );
}
