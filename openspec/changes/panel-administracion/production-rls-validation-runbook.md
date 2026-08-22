# Production RLS Validation Runbook

> **Status: draft plan only. Production execution remains unauthorized.** Reviewing or approving this document does not authorize database access, credential use, deployment, migration, fixture creation, or any production operation. A separately recorded execution authorization is required.

## Quick Path

1. Confirm every approval gate in the final approval envelope without accessing production.
2. A separately authorized operator verifies the exact target and migration receipt, then records safe baselines.
3. The operator runs the bounded role checks in order inside one rollback-only transaction.
4. Any mismatch stops the run without repair or retry.
5. An independent reviewer proves zero fixture residue and confirms navigation remains disabled.

## Outcome

This runbook plans a production RLS validation for OpenSpec task 5.2. It is not an execution record, does not complete task 5.2, and does not establish that production matches the repository.

The intended outcome of a later authorized run is evidence that administrator, editor, inactive authenticated, and anonymous identities receive the expected RLS behavior across the protected administration domains. The run must leave zero fixture rows, zero fixture audit rows, and no Auth changes. Navigation remains disabled until the maintainer separately accepts the production evidence.

## Scope

### In Scope

- Read-only preflight of the exact approved production target and migration receipt.
- RLS and function privilege checks for access, editorial, athlete, club, calendar, and result domains.
- A minimal synthetic data graph contained in one rollback-only SQL transaction.
- In-transaction audit count and watermark checks.
- Post-transaction residue proof by an independent reviewer or independently executed read-only step.
- Safe evidence containing only bounded counts, outcomes, hashes/references, and opaque identifiers.

### Non-Goals

- Enabling or exposing admin navigation.
- Deployment, migration, fixture import, schema repair, or configuration changes.
- Production execution under the authority of this document.
- Creating, inviting, deleting, banning, unbanning, activating, deactivating, or changing the role of any Auth user.
- Using real-person athlete, contact, identity, or staff data.
- Sending invitations or email.
- Uploading media or contacting Cloudinary or any other external service.
- Testing service-role account orchestration, email delivery, media upload, browser navigation, or full application workflows.
- Re-running repository regressions unchanged in production; existing SQL files include staging assumptions and broader fixtures.
- Proving end-to-end athlete creation. The current schema requires a same-transaction private identity row while the client role cannot write `private.athlete_details`; this run isolates RLS with privileged synthetic fixture setup and does not claim that the browser workflow is validated.

## Preconditions And Gates

Every gate is fail-closed. Missing, stale, or ambiguous evidence means **do not start**.

| Gate | Required evidence before execution |
|---|---|
| Separate authority | A time-bounded production execution approval that names the operator, independent reviewer, maintenance window, scope, and stop authority. Approval of this document is not sufficient. |
| Exact target identity | The production project/database identity is supplied and approved at execution time through a safe channel. Evidence records only an approved hash or change/reference identifier, never the raw connection value. |
| Delivered candidate | Reviewed source and migrations are already delivered. The approved Git candidate/receipt identity is immutable and recorded before target access. |
| Migration parity | Production migration history exactly matches the approved receipt, including the reviewed forward correction through `20260820152000_fix_result_import_entry_conflict.sql`. No missing, extra, reordered, or checksum-different migration is accepted. |
| Validation identities | Dedicated, pre-provisioned administrator, editor, and inactive authenticated identities exist and are approved for this run. Their profile role/activity states are read-only inputs. Anonymous uses no identity. |
| Auth immutability | The run will not create or change Auth users, profiles, roles, active flags, passwords, sessions, bans, or invitations. |
| Secret handling | Credentials and tokens never appear in command arguments, files, logs, evidence artifacts, shell history, environment dumps, or persistent environment values. The authorized operator must use an approved ephemeral secret channel and a non-echoing execution mechanism. |
| Transaction support | The selected production SQL execution path is proven to preserve one transaction across setup, role switches, assertions, audit inspection, and final rollback. If this cannot be guaranteed, stop. |
| Audit sequence semantics | The maintainer accepts an exact, reviewed, non-semantic identity-sequence allocation bound for each candidate slice. Slice 1 contributes exactly **3** allocations. Audit rows and fixture rows must still roll back to zero; sequence reset and trigger disabling remain prohibited. This policy does not authorize execution. |
| Fixture review | The exact transaction candidate is independently reviewed against this runbook before execution. It uses only the tables, policies, and functions listed here and contains an unconditional final rollback. |
| Window and ownership | A bounded maintenance window, execution operator, stop authority, cleanup owner, residue reviewer, and escalation contact are recorded. |
| Observability | Safe baseline and post-run count queries are reviewed before execution. Their output is aggregate-only and cannot emit raw rows. |
| Navigation hold | The maintainer confirms admin navigation is disabled and will remain disabled until separate evidence acceptance. |

## Evidence Key

The role matrix uses these repository evidence codes. Paths are repository-relative.

| Code | Evidence |
|---|---|
| `P` | `supabase/migrations/20260812132352_initial_asanda_schema.sql`: `private.is_content_editor()`, `private.is_administrator()`, public read policies, generated content-editor policies, profile policies, grants, and RLS enablement. |
| `A` | `supabase/migrations/20260817175000_add_admin_audit_log.sql`: private audit table, revoked client access, and mutation triggers. |
| `C` | `supabase/migrations/20260817190000_add_admin_content_contracts.sql` and `supabase/migrations/20260818150000_enable_content_contracts_rls.sql`: consent/publication guards, featured/source mapping policies, and RLS enablement. |
| `S` | `supabase/migrations/20260817200000_add_staff_profile_transition_rpc.sql`: service-role-only staff transition function. |
| `L` | `supabase/migrations/20260820120000_add_club_lifecycle_contracts.sql`: archive-only organization lifecycle and approved-logo guard. |
| `K` | `supabase/migrations/20260820133000_add_competition_admin_contracts.sql`: competition/event guards and `reorder_competition_events`. |
| `R` | `supabase/migrations/20260820150000_add_result_import_transaction.sql`, `supabase/migrations/20260820151000_add_public_result_query.sql`, and `supabase/migrations/20260820152000_fix_result_import_entry_conflict.sql`: result import and public result functions. |
| `T-sec` | `supabase/tests/admin-security-foundation.sql`: anonymous write denial, inactive write denial, editor escalation denial, and private audit denial. |
| `T-edit` | `supabase/tests/admin-editorial-services.sql` and `supabase/tests/admin-content-contracts.sql`: editor writes and anonymous publication filtering. |
| `T-ath` | `supabase/tests/admin-athlete-club-rules.sql`: consent, athlete relations, public contact filtering, and archival invariants. |
| `T-cal` | `supabase/tests/admin-calendar-contracts.sql`: venue, competition, and event invariants. |
| `T-res` | `supabase/tests/admin-result-import-contracts.sql`: function privileges, editor import, public projection, audit, atomicity, and residue checks. |
| `T-staff` | `supabase/tests/admin-staff-profile-transition.sql`: service-role-only staff transition and inactive actor denial. |

## Role And Operation Matrix

`Public read` means only rows admitted by the named public policy or public function. It never means unrestricted table visibility. `Deny` must be observed as a permission/RLS denial or zero affected rows, according to the reviewed operation shape; ambiguous success is a stop condition.

| Domain and real surface | Administrator | Editor | Inactive authenticated | Anonymous |
|---|---|---|---|---|
| Profiles: `profiles`; read role/activity state | Allow all profile rows for validation; no mutation in this run (`P`) | Own profile only; other profiles hidden (`P`, `T-sec`) | Own profile only despite inactivity; other profiles hidden (`P`) | Deny all (`P`) |
| Staff authority: `organization_staff`, `transition_staff_profile(uuid,uuid,text,boolean)` | Client call to transition function denied; function is service-role-only. No staff mutation in this run (`S`, `T-staff`) | Deny organization-staff management and profile escalation; transition function denied (`P`, `S`, `T-sec`, `T-staff`) | Deny staff/profile mutation and transition function (`P`, `S`, `T-staff`) | Deny staff/profile read or mutation and transition function (`P`, `S`, `T-staff`) |
| Audit: `private.admin_audit_log` | Client read denied; only aggregate in-transaction inspection by the approved maintenance context (`A`) | Deny client read; authorized mutations create audit rows (`A`, `T-sec`) | Deny (`A`) | Deny (`A`) |
| Editorial: `news_articles`, `media_assets`, `featured_athletes` | Allow admin read/write subject to domain constraints; this run uses synthetic news/featured operations and no media upload (`P`, `C`, `T-edit`) | Allow read/write subject to publication/consent constraints (`P`, `C`, `T-edit`) | Public read only; deny insert/update/delete (`P`, `C`, `T-sec`) | Public read only: due published news, linked public media, current valid featured rows; deny writes (`P`, `C`, `T-edit`) |
| Athletes: `athletes`, `athlete_consents`, `athlete_category_assignments`, `athlete_disciplines`, `athlete_memberships` | Allow admin read/write subject to consent, category, discipline, and membership constraints (`P`, `C`, `T-ath`) | Allow read/write subject to the same constraints (`P`, `C`, `T-ath`) | Public read only; consents remain hidden; deny writes (`P`, `C`) | Public read only for consent-qualified published athletes and admitted relations; consents remain hidden; deny writes (`P`, `C`, `T-ath`) |
| Clubs: `organizations`, `organization_contacts` | Allow read/write; hard delete denied and archive required (`P`, `L`, `T-ath`) | Allow read/write; hard delete denied and archive required (`P`, `L`, `T-ath`) | Public read only for published organizations and explicitly public contacts; deny writes (`P`, `T-ath`) | Same public read-only boundary; private contacts hidden; deny writes (`P`, `T-ath`) |
| Calendar and references: `sports`, `disciplines`, `age_categories`, `event_definitions`, `venues`, `competitions`, `competition_events`; `reorder_competition_events(uuid,uuid[])` | Allow managed reads/writes and reorder subject to constraints; competition delete denied (`P`, `K`, `T-cal`) | Allow managed reads/writes and reorder subject to constraints; competition delete denied (`P`, `K`, `T-cal`) | Public/reference read only; deny writes and reorder because `private.is_content_editor()` is false (`P`, `K`) | Public/reference read only; function execution/write denied (`P`, `K`) |
| Result administration: `source_mappings`, `source_documents`, `import_batches`, `entries`, `performances`; both `commit_result_import` signatures | Allow admin reads/writes/import subject to mapping, revision, consent, and atomicity checks (`P`, `C`, `R`, `T-res`) | Allow reads/writes/import subject to the same checks (`P`, `C`, `R`, `T-res`) | Public result reads only; source mappings and non-public import state hidden; import denied by `private.is_content_editor()` (`P`, `C`, `R`) | Source mappings hidden and import functions not executable; public result projection allowed only through `get_published_result_rows(uuid)` and public RLS (`C`, `R`, `T-res`) |
| Public result projection: `get_published_result_rows(uuid)` | Allow read (`R`, `T-res`) | Allow read (`R`, `T-res`) | Allow filtered read (`R`) | Allow filtered read of official, published, consent-qualified results (`R`, `T-res`) |

### Matrix Interpretation Rules

- Administrator and editor share `private.is_content_editor()` for managed domain tables. Administrator-only authority is limited to profile and organization-staff policies, while staff lifecycle orchestration remains outside this run.
- Inactive authenticated identities retain the public policies and their own-profile read policy. They must not receive content-editor or administrator access.
- Public/reference visibility is expected and is not an RLS failure. The assertion must compare exact fixture visibility, not require every anonymous query to return zero rows.
- Domain constraints may deny an otherwise RLS-authorized mutation. The transaction must separate authorization assertions from constraint assertions so a business-rule failure cannot be mistaken for an RLS denial.
- Existing SQL regressions are evidence for expected behavior, not production-ready commands. Their staging profile names and broad setup must not be reused in production.

## Synthetic Fixture Design

### Identity And Naming

- Generate one opaque run ID with at least 128 bits of randomness before target access.
- Derive a non-semantic prefix such as `rlsv-<opaque-run-id-fragment>` for every slug, code, checksum source, label, and synthetic display value.
- Do not include names, emails, phone numbers, national identifiers, production IDs, operator names, brands, hosts, project references, or external URLs in fixture values.
- Before insertion, perform a collision count for the prefix. Any nonzero result stops the run.

### Maximum Transactional Rows

All rows below exist only inside one rollback-only transaction. Existing active reference rows may be read by identifier but never modified.

| Table | Maximum new rows | Purpose |
|---|---:|---|
| `media_assets` | 0 | Media upload and external URL behavior are out of scope. |
| `news_articles` | 1 | Draft/private and due-published visibility plus editor/admin mutation. |
| `organizations` | 1 | Synthetic club publication and archive-only constraint. |
| `organization_contacts` | 2 | One explicitly public opaque value and one private opaque value. Neither resembles real contact data. |
| `athletes` | 1 | Synthetic public athlete row without photo. |
| `private.athlete_details` | 1 | Privileged fixture support only: fixed synthetic date, non-real last-four canary, and a hash derived from the opaque run ID rather than a national identifier. Never selected into evidence. |
| `athlete_consents` | 2 | Public-profile and results-publication consent; no document asset. |
| `athlete_category_assignments` | 1 | Uses one existing active category. |
| `athlete_disciplines` | 1 | Uses one existing active discipline. |
| `athlete_memberships` | 1 | Associated membership to the synthetic club. |
| `featured_athletes` | 1 | Active window for the synthetic consent-qualified athlete. |
| `venues` | 1 | Opaque venue identity with no address. |
| `competitions` | 1 | Published synthetic competition using an existing active sport. |
| `competition_events` | 1 | Uses one existing compatible active event definition and category. |
| `source_mappings` | 1 | Opaque pending mapping used only for visibility/write denial checks. |
| `source_documents` | 1 | Created only through the reviewed manual result-import function. |
| `import_batches` | 1 | Created only through the reviewed manual result-import function. |
| `entries` | 1 | Created only through the reviewed manual result-import function. |
| `performances` | 1 | One official synthetic result with consent. |

### Transaction And Audit Impact

- Fixture setup, role assertions, expected writes, aggregate audit inspection, and teardown are one database transaction ending in unconditional rollback.
- `organizations` and `competitions` are never committed because their delete guards require archival rather than hard deletion (`L`, `K`).
- Expected lasting row impact: **zero rows in every public and private fixture table**.
- Expected lasting audit-row impact: **zero fixture audit rows**. Audit rows participate in the rolled-back transaction.
- Accepted non-row impact: `private.admin_audit_log.id` is `generated always as identity`, so PostgreSQL sequence allocation is non-transactional. Slice 1 contributes exactly **3** allocations on pass. A stopped run may contribute **0..4** allocations because an unexpectedly allowed profile-escalation probe can allocate once before the candidate fails; absence of final evidence is stopped, never pass. The in-transaction ledger attributes actual pass rows by actor, action, table, transaction, and exact fixture identifier.
- The in-transaction audit delta must equal the independently reviewed operation ledger. The ledger is finalized with the exact transaction candidate; it is not guessed in this runbook.
- Immutable audit rows that predate the run remain untouched. If the approved execution mechanism would make audit evidence survive the rollback, this plan is invalid and execution must stop. Any future plan permitting lasting audit rows must use only opaque synthetic entity identifiers and state the exact count before authorization.

### Candidate Admission Policy

Mutation-bearing candidates are admissible only when their reviewed operation ledger fixes an exact sequence-allocation contribution and aggregate-only evidence reports that bound. Global sequence movement is not a residue signal because unrelated concurrent audit activity may also allocate values. Fixture rows and fixture audit rows remain subject to independent zero-residue proof.

Resetting the sequence is not an acceptable workaround: it is a separate production mutation and is unsafe under concurrent audit activity. Disabling audit triggers is also prohibited because it invalidates the behavior being tested.

**Maintainer audit-sequence decision:** `accepted-bounded-non-semantic-advancement`

The first autonomous candidate slice is `supabase/tests/production-rls-validation-candidate.sql`; its separate read-only residue proof is `supabase/tests/production-rls-validation-residue.sql`. This slice validates all four roles against access/editorial surfaces and establishes the ledger/evidence mechanism. Athlete/club, calendar, and result surfaces remain for later slices. Neither file grants production execution authority.

### Non-Transactional State

- Auth identities, sessions, bans, passwords, invitations, and profile role/activity states are pre-existing inputs and are not fixtures.
- No Auth state is created, changed, restored, or cleaned up. The editor profile-escalation probe is expected to affect zero rows; any unexpectedly allowed transactional profile change is a failed run and is removed by the unconditional rollback.
- Operator evidence stored outside the database may persist, but only under the safe evidence schema below.

## Ordered Execution Procedure

Concrete invocation syntax is intentionally omitted. The repository proves SQL behavior but does not provide a production-safe credential wrapper or transaction harness. The later authorized actor must use a separately reviewed invocation that satisfies all gates.

### 1. Privacy Scan

- Scan the exact transaction candidate and evidence template before target access.
- Confirm fixture literals contain only the opaque prefix, bounded generic labels, fixed synthetic values, and no raw identity/contact values, credentials, hosts, brands, or external URLs.
- Confirm queries return assertions and aggregate counts only, never raw rows.
- Confirm the candidate contains no Auth mutation, persistent profile mutation, DDL, migration, deployment, navigation, media, network, or extension-install operation. The single profile-escalation probe must remain transaction-local, affect zero rows on pass, and roll back on failure.
- Confirm an unconditional rollback is structurally present and cannot be skipped by an assertion path.

### 2. Exact Identity And Migration Preflight

- Resolve the target identity through the approved safe channel and compare its approved hash/reference exactly.
- Record the immutable Git candidate and approved delivery receipt.
- Read migration history and compare ordered versions and approved checksums to the receipt. The expected repository tip for this plan includes `20260820152000_fix_result_import_entry_conflict.sql`; the authorized receipt remains authoritative.
- Confirm the administrator, editor, and inactive validation profile IDs resolve exactly once and have the approved roles/activity states. Do not record names, emails, or raw UUIDs; evidence uses approved opaque references or hashes.
- Confirm required tables, RLS flags, policies, functions, grants, and audit triggers match the reviewed transaction's preflight manifest.

### 3. Baseline Counts And Watermarks

- Record aggregate counts scoped to the opaque prefix across every fixture table.
- Record the audit count and maximum audit identity as bounded aggregate values.
- Record existing profile role/activity state as per-identity booleans through approved opaque references.
- Require zero prefix collisions before starting the transaction.

### 4. Anonymous Checks

- Enter the anonymous database role with no user claim inside the transaction.
- Prove writes are denied for one representative managed table and that result-import functions are not executable.
- Prove the private audit table, profiles, source mappings, and non-public fixture rows are unreadable.
- Prove exact public visibility for due news, public club/contact, consent-qualified athlete relations, published calendar rows, current featured selection, and the official consent-qualified result projection.
- Prove draft/private/expired/non-public counterparts are hidden where the fixture graph includes them.

### 5. Inactive Authenticated Checks

- Set only the transaction-local authenticated role and the approved inactive identity claim.
- Prove the identity can read only its own profile plus public-policy rows.
- Prove content insert/update/delete, event reorder, result import, staff mutation, source mapping access, and private audit access are denied.
- Do not activate, replace, or otherwise alter the inactive identity.

### 6. Editor Checks

- Set only the transaction-local authenticated role and approved active editor identity claim.
- Prove managed-table visibility and bounded mutations across editorial, athlete/club, calendar, and result surfaces using the synthetic graph.
- Prove `reorder_competition_events` accepts the complete synthetic event order.
- Prove the manual `commit_result_import` path accepts one sanitized row with opaque reason/evidence and creates exactly one source document, batch, entry, and performance inside the transaction.
- Prove direct profile role escalation affects zero rows or is denied, `organization_staff` mutation is denied, `transition_staff_profile` is not executable, and private audit reads are denied.
- Inspect only aggregate audit deltas from the maintenance context, not from the editor role.

### 7. Administrator Checks

- Set only the transaction-local authenticated role and approved active administrator identity claim.
- Prove administrator visibility across profiles and all managed domain rows.
- Perform one bounded synthetic domain mutation to prove content-editor authority.
- Prove organization and competition hard-delete guards deny destructive removal even though RLS authorizes domain management.
- Do not mutate profiles, organization staff, Auth users, or invoke service-role staff transitions.

### 8. Cleanup

- Reset transaction-local claims and roles.
- Compare in-transaction fixture counts and audit deltas to the reviewed operation ledger.
- Roll back the entire transaction unconditionally. Do not issue compensating deletes and do not commit partial evidence.
- Clear ephemeral credentials/tokens from the approved execution mechanism without printing or persisting them.

### 9. Independent Residue Proof

- A second operator, or an independently executed read-only step owned by the residue reviewer, repeats the prefix-scoped aggregate counts.
- Require zero fixture rows and zero fixture audit rows, unchanged validation profile role/activity states, and no Auth changes. Global audit count/watermark may advance because of the accepted candidate allocation or unrelated concurrent audited work; it is context, not fixture residue.
- Compare production migration history again to prove the run performed no schema change.
- Any nonzero or ambiguous result is a failed run and an incident/escalation input, not a cleanup invitation.

### 10. Hold Navigation

- Record the operator decision as pass, fail, or stopped.
- Keep admin navigation disabled regardless of technical outcome.
- Navigation may be considered only after the maintainer separately accepts the complete safe evidence and records a new authorization decision.

## Stop Conditions

Stop immediately, preserve only safe evidence, and do not repair or retry inside the production run when any condition occurs:

- Target identity does not exactly match the approved production reference.
- Migration versions, order, checksums, objects, grants, RLS flags, policies, functions, or triggers drift from the approved receipt/manifest.
- Credential or token handling could expose secrets through arguments, files, logs, artifacts, shell history, environment dumps, or persistent environment values.
- Any expected allow is denied, any expected deny is allowed, or an affected-row/visibility result differs from the matrix.
- A business-rule failure cannot be distinguished from an RLS failure.
- Baseline collision count is nonzero or a fixture could overlap real data.
- Any output contains raw rows or disallowed evidence fields.
- Administrator, editor, or inactive validation identity is missing, duplicated, unavailable, or in the wrong role/activity state.
- The transaction boundary, final rollback, independent review, maintenance window, cleanup owner, or stop authority is unavailable.
- The audit identity-sequence impact remains undecided, is absent from the reviewed ledger/evidence schema, or differs from the maintainer-approved bound.
- In-transaction audit count/ledger, actor reference, entity table, action, reason, or evidence does not match exactly.
- Post-rollback fixture rows or fixture audit rows are nonzero, profile/Auth state changes, or migration history changes. Global audit count/watermark movement alone is not residue; it must remain compatible with the accepted 0..4 stopped bound or exact 3-on-pass candidate contribution plus independently identified concurrent audit activity.
- Any output, error, count, identity, or target result is ambiguous.

There is **no repair, migration, privilege change, fixture deletion, identity replacement, or retry inside the run**. A stopped run requires incident assessment and a new reviewed plan and authorization.

## Safe Evidence Template

The evidence artifact may contain only the following fields. Values shown in angle brackets are placeholders, not commands or production values.

```yaml
schema: asanda.production-rls-validation-evidence/v1
run_id: <opaque-run-id>
plan_revision: <runbook-content-hash-or-approved-reference>
target_identity_reference: <approved-hash-or-change-reference>
window_started_at: <utc-timestamp>
window_ended_at: <utc-timestamp>
git_candidate: <immutable-commit-or-tree-identity>
delivery_receipt: <approved-receipt-identity>
migration_receipt_match: <true|false>
command_shapes:
  - <secret-free-operation-shape>
roles:
  anonymous: <pass|fail|stopped|not-run>
  inactive_authenticated: <pass|fail|stopped|not-run>
  editor: <pass|fail|stopped|not-run>
  administrator: <pass|fail|stopped|not-run>
domain_outcomes:
  access: <pass|fail|stopped|not-run>
  editorial: <pass|fail|stopped|not-run>
  athletes: <pass|fail|stopped|not-run>
  clubs: <pass|fail|stopped|not-run>
  calendar: <pass|fail|stopped|not-run>
  results: <pass|fail|stopped|not-run>
bounded_counts:
  baseline_prefix_rows: <integer>
  in_transaction_fixture_rows: <integer>
  final_prefix_rows: <integer>
audit:
  baseline_count: <integer>
  baseline_watermark: <integer-or-null>
  in_transaction_delta: <integer>
  expected_in_transaction_delta: <integer>
  actual_candidate_audit_rows: <integer>
  exact_sequence_allocations_on_pass: <3-or-null>
  stopped_sequence_allocations_min: 0
  stopped_sequence_allocations_max: 4
  final_count: <integer>
  final_watermark: <integer-or-null>
cleanup:
  transaction_rolled_back: <true|false>
  residue_zero: <true|false>
  auth_state_unchanged: <true|false>
  profile_state_unchanged: <true|false>
independent_residue_reviewer: <approved-opaque-reference>
operator_decision: <pass|fail|stopped>
stop_reason_code: <bounded-code-or-null>
navigation_remains_disabled: true
```

Evidence must not contain raw query rows, names, display names, emails, phone numbers, addresses, national identifiers or hashes, profile/Auth UUIDs, access or refresh tokens, passwords, connection strings, URLs containing credentials, environment dumps, raw command output, raw SQL errors containing data, absolute local paths, production hostnames, or secret-bearing command lines.

## Rollback And Irreversibility

- Data fixtures must be rolled back and their absence independently proven with aggregate prefix-scoped counts.
- The expected lasting row impact is exactly zero. The only accepted lasting database effect is non-semantic audit identity-sequence allocation: exactly **3** on pass and **0..4** when stopped before complete evidence.
- Existing immutable audit evidence is never altered. If a future authorized design permits lasting audit evidence, it may contain only synthetic opaque identifiers and must declare its exact count in advance.
- Auth changes are out of scope and have no rollback procedure in this runbook.
- Applied schema cannot be rolled back by editing or removing migration history. Any deployed schema rollback requires a separately reviewed forward migration and separate authorization.
- Navigation enablement is a separate reversible application decision and is not part of this run.

## Approval Envelope

Completing this checklist approves the **plan for readiness review only**. It does **not** authorize production execution.

- [ ] The maintainer accepts the RLS-only scope and the explicit exclusion of end-to-end athlete creation, Auth lifecycle, media upload, and navigation enablement.
- [ ] The exact immutable Git candidate and delivery receipt are recorded.
- [ ] The expected production migration manifest and checksums are independently reviewed.
- [ ] The exact production target identity will be provided through an approved safe channel at execution time and only its hash/reference will enter evidence.
- [ ] Dedicated pre-provisioned administrator, editor, and inactive identities are approved and will remain unchanged.
- [ ] The secret-handling mechanism is non-echoing, ephemeral, and cannot persist secrets in arguments, files, logs, artifacts, shell history, or environment dumps.
- [ ] The exact rollback-only transaction candidate and aggregate residue queries are independently reviewed.
- [ ] The transaction candidate's operation ledger fixes the exact expected in-transaction audit delta.
- [ ] The maintainer has resolved the non-transactional audit identity-sequence impact and the candidate, ledger, residue procedure, and evidence schema match that decision.
- [ ] The fixture prefix, maximum row counts, synthetic private-detail canary, zero-row-residue requirement, and exact candidate sequence-allocation bound are accepted.
- [ ] The bounded maintenance window, operator, stop authority, cleanup owner, independent residue reviewer, and escalation contact are named in the separate execution authorization.
- [ ] Every stop condition is accepted with no in-run repair or retry.
- [ ] The safe evidence schema and prohibited fields are accepted.
- [ ] Admin navigation is confirmed disabled and subject to separate post-evidence acceptance.
- [ ] A separate, explicit, time-bounded production execution authorization is still required after this checklist is complete.

**Maintainer plan-review decision:** `approved-for-planning`

**Production execution authorization:** `NOT GRANTED BY THIS DOCUMENT`

## References

### OpenSpec

- `openspec/changes/panel-administracion/proposal.md`
- `openspec/changes/panel-administracion/design.md`
- `openspec/changes/panel-administracion/tasks.md`
- `openspec/changes/panel-administracion/apply-progress.md`
- `openspec/changes/panel-administracion/specs/admin-access/spec.md`
- `openspec/changes/panel-administracion/specs/editorial-management/spec.md`
- `openspec/changes/panel-administracion/specs/athlete-administration/spec.md`
- `openspec/changes/panel-administracion/specs/club-administration/spec.md`
- `openspec/changes/panel-administracion/specs/competition-administration/spec.md`
- `openspec/changes/panel-administracion/specs/result-administration/spec.md`

### Migrations And Policies

- `supabase/migrations/20260812132352_initial_asanda_schema.sql`
- `supabase/migrations/20260812175456_require_unique_athlete_national_id.sql`
- `supabase/migrations/20260812175735_fix_deleted_athlete_identity_check.sql`
- `supabase/migrations/20260812172134_add_athlete_category_assignments.sql`
- `supabase/migrations/20260812181338_restrict_future_public_memberships.sql`
- `supabase/migrations/20260812191023_limit_athlete_active_disciplines.sql`
- `supabase/migrations/20260817175000_add_admin_audit_log.sql`
- `supabase/migrations/20260817190000_add_admin_content_contracts.sql`
- `supabase/migrations/20260817200000_add_staff_profile_transition_rpc.sql`
- `supabase/migrations/20260818150000_enable_content_contracts_rls.sql`
- `supabase/migrations/20260820120000_add_club_lifecycle_contracts.sql`
- `supabase/migrations/20260820133000_add_competition_admin_contracts.sql`
- `supabase/migrations/20260820150000_add_result_import_transaction.sql`
- `supabase/migrations/20260820151000_add_public_result_query.sql`
- `supabase/migrations/20260820152000_fix_result_import_entry_conflict.sql`

### Regression Evidence

- `supabase/tests/admin-security-foundation.sql`
- `supabase/tests/admin-staff-profile-transition.sql`
- `supabase/tests/admin-content-contracts.sql`
- `supabase/tests/admin-editorial-services.sql`
- `supabase/tests/admin-athlete-club-rules.sql`
- `supabase/tests/admin-calendar-contracts.sql`
- `supabase/tests/admin-result-import-contracts.sql`
