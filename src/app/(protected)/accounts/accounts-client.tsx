"use client";

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getActiveUserId } from '@/lib/auth/client-user';
import { getKriyoDb, type KriyoComptePropRecord, type KriyoProfilRisqueRecord } from '@/lib/db';
import { enqueueMutation } from '@/lib/sync/queue';
import { formatLocalTimestamp } from '@/lib/time';
import { PAYOUT_OPTIONS, PayoutToRiskProfile, RISK_PROFILE_PRESETS, type PayoutType } from '@/lib/risk-profiles';

const profileOrder = ['AGRESSIF', 'MODERE', 'CONSERVATEUR'] as const;

type FormState = {
  nom: string;
  capital: string;
  typePayout: PayoutType;
};

const initialForm: FormState = {
  nom: '',
  capital: '',
  typePayout: 'ON_DEMAND'
};

function formatCapital(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

export default function AccountsPage() {
  const [userId, setUserId] = useState('local-user');
  const [form, setForm] = useState<FormState>(initialForm);
  const [accounts, setAccounts] = useState<KriyoComptePropRecord[]>([]);
  const [profiles, setProfiles] = useState<KriyoProfilRisqueRecord[]>([]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');

  const profileByType = useMemo(() => Object.fromEntries(profiles.map((profile) => [profile.type, profile])) as Record<string, KriyoProfilRisqueRecord>, [profiles]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus('loading');
      setMessage('Chargement des comptes locaux...');

      try {
        const activeUserId = await getActiveUserId();
        if (cancelled) return;

        setUserId(activeUserId);
        const db = await getKriyoDb();

        const seededProfiles = profileOrder.map((type) => RISK_PROFILE_PRESETS[type]);
        await Promise.all(
          seededProfiles.map((preset) =>
            db.put('profilRisque', {
              id: preset.id,
              type: preset.type,
              dailyDD: preset.dailyDD ?? null,
              maxDD: preset.maxDD ?? null,
              plafondTP: preset.plafondTP ?? null
            })
          )
        );

        const [savedProfiles, savedAccounts] = await Promise.all([db.getAll('profilRisque'), db.getAll('comptesProp')]);
        if (cancelled) return;

        setProfiles(savedProfiles);
        setAccounts(savedAccounts.filter((account) => account.userId === activeUserId));
        setStatus('ready');
        setMessage(savedAccounts.length > 0 ? 'Comptes locaux chargés.' : 'Aucun compte pour le moment.');
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage('Impossible de charger les comptes locaux.');
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === 'loading' || status === 'saving') return;

    const capital = Number(form.capital);
    if (!form.nom.trim() || !Number.isFinite(capital) || capital <= 0) {
      setStatus('error');
      setMessage('Renseigne un nom de compte et un capital valide.');
      return;
    }

    try {
      setStatus('saving');
      setMessage('Sauvegarde du compte et du profil de risque...');

      const db = await getKriyoDb();
      const profileType = PayoutToRiskProfile[form.typePayout];
      const preset = RISK_PROFILE_PRESETS[profileType];
      const profile = {
        id: preset.id,
        type: preset.type,
        dailyDD: preset.dailyDD ?? null,
        maxDD: preset.maxDD ?? null,
        plafondTP: preset.plafondTP ?? null
      } satisfies KriyoProfilRisqueRecord;

      await db.put('profilRisque', profile);

      const account: KriyoComptePropRecord = {
        id: `compte-${crypto.randomUUID()}`,
        userId,
        nom: form.nom.trim(),
        capital,
        typePayout: form.typePayout,
        profilRisqueId: profile.id,
        createdAt: new Date().toISOString()
      };

      await db.put('comptesProp', account);
      await enqueueMutation('create_compte_prop', account);

      setProfiles((current) => {
        const existing = current.filter((item) => item.type !== profile.type);
        return [...existing, profile].sort((a, b) => profileOrder.indexOf(a.type) - profileOrder.indexOf(b.type));
      });
      setAccounts((current) => [account, ...current]);
      setForm(initialForm);
      setStatus('ready');
      setMessage(`Profil de risque configuré: ${preset.label}.`);
    } catch {
      setStatus('error');
      setMessage('Impossible d’enregistrer le compte localement.');
    }
  }

  return (
    <AppShell title="Comptes & Onboarding" subtitle="Configuration des comptes prop firm et des profils de risque.">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-kriyo-text">Création locale</p>
              <p className="mt-1 text-sm text-kriyo-dim">Nom, capital et payout suffisent. Le profil de risque est assigné automatiquement.</p>
            </div>
            <Badge className="border-kriyo-amber/30 bg-kriyo-amber/10 text-kriyo-amber">Sprint 2</Badge>
          </div>
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.14em] text-kriyo-dim" htmlFor="nom">Nom du compte</label>
              <input
                id="nom"
                value={form.nom}
                onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))}
                className="w-full rounded-xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3 text-sm text-kriyo-text outline-none transition placeholder:text-kriyo-faint focus:border-kriyo-cyan"
                placeholder="FTMO 5K"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.14em] text-kriyo-dim" htmlFor="capital">Capital initial</label>
                <input
                  id="capital"
                  type="number"
                  min="0"
                  step="100"
                  value={form.capital}
                  onChange={(event) => setForm((current) => ({ ...current, capital: event.target.value }))}
                  className="w-full rounded-xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3 text-sm text-kriyo-text outline-none transition placeholder:text-kriyo-faint focus:border-kriyo-cyan"
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.14em] text-kriyo-dim" htmlFor="payout">Type de payout</label>
                <select
                  id="payout"
                  value={form.typePayout}
                  onChange={(event) => setForm((current) => ({ ...current, typePayout: event.target.value as PayoutType }))}
                  className="w-full rounded-xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3 text-sm text-kriyo-text outline-none transition focus:border-kriyo-cyan"
                >
                  {PAYOUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button className="w-full" disabled={status === 'saving'} type="submit">
              {status === 'saving' ? 'Sauvegarde...' : 'Ajouter un compte'}
            </Button>
            <p className={status === 'error' ? 'text-xs leading-5 text-kriyo-danger' : 'text-xs leading-5 text-kriyo-dim'}>{message}</p>
          </form>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-medium text-kriyo-text">Profils de risque actifs</p>
          <div className="mt-3 grid gap-3">
            {profileOrder.map((type) => {
              const profile = profileByType[type];
              const preset = RISK_PROFILE_PRESETS[type];
              return (
                <div key={type} className="rounded-2xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-kriyo-text">{preset.label}</p>
                      <p className="mt-1 text-xs text-kriyo-dim">{preset.note}</p>
                    </div>
                    <Badge className="border-kriyo-borderSoft bg-kriyo-elevated text-kriyo-dim">{profile ? 'seeded' : 'preset'}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-kriyo-dim">
                    {preset.plafondTP ? `TP forcé ${preset.plafondTP}%` : `Daily DD ${preset.dailyDD ?? '—'}% · Max DD ${preset.maxDD ?? '—'}%`}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-kriyo-text">Comptes enregistrés</p>
            <Badge className="border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success">{accounts.length}</Badge>
          </div>
          <div className="mt-3 space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-kriyo-dim">Aucun compte local pour le moment.</p>
            ) : (
              accounts.map((account) => {
                const profile = profiles.find((item) => item.id === account.profilRisqueId);
                return (
                  <div key={account.id} className="rounded-2xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-kriyo-text">{account.nom}</p>
                        <p className="mt-1 text-xs text-kriyo-dim">{formatCapital(account.capital)} · {account.typePayout}</p>
                      </div>
                      <Badge className="border-kriyo-cyan/30 bg-kriyo-cyan/10 text-kriyo-cyan">{profile?.type ?? '—'}</Badge>
                    </div>
                    <p className="mt-3 text-xs text-kriyo-dim">Créé {formatLocalTimestamp(account.createdAt)}</p>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
