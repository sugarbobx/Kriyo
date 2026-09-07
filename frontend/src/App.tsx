import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiValidationError, type User } from './api/client';
import Engagement from './Engagement';
import Dashboard from './Dashboard';
import SecurityGate from './SecurityGate';
import Performance from './Performance';
import Accounts from './Accounts';
import AppShell from './AppShell';

const ENGAGEMENT_KEY = 'kriyo_engagement_accepted';

type PostAuthView = 'dashboard' | 'gate' | 'performance' | 'accounts';

export default function App() {
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [engaged, setEngaged] = useState(() => sessionStorage.getItem(ENGAGEMENT_KEY) === '1');
  const [view, setView] = useState<PostAuthView>('dashboard');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.health().then(() => setHealth('ok')).catch(() => setHealth('down'));
    api.csrf().finally(() => {
      api.me().then(setUser).catch(() => setUser(null)).finally(() => setCheckingSession(false));
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = mode === 'login' ? await api.login(email, password) : await api.signup(email, password);
      sessionStorage.removeItem(ENGAGEMENT_KEY);
      setEngaged(false);
      setView('dashboard');
      setUser(loggedInUser);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setError(Object.values(err.fieldErrors).flat().join(' '));
      } else {
        setError(err instanceof Error ? err.message : `${mode === 'login' ? 'Login' : 'Signup'} failed.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await api.logout();
    sessionStorage.removeItem(ENGAGEMENT_KEY);
    setEngaged(false);
    setView('dashboard');
    setUser(null);
  }

  function handleEngagementAccepted() {
    sessionStorage.setItem(ENGAGEMENT_KEY, '1');
    setEngaged(true);
  }

  function switchMode(next: 'login' | 'signup') {
    setMode(next);
    setError('');
  }

  if (checkingSession) {
    return (
      <AppShell title="Kriyo">
        <p className="kriyo-dim">Vérification de la session...</p>
      </AppShell>
    );
  }

  if (user && engaged && view === 'gate') {
    return <SecurityGate onDone={() => setView('dashboard')} />;
  }

  if (user && engaged && view === 'performance') {
    return <Performance onOpenAccounts={() => setView('accounts')} onBack={() => setView('dashboard')} />;
  }

  if (user && engaged && view === 'accounts') {
    return <Accounts onBack={() => setView('performance')} />;
  }

  if (user && engaged) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onOpenGate={() => setView('gate')}
        onOpenPerformance={() => setView('performance')}
      />
    );
  }

  if (user && !engaged) {
    return <Engagement onAccepted={handleEngagementAccepted} onLogout={handleLogout} />;
  }

  return (
    <AppShell title={mode === 'login' ? 'Connexion' : 'Créer un compte'} subtitle="Accède à ton espace Kriyo.">
      <span className={`kriyo-badge ${health === 'ok' ? 'kriyo-badge--success' : ''}`}>API {health}</span>

      <div className="kriyo-btn-row">
        <button
          type="button"
          className="kriyo-btn kriyo-btn--secondary"
          data-active={mode === 'login'}
          onClick={() => switchMode('login')}
        >
          Se connecter
        </button>
        <button
          type="button"
          className="kriyo-btn kriyo-btn--secondary"
          data-active={mode === 'signup'}
          onClick={() => switchMode('signup')}
        >
          Créer un compte
        </button>
      </div>

      <form onSubmit={handleSubmit} className="kriyo-stack">
        <input
          className="kriyo-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="kriyo-input"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
        />
        <button className="kriyo-btn kriyo-btn--primary" type="submit" disabled={submitting}>
          {submitting ? 'Patiente...' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
        </button>
        {error ? <p className="kriyo-error">{error}</p> : null}
      </form>
    </AppShell>
  );
}
