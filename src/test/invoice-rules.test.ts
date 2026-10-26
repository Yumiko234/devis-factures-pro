import { describe, expect, it } from "vitest";
import { documentTotal, legalMentions, displayStatus, VAT_MENTION } from "@/lib/invoice";

describe("règles de facturation micro-entreprise", () => {
  it("calcule le total sans TVA, arrondi au centime", () => {
    expect(
      documentTotal([
        { description: "a", quantity: 3, unit: "h", unit_price: 33.335 },
        { description: "b", quantity: 1, unit: "u", unit_price: 0.1 },
      ]),
    ).toBe(100.11);
  });

  it("inclut la mention art. 293 B du CGI sur tous les documents", () => {
    for (const type of ["quote", "invoice", "credit_note"] as const) {
      expect(legalMentions({ type, clientIsProfessional: false, latePenalty: "x" })).toContain(VAT_MENTION);
    }
  });

  it("ajoute l'indemnité de 40 € uniquement pour un client professionnel", () => {
    const pro = legalMentions({ type: "invoice", clientIsProfessional: true, latePenalty: "x" }).join(" ");
    const part = legalMentions({ type: "invoice", clientIsProfessional: false, latePenalty: "x" }).join(" ");
    expect(pro).toContain("40 €");
    expect(part).not.toContain("40 €");
  });

  it("marque une facture émise et échue comme en retard", () => {
    expect(displayStatus({ type: "invoice", status: "issued", due_date: "2000-01-01" })).toBe("overdue");
    expect(displayStatus({ type: "invoice", status: "paid", due_date: "2000-01-01" })).toBe("paid");
  });
});

import { netToPay, sanitizeRichText } from "@/lib/invoice";

describe("acomptes et mise en forme", () => {
  it("déduit les acomptes du net à payer", () => {
    expect(netToPay(1000, [{ label: "Acompte 30 %", amount: 300 }, { label: "b", amount: 50.5 }])).toBe(649.5);
  });
  it("conserve gras/italique/souligné et retire le reste", () => {
    expect(sanitizeRichText('<b onclick="x">a</b><script>x</script><a href="y"><u>c</u></a>')).toBe("<b>a</b><u>c</u>");
  });
});

import { billedTotal, collectedByClient, collectedByMonth, collectedTotal, documentsCsv } from "@/lib/invoice";

describe("suivi du chiffre d'affaires", () => {
  const docs = [
    { type: "invoice", status: "paid", number: "FA-2026-001", issue_date: "2026-03-10", paid_at: "2026-04-02", total: 1200, client_name: "Durand" },
    { type: "invoice", status: "paid", number: "FA-2026-002", issue_date: "2026-01-20", paid_at: "2026-01-25", total: 300.5, client_name: "Durand" },
    { type: "invoice", status: "issued", number: "FA-2026-003", issue_date: "2026-05-01", paid_at: null, total: 500, client_name: "Martin" },
    { type: "credit_note", status: "issued", number: "AV-2026-001", issue_date: "2026-04-10", paid_at: null, total: -200, client_name: "Durand" },
    { type: "invoice", status: "paid", number: "FA-2025-009", issue_date: "2025-06-01", paid_at: "2025-06-30", total: 999, client_name: "Durand" },
  ];

  it("compte les encaissements au mois du paiement, avoirs déduits", () => {
    const months = collectedByMonth(docs, "2026");
    expect(months[0]).toBe(300.5);
    expect(months[3]).toBe(1000);
    expect(months[1]).toBe(0);
    expect(collectedTotal(docs, "2026")).toBe(1300.5);
    expect(collectedTotal(docs, "2025")).toBe(999);
  });

  it("additionne le CA facturé, avoirs déduits et brouillons exclus", () => {
    expect(billedTotal(docs, "2026")).toBe(1800.5);
  });

  it("répartit le CA encaissé par client", () => {
    expect(collectedByClient(docs, "2026")).toEqual([{ name: "Durand", total: 1300.5 }]);
  });

  it("exporte un CSV point-virgule avec décimales à la française", () => {
    const csv = documentsCsv(docs);
    expect(csv.split("\r\n")[0]).toBe("Type;Numéro;Date d'émission;Client;Montant HT;Statut");
    expect(csv).toContain("Facture;FA-2026-001;2026-03-10;Durand;1200,00;Payée");
    expect(csv).toContain("Avoir;AV-2026-001;2026-04-10;Durand;-200,00;Émise");
  });
});
