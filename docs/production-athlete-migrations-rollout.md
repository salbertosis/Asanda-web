# Production Athlete Migrations Rollout Runbook

> **Status: PRE-DEPLOYMENT BLOCKED — compatibility integration passes; authorization and clone rehearsal remain pending.**
> **Production execution authorization: NOT GRANTED BY THIS DOCUMENT.**

## Decision

After every remaining gate in this runbook is closed, deploy exactly four canonical migrations from a newly frozen `origin/main` candidate to production project `fuxlohqricsfsxkjztne`, in timestamp order:

1. `20260830120000_expand_featured_athlete_ordering.sql`
2. `20260830122000_paginate_featured_athlete_profiles.sql`
3. `20260830130000_robust_athlete_achievement_groups.sql`
4. `20260830131000_robust_athlete_achievement_guards.sql`

Migration `20260830121000_add_athlete_evidence_sources.sql` was intentionally removed from the canonical branch before production deployment. It is not a pending migration, must not appear in the release candidate, and must not be recreated, repaired into the ledger, or applied manually.

The release is fail-closed: all four reviewed migrations deploy in order or none deploys. Any mismatch, failed gate, partial application, or ambiguous result stops the rollout.

## Current Reviewed Baseline

| Item | Expected state before release |
|---|---|
| Production project | `fuxlohqricsfsxkjztne` |
| Production ledger head | Exactly `20260829152000` |
| Pending manifest | Exactly the four files listed above, in that order |
| Retired evidence migration | Absent locally and absent from the production ledger |
| Candidate compatibility | The frozen candidate must contain grouped admin/public consumers plus concurrency/regression scripts and pass the readiness validator 25/25 |
| Runtime evidence | Migration contracts, concurrency harness, application regression, E2E, and build must pass again for the frozen candidate |
| Authorization | Must be granted separately; this runbook grants none |

This baseline must be rechecked immediately before rehearsal and again during the approved production window. Historical SDD evidence is not part of the `origin/main` release candidate and is not a substitute for current, repeatable runtime evidence.

## Compatibility Integration Status

The grouped release tracker closes the previously identified application/schema mismatch:

1. Administration writes through grouped RPCs instead of direct CRUD against `public.athlete_achievements`.
2. The public adapter accepts grouped `camelCase` cards and validated child results instead of the retired flat payload.
3. The candidate includes the real concurrency harness and dependency-free regression script.
4. Integrated verification passed the readiness validator 25/25, regression 7/7, Playwright 131/131, production build, and `git diff --check`.

This evidence proves compatibility of the integrated tracker, not authorization to deploy. If the reviewed chain is not present in the final `origin/main` candidate, or any file changes after the candidate is frozen, stop and repeat the gates.

## Quick Path

1. Merge the reviewed grouped-release chain into `origin/main` without changing its verified contents.
2. Freeze the resulting immutable Git candidate and record the four migration checksums.
3. Complete the approval envelope, backup/PITR confirmation, maintenance window, operator, reviewer, and stop authority.
4. Confirm the production ledger and exact pre-deploy schema fingerprint.
5. Rehearse the four migrations on Restore Test and then on a fresh production clone.
6. Review the exact pending manifest and dry-run output; reject any additional or missing migration.
7. During the approved window, stop incompatible writes, deploy the database contract, deploy the compatible frontend, and verify both.
8. Reopen traffic only after every post-deploy check passes and operator plus reviewer sign off.

## Release Scope

| Migration | Runtime purpose | Required outcome |
|---|---|---|
| `20260830120000` | Expands featured-athlete ordering and adds eligibility and ordering RPCs. | Current administration runtime can manage an ordered featured list safely. |
| `20260830122000` | Replaces the unpaginated featured-profile RPC with bounded paginated and homepage wrappers. | Current public runtime receives ordered, bounded profiles. |
| `20260830130000` | Migrates legacy achievement rows into grouped achievements and replaces write/public RPC behavior. | Grouped achievement authoring and public projection become available without document evidence. |
| `20260830131000` | Adds deferred child, record-owner, publication, and public-projection guards. | The grouped schema is complete and its invariants are enforced. |

The dependency order is `120000 -> 122000 -> 130000 -> 131000`. The timestamp gap at `121000` is intentional because that migration was removed before production application.

## Hard Prohibitions

- Do not treat this document as production authorization.
- Do not deploy migration SQL through `supabase db query`, `psql`, the SQL editor, or any direct-query mechanism.
- Do not run a blind `supabase db push`; independently review the exact pending manifest and dry-run first.
- Do not use `supabase migration repair` to manufacture parity or fill the intentional timestamp gap.
- Do not restore, recreate, or manually apply `20260830121000_add_athlete_evidence_sources.sql`.
- Do not relink the primary checkout, an existing Restore Test checkout, or a developer workspace to production.
- Do not reorder, omit, patch, retry, or forward-fix migrations during the release window.
- Do not run fixture-heavy SQL contracts or the concurrency harness in production.
- Do not log credentials, connection strings, row contents, UUIDs, object paths, or private athlete data.

## Required Approval Envelope

Do not start until every field is populated through an approved, non-secret channel.

| Field | Required record |
|---|---|
| Authorization | Approver, scope, issue/change reference, granted timestamp, and expiration |
| Target | Project reference `fuxlohqricsfsxkjztne`, independently confirmed by operator and reviewer |
| Candidate | Immutable Git SHA and checksums for all four migration files |
| Operator | Named production operator |
| Independent reviewer | Named person who does not execute the deployment |
| Window | Start, end, timezone, expected duration, and communications channel |
| Stop authority | Named person empowered to stop without further approval |
| Backup | Successful snapshot/backup reference and timestamp |
| PITR | Recovery coverage, earliest recovery point, retention, and restore owner |
| Frontend | Immutable frontend artifact/SHA compatible with the final database contract |

Any missing, stale, ambiguous, or inconsistent value blocks the release.

## Exact Production Starting Fingerprint

The operator and reviewer must independently confirm the following read-only state without returning private row data.

| Area | Exact expected pre-deploy state |
|---|---|
| Migration ledger | Highest applied version is exactly `20260829152000`; none of `20260830120000`, `20260830122000`, `20260830130000`, or `20260830131000` is recorded. |
| Retired migration | `20260830121000` is absent from both the pending candidate and remote ledger. |
| Featured order | `public.featured_athletes.display_order` is `smallint`; constraints `featured_athletes_display_order_check` and `featured_athletes_display_order_key` exist. |
| Featured RPC | `public.get_featured_athlete_profiles()` exists and returns `display_order smallint`; paginated and homepage wrappers do not yet exist. |
| Ordering RPCs | Append, move, candidate-list, and private eligibility RPCs from `120000` do not exist. |
| Legacy achievements | `public.athlete_achievements` exists with the legacy achievement types and indexes `athlete_achievements_public_idx` and `athlete_achievements_source_idx`. |
| Grouped achievements | Legacy-renamed/group/result tables and grouped save/publish/delete/list RPCs do not exist. |
| Evidence subsystem | No athlete-evidence bucket, evidence-specific source-document columns, or athlete-evidence RPCs exist. |

Record only aggregate baselines for featured athletes, legacy achievements, and source-document approval states. Do not export source rows or private identifiers.

Any mismatch means production is not at the reviewed starting state. Stop; do not adapt SQL or repair metadata during the window.

## Rehearsal Gates

### Gate 1: Restore Test

Use an isolated checkout linked only to Restore Test. Confirm the displayed project reference before every remote command. Restore a pre-`20260830120000` database state, review the exact four-file manifest, apply the four migrations through the reviewed migration mechanism, and run:

```powershell
npx.cmd --yes supabase@2.115.0 db query --linked --file supabase/tests/featured-athlete-ordering-contract.sql --agent no --output table
npx.cmd --yes supabase@2.115.0 db query --linked --file supabase/tests/featured-athlete-source-approval.sql --agent no --output table
npx.cmd --yes supabase@2.115.0 db query --linked --file supabase/tests/athlete-achievements-contract.sql --agent no --output table
npx.cmd --yes supabase@2.115.0 db query --linked --file supabase/tests/featured-athlete-profiles-rpc.sql --agent no --output table
node scripts/athlete-achievements-concurrency-harness.mjs
node scripts/athlete-achievements-regression.mjs
npm.cmd run test:e2e
npm.cmd run build
git diff --check
```

Acceptance requires every command to exit `0`, every SQL contract to end in `ROLLBACK`, the concurrency harness to admit exactly one seventh-group writer and reject the other, and cleanup to leave no race fixtures.

These `db query` commands are non-production contract tests. They are never a production deployment method.

### Gate 2: Fresh Production Clone

Create a fresh provider-supported clone from the approved production backup or recovery point. Use an ephemeral checkout and isolated CLI configuration linked only to the clone.

1. Confirm ledger head `20260829152000` and the exact starting fingerprint.
2. Confirm the pending manifest contains exactly the four canonical files in order and excludes `20260830121000`.
3. Review the dry-run output with the independent reviewer.
4. Apply the four migrations using the same mechanism intended for production.
5. Repeat every Gate 1 contract, harness, application, build, and diff check.
6. Compare aggregate pre/post counts and prove complete legacy-to-grouped migration.
7. Exercise public and administrator paths with synthetic data only, then remove all rehearsal fixtures.
8. Destroy or expire the clone according to the approved data-handling policy.

Any candidate, SQL, manifest, frontend, test, or environment change invalidates both rehearsal gates.

## Coordinated Production Execution

### 1. Freeze and Stop Writes

1. Announce the approved window and identify operator, reviewer, and stop authority.
2. Freeze deployments and administrative writes affecting featured athletes, achievements, records, consent, or event definitions.
3. Confirm the backup and PITR point are usable and inside retention.
4. Reconfirm target, ledger head, starting fingerprint, Git SHA, frontend artifact, manifest, and checksums.

### 2. Deploy the Database Contract

1. Present the exact four-file pending manifest and reviewed dry-run to the reviewer.
2. Apply all four canonical migrations in timestamp order through the approved migration mechanism.
3. Stop immediately on failure, connection loss, unexpected output, or ambiguous completion. Do not continue, repair, or issue direct SQL fixes.

### 3. Deploy the Compatible Frontend

Keep incompatible administrative writes stopped while the database changes. Deploy the frozen compatible frontend only after all four migrations pass database verification. Never reopen the legacy administration UI after the legacy achievement table is renamed.

### 4. Reopen Gradually

1. Verify anonymous/public read paths.
2. Verify administrator read paths and one approved cleanup-safe smoke workflow.
3. Confirm the removed athlete-evidence UI and backend remain absent.
4. Re-enable normal traffic and administration only after operator and reviewer sign off.

## Post-Deploy Verification

### Migration Metadata

- Ledger head is exactly `20260830131000`.
- The four expected versions appear once and in order.
- `20260830121000` remains absent.
- No unexpected migration is present.
- Applied migration checksums match the frozen candidate.

### Schema and Privilege Checks

- `featured_athletes.display_order` is `integer`, positive, unique, and initially deferred.
- Ordering RPCs exist; anonymous execution is denied and staff authorization remains enforced.
- The no-argument featured RPC is absent; paginated and homepage RPCs exist with `display_order integer` and reviewed grants.
- `athlete_achievements` is absent; `athlete_achievements_legacy` is inaccessible to client roles.
- Group/result tables and grouped save, publish, delete, and list RPCs exist.
- Deferred child, record-owner, publication, and public-projection guards from `131000` exist.
- Athlete-evidence columns, bucket, policies, and RPCs remain absent.

### Data and RPC Checks

- Legacy achievement count matches the aggregate baseline retained in `athlete_achievements_legacy`.
- Migrated group/result counts and orphan/duplicate aggregates match the reviewed mapping.
- Featured membership is unchanged and order values are positive and unique.
- Source-document aggregate approval states remain unchanged.
- Homepage and paginated featured RPCs return bounded, ordered, public-safe payloads.
- Grouped mutations enforce administrator-only access, six-group concurrency limits, active-event rules, record ownership, and publication consent.
- Public payloads exclude internal IDs, private fields, drafts, inactive events, and invalid/future/unpublished records.

Production verification must be read-only or use an explicitly approved cleanup-safe smoke path. Do not run rehearsal contracts or the concurrency harness against production.

## Stop Conditions

Stop the rollout immediately for:

- missing or expired authorization, window, backup, PITR, operator, reviewer, or stop authority;
- target, ledger, fingerprint, checksum, manifest, Git SHA, or frontend mismatch;
- appearance of `20260830121000` or any unexpected migration;
- any failed Restore Test or fresh-clone gate;
- migration failure, connection loss, partial state, or ambiguous completion;
- unexpected privilege, RPC signature, constraint, row-count delta, or public-data exposure;
- durable fixtures, credentials, private data, or identifiers in output;
- a request to reorder, omit, retry, repair, relink, directly query, or patch production during the window.

A stopped rollout is a failed rollout. Preserve evidence, keep writes closed where required, assess recovery offline, and obtain new authorization before another attempt.

## Recovery Boundaries

There are no down migrations.

| State | Approved recovery boundary |
|---|---|
| Before deployment starts | Abort without database change. |
| Failure before frontend cutover | Keep writes and frontend cutover stopped. Prefer snapshot/PITR restore when completion is partial or ambiguous. |
| Database succeeds, frontend fails | Keep administrative writes stopped. Roll forward only with the unchanged reviewed artifact; otherwise restore or rehearse a new fix and obtain authorization. |
| Writes occur under grouped schema | Do not restore application code alone or rename tables back. Use the approved snapshot/PITR boundary or a separately designed data conversion. |

Never use migration repair as rollback. Any forward fix requires offline design, fresh-clone rehearsal, independent review, and new authorization.

## Evidence Record

Preserve only:

- authorization, operator, reviewer, stop authority, and window;
- non-secret target project reference;
- backup/PITR references and timestamps;
- Git SHA, frontend artifact identity, exact four-file manifest, and checksums;
- starting fingerprint and ledger-head PASS/FAIL;
- Restore Test and clone command results, aggregate outcomes, and artifact hashes;
- production start/end timestamps and applied migration metadata;
- aggregate pre/post counts, schema/RPC/privilege results, smoke result, and cleanup result;
- stop reason, recovery action, and final maintainer decision.

Never record credentials, connection strings, access tokens, raw UUIDs, source rows, Storage paths, URLs, or private athlete data.

## Completion Checklist

- [ ] Authorization names the operator, reviewer, window, and stop authority.
- [ ] Backup and PITR references are verified.
- [ ] Production ledger ends at `20260829152000` before execution.
- [ ] Exact starting fingerprint passes.
- [ ] Git SHA, frontend artifact, four-file manifest, and checksums are frozen.
- [ ] `20260830121000` is absent from candidate and remote ledger.
- [ ] Restore Test rehearsal passes with zero durable fixtures.
- [ ] Fresh production-clone rehearsal passes with zero durable fixtures.
- [ ] Reviewer approves the exact manifest and dry-run.
- [ ] All four migrations apply in order; ledger ends at `20260830131000`.
- [ ] Post-deploy metadata, schema, privilege, data, and RPC checks pass.
- [ ] Compatible frontend deployment and public/admin smoke checks pass.
- [ ] No private data, credentials, or durable fixtures were produced.
- [ ] Operator, reviewer, and maintainer accept the recorded evidence.

The rollout is complete only when every item is checked. Any unchecked or failed item leaves the release stopped and unaccepted.
