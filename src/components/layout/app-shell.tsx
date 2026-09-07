"use client";

import { BottomNav } from '@/components/layout/bottom-nav';
import { Card } from '@/components/ui/card';
import { LanguageSwitch } from '@/components/i18n/language-switch';
import { useLanguage } from '@/lib/i18n/context';
import type { ReactNode } from 'react';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const { dict } = useLanguage();

  return (
    <div className="min-h-[100svh] pb-24">
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-5">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-cyan">{dict.appShell.brand}</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-kriyo-text">{title}</h1>
            {subtitle ? <p className="text-sm text-kriyo-dim">{subtitle}</p> : null}
          </div>
          <LanguageSwitch />
        </header>
        <Card className="p-4">{children}</Card>
      </main>
      <BottomNav />
    </div>
  );
}
