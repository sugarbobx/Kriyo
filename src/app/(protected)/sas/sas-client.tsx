"use client";

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { enqueueMutation } from '@/lib/sync/queue';
import { getActiveUserId } from '@/lib/auth/client-user';
import { getKriyoDb, type KriyoValidationSasRecord } from '@/lib/db';
import { buildKriyoSessionCookie, clearKriyoSessionCookie } from '@/lib/session';
import { formatLocalTimestamp, getLocalDateKey, getMillisecondsUntilNextLocalMidnight, getNextLocalMidnight } from '@/lib/time';
import { APP_BASE_PATH } from '@/lib/app-config';

const criteria = [
  { key: 'tension', label: 'Tension', description: 'État mental et physique stable', group: 'Psy' },
  { key: 'ecran', label: 'Écran', description: 'Temps d’écran sous contrôle', group: 'Psy' },
  { key: 'telephone', label: 'Téléphone', description: 'Distractions minimisées', group: 'Psy' },
  { key: 'macro', label: 'Macro', description: 'Calendrier macro acceptable', group: 'Tech' },
  { key: 'alignement', label: 'Alignement', description: 'Contexte marché aligné', group: 'Tech' }
] as const;

type CriterionKey = (typeof criteria)[number]['key'];
type SasValues = Record<CriterionKey, boolean>;

const defaultValues: SasValues = {
  tension: false,
  ecran: false,
  telephone: false,
  macro: false,
  alignement: false
};

function getValidationId(userId: string, dayKey: string) {
  return `sas-${userId}-${dayKey}`;
}

function setCookie(value: string) {
  document.cookie = value;
}

export default function SasPage() {
  const [userId, setUserId] = useState('local-user');
  const [dayKey, setDayKey] = useState(() => getLocalDateKey());
  const [values, setValues] = useState<SasValues>(defaultValues);
  const [status, setStatus] = useState<'loading' | 'ready' | 'locked' | 'saved' | 'error'>('loading');
  const [message, setMessage] = useState('Chargement de la validation du jour...');
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [lastValidationAt, setLastValidationAt] = useState<string | null>(null);

  const score = useMemo(() => Object.values(values).filter(Boolean).length, [values]);
  const gateOpen = score === criteria.length;
  const isLocked = status === 'locked';
  const isLoading = status === 'loading';

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus('loading');
      setMessage('Chargement de la validation du jour...');

      try {
        const activeUserId = await getActiveUserId();
        if (cancelled) return;

        setUserId(activeUserId);
        const db = await getKriyoDb();
        const existing = await db.get('validationsSas', getValidationId(activeUserId, dayKey));

        if (cancelled) return;

        if (existing) {
          setValues({
            tension: existing.tension,
            ecran: existing.ecran,
            telephone: existing.telephone,
            macro: existing.macro,
            alignement: existing.alignement
          });
          setLastValidationAt(existing.dateValidation);

          if (existing.valide) {
            setCookie(buildKriyoSessionCookie(getNextLocalMidnight()));
            setStatus('saved');
            setLockedUntil(null);
            setMessage('Sas déjà validé aujourd’hui. Tu peux entrer dans le dashboard.');
          } else {
            setCookie(clearKriyoSessionCookie());
            const nextMidnight = getNextLocalMidnight();
            setStatus('locked');
            setLockedUntil(nextMidnight.toISOString());
            setMessage('Sas verrouillé jusqu’au prochain minuit local.');
          }
          return;
        }

        setCookie(clearKriyoSessionCookie());
        setValues(defaultValues);
        setLastValidationAt(null);
        setLockedUntil(null);
        setStatus('ready');
        setMessage('Active les 5 critères puis valide la session.');
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage('Impossible de charger le sas localement.');
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [dayKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDayKey(getLocalDateKey());
    }, getMillisecondsUntilNextLocalMidnight());

    return () => window.clearTimeout(timeout);
  }, [dayKey]);

  async function persistValidation(valid: boolean) {
    const db = await getKriyoDb();
    const dateValidation = new Date().toISOString();
    const record: KriyoValidationSasRecord = {
      id: getValidationId(userId, dayKey),
      userId,
      tension: values.tension,
      ecran: values.ecran,
      telephone: values.telephone,
      macro: values.macro,
      alignement: values.alignement,
      valide: valid,
      dateValidation
    };

    await db.put('validationsSas', record);
    await enqueueMutation('validation_sas', record);
    return record;
  }

  async function handleValidate() {
    if (isLocked || isLoading) return;

    try {
      if (gateOpen) {
        const record = await persistValidation(true);
        await getKriyoDb().then((db) =>
          db.put('sessions', {
            id: `session-${userId}-${dayKey}`,
            userId,
            dateDebut: record.dateValidation,
            dateFin: null
          })
        );
        setCookie(buildKriyoSessionCookie(getNextLocalMidnight()));
        setStatus('saved');
        setMessage('Sas validé. Redirection vers le dashboard...');
        window.location.assign(`${APP_BASE_PATH}/dashboard`);
        return;
      }

      const record = await persistValidation(false);
      const nextMidnight = getNextLocalMidnight();
      setCookie(clearKriyoSessionCookie());
      setStatus('locked');
      setLockedUntil(nextMidnight.toISOString());
      setLastValidationAt(record.dateValidation);
      setMessage('Un ou plusieurs critères sont à OFF. Sas verrouillé jusqu’à demain à minuit.');
    } catch {
      setStatus('error');
      setMessage('Impossible d’enregistrer la validation locale.');
    }
  }

  return (
    <AppShell title="Sas de Sécurité" subtitle="Porte obligatoire avant toute session de trading.">
      <div className="space-y-4">
        <Card className={isLocked ? 'border-kriyo-danger/40 bg-kriyo-danger/10 p-4' : gateOpen ? 'border-kriyo-success/40 bg-kriyo-success/10 p-4' : 'border-kriyo-borderSoft bg-kriyo-bg p-4'}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge className={isLocked ? 'border-kriyo-danger/30 bg-kriyo-danger/10 text-kriyo-danger' : gateOpen ? 'border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success' : 'border-kriyo-amber/30 bg-kriyo-amber/10 text-kriyo-amber'}>
                {status === 'saved' ? 'Session validée' : isLocked ? 'Session bloquée' : 'Sas en contrôle'}
              </Badge>
              <p className="text-sm text-kriyo-text">{message}</p>
              <p className="text-xs text-kriyo-dim">
                {status === 'locked'
                  ? `Réinitialisation automatique ${lockedUntil ? `le ${formatLocalTimestamp(lockedUntil)}` : 'à minuit local'}.`
                  : lastValidationAt
                    ? `Dernière validation locale: ${formatLocalTimestamp(lastValidationAt)}`
                    : 'Aucune validation locale enregistrée aujourd’hui.'}
              </p>
            </div>
            <div className="rounded-2xl border border-kriyo-borderSoft bg-kriyo-elevated px-4 py-3 text-right">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-kriyo-dim">Score</p>
              <p className={`mt-2 text-3xl font-semibold ${gateOpen ? 'text-kriyo-success' : 'text-kriyo-amber'}`}>{score}/5</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-3">
          {criteria.map((criterion) => (
            <Switch
              key={criterion.key}
              checked={values[criterion.key]}
              disabled={isLocked || isLoading}
              onCheckedChange={(checked) => {
                setValues((current) => ({ ...current, [criterion.key]: checked }));
                if (status === 'saved') {
                  setStatus('ready');
                  setMessage('Les critères ont changé. Revalide la session.');
                }
              }}
              label={criterion.label}
              description={`${criterion.group} · ${criterion.description}`}
            />
          ))}
        </div>

        <Button className="w-full" disabled={isLoading} onClick={handleValidate} type="button">
          {isLocked ? 'Sas verrouillé' : 'Valider ma Session'}
        </Button>

        <p className="text-xs leading-5 text-kriyo-dim">
          Le sas est persistant en IndexedDB. Si un critère est refusé, l’accès reste bloqué jusqu’au prochain minuit local.
        </p>
      </div>
    </AppShell>
  );
}
