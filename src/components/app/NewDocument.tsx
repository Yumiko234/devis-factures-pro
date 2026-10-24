import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addDays, todayISO } from "@/lib/invoice";

/** Crée un brouillon puis redirige vers son éditeur. */
export function NewDocument({ type }: { type: "quote" | "invoice" }) {
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      const { data: s } = await supabase.from("company_settings").select("*").maybeSingle();
      const today = todayISO();
      const { data, error } = await supabase
        .from("documents")
        .insert({
          type,
          issue_date: today,
          due_date: type === "invoice" ? addDays(today, s?.payment_terms_days ?? 30) : null,
          valid_until: type === "quote" ? addDays(today, s?.quote_validity_days ?? 30) : null,
          items: [{ description: "", quantity: 1, unit: "unité", unit_price: 0 }],
        })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/documents/$id", params: { id: data.id }, replace: true });
    })();
  }, [type, navigate]);

  return <p className="text-muted-foreground">Création…</p>;
}
