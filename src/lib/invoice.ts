export type DocType = "quote" | "invoice" | "credit_note";

export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

/** Plafonds micro-entreprise (chiffre d'affaires annuel) */
export const MICRO_THRESHOLD_SERVICES = 77700;
export const MICRO_THRESHOLD_GOODS = 188700;
export const RECOVERY_FEE = 40;
export const VAT_MENTION = "TVA non applicable, art. 293 B du CGI";

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(item: LineItem): number {
  return round2((Number(item.quantity) || 0) * (Number(item.unit_price) || 0));
}

export function documentTotal(items: LineItem[]): number {
  return round2(items.reduce((sum, i) => sum + lineTotal(i), 0));
}

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export const formatEUR = (n: number) => eur.format(Number(n) || 0);

export const formatDate = (d?: string | null) =>
  d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("fr-FR") : "—";

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const DOC_LABEL: Record<DocType, string> = {
  quote: "Devis",
  invoice: "Facture",
  credit_note: "Avoir",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
  issued: "Émise",
  paid: "Payée",
  cancelled: "Annulée",
  overdue: "En retard",
};

export function displayStatus(doc: { type: string; status: string; due_date: string | null }): string {
  if (doc.type === "invoice" && doc.status === "issued" && doc.due_date && doc.due_date < todayISO()) {
    return "overdue";
  }
  return doc.status;
}

export const OPERATION_LABEL: Record<string, string> = {
  services: "Prestation de services",
  goods: "Livraison de biens",
  mixed: "Mixte (biens et services)",
};

/** Mentions légales obligatoires en bas de document (micro-entreprise, franchise en base de TVA). */
export function legalMentions(opts: {
  type: DocType;
  clientIsProfessional: boolean;
  latePenalty: string;
}): string[] {
  const m: string[] = [VAT_MENTION];
  if (opts.type === "invoice") {
    m.push("Pas d'escompte pour paiement anticipé.");
    m.push(`En cas de retard de paiement, des pénalités seront appliquées au taux de ${opts.latePenalty}.`);
    if (opts.clientIsProfessional) {
      m.push(
        `Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : ${RECOVERY_FEE} € (art. L441-10 et D441-5 du Code de commerce).`,
      );
    }
  }
  if (opts.type === "quote") {
    m.push("Devis gratuit. Pour accepter ce devis, retournez-le daté et signé avec la mention « Bon pour accord ».");
  }
  return m;
}

export interface Deposit {
  label: string;
  amount: number;
}

export function depositsTotal(deposits: Deposit[]): number {
  return round2(deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0));
}

/** Net à payer = total HT (pas de TVA) moins les acomptes déjà versés. */
export function netToPay(total: number, deposits: Deposit[]): number {
  return round2(total - depositsTotal(deposits));
}

export const SIRET_PENDING = "en cours d'attribution";

const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "br", "div", "p"]);

/** Garde uniquement gras / italique / souligné / retours à la ligne ; supprime tout attribut. */
export function sanitizeRichText(html: string): string {
  return (html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?([a-z0-9]+)[^>]*>/gi, (tag, name: string) => {
      const n = name.toLowerCase();
      if (!ALLOWED_TAGS.has(n)) return "";
      return tag.startsWith("</") ? `</${n}>` : `<${n}>`;
    });
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
