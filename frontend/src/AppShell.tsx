import type { ReactNode } from 'react';
import { LanguageSwitch } from './i18n/LanguageSwitch';
import { useLanguage } from './i18n/context';
import { useOnlineStatus } from './hooks/useOnlineStatus';

export default function AppShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { dict } = useLanguage();
  const online = useOnlineStatus();

  return (
    <div className="kriyo-shell">
      {online ? null : (
        <div className="kriyo-offline-banner" role="status">
          {dict.common.offlineBanner}
        </div>
      )}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <p className="kriyo-brand">Kriyo</p>
          <h1 className="kriyo-title">{title}</h1>
          {subtitle ? <p className="kriyo-subtitle">{subtitle}</p> : null}
        </div>
        <LanguageSwitch />
      </header>
      <div className="kriyo-card kriyo-stack">{children}</div>
    </div>
  );
}
