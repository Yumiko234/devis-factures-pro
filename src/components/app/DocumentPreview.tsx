import {
  DOC_LABEL,
  OPERATION_LABEL,
  formatDate,
  formatEUR,
  legalMentions,
  lineTotal,
  type DocType,
  type LineItem,
} from "@/lib/invoice";
import type { Client, Settings } from "@/lib/data";

interface Props {
  type: DocType;
  number: string | null;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  serviceDate: string;
  operationCategory: string;
  items: LineItem[];
  total: number;
  notes: string;
  paymentMethod: string;
  company: Partial<Settings> | null;
  client: Partial<Client> | null;
  sourceNumber?: string | null | undefined;
}

export function DocumentPreview(p: Props) {
  const c = p.company ?? {};
  const cl = p.client ?? {};
  const mentions = legalMentions({ type: p.type });

  return (
    <div className="print-sheet shadow-paper mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-paper p-[14mm] text-[12px] leading-relaxed text-ink">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-display text-xl font-semibold">{c.name || "Votre entreprise"}</p>
          <p>
            {c.owner_name} {c.legal_mention ? `— ${c.legal_mention}` : ""}
          </p>
          <p>{c.address}</p>
          <p>
            {c.postal_code} {c.city}
          </p>
          {c.email && <p>{c.email}</p>}
          {c.phone && <p>{c.phone}</p>}
        </div>
        <div className="text-right">
          <p className="font-display text-4xl">{DOC_LABEL[p.type]}</p>
          <p className="mt-1 font-mono">{p.number ?? "BROUILLON — non numéroté"}</p>
          <p className="mt-3">Date d'émission : {formatDate(p.issueDate)}</p>
          {p.type === "quote" && <p>Valable jusqu'au : {formatDate(p.validUntil)}</p>}
          {p.type === "invoice" && <p>Échéance : {formatDate(p.dueDate)}</p>}
          {p.sourceNumber && p.type === "credit_note" && <p>Avoir sur reçu : {p.sourceNumber}</p>}
          {p.sourceNumber && p.type === "invoice" && <p>Réf. proposition de vente : {p.sourceNumber}</p>}
        </div>
      </div>

      <div className="mt-8 ml-auto w-1/2 rounded border border-border p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Client</p>
        <p className="font-semibold">{cl.name || "—"}</p>
        {cl.contact_name && <p>{cl.contact_name}</p>}
        <p>{cl.address}</p>
        <p>
          {cl.postal_code} {cl.city}
        </p>
        {cl.country && cl.country !== "France" && <p>{cl.country}</p>}
      </div>

      <div className="mt-6 flex flex-wrap gap-x-8 text-[11px]">
        <p>
          <span className="text-muted-foreground">Nature de l'opération : </span>
          {OPERATION_LABEL[p.operationCategory] ?? p.operationCategory}
        </p>
        {p.serviceDate && (
          <p>
            <span className="text-muted-foreground">Date / période de réalisation : </span>
            {p.serviceDate}
          </p>
        )}
      </div>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-y border-ink text-left text-[10px] uppercase tracking-wider">
            <th className="py-2">Désignation</th>
            <th className="py-2 text-right">Qté</th>
            <th className="py-2 text-right">Unité</th>
            <th className="py-2 text-right">PU net</th>
            <th className="py-2 text-right">Prix net</th>
          </tr>
        </thead>
        <tbody>
          {p.items.map((it, i) => (
            <tr key={i} className="border-b border-border align-top">
              <td className="whitespace-pre-wrap py-2 pr-4">{it.description || "—"}</td>
              <td className="tabular py-2 text-right">{it.quantity}</td>
              <td className="py-2 text-right">{it.unit}</td>
              <td className="tabular py-2 text-right">{formatEUR(it.unit_price)}</td>
              <td className="tabular py-2 text-right">{formatEUR(lineTotal(it))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-64">
        <div className="flex justify-between py-1">
          <span>Prix net</span>
          <span className="tabular">{formatEUR(p.total)}</span>
        </div>
        <div className="flex justify-between border-t-2 border-ink py-2 text-base font-semibold">
          <span>Net à payer</span>
          <span className="tabular">{formatEUR(p.total)}</span>
        </div>
      </div>

      {p.notes && <p className="mt-6 whitespace-pre-wrap">{p.notes}</p>}

      {p.type === "invoice" && (
        <div className="mt-6 text-[11px]">
          <p>
            <span className="font-semibold">Règlement :</span> {p.paymentMethod}, au plus tard le {formatDate(p.dueDate)}.
          </p>
          {c.iban && (
            <p>
              IBAN : <span className="font-mono">{c.iban}</span> {c.bic && <>— BIC : <span className="font-mono">{c.bic}</span></>}
            </p>
          )}
        </div>
      )}

      {p.type === "quote" && (
        <div className="mt-8 ml-auto h-28 w-72 rounded border border-dashed border-ink/40 p-3 text-[11px]">
          <p>Date et signature du client,</p>
          <p className="text-muted-foreground">précédées de la mention « Bon pour accord et validation de la proposition »</p>
        </div>
      )}

      <div className="mt-auto border-t border-border pt-4 text-[10px] text-muted-foreground">
        {mentions.map((m) => (
          <p key={m}>{m}</p>
        ))}
        {c.insurance && <p>Assurance professionnelle : {c.insurance}</p>}
        {c.footer_note && <p>{c.footer_note}</p>}
      </div>
    </div>
  );
}
