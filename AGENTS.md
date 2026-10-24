<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Invoice/quote/credit-note numbers are assigned only by the `finalize_document` SQL function (sequential per type/year), and a DB trigger blocks editing/deleting numbered invoices — French law requires gap-free, immutable invoices; never number or mutate them from app code.
- Billing rules and legal mentions live in `src/lib/invoice.ts` (tested in `src/test/invoice-rules.test.ts`) — keep calculations there, not in components.
- App data is read/written from the browser client with RLS scoped to `auth.uid()`; protected pages live under `src/routes/_authenticated/`.
