import type { User } from './api/client';

const paliers = [
  { title: 'Palier 01', subtitle: 'Sas de Sécurité', available: true },
  { title: 'Palier 02', subtitle: 'Score de Performance', available: true },
  { title: 'Palier 03', subtitle: 'Routage Prop Firm', available: false }
] as const;

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div>
      <h2>Tableau de Bord</h2>
      <p>
        Connecté en tant que <strong>{user.email}</strong>
      </p>
      <div style={{ display: 'grid', gap: '0.75rem', margin: '1rem 0' }}>
        {paliers.map((palier) => (
          <div
            key={palier.title}
            style={{
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              opacity: palier.available ? 1 : 0.6
            }}
          >
            <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {palier.title}
            </p>
            <p style={{ margin: '0.25rem 0 0' }}>{palier.subtitle}</p>
            {!palier.available ? <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>Bientôt disponible</p> : null}
          </div>
        ))}
      </div>
      <button onClick={onLogout}>Log out</button>
    </div>
  );
}
