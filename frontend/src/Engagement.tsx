import { useState } from 'react';
import { api } from './api/client';
import AppShell from './AppShell';
import { useLanguage } from './i18n/context';

export default function Engagement({ onAccepted, onLogout }: { onAccepted: () => void; onLogout: () => void }) {
  const { dict } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    setSubmitting(true);
    setError('');
    try {
      await api.acceptEngagement();
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.engagement.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title={dict.engagement.title}>
      <p className="kriyo-dim">{dict.engagement.paragraph1}</p>
      <p className="kriyo-dim">{dict.engagement.paragraph2}</p>
      <button className="kriyo-btn kriyo-btn--primary" onClick={handleAccept} disabled={submitting}>
        {submitting ? dict.engagement.saving : dict.engagement.accept}
      </button>
      <button className="kriyo-btn kriyo-btn--secondary" onClick={onLogout} disabled={submitting}>
        {dict.common.logout}
      </button>
      {error ? <p className="kriyo-error">{error}</p> : null}
    </AppShell>
  );
}
