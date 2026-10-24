import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, type Product } from "@/lib/data";
import { formatEUR } from "@/lib/invoice";
import { PageHeader, Panel } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Catalogue — Registre" }] }),
  component: ProductsPage,
});

type Form = Omit<Product, "id" | "user_id" | "created_at">;
const empty: Form = { name: "", description: "", unit: "unité", unit_price: 0, kind: "service" };

function ProductsPage() {
  const { data = [] } = useProducts();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<(Form & { id?: string }) | null>(null);

  async function save() {
    if (!editing?.name.trim()) { toast.error("Le nom est obligatoire."); return; }
    const { id, ...rest } = editing;
    const { error } = id
      ? await supabase.from("products").update(rest).eq("id", id)
      : await supabase.from("products").insert(rest);
    if (error) { toast.error(error.message); return; }
    toast.success("Élément enregistré");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet élément ?")) return;
    await supabase.from("products").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div>
      <PageHeader title="Catalogue" subtitle="Vos prestations et produits récurrents" actions={<Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4" /> Nouvel élément</Button>} />
      <Panel>
        {data.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Votre catalogue est vide.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{p.kind === "goods" ? "Bien" : "Service"} · {p.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular font-mono text-sm">{formatEUR(Number(p.unit_price))} / {p.unit}</span>
                  <Button size="icon" variant="ghost" aria-label="Modifier" onClick={() => setEditing({ ...p, unit_price: Number(p.unit_price) })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Modifier" : "Nouvel élément"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label>Nom *</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Prix unitaire net (€)</Label><Input type="number" step="0.01" value={editing.unit_price} onChange={(e) => setEditing({ ...editing, unit_price: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Unité</Label><Input value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Type</Label>
                <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="service">Prestation de service</SelectItem><SelectItem value="goods">Bien / marchandise</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
