import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiValidationError, type User } from './api/client';
import Engagement from './Engagement';
import Dashboard from './Dashboard';
import SecurityGate from './SecurityGate';
import Performance from './Performance';
import Accounts from './Accounts';
import Tracking from './Tracking';
import Education from './Education';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';

const ENGAGEMENT_KEY = 'kriyo_engagement_accepted';

type PostAuthView = 'dashboard' | 'gate' | 'performance' | 'accounts' | 'tracking' | 'education';

export default function App() {
  const { dict } = useLanguage();
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [engaged, setEngaged] = useState(() => sessionStorage.getItem(ENGAGEMENT_KEY) === '1');
  const [view, setView] = useState<PostAuthView>('dashboard');
  const [routeReady, setRouteReady] = useState(false);
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

  useEffect(() => {
    function onSessionExpired() {
      sessionStorage.removeItem(ENGAGEMENT_KEY);
      setEngaged(false);
      setRouteReady(false);
      setView('dashboard');
      setUser(null);
    }
    window.addEventListener('kriyo:session-expired', onSessionExpired);
    return () => window.removeEventListener('kriyo:session-expired', onSessionExpired);
  }, []);

  useEffect(() => {
    if (!user || !engaged || routeReady) return;
    api.gate
      .current()
      .then((state) => setView(state.status === 'passed_today' ? 'dashboard' : 'gate'))
      .catch(() => setView('dashboard'))
      .finally(() => setRouteReady(true));
  }, [user, engaged, routeReady]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = mode === 'login' ? await api.login(email, password) : await api.signup(email, password);
      sessionStorage.removeItem(ENGAGEMENT_KEY);
      setEngaged(false);
      setRouteReady(false);
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
    setRouteReady(false);
    setView('dashboard');
    setUser(null);
  }

  async function handleDeleteAccount() {
    await api.deleteAccount();
    sessionStorage.removeItem(ENGAGEMENT_KEY);
    setEngaged(false);
    setRouteReady(false);
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
        <p className="kriyo-dim">{dict.auth.checkingSession}</p>
      </AppShell>
    );
  }

  if (user && engaged && !routeReady) {
    return (
      <AppShell title="Kriyo">
        <p className="kriyo-dim">{dict.common.loading}</p>
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

  if (user && engaged && view === 'tracking') {
    return <Tracking onBack={() => setView('dashboard')} />;
  }

  if (user && engaged && view === 'education') {
    return <Education onBack={() => setView('dashboard')} />;
  }

  if (user && engaged) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onOpenGate={() => setView('gate')}
        onOpenPerformance={() => setView('performance')}
        onOpenTracking={() => setView('tracking')}
        onOpenEducation={() => setView('education')}
      />
    );
  }

  if (user && !engaged) {
    return <Engagement onAccepted={handleEngagementAccepted} onLogout={handleLogout} />;
  }

  return (
    <AppShell title={mode === 'login' ? dict.auth.loginTitle : dict.auth.signupTitle} subtitle={dict.auth.subtitle}>
      <span className={`kriyo-badge ${health === 'ok' ? 'kriyo-badge--success' : ''}`}>
        {dict.auth.apiHealth} {health}
      </span>

      <div className="kriyo-btn-row">
        <button
          type="button"
          className="kriyo-btn kriyo-btn--secondary"
          data-active={mode === 'login'}
          onClick={() => switchMode('login')}
        >
          {dict.auth.login}
        </button>
        <button
          type="button"
          className="kriyo-btn kriyo-btn--secondary"
          data-active={mode === 'signup'}
          onClick={() => switchMode('signup')}
        >
          {dict.auth.createAccount}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="kriyo-stack">
        <div className="kriyo-field">
          <label className="kriyo-field-label" htmlFor="auth-email">{dict.auth.email}</label>
          <input
            id="auth-email"
            className="kriyo-input"
            type="email"
            placeholder={dict.auth.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="kriyo-field">
          <label className="kriyo-field-label" htmlFor="auth-password">{dict.auth.password}</label>
          <input
            id="auth-password"
            className="kriyo-input"
            type="password"
            placeholder={dict.auth.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
          />
        </div>
        <button className="kriyo-btn kriyo-btn--primary" type="submit" disabled={submitting}>
          {submitting ? dict.auth.pleaseWait : mode === 'login' ? dict.auth.login : dict.auth.signup}
        </button>
        {error ? <p className="kriyo-error">{error}</p> : null}
      </form>
    </AppShell>
  );
}
