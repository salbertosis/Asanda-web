# Proposal: Harden Administrative Integrity

## Intent

Address five roots: stale session authority, conflated command/readback state, inconsistent admin accessibility/theme/language, mock-only runtime evidence, and dead `AthleteEvidence` representation—without another truth source.

## Scope

### In Scope

- Enforce sequential identity transitions and fresh server-side active-role authorization.
- Return `confirmed`, `rejected`, or `unknown`; separate read reconciliation, row/revision checks, and atomic/reconcilable multipart work.
- Apply fixes across News, Media, Featured Athletes, Athletes/Achievements, Clubs, Calendar, Results, and Records.
- Provide accessible Spanish keyboard/focus, responsive, dark-mode UI and layered runtime evidence.
- Retire unconsumed `AthleteEvidence` consumer-first; never resurrect its schema/migration.

### Out of Scope

- Leave issue **#207** external; achievement disappearance remains unknown.
- Exclude direct production SQL, unauthorized migrations, production/network access, and blind retry of uncertain writes/migrations.
- Exclude new roles/status stores, raw HY3 upload, historical cleanup, and static-data/SEO changes.

## Capabilities

### New Capabilities

- `admin-session-integrity`: Sequenced identity and server authority.
- `admin-command-integrity`: Outcomes, reconciliation, concurrency, atomicity.
- `admin-shell-integrity`: Accessible responsive Spanish administration.
- `admin-runtime-evidence`: Labeled real-boundary evidence.

### Modified Capabilities

None.

## Approach

- Run authorized server work sequentially; standardize outcome precedence; retry only idempotent reads.
- Preserve scheduling, archives, local HY3, and record publication/revisions via shared shell/reconciliation primitives.
- Label deterministic, server-contract, authenticated-role, public-read, and cleanup evidence; never pass mocks as production proof.
- Inventory consumers; ship linked, runnable, reversible chained slices of **≤400 changed lines**.

## Affected Areas

`src/admin/AdminSessionContext.jsx`/guards; eight modules/`src/services/admin/*`; `src/admin/AdminShell.jsx`/shared UI; and Supabase/RPC/Edge/Cloudinary, tests, and `AthleteEvidence*` cover authority, command integrity, accessible Spanish theme, evidence, and retirement.

## Risks

- Contract drift/unsafe retry: shared outcomes and read reconciliation.
- Mock overclaim: explicit labels and authorized evidence.
- #207 conflict/orphans: preserve tests; inventory recursively.

## Rollback Plan

Revert code/UI slices in reverse order. Correct confirmed database changes through separately authorized forward migrations—never ledger edits, direct production SQL, or retries. Restore removed `AthleteEvidence` code for a discovered consumer, never its withdrawn migration.

## Dependencies

- **#207** stays external and precedes compatible Achievement adoption; server/runtime checks and migrations require separate authorization.

## Success Criteria

- [ ] Session races and fresh-role authorization fail closed.
- [ ] Eight modules separate acknowledgement/readback; unknown writes are never retried blindly.
- [ ] Spanish UI passes keyboard/focus, responsive, dark-mode, contrast, and announcement checks.
- [ ] Evidence distinguishes mocks, server contracts, authenticated smoke, public reads, production facts.
- [ ] `AthleteEvidence` removal follows full inventory without resurrection.
- [ ] Linked slices are runnable, reversible, chained, and ≤400 changed lines.
