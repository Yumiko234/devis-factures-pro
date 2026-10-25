import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClients, type Client } from "@/lib/data";
import { PageHeader, Panel } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({ meta: [{ title: "Clients — Registre" }] }),
  component: ClientsPage,
});

type Form = Omit<Client, "id" | "user_id" | "created_at">;
const empty: Form = {
  name: "", contact_name: "", email: "", phone: "", address: "", postal_code: "", city: "",
  country: "France", siren: "", vat_number: "", is_professional: true, notes: "",
};
const fields: [keyof Form, string][] = [
  ["name", "Raison sociale / Nom *"], ["contact_name", "Contact"], ["email", "Email"], ["phone", "Téléphone"],
  ["address", "Adresse"], ["postal_code", "Code postal"], ["city", "Ville"], ["country", "Pays"],
  ["siren", "SIREN (obligatoire pour les pros)"], ["vat_number", "N° TVA intracommunautaire"],
];

function ClientsPage() {
  const { data = [] } = useClients();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<(Form & { id?: string }) | null>(null);

  async function save() {
    if (!editing?.name.trim()) { toast.error("Le nom est obligatoire."); return; }
    const { id, ...rest } = editing;
    const { error } = id
      ? await supabase.from("clients").update(rest).eq("id", id)
      : await supabase.from("clients").insert(rest);
    if (error) { toast.error(error.message); return; }
    toast.success("Client enregistré");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["clients"] });
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce client ?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["clients"] });
  }

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${data.length} client(s)`} actions={<Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4" /> Nouveau client</Button>} />
      <Panel>
        {data.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Aucun client pour l'instant.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{c.name} <span className="ml-2 text-xs text-muted-foreground">{c.is_professional ? "Professionnel" : "Particulier"}</span></p>
                  <p className="truncate text-sm text-muted-foreground">{[c.email, c.city, c.siren && `SIREN ${c.siren}`].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="Modifier" onClick={() => setEditing({ ...c })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={editing.is_professional} onCheckedChange={(v) => setEditing({ ...editing, is_professional: v })} />
                <Label>Client professionnel (B2B)</Label>
              </div>
              {fields.map(([k, label]) => (
                <div key={k} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input value={editing[k] as string} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button onClick={save}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
