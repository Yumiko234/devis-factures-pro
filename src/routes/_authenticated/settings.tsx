import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSettings, type Settings } from "@/lib/data";
import { PageHeader, Panel } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Mon entreprise — Registre" }] }),
  component: SettingsPage,
});

type Form = Omit<Settings, "user_id" | "created_at" | "updated_at">;

const empty: Form = {
  name: "", owner_name: "", legal_mention: "EI", address: "", postal_code: "", city: "", siret: "",
  ape_code: "", rcs_rm: "", insurance: "", email: "", phone: "", website: "", iban: "", bic: "",
  payment_terms_days: 30, quote_validity_days: 30, late_penalty: "trois fois le taux d'intérêt légal", footer_note: "",
};

const sections: { title: string; fields: [keyof Form, string, string?][] }[] = [
  {
    title: "Identité",
    fields: [
      ["name", "Nom commercial *"],
      ["owner_name", "Nom et prénom de l'entrepreneur"],
      ["legal_mention", "Mention de statut", "« EI » ou « Entrepreneur individuel » (obligatoire)"],
      ["siret", "SIRET", "Laissez vide en attendant l'attribution : « en cours d'attribution » sera affiché"],
      ["ape_code", "Code APE"],
      ["rcs_rm", "RCS / RM", "Ex : RCS Lyon 123 456 789 — si immatriculé"],
      ["insurance", "Assurance professionnelle", "Obligatoire pour certains artisans : assureur et couverture"],
    ],
  },
  {
    title: "Coordonnées",
    fields: [
      ["address", "Adresse *"], ["postal_code", "Code postal"], ["city", "Ville"],
      ["email", "Email"], ["phone", "Téléphone"], ["website", "Site web"],
    ],
  },
  {
    title: "Paiement et conditions",
    fields: [
      ["iban", "IBAN"], ["bic", "BIC"],
      ["payment_terms_days", "Délai de paiement (jours)", "Maximum légal : 60 jours"],
      ["quote_validity_days", "Validité des devis (jours)"],
      ["late_penalty", "Taux des pénalités de retard"],
      ["footer_note", "Note de pied de page"],
    ],
  },
];

function SettingsPage() {
  const { data, isLoading } = useSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const { user_id: _u, created_at: _c, updated_at: _up, ...rest } = data as Settings;
      setForm(rest);
    }
  }, [data]);

  async function save() {
    if (form.payment_terms_days > 60) { toast.error("Le délai de paiement ne peut excéder 60 jours."); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("company_settings").upsert({ ...form, user_id: u.user!.id, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Informations enregistrées");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }

  if (isLoading) return null;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Mon entreprise" subtitle="Ces informations apparaissent sur tous vos devis et factures." actions={<Button onClick={save} disabled={saving}>Enregistrer</Button>} />
      <div className="space-y-6">
        {sections.map((s) => (
          <Panel key={s.title} className="p-6">
            <h2 className="mb-4 text-xl">{s.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {s.fields.map(([key, label, hint]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type={typeof empty[key] === "number" ? "number" : "text"}
                    value={form[key] as string | number}
                    onChange={(e) =>
                      setForm({ ...form, [key]: typeof empty[key] === "number" ? Number(e.target.value) : e.target.value })
                    }
                  />
                  {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
                </div>
              ))}
            </div>
          </Panel>
        ))}
        <Panel className="bg-secondary p-6 text-sm text-secondary-foreground">
          Les mentions « TVA non applicable, art. 293 B du CGI », pénalités de retard et indemnité forfaitaire de 40 € sont ajoutées automatiquement.
        </Panel>
      </div>
    </div>
  );
}
