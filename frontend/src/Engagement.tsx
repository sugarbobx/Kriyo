import { useState } from 'react';
import { api } from './api/client';
import AppShell from './AppShell';

export default function Engagement({ onAccepted, onLogout }: { onAccepted: () => void; onLogout: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    setSubmitting(true);
    setError('');
    try {
      await api.acceptEngagement();
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer l'engagement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Bienvenue sur Kriyo">
      <p className="kriyo-dim">
        Kriyo est un outil éducatif conçu pour t'aider à mieux comprendre et gérer ton trading. Pour que
        l'accompagnement soit vraiment utile, tes réponses doivent refléter fidèlement ta réalité — pas ce que tu
        penses « devoir » répondre.
      </p>
      <p className="kriyo-dim">En continuant, tu t'engages à répondre avec honnêteté et sincérité tout au long de ton parcours.</p>
      <button className="kriyo-btn kriyo-btn--primary" onClick={handleAccept} disabled={submitting}>
        {submitting ? 'Enregistrement...' : "J'accepte et je continue"}
      </button>
      <button className="kriyo-btn kriyo-btn--secondary" onClick={onLogout} disabled={submitting}>
        Se déconnecter
      </button>
      {error ? <p className="kriyo-error">{error}</p> : null}
    </AppShell>
  );
}
