import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useClients, useDocuments, type DocumentRow } from "@/lib/data";
import {
  billedTotal,
  collectedByClient,
  collectedByMonth,
  collectedTotal,
  documentsCsv,
  formatEUR,
  MICRO_THRESHOLD_SERVICES,
  type RevenueDoc,
} from "@/lib/invoice";
import { deliverFile } from "@/lib/download";
import { PageHeader, Panel } from "@/components/app/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/revenue")({
  head: () => ({ meta: [{ title: "Chiffre d'affaires — Registre" }] }),
  component: RevenuePage,
});

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function clientName(d: DocumentRow, clients: { id: string; name: string }[]): string {
  return (
    (d.client_snapshot as { name?: string } | null)?.name ??
    clients.find((c) => c.id === d.client_id)?.name ??
    "Client inconnu"
  );
}

function toRevenueDoc(d: DocumentRow, clients: { id: string; name: string }[]): RevenueDoc {
  return {
    type: d.type,
    status: d.status,
    number: d.number,
    issue_date: d.issue_date,
    paid_at: d.paid_at,
    total: Number(d.total),
    client_name: clientName(d, clients),
  };
}

function RevenuePage() {
  const { data: docs = [] } = useDocuments();
  const { data: clients = [] } = useClients();

  const years = useMemo(() => {
    const set = new Set<string>(docs.filter((d) => d.number).map((d) => d.issue_date.slice(0, 4)));
    set.add(new Date().getFullYear().toString());
    return [...set].sort().reverse();
  }, [docs]);

  const [year, setYear] = useState(new Date().getFullYear().toString());

  const finalized = useMemo(() => docs.filter((d) => d.number).map((d) => toRevenueDoc(d, clients)), [docs, clients]);
  const yearDocs = useMemo(() => finalized.filter((d) => d.issue_date.startsWith(year)), [finalized, year]);

  const monthly = collectedByMonth(finalized, year);
  const collected = collectedTotal(finalized, year);
  const billed = billedTotal(finalized, year);
  const outstanding = yearDocs
    .filter((d) => d.type === "invoice" && d.status === "issued")
    .reduce((s, d) => s + d.total, 0);
  const byClient = collectedByClient(finalized, year);
  const max = Math.max(...monthly, 1);
  const pct = Math.min(100, (collected / MICRO_THRESHOLD_SERVICES) * 100);

  function exportCsv() {
    const csv = documentsCsv(yearDocs);
    void deliverFile(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `registre-${year}.csv`);
  }

  return (
    <div>
      <PageHeader
        title="Chiffre d'affaires"
        subtitle="Encaissements, plafond micro-entreprise et export comptable"
        actions={<Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Exporter en CSV</Button>}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {years.map((y) => (
          <Button key={y} size="sm" variant={y === year ? "default" : "outline"} onClick={() => setYear(y)}>
            {y}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">CA encaissé {year}</p>
          <p className="tabular mt-2 font-display text-3xl">{formatEUR(collected)}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">CA facturé {year}</p>
          <p className="tabular mt-2 font-display text-3xl">{formatEUR(billed)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Factures émises, avoirs déduits</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">À encaisser {year}</p>
          <p className="tabular mt-2 font-display text-3xl">{formatEUR(outstanding)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Factures émises, non payées</p>
        </Panel>
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
          <p className="mt-4 text-xs text-muted-foreground">
            Dépasser ce plafond sur deux années consécutives remet en cause le régime micro-entreprise : surveillez cette jauge.
          </p>
        </Panel>
      </div>

      <Panel className="mt-6">
        <h2 className="p-5 text-xl">CA encaissé par client</h2>
        <div className="divide-y divide-border">
          {byClient.map((c) => (
            <div key={c.name} className="flex items-center justify-between gap-4 px-5 py-3">
              <span className="text-sm">{c.name}</span>
              <span className="flex items-center gap-4">
                <span className="tabular text-xs text-muted-foreground">
                  {collected > 0 ? ((c.total / collected) * 100).toFixed(1) : "0"} %
                </span>
                <span className="tabular text-sm">{formatEUR(c.total)}</span>
              </span>
            </div>
          ))}
          {byClient.length === 0 && (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Aucun encaissement en {year}.</p>
          )}
        </div>
      </Panel>

      <Panel className="mt-6">
        <h2 className="p-5 text-xl">Détail mensuel</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 font-medium">Mois</th>
                <th className="px-5 py-2 font-medium">Documents émis</th>
                <th className="px-5 py-2 text-right font-medium">Encaissé</th>
              </tr>
            </thead>
            <tbody>
              {MONTH_NAMES.map((name, i) => (
                <tr key={name} className="border-b border-border last:border-0">
                  <td className="px-5 py-2">{name}</td>
                  <td className="px-5 py-2">
                    {yearDocs.filter((d) => d.issue_date.slice(5, 7) === String(i + 1).padStart(2, "0")).length}
                  </td>
                  <td className="tabular px-5 py-2 text-right">{formatEUR(monthly[i] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
