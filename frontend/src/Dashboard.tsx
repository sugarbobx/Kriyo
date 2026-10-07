import { useEffect, useState } from 'react';
import { api, type GateState, type User } from './api/client';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';
import { interpolate } from './i18n/translations';

export default function Dashboard({
  user,
  onLogout,
  onOpenGate,
  onOpenPerformance,
  onOpenTracking,
  onOpenEducation
}: {
  user: User;
  onLogout: () => void;
  onOpenGate: () => void;
  onOpenPerformance: () => void;
  onOpenTracking: () => void;
  onOpenEducation: () => void;
}) {
  const { dict } = useLanguage();
  const [gate, setGate] = useState<GateState | null>(null);

  useEffect(() => {
    api.gate.current().then(setGate).catch(() => setGate(null));
  }, []);

  const gateValidatedToday = gate?.status === 'passed_today';
  const gateLabel =
    gate == null
      ? '...'
      : gateValidatedToday
        ? dict.dashboard.validatedLocked
        : gate.status === 'locked'
          ? dict.dashboard.lockedCooldown
          : dict.dashboard.open;

  return (
    <AppShell title={dict.dashboard.title} subtitle={dict.dashboard.subtitle}>
      <p className="kriyo-dim">
        {dict.dashboard.connectedAs} <strong style={{ color: 'var(--kriyo-text)' }}>{user.email}</strong>
      </p>

      {gate ? (
        <div className="kriyo-palier" style={gate.streak > 0 ? { borderColor: 'rgba(232,163,61,0.35)' } : undefined}>
          <p className="kriyo-palier-eyebrow" style={gate.streak > 0 ? { color: 'var(--kriyo-amber)' } : undefined}>
            {dict.dashboard.streakLabel}
          </p>
          <p className="kriyo-palier-title">
            {gate.streak > 0 ? `🔥 ${interpolate(dict.dashboard.streakDays, { n: String(gate.streak) })}` : dict.dashboard.streakZero}
          </p>
        </div>
      ) : null}

      <div className="kriyo-stack">
        <button
          type="button"
          className="kriyo-palier"
          data-available={!gateValidatedToday}
          onClick={gateValidatedToday ? undefined : onOpenGate}
          style={{ textAlign: 'left', width: '100%', cursor: gateValidatedToday ? 'default' : 'pointer', font: 'inherit', color: 'inherit' }}
        >
          <p className="kriyo-palier-eyebrow">Palier 01</p>
          <p className="kriyo-palier-title">{dict.dashboard.palier01Title}</p>
          <p className="kriyo-palier-note">{gateLabel}</p>
        </button>

        <button
          type="button"
          className="kriyo-palier"
          onClick={onOpenPerformance}
          style={{ textAlign: 'left', width: '100%', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
        >
          <p className="kriyo-palier-eyebrow">Palier 02</p>
          <p className="kriyo-palier-title">{dict.dashboard.palier02Title}</p>
          <p className="kriyo-palier-note">{dict.dashboard.open}</p>
        </button>

        <div className="kriyo-palier" data-available="false">
          <p className="kriyo-palier-eyebrow">Palier 03</p>
          <p className="kriyo-palier-title">{dict.dashboard.palier03Title}</p>
          <p className="kriyo-palier-note">{dict.dashboard.comingSoon}</p>
        </div>
      </div>

      <div className="kriyo-btn-row">
        <button className="kriyo-btn kriyo-btn--secondary" onClick={onOpenTracking}>
          {dict.dashboard.tracking}
        </button>
        <button className="kriyo-btn kriyo-btn--secondary" onClick={onOpenEducation}>
          {dict.dashboard.education}
        </button>
      </div>

      <button className="kriyo-btn kriyo-btn--secondary" onClick={onLogout}>
        {dict.common.logout}
      </button>
    </AppShell>
  );
}
