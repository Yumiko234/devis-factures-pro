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
