# Exploration: Authorized Administration Panel

## Current State

The public React SPA already reads athletes, clubs, competitions, and homepage totals from Supabase. News, featured athletes, and some result presentation still use static modules. Supabase defines Auth-linked profiles, roles, RLS, consent, memberships, competitions, entries, performances, news, and media references. A real Hy-Tek Win-TM 8.0 HY3 export confirms that ASANDA's source files carry meet, pool, club, athlete, event, result, relay, and disqualification records, plus private identity and contact data that MUST NOT enter public storage. No admin routes, session guard, write services, HY3 parser, identity reconciliation, audit trail, or transactional importer exists.

## Affected Areas

- `src/App.jsx` — protected admin routes and public detail routes.
- `src/services/` — auth and domain write services.
- `src/pages/admin/`, `src/components/admin/` — login, shell, forms, tables, imports.
- `supabase/migrations/` — featured athletes, audit, constraints, and transactional functions.
- `supabase/functions/` — administrator account operations and Cloudinary signatures.
- `src/services/admin/hy3*` — fixed-width decoding, sanitization, reconciliation, and preview.
- `src/data/noticias.js`, `src/data/atletas.js` — public paths to retire after migration.
- `tests/e2e/`, `supabase/tests/` — authorization, domain invariants, and workflows.

## Approaches

1. **Browser parsing and RLS writes plus narrow server functions**
   - Pros: Reuses Supabase, current service style, and existing roles; low operational overhead.
   - Cons: HY3 versions need explicit compatibility tests; multi-table workflows require reviewed RPCs.
   - Effort: High.

2. **Dedicated administration API facade**
   - Pros: Centralized validation and auditing; easier future multi-client support.
   - Cons: Adds a backend deployment, duplicated authorization, and more failure boundaries than the current product needs.
   - Effort: Very high.

## Recommendation

Use direct Supabase reads/writes under RLS for simple content operations. Parse HY3 locally from raw bytes, decode Windows-1252, whitelist sports fields, discard private contact/identity values, and require operator reconciliation before sending sanitized rows to an atomic import RPC. Keep CSV as an optional fallback, not the authoritative format. Use Edge Functions only for Auth administration and signed Cloudinary uploads.

## Risks

- UI-only authorization would expose privileged writes; RLS must remain authoritative.
- Minor athlete publication without consent could create legal and privacy exposure.
- HY3 contains exact birth dates, identity numbers, addresses, phones, and emails; raw files must never be committed or publicly uploaded.
- Team and athlete source identifiers may be local to one Hy-Tek database and require explicit mapping.
- Result imports can partially corrupt data unless revalidated and committed atomically.
- Service-role and Cloudinary secrets must never enter Vite variables or browser code.
- The requested scope will greatly exceed the repository's 400-line PR budget.

## Ready for Proposal

Yes. Product decisions are resolved: email/password login, separate administrator/editor roles, direct editor publishing, curated featured athletes, manual correction, HY3-first import, and optional CSV fallback.
