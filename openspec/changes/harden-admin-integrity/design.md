# Design: Harden Administrative Integrity

## Technical Approach

Centralize mutation truth in one ephemeral outcome adapter, React context, feedback component, and accessible confirmation dialog. Domain records remain authoritative: no durable command ledger, retry queue, mega-RPC, or per-page state machine. A session generation fence prevents stale identity results from restoring authority. Static `src/data/` modules and SEO metadata do not enter the flow.

## Architecture Decisions

| Decision | Choice and rationale | Rejected |
|---|---|---|
| Command truth | `confirmed`, `rejected`, or `unknown`; readback is independent. Unknown blocks repeat mutation and permits authoritative reads only. | Optimistic success, blind retry, durable duplicate truth |
| Write boundaries | Add focused transactional RPCs only for News and Club; strengthen existing domain RPCs. Other writes require expected revisions and exact returned rows/counts. | One administrative RPC; wrapping every RLS write |
| Session | Capture `{generation,userId}` for every resolution; sign-out advances the generation and revokes locally before remote work. Server requests recheck active role. | Client claims or late async authority |
| UI | One shell provider/dialog/feedback path with shared focus, theme, and professional Rioplatense copy. | Per-page machines and inconsistent messages |

## Data Flow

`AdminSessionProvider → AdminGuard → AdminShell → AdminCommandProvider → route → service/RPC → authoritative row → outcome → independent readback`

News derives author server-side and preserves explicit lifecycle. Club saves organization, contacts, and logo atomically. Competition metadata never changes lifecycle; explicit status commands preserve program/history. Featured converts `America/Caracas` wall time to UTC and back without an item limit. Records revalidate active category, swimming definition, and discipline at save/publish. Results parses locally, uses one coherent reference token, and enforces 10,485,760 bytes/50,000 records client- and server-side.

Media prepares a fixed provider ID with `overwrite=false`; an authorized bounded inspection reconciles uncertainty, and upload is never repeated. New/edited public registrations require meaningful alt text. Legacy media remains visible pending authorized inventory, reviewed remediation, and a fresh zero-row gate.

## File Changes

| Group | Changes |
|---|---|
| Shared/session/shell | Add `src/services/admin/{commandOutcome,dateTime,importLimits}.js` and `src/admin/{AdminCommandContext,AdminCommandFeedback,AdminConfirmationDialog}.jsx`; modify `AdminSessionContext.jsx`, `AdminGuard.jsx`, `AdminShell.jsx`, `SkipLink.jsx`, `useDarkMode.js`, and shared styles. |
| Domains | Modify admin pages/services for News, Media, Featured, Athletes/Logros, Clubs, Calendar, Results, and Records; extend `supabase/functions/sign-media-upload/index.ts`. |
| SQL/evidence | Add sequential Supabase migrations and focused SQL/Node/Playwright contracts. Remove obsolete AthleteEvidence positive contract, then dead UI/service providers only after consumer inventory. Preserve negative resurrection/privacy guards. |

## Interfaces/Contracts

`runCommand({key, command, readback, reconcile, confirmation, messages, onConfirmed})` sends once and stores only ephemeral UI state. Services return `{outcome:'confirmed', value}`, `{outcome:'rejected', code, field?}`, or `{outcome:'unknown', code:'RESULT_UNVERIFIABLE'}`. Confirmation cancellation dispatches nothing; focus returns to the invoker. Unknown reconciliation requires exact identity/revision/postcondition evidence.

All destructive/consequential actions use the shared dialog. Route changes focus `h1` or `main#admin-main`; feedback announces without repeated focus theft. Explicit theme preference persists; otherwise system preference applies. Touched Spanish uses professional Rioplatense voseo.

## Testing Strategy

| Layer | Evidence |
|---|---|
| Deterministic/local | Session races, outcome precedence, rows/revisions, UTC, limits, ambiguity, no retry, consumer/string inventory |
| Mocked browser | Eight modules; keyboard/dialog/focus, one main, 320/390 px, overflow, themes/contrast, Spanish feedback, partial failures |
| Authorized runtime | SQL/Edge role and transaction contracts, authenticated editor/admin smoke, public reads, provider inspection, cleanup reads |

Evidence records command, revision, environment, mocks/skips, and redactions. Mocked evidence never proves deployment; unavailable or unknown boundaries stop mutation. Achievement disappearance and production residue remain unknown.

## Threat Matrix

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A — no executable classification or execution is added. |
| Git repository selection | N/A — no Git routing or cwd authority changes. |
| Commit state | N/A — no VCS automation or commit behavior. |
| Push state | N/A — no push automation or ref resolution. |
| PR commands | N/A — no PR command composition. |

The React shell change concerns in-app landmarks/focus only; it adds no shell commands, subprocesses, or process integration.

## Migration/Rollout

Deliver ≤400-line runnable work units with tests: shared/server foundations first, clients second, obsolete grants/signatures last. Additive migrations coexist with old clients; confirmed corrections use forward migrations, while unknown migration results stop without retry or ledger edits. Global alt enforcement follows inventory → reviewed remediation → fresh zero gate and contains no backfill/hide/delete. Logros adoption waits for external #207 and preserves its named regression. AthleteEvidence retires consumer-first; any uncertain consumer stops deletion.

## Open Questions

None. Authorized runtime, legacy-alt, and #207 evidence are rollout gates, not inferred facts.
