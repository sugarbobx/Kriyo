import { BottomNav } from '@/components/layout/bottom-nav';
import { Card } from '@/components/ui/card';
import type { ReactNode } from 'react';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="min-h-[100svh] pb-24">
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-5">
        <header className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-cyan">Kriyo</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-kriyo-text">{title}</h1>
          {subtitle ? <p className="text-sm text-kriyo-dim">{subtitle}</p> : null}
        </header>
        <Card className="p-4">{children}</Card>
      </main>
      <BottomNav />
    </div>
  );
}
