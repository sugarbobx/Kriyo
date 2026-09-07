import { useEffect, useState, type FormEvent } from 'react';
import { api, type User } from './api/client';

export default function App() {
  const [health, setHealth] = useState<'checking' | 'ok' | 'down'>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.health().then(() => setHealth('ok')).catch(() => setHealth('down'));
    api.csrf().finally(() => {
      api.me().then(setUser).catch(() => setUser(null)).finally(() => setCheckingSession(false));
    });
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const loggedInUser = await api.login(email, password);
      setUser(loggedInUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    }
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
  }

  return (
    <main style={{ maxWidth: 420, margin: '10vh auto', fontFamily: 'system-ui, sans-serif', padding: '0 1rem' }}>
      <h1>Kriyo</h1>
      <p>
        API health: <strong>{health}</strong>
      </p>

      {checkingSession ? (
        <p>Checking session...</p>
      ) : user ? (
        <div>
          <p>
            Logged in as <strong>{user.email}</strong>
          </p>
          <button onClick={handleLogout}>Log out</button>
        </div>
      ) : (
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '0.5rem' }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Log in</button>
          {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        </form>
      )}
    </main>
  );
}
