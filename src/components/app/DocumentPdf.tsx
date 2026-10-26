import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  DOC_LABEL, OPERATION_LABEL, SIRET_PENDING, formatDate, formatEUR, legalMentions, lineTotal, netToPay,
  sanitizeRichText, escapeHtml, type Deposit, type DocType, type LineItem,
} from "@/lib/invoice";
import type { Client, Settings } from "@/lib/data";

export interface PdfProps {
  type: DocType; number: string | null; issueDate: string; dueDate: string | null; validUntil: string | null;
  serviceDate: string; operationCategory: string; items: LineItem[]; total: number; notes: string;
  paymentMethod: string; company: Partial<Settings> | null; client: Partial<Client> | null;
  sourceNumber?: string | null | undefined; deposits?: Deposit[] | undefined;
}

// Les polices PDF standard ne connaissent pas certaines espaces/signes Unicode.
const t = (s: unknown) => String(s ?? "").replace(/[\u202F\u00A0]/g, " ").replace(/\u2212/g, "-");
const eur = (n: number) => t(formatEUR(n));

type Run = { text: string; b: boolean; i: boolean; u: boolean };
function parseRich(html: string): Run[][] {
  const doc = new DOMParser().parseFromString(`<div>${sanitizeRichText(html)}</div>`, "text/html");
  const lines: Run[][] = [[]];
  const walk = (n: Node, s: { b: boolean; i: boolean; u: boolean }) => {
    if (n.nodeType === 3) { if (n.textContent) lines[lines.length - 1]!.push({ text: t(n.textContent), ...s }); return; }
    if (n.nodeType !== 1) return;
    const tag = (n as Element).tagName.toLowerCase();
    if (tag === "br") { lines.push([]); return; }
    const ns = { b: s.b || tag === "b" || tag === "strong", i: s.i || tag === "i" || tag === "em", u: s.u || tag === "u" };
    const block = tag === "p" || tag === "div";
    if (block && lines[lines.length - 1]!.length) lines.push([]);
    n.childNodes.forEach((c) => walk(c, ns));
    if (block) lines.push([]);
  };
  doc.body.firstChild!.childNodes.forEach((c) => walk(c, { b: false, i: false, u: false }));
  return lines.filter((l, idx) => l.length || idx < lines.length - 1);
}
function font(b: boolean, i: boolean) {
  return b && i ? "Helvetica-BoldOblique" : b ? "Helvetica-Bold" : i ? "Helvetica-Oblique" : "Helvetica";
}

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#1f1d1a", lineHeight: 1.4 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#6b665e" },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.5 },
});
const COLS = [{ flex: 4.5 }, { width: 40, textAlign: "right" as const }, { width: 50, textAlign: "right" as const }, { width: 70, textAlign: "right" as const }, { width: 75, textAlign: "right" as const }];

export function DocumentPdf(p: PdfProps) {
  const c = p.company ?? {};
  const cl = p.client ?? {};
  const deps = p.deposits ?? [];
  const mentions = legalMentions({ type: p.type, clientIsProfessional: cl.is_professional ?? true, latePenalty: c.late_penalty || "trois fois le taux d'intérêt légal" });
  return (
    <Document title={`${DOC_LABEL[p.type]} ${p.number ?? "brouillon"}`} author={c.name ?? ""}>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <View style={{ maxWidth: 260 }}>
            <Text style={[s.bold, { fontSize: 14, marginBottom: 2 }]}>{t(c.name || "Votre entreprise")}</Text>
            <Text>{t(`${c.owner_name ?? ""}${c.legal_mention ? ` — ${c.legal_mention}` : ""}`)}</Text>
            {c.address ? <Text>{t(c.address)}</Text> : null}
            <Text>{t(`${c.postal_code ?? ""} ${c.city ?? ""}`)}</Text>
            {c.email ? <Text>{t(c.email)}</Text> : null}
            {c.phone ? <Text>{t(c.phone)}</Text> : null}
            <Text style={{ marginTop: 3 }}>SIRET : {t(c.siret || SIRET_PENDING)}</Text>
            {c.ape_code ? <Text>Code APE : {t(c.ape_code)}</Text> : null}
            {c.rcs_rm ? <Text>{t(c.rcs_rm)}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 24 }}>{DOC_LABEL[p.type]}</Text>
            <Text style={{ fontFamily: "Courier" }}>{p.number ?? "BROUILLON — non numéroté"}</Text>
            <Text style={{ marginTop: 6 }}>Date d'émission : {t(formatDate(p.issueDate))}</Text>
            {p.type === "quote" ? <Text>Valable jusqu'au : {t(formatDate(p.validUntil))}</Text> : null}
            {p.type === "invoice" ? <Text>Échéance : {t(formatDate(p.dueDate))}</Text> : null}
            {p.sourceNumber && p.type === "credit_note" ? <Text>Avoir sur facture : {p.sourceNumber}</Text> : null}
            {p.sourceNumber && p.type === "invoice" ? <Text>Réf. devis : {p.sourceNumber}</Text> : null}
          </View>
        </View>

        <View style={{ marginTop: 22, marginLeft: "auto", width: "50%", borderWidth: 0.75, borderColor: "#d8d3c9", borderRadius: 3, padding: 10 }}>
          <Text style={[s.muted, { fontSize: 7, letterSpacing: 1 }]}>CLIENT</Text>
          <Text style={s.bold}>{t(cl.name || "—")}</Text>
          {cl.contact_name ? <Text>{t(cl.contact_name)}</Text> : null}
          {cl.address ? <Text>{t(cl.address)}</Text> : null}
          <Text>{t(`${cl.postal_code ?? ""} ${cl.city ?? ""}`)}</Text>
          {cl.country && cl.country !== "France" ? <Text>{t(cl.country)}</Text> : null}
          {cl.siren ? <Text>SIREN : {t(cl.siren)}</Text> : null}
          {cl.vat_number ? <Text>N° TVA : {t(cl.vat_number)}</Text> : null}
        </View>

        <View style={{ marginTop: 16, flexDirection: "row", gap: 20, fontSize: 8.5 }}>
          <Text><Text style={s.muted}>Nature de l'opération : </Text>{t(OPERATION_LABEL[p.operationCategory] ?? p.operationCategory)}</Text>
          {p.serviceDate ? <Text><Text style={s.muted}>Date / période de réalisation : </Text>{t(p.serviceDate)}</Text> : null}
        </View>

        <View style={{ marginTop: 10, flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 5 }}>
          {["Désignation", "Qté", "Unité", "PU HT", "Total HT"].map((h, i) => <Text key={h} style={[s.th, COLS[i]!]}>{h}</Text>)}
        </View>
        {p.items.map((it, i) => (
          <View key={i} wrap={false} style={{ flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#d8d3c9", paddingVertical: 5 }}>
            <View style={[COLS[0]!, { paddingRight: 10 }]}>
              {parseRich(it.description?.includes("<") ? it.description : escapeHtml(it.description || "—")).map((line, li) => (
                <Text key={li}>{line.length ? line.map((r, ri) => <Text key={ri} style={{ fontFamily: font(r.b, r.i), textDecoration: r.u ? "underline" : "none" }}>{r.text}</Text>) : " "}</Text>
              ))}
            </View>
            <Text style={COLS[1]!}>{t(String(it.quantity))}</Text>
            <Text style={COLS[2]!}>{t(it.unit)}</Text>
            <Text style={COLS[3]!}>{eur(it.unit_price)}</Text>
            <Text style={COLS[4]!}>{eur(lineTotal(it))}</Text>
          </View>
        ))}

        <View wrap={false} style={{ marginTop: 10, marginLeft: "auto", width: 210 }}>
          <View style={[s.row, { paddingVertical: 2 }]}><Text>{deps.length ? "Sous-total HT" : "Total HT"}</Text><Text>{eur(p.total)}</Text></View>
          <View style={[s.row, s.muted, { paddingVertical: 2 }]}><Text>TVA</Text><Text>{eur(0)}</Text></View>
          {deps.length > 0 ? (
            <>
              <View style={[s.row, { paddingVertical: 2, borderTopWidth: 0.5, borderColor: "#d8d3c9" }]}><Text>Total TTC</Text><Text>{eur(p.total)}</Text></View>
              {deps.map((d, i) => <View key={i} style={[s.row, { paddingVertical: 2 }]}><Text>{t(d.label || "Acompte versé")}</Text><Text>- {eur(Number(d.amount))}</Text></View>)}
            </>
          ) : null}
          <View style={[s.row, { marginTop: 2, paddingVertical: 4, borderTopWidth: 1.5, fontSize: 11 }, s.bold]}><Text>Net à payer</Text><Text>{eur(netToPay(p.total, deps))}</Text></View>
        </View>

        {p.notes ? <Text style={{ marginTop: 14 }}>{t(p.notes)}</Text> : null}

        {p.type === "invoice" ? (
          <View style={{ marginTop: 14, fontSize: 8.5 }}>
            <Text><Text style={s.bold}>Règlement :</Text> {t(p.paymentMethod)}, au plus tard le {t(formatDate(p.dueDate))}.</Text>
            {c.iban ? <Text>IBAN : <Text style={{ fontFamily: "Courier" }}>{t(c.iban)}</Text>{c.bic ? <> — BIC : <Text style={{ fontFamily: "Courier" }}>{t(c.bic)}</Text></> : null}</Text> : null}
          </View>
        ) : null}

        {p.type === "quote" ? (
          <View wrap={false} style={{ marginTop: 20, marginLeft: "auto", width: 210, height: 80, borderWidth: 0.75, borderStyle: "dashed", borderColor: "#999", padding: 8, fontSize: 8.5 }}>
            <Text>Date et signature du client,</Text>
            <Text style={s.muted}>précédées de la mention « Bon pour accord »</Text>
          </View>
        ) : null}

        <View fixed style={{ position: "absolute", bottom: 28, left: 40, right: 40, borderTopWidth: 0.5, borderColor: "#d8d3c9", paddingTop: 6, fontSize: 7, color: "#6b665e" }}>
          {mentions.map((m) => <Text key={m}>{t(m)}</Text>)}
          {c.insurance ? <Text>Assurance professionnelle : {t(c.insurance)}</Text> : null}
          {c.footer_note ? <Text>{t(c.footer_note)}</Text> : null}
          <Text render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page ${pageNumber} / ${totalPages}` : "")} style={{ textAlign: "right" }} />
        </View>
        <View fixed style={{ height: 70 }} />
      </Page>
    </Document>
  );
}
