# Production News Body Approval Envelope

> **Status: AUTHORIZED / NOT EXECUTED**
>
> Issue [#137](https://github.com/salbertosis/Asanda-web/issues/137) and the maintainer's explicit authorization on `2026-08-26` authorize one validation and one atomic production application of the exact migration below, followed by one independent verification. This does not reopen, repair, retry, or replace the stopped production RLS envelope.

## Frozen scope

| Evidence | Authorized value |
|---|---|
| Repository base ancestor | `4e4b931c00dcb22cd93abce46bd776803f14df9d` |
| Migration | `20260825120000_validate_news_article_body.sql` |
| Migration Git-byte SHA-256 | `e5470d3ed4bcc3a943f45f0bc71fc3140f68ce54dcb1aa1c680cca379a972694` |
| Migration count before/after | `27` / `28` |
| Exact 28-file manifest SHA-256 | `e65887b9f9b820d3b27636f5620f4bced9fff28930bf25deee014229791d4be3` |
| Wrapper | `scripts/invoke-production-news-body-migration.ps1` |
| Wrapper Git-byte SHA-256 | `2d8b37b9e57cf97657ed41ad435c81cc2ba1935698a9d8044364c74673ff7ea5` |
| Approved production target | non-secret SHA-256 `a984bf1acccaf669f54a7d4a43449a58223c6cf00e7143beab293addc504bcdf` |
| Approved `psql.exe` | PostgreSQL major `17`; SHA-256 `2e8ff78ed93cd1f8610c240116aa43be3c0969c7372c748e8af1050dad4fcf73` |
| Backup receipt | `production-news-body-backup.json`; SHA-256 `ed92f24668cf5097f69cd0ceb57e17714df9d7cbaa544824fd96def2a2191bbc` |

Any difference in these values, the committed wrapper, the committed envelope, the migration manifest, or the protected receipts is a mandatory stop.

## Recovery and credentials

The authorized current logical backup contains exactly three verified PostgreSQL 17 custom archives: application schemas and migration ledger, Auth database data, and Storage database metadata. Binary Storage objects are outside this database-migration recovery scope. The protected receipt records each fixed filename, byte length, and SHA-256; the wrapper requires one unique matching file below the protected state root. The archives and receipt remain outside Git and synchronized folders, and their restricted ACL was verified operationally. The receipt timestamp must precede the fresh window by no more than 24 hours.

The protected state also contains `project.json` and a DPAPI CurrentUser `db-password.dpapi` payload. The wrapper validates only the approved target hash, places connection values only in the child `psql` environment, suppresses database error text, removes temporary SQL, clears byte buffers, and emits sanitized counts, booleans, phase tokens, and window timestamps only. Passwords, connection strings, project references, tokens, local paths, UUIDs, rows, claims, and private data must never enter evidence.

## Authority and window

- Operator: `Codex`.
- Independent verifier: a separate Codex agent and fresh database connection.
- Stop authority and cleanup owner: `Codex`.
- Candidate receipt: after merge, generate external `production-news-body-candidate.json` with exact `head_sha`, raw Git-byte wrapper/envelope hashes, and the frozen migration, manifest, backup-receipt, and target hashes. Its own SHA-256 must be explicitly approved and supplied to Preflight as `-ApprovedCandidateReceiptHash <approved-sha256>`; the same immutable receipt is required by every phase.
- Window: exactly 60 minutes beginning only when the first `Preflight` atomically creates the state receipt.
- Shared receipt: distinct `production-news-body-window.json` binds the exact approved candidate-receipt SHA-256 and carries `Preflight`, `Apply`, and `Verify` one-shot states. Every invocation must present that same hash before transition. Each phase atomically changes `not_started` to `started` before work and to `succeeded` only after its token; failure remains `started` and permanently blocks retry. `Apply` requires successful Preflight and `Verify` requires successful Apply. The stopped RLS receipt is preserved untouched and this receipt is never reset.
- Retry policy: one preflight, one apply, and one verify only. Phase consumption begins only after immutable candidate, target, `psql`, credential-state, and backup gates pass locally and `Start-Phase` writes `started`; any earlier local integrity failure is still a STOP requiring explicit reauthorization and a new candidate before another invocation, not an authorized retry. Any mismatch, timeout, connection ambiguity, credential exposure, unexpected output, or missing acceptance token stops execution with no repair or retry.

## Required sequence

1. Run `Preflight` through the frozen wrapper. It must prove the exact 27-version baseline, absence of the new version and three constraint names, zero existing body violations, and the expected prior structural aggregates. Only `ASANDA_NEWS_BODY_PREFLIGHT_OK` authorizes step 2.
2. Run `Apply` once. One explicit transaction takes a transaction-scoped advisory lock, repeats every mutable guard, executes the migration from immutable `HEAD`, records its exact SQL in the migration ledger, proves the exact 28-version post-state and three validated constraints, and commits. Only `ASANDA_NEWS_BODY_APPLY_OK` confirms the commit.
3. A separate agent runs `Verify` in a fresh process and connection within the same window. It must prove the exact 28-version ledger, all three validated constraints, zero violations, and the expected structural aggregates. Only `ASANDA_NEWS_BODY_VERIFY_OK` is acceptance evidence.

The older `production-rls-approval-envelope.md` remains stopped. This narrow migration cannot be treated as acceptance of its RLS candidate or as authorization for navigation, fixtures, account changes, other migrations, deployment retries, or unrelated production work.

## Stop and rollback boundary

Before commit, any SQL failure rolls back both the constraints and ledger insert. After a confirmed commit, the complete rollback boundary is only the three named `public.news_articles` CHECK constraints plus migration ledger version `20260825120000`; no application data is rewritten. A later rollback requires its own reviewed forward corrective migration and explicit authorization. Do not drop constraints, edit the ledger, reset sequences, disable triggers, or issue compensating statements during this window.

## Execution record

| Gate | Result |
|---|---|
| Immutable post-merge candidate, wrapper, envelope, manifest, migration, target, `psql`, and backup receipts | `PENDING` |
| Fresh 60-minute window | `PENDING` |
| Read-only preflight and individual structural diagnostics | `PENDING` |
| Atomic migration and exact ledger insertion | `PENDING` |
| Separate-connection verification | `PENDING` |
| Credential and temporary-file cleanup | `PENDING` |
| Maintainer acceptance | `PENDING` |

Record only bounded tokens, timestamps, counts, hashes, and PASS/STOP outcomes. A partial token is evidence of the last confirmed boundary, never permission to continue.
