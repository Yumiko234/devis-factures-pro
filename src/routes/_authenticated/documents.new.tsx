import { createFileRoute } from "@tanstack/react-router";
import { NewDocument } from "@/components/app/NewDocument";

export const Route = createFileRoute("/_authenticated/documents/new")({
  validateSearch: (s: Record<string, unknown>) => ({ type: s["type"] === "quote" ? "quote" : "invoice" }) as { type: "quote" | "invoice" },
  head: () => ({ meta: [{ title: "Nouveau document — Registre" }] }),
  component: NewDoc,
});

function NewDoc() {
  const { type } = Route.useSearch();
  return <NewDocument type={type} />;
}
