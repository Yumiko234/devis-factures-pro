import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClients, useDocument, useDocuments, useProducts, useSettings, type DocumentRow } from "@/lib/data";
import { addDays, displayStatus, documentTotal, escapeHtml, depositsTotal, todayISO, DOC_LABEL, type DocType, type LineItem } from "@/lib/invoice";
import { DocumentPreview } from "@/components/app/DocumentPreview";
import { Panel, StatusBadge } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextInput } from "@/components/app/RichTextInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  head: () => ({ meta: [{ title: "Document — Registre" }] }),
  component: DocPage,
});

function DocPage() {
  const { id } = Route.useParams();
  const { data: doc, isLoading } = useDocument(id);
  if (isLoading || !doc) return <p className="text-muted-foreground">Chargement…</p>;
  return <DocEditor key={doc.id + doc.updated_at} doc={doc} />;
}

function DocEditor({ doc }: { doc: DocumentRow }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const { data: settings } = useSettings();
  const { data: allDocs = [] } = useDocuments();
  const [d, setD] = useState(doc);
  const [busy, setBusy] = useState(false);
  const type = d.type as DocType;
  const isDraft = !d.number;
  const total = documentTotal(d.items);
  const client = d.client_snapshot ?? clients.find((c) => c.id === d.client_id) ?? null;
  const company = d.company_snapshot ?? settings ?? null;
  const source = allDocs.find((x) => x.id === d.source_id);

  useEffect(() => setD(doc), [doc]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["documents"] });

  async function saveDraft(silent = false) {
    const { error } = await supabase
      .from("documents")
      .update({
        client_id: d.client_id, issue_date: d.issue_date, due_date: d.due_date, valid_until: d.valid_until,
        service_date: d.service_date, operation_category: d.operation_category, items: d.items as never, deposits: d.deposits as never,
        total, notes: d.notes, payment_method: d.payment_method,
      })
      .eq("id", d.id);
    if (error) { toast.error(error.message); return false; }
    if (!silent) { toast.success("Brouillon enregistré"); refresh(); }
    return true;
  }

  async function finalize() {
    if (!confirm(type === "quote" ? "Émettre ce devis ? Il recevra un numéro définitif." : "Émettre ce document ? Une fois numéroté, il ne pourra plus être modifié ni supprimé.")) return;
    setBusy(true);
    if (!(await saveDraft(true))) { setBusy(false); return; }
    const { error } = await supabase.rpc("finalize_document", { _doc_id: d.id });
    if (error) { setBusy(false); { toast.error(error.message); return; } }
    if (type === "credit_note" && d.source_id) await supabase.from("documents").update({ status: "cancelled" }).eq("id", d.source_id);
    setBusy(false);
    toast.success(`${DOC_LABEL[type]} émis(e)`);
    refresh();
  }

  async function setStatus(status: string, extra: Record<string, unknown> = {}) {
    const { error } = await supabase.from("documents").update({ status, ...extra }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  async function derive(newType: "invoice" | "credit_note") {
    const today = todayISO();
    const items = newType === "credit_note" ? d.items.map((i) => ({ ...i, unit_price: -Math.abs(i.unit_price) })) : d.items;
    const { data, error } = await supabase
      .from("documents")
      .insert({
        type: newType, client_id: d.client_id, issue_date: today,
        due_date: newType === "invoice" ? addDays(today, settings?.payment_terms_days ?? 30) : null,
        service_date: d.service_date, operation_category: d.operation_category,
        items: items as never, total: documentTotal(items), source_id: d.id, payment_method: d.payment_method,
        notes: newType === "credit_note" ? `Avoir annulant la facture ${d.number}.` : d.notes,
      })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    if (newType === "invoice" && type === "quote") await supabase.from("documents").update({ status: "accepted" }).eq("id", d.id);
    refresh();
    navigate({ to: "/documents/$id", params: { id: data.id } });
  }

  async function removeDraft() {
    if (!confirm("Supprimer ce brouillon ?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    refresh();
    navigate({ to: "/documents" });
  }

  const setItem = (i: number, patch: Partial<LineItem>) =>
    setD({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Retour"><Link to="/documents"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <h1 className="text-3xl">{DOC_LABEL[type]} <span className="font-mono text-xl">{d.number ?? ""}</span></h1>
          <StatusBadge status={displayStatus(d)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <>
              <Button variant="ghost" onClick={removeDraft}><Trash2 className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => saveDraft()}>Enregistrer</Button>
              <Button onClick={finalize} disabled={busy}>Émettre et numéroter</Button>
            </>
          )}
          {!isDraft && type === "quote" && d.status === "sent" && (
            <>
              <Button variant="outline" onClick={() => setStatus("refused")}>Refusé</Button>
              <Button variant="outline" onClick={() => setStatus("accepted")}>Accepté</Button>
            </>
          )}
          {!isDraft && type === "quote" && d.status !== "refused" && <Button onClick={() => derive("invoice")}>Convertir en facture</Button>}
          {!isDraft && type === "invoice" && d.status === "issued" && (
            <Button onClick={() => setStatus("paid", { paid_at: todayISO() })}>Marquer payée</Button>
          )}
          {!isDraft && type === "invoice" && d.status !== "cancelled" && (
            <Button variant="outline" onClick={() => derive("credit_note")}>Créer un avoir</Button>
          )}
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> PDF</Button>
        </div>
      </div>

      <div className={isDraft ? "grid gap-8 xl:grid-cols-[minmax(0,420px)_1fr]" : ""}>
        {isDraft && (
          <div className="no-print space-y-4">
            <Panel className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={d.client_id ?? ""} onValueChange={(v) => setD({ ...d, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {clients.length === 0 && <p className="text-xs text-muted-foreground"><Link to="/clients" className="underline">Ajoutez un client</Link> d'abord.</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Date d'émission</Label><Input type="date" value={d.issue_date} onChange={(e) => setD({ ...d, issue_date: e.target.value })} /></div>
                {type === "invoice" && <div className="space-y-1.5"><Label>Échéance</Label><Input type="date" value={d.due_date ?? ""} onChange={(e) => setD({ ...d, due_date: e.target.value })} /></div>}
                {type === "quote" && <div className="space-y-1.5"><Label>Valable jusqu'au</Label><Input type="date" value={d.valid_until ?? ""} onChange={(e) => setD({ ...d, valid_until: e.target.value })} /></div>}
              </div>
              <div className="space-y-1.5"><Label>Date ou période de réalisation</Label><Input placeholder="Ex : du 1er au 15 octobre 2026" value={d.service_date} onChange={(e) => setD({ ...d, service_date: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Nature de l'opération</Label>
                <Select value={d.operation_category} onValueChange={(v) => setD({ ...d, operation_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="services">Prestation de services</SelectItem>
                    <SelectItem value="goods">Livraison de biens</SelectItem>
                    <SelectItem value="mixed">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Panel>

            <Panel className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg">Lignes</h2>
                {products.length > 0 && (
                  <Select value="" onValueChange={(pid) => {
                    const p = products.find((x) => x.id === pid)!;
                    setD({ ...d, items: [...d.items.filter((i) => i.description || i.unit_price), { description: `<b>${escapeHtml(p.name)}</b>` + (p.description ? `<br>${escapeHtml(p.description)}` : ""), quantity: 1, unit: p.unit, unit_price: Number(p.unit_price) * (type === "credit_note" ? -1 : 1) }] });
                  }}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Depuis le catalogue" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              {d.items.map((it, i) => (
                <div key={i} className="space-y-2 rounded-md border border-border p-3">
                  <RichTextInput placeholder="Désignation" value={it.description.includes("<") ? it.description : escapeHtml(it.description)} onChange={(html) => setItem(i, { description: html })} />
                  <div className="grid grid-cols-[1fr_1fr_1.3fr_auto] gap-2">
                    <Input type="number" step="0.01" aria-label="Quantité" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} />
                    <Input aria-label="Unité" value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} />
                    <Input type="number" step="0.01" aria-label="Prix unitaire" value={it.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} />
                    <Button size="icon" variant="ghost" aria-label="Supprimer la ligne" onClick={() => setD({ ...d, items: d.items.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={() => setD({ ...d, items: [...d.items, { description: "", quantity: 1, unit: "unité", unit_price: 0 }] })}>
                <Plus className="h-4 w-4" /> Ajouter une ligne
              </Button>
            </Panel>

            {type === "invoice" && (
              <Panel className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg">Acomptes déjà versés</h2>
                  <Button size="sm" variant="outline" onClick={() => setD({ ...d, deposits: [...(d.deposits ?? []), { label: `Acompte reçu le ${new Date().toLocaleDateString("fr-FR")}`, amount: 0 }] })}>
                    <Plus className="h-4 w-4" /> Acompte
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Affiche un sous-total puis déduit les acomptes du net à payer.</p>
                {(d.deposits ?? []).map((dep, i) => (
                  <div key={i} className="grid grid-cols-[1fr_7rem_auto] gap-2">
                    <Input aria-label="Libellé de l'acompte" value={dep.label} onChange={(e) => setD({ ...d, deposits: d.deposits.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <Input type="number" step="0.01" aria-label="Montant de l'acompte" value={dep.amount} onChange={(e) => setD({ ...d, deposits: d.deposits.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)) })} />
                    <Button size="icon" variant="ghost" aria-label="Retirer l'acompte" onClick={() => setD({ ...d, deposits: d.deposits.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {depositsTotal(d.deposits ?? []) > total && <p className="text-xs text-destructive">Les acomptes dépassent le total.</p>}
              </Panel>
            )}

            <Panel className="space-y-4 p-5">
              {type === "invoice" && <div className="space-y-1.5"><Label>Mode de paiement</Label><Input value={d.payment_method} onChange={(e) => setD({ ...d, payment_method: e.target.value })} /></div>}
              <div className="space-y-1.5"><Label>Notes</Label><Textarea value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></div>
            </Panel>
          </div>
        )}

        <div className="min-w-0 overflow-x-auto">
          <DocumentPreview
            type={type} number={d.number} issueDate={d.issue_date} dueDate={d.due_date} validUntil={d.valid_until}
            serviceDate={d.service_date} operationCategory={d.operation_category} items={d.items} total={isDraft ? total : Number(d.total)}
            notes={d.notes} paymentMethod={d.payment_method} company={company as never} client={client as never}
            sourceNumber={source?.number} deposits={d.deposits ?? []}
          />
        </div>
      </div>
    </div>
  );
}
