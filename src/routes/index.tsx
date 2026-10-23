import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, Users, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Registre — Devis et factures conformes pour micro-entrepreneurs" },
      {
        name: "description",
        content:
          "Devis, factures et avoirs conformes à la loi française : numérotation continue, mentions obligatoires, export PDF.",
      },
      { property: "og:title", content: "Registre — Devis et factures conformes" },
      { property: "og:description", content: "L'outil de facturation pensé pour les micro-entrepreneurs français." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: ShieldCheck, title: "Conforme", text: "Mentions légales, art. 293 B du CGI, numérotation continue et factures verrouillées après émission." },
  { icon: FileText, title: "Devis → Facture", text: "Transformez un devis accepté en facture en un clic, émettez un avoir pour annuler." },
  { icon: Users, title: "Clients & catalogue", text: "Votre carnet de clients et vos prestations, réutilisables sur chaque document." },
  { icon: BarChart3, title: "Pilotage", text: "Chiffre d'affaires, impayés, retards et suivi du plafond micro-entreprise." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-2xl">Registre<span className="text-accent">.</span></span>
        <Button asChild variant="ghost">
          <Link to="/auth">Se connecter</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-accent">Micro-entreprise · France</p>
            <h1 className="font-display text-5xl leading-[1.05] md:text-6xl">
              Des factures irréprochables, sans y penser.
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Devis, factures et avoirs conformes au Code de commerce et au CGI. Vous facturez, Registre s'occupe des mentions.
            </p>
            <div className="mt-8 flex gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Commencer gratuitement</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="shadow-paper rotate-1 rounded-sm bg-paper p-8 text-ink">
              <div className="flex justify-between">
                <span className="font-display text-2xl">Facture</span>
                <span className="font-mono text-sm">F-2026-0042</span>
              </div>
              <div className="mt-6 space-y-2 text-sm">
                {["Conception graphique", "Intégration du site", "Maintenance (3 mois)"].map((l, i) => (
                  <div key={l} className="flex justify-between border-b border-border pb-2">
                    <span>{l}</span>
                    <span className="tabular font-mono">{["1 200,00 €", "2 400,00 €", "450,00 €"][i]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular font-mono">4 050,00 €</span>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">TVA non applicable, art. 293 B du CGI</p>
            </div>
          </div>
        </section>
        <section className="grid gap-6 border-t border-border py-16 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title}>
              <f.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
