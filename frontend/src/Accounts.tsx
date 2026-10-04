import { useEffect, useState, type FormEvent } from 'react';
import { api, type PayoutType, type TradingAccount } from './api/client';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';

const PAYOUT_TYPES: PayoutType[] = ['ON_DEMAND', 'DEUX_SEMAINES', 'UN_MOIS'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function Accounts({ onBack }: { onBack: () => void }) {
  const { dict } = useLanguage();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [name, setName] = useState('');
  const [capital, setCapital] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [payoutType, setPayoutType] = useState<PayoutType>('ON_DEMAND');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.performance
      .accounts()
      .then((data) => {
        setAccounts(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

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

    setStatus('saving');
    setMessage('');
    try {
      const account = await api.performance.createAccount(name.trim(), capitalValue, currentBalanceValue, payoutType);
      setAccounts((current) => [account, ...current]);
      setName('');
      setCapital('');
      setCurrentBalance('');
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : dict.accounts.errorSave);
    }
  }

  return (
    <AppShell title={dict.accounts.title} subtitle={dict.accounts.subtitle}>
      <form onSubmit={handleSubmit} className="kriyo-stack">
        <input
          className="kriyo-input"
          placeholder={dict.accounts.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="kriyo-input"
          type="number"
          min="0"
          step="any"
          placeholder={dict.accounts.capitalPlaceholder}
          value={capital}
          onChange={(e) => setCapital(e.target.value)}
        />
        <input
          className="kriyo-input"
          type="number"
          min="0"
          step="any"
          placeholder={dict.accounts.balancePlaceholder}
          value={currentBalance}
          onChange={(e) => setCurrentBalance(e.target.value)}
        />
        <select className="kriyo-input" value={payoutType} onChange={(e) => setPayoutType(e.target.value as PayoutType)}>
          {PAYOUT_TYPES.map((value) => (
            <option key={value} value={value}>
              {dict.accounts.payoutOptions[value]}
            </option>
          ))}
        </select>
        <button className="kriyo-btn kriyo-btn--primary" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? dict.accounts.savingButton : dict.accounts.addButton}
        </button>
        {message ? <p className="kriyo-error">{message}</p> : null}
      </form>

      <div className="kriyo-stack">
        {accounts.length === 0 ? (
          <p className="kriyo-dim">{dict.accounts.noAccountsYet}</p>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="kriyo-palier">
              <p className="kriyo-palier-title">{account.name}</p>
              <p className="kriyo-palier-note">
                {formatCurrency(account.capital)} → {formatCurrency(account.current_balance)} · {account.payout_type} ·{' '}
                {account.risk_profile.label}
              </p>
            </div>
          ))
        )}
      </div>

      <button className="kriyo-btn kriyo-btn--secondary" onClick={onBack}>
        {dict.common.back}
      </button>
    </AppShell>
  );
}
