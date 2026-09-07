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
import { formatCountdown, formatLocalTimestamp, getLocalDateKey, getNextLocalMidnight } from '@/lib/time';
import { APP_BASE_PATH } from '@/lib/app-config';
import { useLanguage } from '@/lib/i18n/context';

const LOCK_DURATION_MS = 30 * 60 * 1000;

const criteriaKeys = ['tension', 'ecran', 'telephone', 'macro', 'alignement'] as const;
const criteriaGroup: Record<(typeof criteriaKeys)[number], 'psy' | 'tech'> = {
  tension: 'psy',
  ecran: 'psy',
  telephone: 'psy',
  macro: 'tech',
  alignement: 'tech'
};

type CriterionKey = (typeof criteriaKeys)[number];
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
  const { dict, intlLocale } = useLanguage();
  const [userId, setUserId] = useState('local-user');
  const [dayKey, setDayKey] = useState(() => getLocalDateKey());
  const [values, setValues] = useState<SasValues>(defaultValues);
  const [status, setStatus] = useState<'loading' | 'ready' | 'locked' | 'saved' | 'error'>('loading');
  const [message, setMessage] = useState(dict.sas.loadingMsg);
  const [lockExpiresAt, setLockExpiresAt] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [lastValidationAt, setLastValidationAt] = useState<string | null>(null);

  const score = useMemo(() => Object.values(values).filter(Boolean).length, [values]);
  const gateOpen = score === criteriaKeys.length;
  const isLocked = status === 'locked';
  const isLoading = status === 'loading';

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus('loading');
      setMessage(dict.sas.loadingMsg);

      try {
        const activeUserId = await getActiveUserId();
        if (cancelled) return;

        setUserId(activeUserId);
        const db = await getKriyoDb();
        const existing = await db.get('validationsSas', getValidationId(activeUserId, dayKey));

        if (cancelled) return;

        if (existing) {
          setLastValidationAt(existing.dateValidation);

          if (existing.valide) {
            setValues({
              tension: existing.tension,
              ecran: existing.ecran,
              telephone: existing.telephone,
              macro: existing.macro,
              alignement: existing.alignement
            });
            setCookie(buildKriyoSessionCookie(getNextLocalMidnight()));
            setStatus('saved');
            setLockExpiresAt(null);
            setMessage(dict.sas.savedMsg);
            return;
          }

          const lockExpiry = existing.lockExpiresAt ? new Date(existing.lockExpiresAt) : null;
          const stillLocked = lockExpiry != null && lockExpiry.getTime() > Date.now();

          setCookie(clearKriyoSessionCookie());

          if (stillLocked) {
            setValues({
              tension: existing.tension,
              ecran: existing.ecran,
              telephone: existing.telephone,
              macro: existing.macro,
              alignement: existing.alignement
            });
            setStatus('locked');
            setLockExpiresAt(existing.lockExpiresAt ?? null);
            setMessage(dict.sas.lockedMsgPrefix);
          } else {
            setValues(defaultValues);
            setStatus('ready');
            setLockExpiresAt(null);
            setMessage(dict.sas.readyMsg);
          }
          return;
        }

        setCookie(clearKriyoSessionCookie());
        setValues(defaultValues);
        setLastValidationAt(null);
        setLockExpiresAt(null);
        setStatus('ready');
        setMessage(dict.sas.readyMsg);
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage(dict.sas.errorLoadMsg);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDayKey(getLocalDateKey());
    }, 24 * 60 * 60 * 1000);

    return () => window.clearTimeout(timeout);
  }, [dayKey]);

  useEffect(() => {
    if (status !== 'locked' || !lockExpiresAt) {
      setRemainingMs(null);
      return;
    }

    function tick() {
      const remaining = new Date(lockExpiresAt as string).getTime() - Date.now();
      if (remaining <= 0) {
        setStatus('ready');
        setValues(defaultValues);
        setLockExpiresAt(null);
        setRemainingMs(null);
        setMessage(dict.sas.lockExpiredMsg);
        return;
      }
      setRemainingMs(remaining);
    }

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, lockExpiresAt]);

  async function persistValidation(valid: boolean, nextLockExpiresAt: string | null) {
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
      dateValidation,
      lockExpiresAt: nextLockExpiresAt
    };

    await db.put('validationsSas', record);
    await enqueueMutation('validation_sas', record);
    return record;
  }

  async function handleValidate() {
    if (isLocked || isLoading) return;

    try {
      if (gateOpen) {
        const record = await persistValidation(true, null);
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
        setMessage(dict.sas.validatingMsg);
        window.location.assign(`${APP_BASE_PATH}/dashboard`);
        return;
      }

      const nextLockExpiresAt = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
      const record = await persistValidation(false, nextLockExpiresAt);
      setCookie(clearKriyoSessionCookie());
      setStatus('locked');
      setLockExpiresAt(nextLockExpiresAt);
      setLastValidationAt(record.dateValidation);
      setMessage(dict.sas.lockedMsgPrefix);
    } catch {
      setStatus('error');
      setMessage(dict.sas.errorSaveMsg);
    }
  }

  return (
    <AppShell title={dict.sas.title} subtitle={dict.sas.subtitle}>
      <div className="space-y-4">
        <Card className={isLocked ? 'border-kriyo-danger/40 bg-kriyo-danger/10 p-4' : gateOpen ? 'border-kriyo-success/40 bg-kriyo-success/10 p-4' : 'border-kriyo-borderSoft bg-kriyo-bg p-4'}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge className={isLocked ? 'border-kriyo-danger/30 bg-kriyo-danger/10 text-kriyo-danger' : gateOpen ? 'border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success' : 'border-kriyo-amber/30 bg-kriyo-amber/10 text-kriyo-amber'}>
                {status === 'saved' ? dict.sas.badgeSaved : isLocked ? dict.sas.badgeLocked : dict.sas.badgeControl}
              </Badge>
              <p className="text-sm text-kriyo-text">{message}</p>
              {isLocked && remainingMs != null ? (
                <p className="font-mono text-3xl font-semibold tracking-tight text-kriyo-danger">{formatCountdown(remainingMs)}</p>
              ) : null}
              <p className="text-xs text-kriyo-dim">
                {isLocked
                  ? dict.sas.timerCountdownLabel
                  : lastValidationAt
                    ? `${dict.sas.lastValidationPrefix} ${formatLocalTimestamp(lastValidationAt, intlLocale)}`
                    : dict.sas.noValidation}
              </p>
            </div>
            <div className="rounded-2xl border border-kriyo-borderSoft bg-kriyo-elevated px-4 py-3 text-right">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-kriyo-dim">{dict.sas.scoreLabel}</p>
              <p className={`mt-2 text-3xl font-semibold ${gateOpen ? 'text-kriyo-success' : 'text-kriyo-amber'}`}>{score}/5</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-3">
          {criteriaKeys.map((key) => (
            <Switch
              key={key}
              checked={values[key]}
              disabled={isLocked || isLoading}
              onCheckedChange={(checked) => {
                setValues((current) => ({ ...current, [key]: checked }));
                if (status === 'saved') {
                  setStatus('ready');
                  setMessage(dict.sas.changedMsg);
                }
              }}
              label={dict.sas.criteria[key].label}
              description={`${criteriaGroup[key] === 'psy' ? dict.sas.groupPsy : dict.sas.groupTech} · ${dict.sas.criteria[key].description}`}
            />
          ))}
        </div>

        <Button className="w-full" disabled={isLoading} onClick={handleValidate} type="button">
          {isLocked ? dict.sas.lockedButton : dict.sas.validateButton}
        </Button>

        <p className="text-xs leading-5 text-kriyo-dim">{dict.sas.footerNote}</p>
      </div>
    </AppShell>
  );
}
