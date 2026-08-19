"use client";

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface AuthFormProps {
  mode: 'login' | 'signup';
  nextPath?: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export function AuthForm({ mode, nextPath = '/sas' }: AuthFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const canSubmit = email.trim().length > 0 && password.length >= 8 && status !== 'loading';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setStatus('error');
      setMessage(
        'Variables Supabase manquantes. Renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
      return;
    }

    setStatus('loading');
    setMessage('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus('error');
        setMessage(error.message);
        return;
      }

      router.replace(nextPath as any);
      router.refresh();
      return;
    }

    const redirectTo = new URL(nextPath, window.location.origin).toString();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    if (data.session) {
      router.replace(nextPath as any);
      router.refresh();
      return;
    }

    setStatus('success');
    setMessage('Compte créé. Vérifie ta boîte mail si la confirmation est activée.');
  }

  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.14em] text-kriyo-dim" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3 text-sm text-kriyo-text outline-none transition placeholder:text-kriyo-faint focus:border-kriyo-cyan"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.14em] text-kriyo-dim" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3 text-sm text-kriyo-text outline-none transition placeholder:text-kriyo-faint focus:border-kriyo-cyan"
            placeholder="••••••••"
          />
        </div>
        <Button className="w-full" disabled={!canSubmit} type="submit">
          {status === 'loading' ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
        </Button>
        <p
          aria-live="polite"
          className={cn(
            'text-xs leading-5',
            status === 'error' ? 'text-kriyo-danger' : status === 'success' ? 'text-kriyo-success' : 'text-kriyo-dim'
          )}
        >
          {message || 'L’authentification Supabase email/password est branchée directement depuis le navigateur.'}
        </p>
      </form>
    </Card>
  );
}
