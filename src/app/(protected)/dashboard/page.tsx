import { cookies } from 'next/headers';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { KRIYO_SESSION_COOKIE } from '@/lib/session';
import { redirectTo } from '@/lib/redirect';
import { getServerDictionary } from '@/lib/i18n/locale';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  if (!cookieStore.has(KRIYO_SESSION_COOKIE)) {
    redirectTo('/sas');
  }

  const { dict } = await getServerDictionary();

  const pillars = [
    { title: dict.dashboard.pillar1Title, subtitle: dict.dashboard.pillar1Subtitle, href: '/sas', tone: 'text-kriyo-cyan' },
    { title: dict.dashboard.pillar2Title, subtitle: dict.dashboard.pillar2Subtitle, href: '/engine', tone: 'text-kriyo-amber' },
    { title: dict.dashboard.pillar3Title, subtitle: dict.dashboard.pillar3Subtitle, href: '/tracking', tone: 'text-kriyo-success' }
  ] as const;

  return (
    <AppShell title={dict.dashboard.title} subtitle={dict.dashboard.subtitle}>
      <div className="space-y-4">
        <Card className="border-kriyo-cyan/20 bg-[radial-gradient(circle_at_top_right,rgba(79,209,197,0.12),transparent_42%),linear-gradient(180deg,rgba(13,17,23,0.98),rgba(19,25,34,0.92))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-cyan">{dict.dashboard.sprintBadge}</p>
              <h2 className="mt-2 text-xl font-semibold text-kriyo-text">{dict.dashboard.bannerTitle}</h2>
              <p className="mt-2 text-sm text-kriyo-dim">{dict.dashboard.bannerDescription}</p>
            </div>
            <Badge className="border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success">{dict.dashboard.inProgressBadge}</Badge>
          </div>
        </Card>

        <div className="grid gap-3">
          {pillars.map((pillar) => (
            <Link key={pillar.href} href={pillar.href} className="block">
              <Card className="p-4 transition hover:border-kriyo-cyan/40 hover:bg-kriyo-surfaceHover">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`font-mono text-[11px] uppercase tracking-[0.16em] ${pillar.tone}`}>{pillar.title}</p>
                    <p className="mt-2 text-sm font-medium text-kriyo-text">{pillar.subtitle}</p>
                  </div>
                  <span className="text-sm text-kriyo-dim">{dict.dashboard.openLabel}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
