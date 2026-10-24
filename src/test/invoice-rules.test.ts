import { describe, expect, it } from "vitest";
import { documentTotal, legalMentions, displayStatus } from "@/lib/invoice";

describe("règles des documents", () => {
  it("calcule le prix net, arrondi au centime", () => {
    expect(
      documentTotal([
        { description: "a", quantity: 3, unit: "h", unit_price: 33.335 },
        { description: "b", quantity: 1, unit: "u", unit_price: 0.1 },
      ]),
    ).toBe(100.11);
  });

  it("n'inclut aucune mention de TVA", () => {
    for (const type of ["quote", "invoice", "credit_note"] as const) {
      expect(legalMentions({ type }).join(" ")).not.toMatch(/TVA/);
    }
  });

  it("marque un reçu émis et échue comme en retard", () => {
    expect(displayStatus({ type: "invoice", status: "issued", due_date: "2000-01-01" })).toBe("overdue");
    expect(displayStatus({ type: "invoice", status: "paid", due_date: "2000-01-01" })).toBe("paid");
  });
});
