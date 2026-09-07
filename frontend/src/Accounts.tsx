import { useEffect, useState, type FormEvent } from 'react';
import { api, type PayoutType, type TradingAccount } from './api/client';
import AppShell from './AppShell';

const PAYOUT_OPTIONS: Array<{ value: PayoutType; label: string; note: string }> = [
  { value: 'ON_DEMAND', label: 'On-Demand', note: 'Extraction immédiate' },
  { value: 'DEUX_SEMAINES', label: '2 Semaines', note: 'Challenge avec DD journalier' },
  { value: 'UN_MOIS', label: '1 Mois', note: 'Capitalisation et DD global' }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function Accounts({ onBack }: { onBack: () => void }) {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [name, setName] = useState('');
  const [capital, setCapital] = useState('');
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
    if (!name.trim() || !Number.isFinite(capitalValue) || capitalValue <= 0) {
      setMessage('Renseigne un nom de compte et un capital valide.');
      return;
    }

    setStatus('saving');
    setMessage('');
    try {
      const account = await api.performance.createAccount(name.trim(), capitalValue, payoutType);
      setAccounts((current) => [account, ...current]);
      setName('');
      setCapital('');
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : "Impossible d'enregistrer le compte.");
    }
  }

  return (
    <AppShell title="Comptes & Onboarding" subtitle="Configuration des comptes prop firm et des profils de risque.">
      <form onSubmit={handleSubmit} className="kriyo-stack">
        <input
          className="kriyo-input"
          placeholder="Nom du compte (ex: FTMO 5K)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="kriyo-input"
          type="number"
          min="0"
          step="100"
          placeholder="Capital initial"
          value={capital}
          onChange={(e) => setCapital(e.target.value)}
        />
        <select className="kriyo-input" value={payoutType} onChange={(e) => setPayoutType(e.target.value as PayoutType)}>
          {PAYOUT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} — {option.note}
            </option>
          ))}
        </select>
        <button className="kriyo-btn kriyo-btn--primary" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Sauvegarde...' : 'Ajouter un compte'}
        </button>
        {message ? <p className="kriyo-error">{message}</p> : null}
      </form>

      <div className="kriyo-stack">
        {accounts.length === 0 ? (
          <p className="kriyo-dim">Aucun compte local pour le moment.</p>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="kriyo-palier">
              <p className="kriyo-palier-title">{account.name}</p>
              <p className="kriyo-palier-note">
                {formatCurrency(account.capital)} · {account.payout_type} · {account.risk_profile.label}
              </p>
            </div>
          ))
        )}
      </div>

      <button className="kriyo-btn kriyo-btn--secondary" onClick={onBack}>
        Retour au dashboard
      </button>
    </AppShell>
  );
}
