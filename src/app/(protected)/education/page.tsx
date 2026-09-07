import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { KRIYO_SESSION_COOKIE } from "@/lib/session";
import { redirectTo } from "@/lib/redirect";
import { getServerDictionary } from "@/lib/i18n/locale";

export default async function EducationPage() {
  const cookieStore = await cookies();
  if (!cookieStore.has(KRIYO_SESSION_COOKIE)) {
    redirectTo("/sas");
  }

  const { dict } = await getServerDictionary();

  return (
    <AppShell title={dict.education.title} subtitle={dict.education.subtitle}>
      <div className="space-y-4">
        <Card className="border-kriyo-cyan/20 bg-[radial-gradient(circle_at_top_right,rgba(79,209,197,0.12),transparent_42%),linear-gradient(180deg,rgba(13,17,23,0.98),rgba(19,25,34,0.92))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-cyan">{dict.education.lightV1}</p>
              <h2 className="mt-2 text-xl font-semibold text-kriyo-text">{dict.education.heroTitle}</h2>
              <p className="mt-2 text-sm text-kriyo-dim">{dict.education.heroDescription}</p>
            </div>
            <Badge className="border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success">{dict.education.staticBadge}</Badge>
          </div>
        </Card>

        <div className="space-y-3">
          {dict.education.pillars.map((topic) => (
            <Card key={topic.title} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-amber">{topic.badge}</p>
                  <h3 className="mt-2 text-base font-semibold text-kriyo-text">{topic.title}</h3>
                  <p className="mt-2 text-sm text-kriyo-dim">{topic.text}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="border-kriyo-amber/20 bg-[radial-gradient(circle_at_top_left,rgba(245,166,35,0.10),transparent_42%)] p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-amber">{dict.education.programTitle}</p>
          <p className="mt-2 text-sm text-kriyo-dim">{dict.education.programIntro}</p>
        </Card>

        <div className="space-y-3">
          {dict.education.modules.map((module, index) => (
            <Card key={module.title} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-cyan">{`0${index + 1}`}</p>
                  <h3 className="mt-2 text-base font-semibold text-kriyo-text">{module.title}</h3>
                  <p className="mt-2 text-sm text-kriyo-dim">{module.summary}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {module.tips.map((tip) => (
                  <li key={tip} className="flex gap-2 rounded-2xl border border-kriyo-borderSoft bg-kriyo-bg px-3 py-2 text-xs text-kriyo-dim">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kriyo-cyan" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <Card className="p-4">
          <p className="text-sm font-medium text-kriyo-text">{dict.education.glossaryTitle}</p>
          <div className="mt-3 space-y-3">
            {dict.education.glossary.map(([term, definition]) => (
              <div key={term} className="rounded-2xl border border-kriyo-borderSoft bg-kriyo-bg px-4 py-3">
                <p className="text-sm font-medium text-kriyo-text">{term}</p>
                <p className="mt-1 text-xs text-kriyo-dim">{definition}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
