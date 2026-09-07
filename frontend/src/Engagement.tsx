import { useState } from 'react';
import { api } from './api/client';

export default function Engagement({ onAccepted }: { onAccepted: () => void }) {
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
    <div>
      <h2>Engagement</h2>
      <p>
        Avant d'accéder à ton espace Kriyo, tu confirmes vouloir t'engager pleinement dans le processus : je
        m'engage à répondre honnêtement à chaque critère et question, sans chercher à contourner le système pour
        forcer un accès.
      </p>
      <button onClick={handleAccept} disabled={submitting}>
        {submitting ? 'Enregistrement...' : "J'accepte et je continue"}
      </button>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
    </div>
  );
}
