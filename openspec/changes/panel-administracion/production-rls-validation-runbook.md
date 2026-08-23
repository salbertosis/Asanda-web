# Production RLS Validation Runbook — MVP

> **Status: execution plan, not authorization.**
> **Production execution authorization:** `NOT GRANTED BY THIS DOCUMENT`

## Goal

Prove, once and safely, that production protects the ASANDA panel while administrator and editor users can operate the MVP. The authorized check must run inside one rollback-only transaction and leave no fixture or audit rows.

Task 5.2 remains open until this complete MVP candidate is independently reviewed, an authorized run succeeds, a separate reviewer proves zero residue, and the maintainer accepts the evidence. Public admin navigation remains disabled until that acceptance.

## Quick Path

1. Record authorization, operator, reviewer, window, target reference, backup, and immutable Git candidate.
2. Confirm production migration parity through `20260820152000_fix_result_import_entry_conflict.sql`.
3. Use dedicated administrator, editor, and inactive accounts; use no identity for anonymous checks.
4. Run the reviewed candidate once inside one transaction ending in unconditional `ROLLBACK`.
5. Stop on any mismatch. Do not repair or retry during the window.
6. Run the independent read-only residue query and obtain maintainer acceptance.

## MVP Boundary

The validation covers RLS for:

- news and publication;
- athletes and their supporting club relations;
- published venues/competitions/event programs;
- results and HY3 import through the admitted result/import candidate slice;
- administrator, editor, inactive authenticated, and anonymous access.

It does not deploy migrations, change Auth users or profile roles, upload media, send email, enable navigation, or use real-person data. It does not test Cloudinary or service-role staff orchestration.

## Required Inputs

- Explicit, time-bounded authorization naming the operator, reviewer, maintenance window, stop authority, and cleanup owner.
- Approved production target reference through a safe channel; evidence stores only a non-secret identifier or hash.
- Successful backup or provider recovery point with its timestamp/reference.
- Immutable Git SHA plus reviewed migration manifest/checksums matching production exactly.
- Pre-provisioned administrator, editor, and inactive test identities whose state will not be changed.
- Non-echoing credential mechanism: no passwords, tokens, URLs, or keys in arguments, files, logs, shell history, or evidence.
- SQL path proven to preserve a single transaction through setup, role changes, assertions, evidence, and rollback.

If any input is missing, stale, or ambiguous, do not start.

## Reviewed Artifacts

- Candidate: `supabase/tests/production-rls-validation-candidate.sql`
- Independent residue proof: `supabase/tests/production-rls-validation-residue.sql`
- Readiness validator: `scripts/validate-production-rls-readiness.mjs`

The current candidate covers access/editorial, athlete/club, calendar, and result/import. It also requires migration parity through the result-import RPC, public projection, and forward-only conflict fix migrations. The package remains preparation only and cannot complete task 5.2 without independent review and explicit production authorization.

## Candidate Safety Contract

- Use opaque synthetic identifiers and no real athlete, contact, staff, or HY3 data.
- Create all fixtures inside the rollback-only transaction; no DDL, grants, deployment, or compensating deletes.
- Emit aggregate pass/fail evidence only, never UUIDs, rows, claims, credentials, or connection values.
- Bind audit checks to the expected actor, action, table, and fixture entity.
- The accepted policy identifier is `accepted-bounded-non-semantic-advancement`.
- The admitted MVP candidate produces exactly **36** allocations on pass and **0..37** when stopped before complete evidence. These bounds reflect the active audit triggers, including two synthetic mappings and two successful one-row imports. Failed unresolved, duplicate, stale-revision, and mixed-event attempts occur before writes and do not advance the bound.
- Resetting the sequence is not an acceptable workaround.
- Disabling audit triggers is also prohibited.

## Ordered Execution

### 1. Preflight

1. Re-run the readiness validator and SQL parser against the frozen files.
2. Match target, Git SHA, migration names/order/checksums, backup reference, identity states, and candidate hashes to the authorization.
3. Record aggregate baseline fixture counts and audit watermarks without returning rows.
4. Confirm transaction continuity and the unconditional final rollback.

### 2. Anonymous Checks

- Published news, consent-qualified athletes, published calendar entries, and published results are readable only through their public surfaces.
- Every panel-table write and protected function call is denied.

### 3. Inactive Checks

- Public information may remain readable.
- Every administrative write, reorder, import, and role-management operation is denied.

### 4. Fixture Setup

The approved maintenance context creates the minimum synthetic graph required by the candidate. Setup must not create or mutate Auth users, profiles, roles, sessions, passwords, bans, or invitations.

### 5. Public Boundary Checks

- Draft/unapproved news, athletes, calendar entries, and results remain hidden.
- Private athlete identity/contact fields remain inaccessible.
- Published synthetic records are visible only through approved public projections.

### 6. Editor Checks

- Prove permitted create/update/publish behavior for news, athletes, and calendar records.
- Prove account administration, role elevation, audit-log reads, private athlete data, and destructive club lifecycle operations are denied.
- Prove the editor's one-row HY3 import plus unresolved mapping, duplicate checksum, stale revision, and mixed-event atomic denials. Clear transaction-local audit reason/evidence immediately after the successful import.

### 7. Administrator Checks

- Prove administrator access to the same four MVP domains and the approved lifecycle operations in the final candidate.
- Do not mutate validation identities or exercise service-role staff transitions.
- Require exact audit attribution for every mutation in scope.

### 8. Results/Import Checks — Required Before Execution

The candidate proves editor HY3 import and administrator manual correction, anonymous/inactive denial, unresolved mapping failure, duplicate/revision protection, private-field exclusion, mixed-event atomic failure, public projection, exact audit attribution, and residue coverage for `source_documents`, `import_batches`, `entries`, and `performances`. Only synthetic mappings and sanitized rows are admitted; no raw HY3 bytes or private athlete fields enter the transaction.

### 9. Rollback And Evidence

1. Verify all expected assertions and aggregate audit counts inside the transaction.
2. Execute unconditional `ROLLBACK`, even after a failed assertion.
3. Preserve only command/result status, timestamps, approved references, hashes, counts, and reviewer sign-off.
4. Treat connection loss or ambiguous rollback as failure and escalate; do not issue compensating deletes.

### 10. Independent Residue Proof

The reviewer runs the frozen read-only residue artifact through a separate session. Every synthetic fixture and audit count must be zero. Compare non-transactional audit identity movement only to the accepted bound; never reset it.

## Stop Conditions

Stop immediately for a target or migration mismatch, missing backup, credential exposure, unexpected authorization, expected operation denied, private-data visibility, unbounded output, unexpected audit attribution, transaction loss, non-zero residue, or any request to change production during the run.

A stopped run does not complete task 5.2. Diagnose offline, revise and review the candidate, and obtain new execution authorization.

## Evidence Record

Record only:

- authorization, operator/reviewer, window, target reference hash, backup reference;
- Git SHA, migration manifest hash, candidate/residue hashes;
- preflight PASS/FAIL and migration parity;
- anonymous, inactive, editor, administrator, public-boundary, result/import, rollback, and residue PASS/FAIL;
- aggregate expected/actual audit counts and accepted sequence range;
- stop reason if applicable;
- maintainer decision: accepted or rejected.

Never record credentials, connection strings, raw UUIDs, tokens, claims, raw rows, private athlete data, or HY3 contents.

## Approval Envelope

- [ ] Production target and recovery point approved.
- [ ] Git SHA and migration manifest frozen; production parity confirmed.
- [ ] Candidate includes result/import and passes static validation/review.
- [ ] Administrator, editor, and inactive identities approved without mutation.
- [ ] Operator, independent reviewer, window, stop authority, and safe credential path approved.
- [ ] Rollback-only execution completed with all role/domain checks passing.
- [ ] Independent residue proof returned zero for every fixture and audit scope.
- [ ] Maintainer accepted the evidence and separately decided whether to expose navigation.

Checking this list records evidence; it never retroactively authorizes an unapproved execution.

## Completion Rule

Mark task 5.2 complete only when every approval-envelope item is checked and linked from `apply-progress.md`. Otherwise keep it open. Then proceed to task 5.3 for approved fixture migration, fallback retirement, and operator documentation.
