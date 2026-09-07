import { useEffect, useState } from 'react';
import { api, type GateState, type User } from './api/client';
import AppShell from './AppShell';

export default function Dashboard({
  user,
  onLogout,
  onOpenGate,
  onOpenPerformance
}: {
  user: User;
  onLogout: () => void;
  onOpenGate: () => void;
  onOpenPerformance: () => void;
}) {
  const [gate, setGate] = useState<GateState | null>(null);

  useEffect(() => {
    api.gate.current().then(setGate).catch(() => setGate(null));
  }, []);

  const gateValidatedToday = gate?.status === 'passed_today';
  const gateLabel = gate == null ? '...' : gateValidatedToday ? 'Validé ✓ — verrouillé' : gate.status === 'locked' ? 'Verrouillé (cooldown)' : 'Open';

  return (
    <AppShell title="Tableau de Bord" subtitle="Hub central des paliers Kriyo.">
      <p className="kriyo-dim">
        Connecté en tant que <strong style={{ color: 'var(--kriyo-text)' }}>{user.email}</strong>
      </p>
      <div className="kriyo-stack">
        <button
          type="button"
          className="kriyo-palier"
          data-available={!gateValidatedToday}
          onClick={gateValidatedToday ? undefined : onOpenGate}
          style={{ textAlign: 'left', width: '100%', cursor: gateValidatedToday ? 'default' : 'pointer', font: 'inherit', color: 'inherit' }}
        >
          <p className="kriyo-palier-eyebrow">Palier 01</p>
          <p className="kriyo-palier-title">Security Gate</p>
          <p className="kriyo-palier-note">{gateLabel}</p>
        </button>

        <button
          type="button"
          className="kriyo-palier"
          onClick={onOpenPerformance}
          style={{ textAlign: 'left', width: '100%', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
        >
          <p className="kriyo-palier-eyebrow">Palier 02</p>
          <p className="kriyo-palier-title">Score de Performance</p>
          <p className="kriyo-palier-note">Open</p>
        </button>

        <div className="kriyo-palier" data-available="false">
          <p className="kriyo-palier-eyebrow">Palier 03</p>
          <p className="kriyo-palier-title">Prop firm routing</p>
          <p className="kriyo-palier-note">Bientôt disponible</p>
        </div>
      </div>
      <button className="kriyo-btn kriyo-btn--secondary" onClick={onLogout}>
        Log out
      </button>
    </AppShell>
  );
}
