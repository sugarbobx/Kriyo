import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { KRIYO_SESSION_COOKIE } from "@/lib/session";
import { redirectTo } from "@/lib/redirect";

const topics = [
  {
    title: "Sas de Sécurité",
    badge: "Pilier 1",
    text: "Onboarding psycho-technique à 5 critères. Si un critère est OFF, la session est bloquée jusqu’au prochain minuit local."
  },
  {
    title: "Moteur 9/9",
    badge: "Pilier 2",
    text: "Le setup n’est exécutable qu’à score maximal. Pas de score intermédiaire toléré."
  },
  {
    title: "Routage Prop Firm",
    badge: "Pilier 3",
    text: "Chaque compte hérite d’un profil de risque qui force la logique de gestion: agressif, modéré ou conservateur."
  }
] as const;

const glossary = [
  ["Daily DD", "Perte maximale autorisée sur la journée de trading."],
  ["Max DD", "Perte cumulée maximale autorisée sur le compte."],
  ["Payout on-demand", "Extraction des profits à la demande, généralement plus agressive."],
  ["Confluence", "Accumulation de signaux qui renforce la qualité du setup."],
  ["Invalidation", "Niveau qui invalide le scénario et impose la sortie."]
] as const;

export default async function EducationPage() {
  const cookieStore = await cookies();
  if (!cookieStore.has(KRIYO_SESSION_COOKIE)) {
    redirectTo("/sas");
  }

  return (
    <AppShell title="Éducation & Glossaire" subtitle="Repères rapides pour les règles Kriyo et le vocabulaire trading.">
      <div className="space-y-4">
        <Card className="border-kriyo-cyan/20 bg-[radial-gradient(circle_at_top_right,rgba(79,209,197,0.12),transparent_42%),linear-gradient(180deg,rgba(13,17,23,0.98),rgba(19,25,34,0.92))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-kriyo-cyan">V1 légère</p>
              <h2 className="mt-2 text-xl font-semibold text-kriyo-text">Les règles avant la vitesse</h2>
              <p className="mt-2 text-sm text-kriyo-dim">
                Cette section pose les définitions utiles pour lire les écrans Kriyo sans ambiguïté.
              </p>
            </div>
            <Badge className="border-kriyo-success/30 bg-kriyo-success/10 text-kriyo-success">Statique</Badge>
          </div>
        </Card>

        <div className="space-y-3">
          {topics.map((topic) => (
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

        <Card className="p-4">
          <p className="text-sm font-medium text-kriyo-text">Glossaire</p>
          <div className="mt-3 space-y-3">
            {glossary.map(([term, definition]) => (
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
