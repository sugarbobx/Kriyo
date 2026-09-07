import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiValidationError, type User } from './api/client';
import Engagement from './Engagement';
import Dashboard from './Dashboard';

const ENGAGEMENT_KEY = 'kriyo_engagement_accepted';

export default function App() {
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [engaged, setEngaged] = useState(() => sessionStorage.getItem(ENGAGEMENT_KEY) === '1');
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

  return (
    <main style={{ maxWidth: 420, margin: '10vh auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' }}>
      <h1>Kriyo</h1>
      <p>
        API health: <strong>{health}</strong>
      </p>

      {checkingSession ? (
        <p>Checking session...</p>
      ) : !user ? (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button type="button" onClick={() => switchMode('login')} disabled={mode === 'login'}>
              Log in
            </button>
            <button type="button" onClick={() => switchMode('signup')} disabled={mode === 'signup'}>
              Create account
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.5rem' }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
            <button type="submit" disabled={submitting}>
              {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
            {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
          </form>
        </div>
      ) : !engaged ? (
        <Engagement onAccepted={handleEngagementAccepted} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </main>
  );
}
