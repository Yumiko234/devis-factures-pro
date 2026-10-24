import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useClients, useDocuments } from "@/lib/data";
import { displayStatus, formatDate, formatEUR, DOC_LABEL, type DocType } from "@/lib/invoice";
import { PageHeader, Panel, StatusBadge } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/documents/")({
  head: () => ({ meta: [{ title: "Propositions de vente & reçus — Registre" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { data: docs = [] } = useDocuments();
  const { data: clients = [] } = useClients();
  const [tab, setTab] = useState<"all" | DocType>("all");
  const list = tab === "all" ? docs : docs.filter((d) => d.type === tab);
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Propositions de vente & reçus"
        actions={
          <>
            <Button variant="outline" asChild><Link to="/documents/new" search={{ type: "quote" }}>Nouvelle proposition de vente</Link></Button>
            <Button asChild><Link to="/documents/new" search={{ type: "invoice" }}>Nouveau reçu</Link></Button>
          </>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="quote">Propositions de vente</TabsTrigger>
          <TabsTrigger value="invoice">Reçus</TabsTrigger>
          <TabsTrigger value="credit_note">Avoirs</TabsTrigger>
        </TabsList>
      </Tabs>
      <Panel>
        {list.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Aucun document.</p>
        ) : (
          <div className="divide-y divide-border">
            {list.map((d) => (
              <Link key={d.id} to="/documents/$id" params={{ id: d.id }} className="grid grid-cols-2 items-center gap-2 px-5 py-3 hover:bg-muted sm:grid-cols-5">
                <span className="text-sm"><span className="text-muted-foreground">{DOC_LABEL[d.type as DocType]}</span> <span className="font-mono">{d.number ?? "brouillon"}</span></span>
                <span className="truncate text-sm">{clientName(d.client_id)}</span>
                <span className="hidden text-sm text-muted-foreground sm:block">{formatDate(d.issue_date)}</span>
                <span className="tabular text-sm sm:text-right">{formatEUR(Number(d.total))}</span>
                <span className="sm:text-right"><StatusBadge status={displayStatus(d)} /></span>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
