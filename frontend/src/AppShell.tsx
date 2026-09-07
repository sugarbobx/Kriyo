import type { ReactNode } from 'react';

export default function AppShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="kriyo-shell">
      <header>
        <p className="kriyo-brand">Kriyo</p>
        <h1 className="kriyo-title">{title}</h1>
        {subtitle ? <p className="kriyo-subtitle">{subtitle}</p> : null}
      </header>
      <div className="kriyo-card kriyo-stack">{children}</div>
    </div>
  );
}
