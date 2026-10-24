import { createFileRoute, Link } from "@tanstack/react-router";
import { useDocuments, useSettings } from "@/lib/data";
import { displayStatus, formatEUR, formatDate, DOC_LABEL, MICRO_THRESHOLD_SERVICES, type DocType } from "@/lib/invoice";
import { PageHeader, Panel, StatusBadge } from "@/components/app/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — Registre" }] }),
  component: Dashboard,
});

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function Dashboard() {
  const { data: docs = [] } = useDocuments();
  const { data: settings } = useSettings();
  const year = new Date().getFullYear().toString();
  const finalized = docs.filter((d) => d.number && d.issue_date.startsWith(year));

  const paid = finalized.filter((d) => d.type === "invoice" && d.status === "paid");
  const credits = finalized.filter((d) => d.type === "credit_note");
  const revenue = paid.reduce((s, d) => s + Number(d.paid_at ? d.total : 0), 0) + credits.reduce((s, d) => s + Number(d.total), 0);
  const unpaid = docs.filter((d) => d.type === "invoice" && d.status === "issued");
  const overdue = unpaid.filter((d) => displayStatus(d) === "overdue");
  const pendingQuotes = docs.filter((d) => d.type === "quote" && d.status === "sent");

  const monthly = MONTHS.map((_, m) =>
    paid.filter((d) => new Date((d.paid_at ?? d.issue_date) + "T00:00:00").getMonth() === m).reduce((s, d) => s + Number(d.total), 0),
  );
  const max = Math.max(...monthly, 1);
  const pct = Math.min(100, (revenue / MICRO_THRESHOLD_SERVICES) * 100);

  const stats = [
    { label: `CA encaissé ${year}`, value: formatEUR(revenue) },
    { label: "À encaisser", value: formatEUR(unpaid.reduce((s, d) => s + Number(d.total), 0)), sub: `${unpaid.length} facture(s)` },
    { label: "En retard", value: formatEUR(overdue.reduce((s, d) => s + Number(d.total), 0)), sub: `${overdue.length} facture(s)` },
    { label: "Devis en attente", value: formatEUR(pendingQuotes.reduce((s, d) => s + Number(d.total), 0)), sub: `${pendingQuotes.length} devis` },
  ];

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle={settings?.name || "Bienvenue"}
        actions={
          <>
            <Button variant="outline" asChild><Link to="/documents/new" search={{ type: "quote" }}>Nouveau devis</Link></Button>
            <Button asChild><Link to="/documents/new" search={{ type: "invoice" }}>Nouvelle facture</Link></Button>
          </>
        }
      />
      {!settings?.siret && (
        <Panel className="mb-6 border-accent bg-accent/10 p-4 text-sm">
          Complétez <Link to="/settings" className="font-medium underline">les informations de votre entreprise</Link> (nom, adresse, SIRET) pour pouvoir émettre des documents.
        </Panel>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Panel key={s.label} className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="tabular mt-2 font-display text-3xl">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>}
          </Panel>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="p-6 lg:col-span-2">
          <h2 className="text-xl">Encaissements {year}</h2>
          <div className="mt-6 flex h-44 items-end gap-2">
            {monthly.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t bg-primary transition-all" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 4 : 1 }} title={formatEUR(v)} />
                <span className="text-xs text-muted-foreground">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-6">
          <h2 className="text-xl">Plafond micro</h2>
          <p className="mt-1 text-xs text-muted-foreground">Prestations de services : {formatEUR(MICRO_THRESHOLD_SERVICES)}</p>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted">
            <div className={pct > 85 ? "h-full bg-destructive" : "h-full bg-accent"} style={{ width: `${pct}%` }} />
          </div>
          <p className="tabular mt-2 text-sm">{pct.toFixed(1)} % atteint</p>
        </Panel>
      </div>
      <Panel className="mt-6">
        <h2 className="p-5 text-xl">Documents récents</h2>
        <div className="divide-y divide-border">
          {docs.slice(0, 6).map((d) => (
            <Link key={d.id} to="/documents/$id" params={{ id: d.id }} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted">
              <span className="text-sm">{DOC_LABEL[d.type as DocType]} <span className="font-mono">{d.number ?? "brouillon"}</span> · {formatDate(d.issue_date)}</span>
              <span className="flex items-center gap-3"><span className="tabular text-sm">{formatEUR(Number(d.total))}</span><StatusBadge status={displayStatus(d)} /></span>
            </Link>
          ))}
          {docs.length === 0 && <p className="px-5 pb-5 text-sm text-muted-foreground">Aucun document.</p>}
        </div>
      </Panel>
    </div>
  );
}
