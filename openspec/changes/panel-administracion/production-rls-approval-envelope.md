# Production RLS Approval Envelope — MVP

> **Status: PREPARED / NOT AUTHORIZED**
>
> This worksheet records the frozen candidate and the approvals still required. It does not authorize a production connection, database mutation, deployment, navigation change, or retry.

## Frozen Candidate

| Evidence | Frozen value |
|---|---|
| Prepared at | `2026-08-24T00:39:03Z` |
| Repository | `salbertosis/Asanda-web` |
| `main` Git SHA | `19aea476694fd67c5cd7eaeceb50413457596193` |
| Source PRs | `#116`, `#117`, `#118` |
| Migration count | `27` |
| Migration tip | `20260823203019_grant_private_schema_usage.sql` |
| Migration manifest SHA-256 | `7c168bd1686877d2a476bb05e29542f0dbc45b5f41a465de4607f7fa499cf86f` |
| Migration manifest format | Sorted `<sha256><two spaces><filename>\n` records encoded as UTF-8 |
| Candidate SHA-256 | `f1fbf462a4c9334ef93fa7a285785fe704c3e45c505d8a39630ce2404ed75504` |
| Residue proof SHA-256 | `cfb1fcb71a4cd89c01b12306081b5fe0047c3af0e93c2676466ffbf1bc177a24` |
| Readiness validator SHA-256 | `a12d09147c7e264fc1f9384de8845425bf9200b02780109d31500e99115e6890` |
| Runbook SHA-256 | `127ce1a3d3d3b96ee219e05dcf00f89c737ec6d63b93cceb8371cea5787c6b2e` |

Any change to these values invalidates this envelope and requires a new review.

## Pre-production Evidence

- [x] Candidate and residue artifacts are merged into `main`.
- [x] Readiness validator passed `43/43`.
- [x] Full candidate and residue SQL parsing passed.
- [x] Staging rollback-only candidate passed `69/69` with no failed assertion names.
- [x] Staging audit ledger matched `36/36`; accepted stopped bound remains `0..37`.
- [x] Independent staging residue proof returned zero for fixture, calendar, result, and audit scopes.
- [x] Production was not contacted while collecting this evidence.

Staging evidence demonstrates candidate behavior only. It does not prove production target identity, migration parity, recovery readiness, or production residue.

## Required Production Inputs

Do not start until every item has an approved, non-secret reference.

- [ ] Production target reference or approved target hash: observed `sha256:a984bf1acccaf669f54a7d4a43449a58223c6cf00e7143beab293addc504bcdf`; execution approval `PENDING`
- [ ] Recovery point or backup reference and timestamp: `AVAILABLE / ACL-RESTRICTED / RESTORE VERIFIED / NOT INDEPENDENTLY ENCRYPTED` — logical backup created `2026-08-23T20:51:55Z`; isolated restore verified `2026-08-23T21:25:32Z`; manifest SHA-256 `f9c9f268919ecb60f28a77d40f8633113a153073b98f35b1400f313e65fa352f`
- [ ] Production migration manifest parity with the frozen hash: `FAILED` — all `16` production versions are now preserved locally, but production still lacks the canonical `20260812231000` ledger counterpart, the `9` administrative/RLS/result migrations, and `20260823203019_grant_private_schema_usage.sql`
- [ ] Dedicated administrator identity approved without mutation: `PENDING`
- [ ] Dedicated editor identity approved without mutation: `PENDING`
- [ ] Dedicated inactive identity approved without mutation: `PENDING`
- [ ] Operator: `PENDING`
- [ ] Independent reviewer: `PENDING`
- [ ] Maintenance window: `PENDING`
- [ ] Stop authority: `PENDING`
- [ ] Cleanup owner: `PENDING`
- [ ] Non-echoing credential path confirmed: `PENDING`
- [ ] Explicit production execution authorization: `PENDING`

Never record passwords, tokens, connection strings, raw UUIDs, claims, or private athlete data in this file.

### Read-only Production Audit

Observed at `2026-08-23T19:15:47Z` through Supabase CLI `2.115.0`, without custom SQL, account creation, schema changes, or candidate execution:

- the linked project is healthy in `us-east-1` and matches the non-secret target hash recorded above;
- physical backup inventory was empty and PITR was disabled;
- production reported `16` migration versions; `15` matched the manifest at audit time, and all `16` are now preserved locally after recovering `20260812211000`;
- a temporary read-only history fetch identified remote `20260812211000_correct_copa_pasion_acuatica_organizer.sql`; its exact SQL is now preserved in the repository alongside the later canonical `20260812231000` correction, because `20260812211000` records production history while `20260812231000` preserves correct chronological replay after the calendar seed;
- Git forensics originally found that variant only in unreachable tree `6c2259d59dcc6143decd4adfef77d950dc095446`; commit `483367e` now preserves the exact recovered blob `4c5a573f2b0192635acf8e0c7785a7e393c8390e` as published migration history;
- the `11` versions still absent from production are the canonical `20260812231000` ledger counterpart, `9` administrative/RLS/result migrations from `20260817175000` through `20260820152000`, and the private-schema grant correction `20260823203019`;
- aggregate inspection found `29` public application tables and `1` private athlete-detail table; no row contents were retrieved;
- non-empty estimates were limited to sports/catalog, organizations, athletes, memberships, calendar, media, and one profile; the editorial, result, event, performance, record, import, award, album, photo, video, staff, and entry tables reported zero estimated rows.

The preferred recovery path is provider-native: enable an eligible daily-backup plan or PITR, wait until the provider exposes a concrete recovery timestamp/reference, and verify it through a fresh read-only `backups list`. Supabase CLI exposes list and restore operations but no command to create an immediate physical snapshot. A logical dump is not a substitute in this envelope unless it receives separate authorization for private-data handling, encrypted storage, and a successful isolated restore drill; the attempted schema-only dump also could not run in this environment because Docker is unavailable.

The maintainer authorized a logical production backup for the Free plan. Native `pg_dump 17.5` created and structurally verified separate custom archives for application data (`public`, `private`, and `supabase_migrations`), Auth, and Storage database metadata. Binary Storage objects are excluded. The password was consumed from the clipboard only in process memory, then both clipboard and environment variable were cleared. No local PostgreSQL server was contacted. The backup directory is outside Git/OneDrive and its ACL is limited to the maintainer, SYSTEM, and local Administrators. The archives are not independently encrypted.

The maintainer then authorized an isolated restore drill. `Asanda_Staging` was paused without mutation, and a new healthy Free-plan project in `us-east-1` was created through terminal-only Supabase administration; its non-secret target hash is `sha256:e21f05bbf70fa4382d59b9fbf9d2d0ced1788593d430f327135f46b53f958d38`. A preflight proved that `public`, Auth user/identity data, and Storage bucket/object data were empty. The restore preserved the provider-managed Auth and Storage schemas, loaded only the single Auth user and identity, treated empty Storage metadata as a documented no-op, and restored the application schemas and migration ledger. Because the schema-scoped archive does not carry extension prerequisites, `btree_gist` was created from the repository migration declaration before the atomically rolled-back post-data phase was retried.

The isolated verification passed with exact per-table counts across `31` restored tables: `29` public tables, `1` private table, `74` domain rows, and `16` migration rows. It also confirmed `1` Auth user, `1` Auth identity, zero Auth/profile orphans, zero unvalidated constraints, `55` policies, `29` public RLS tables, `24` non-internal triggers, working aggregate queries under both `anon` and `authenticated`, and zero Storage buckets or objects. No identities or row contents were emitted. The restore drill therefore proves archive usability, but the required-production-input checkbox remains open until the maintainer accepts the ACL-only storage posture or supplies an independently encrypted copy.

### Isolated Migration Rehearsal

The maintainer authorized mutation only in `Asanda_Restore_Test`. Preflight confirmed ledger version `20260812211000`, no `20260812231000`, one already-correct Copa row, and no administrative-schema residue. The rehearsal recorded `20260812231000` in the ledger without executing its data correction, then applied the `9` pending administrative/RLS/result migrations in three atomic batches so neither the RLS gap nor the intermediate result-import implementation was externally exposed.

The first role regression exposed missing `USAGE` grants on the restored `private` schema. The rehearsal restored the `anon` and `authenticated` grants already declared by the initial migration, then added reviewed forward migration `20260823203019_grant_private_schema_usage.sql` so `service_role` can use its existing `SELECT` grant on `private.admin_audit_log`. All `7` SQL regressions passed with synthetic identities removed afterward and zero audit, featured-athlete, or source-mapping residue.

Final aggregate state is `27` migration rows, `31` public tables, `2` private tables, `31` public RLS tables, `58` public policies, `58` non-internal application triggers, zero invalid constraints, the original `1` Auth user and `1` identity, and the Copa organizer/logo still correct. Production and staging were not contacted.

These findings remain stop conditions. Do not approve or execute the production candidate until the recovery artifact's storage posture is accepted, production ledger alignment is separately authorized, and the remaining identity/operator/window approvals are complete.

## Authorized Execution Record

Complete this section only during an explicitly authorized window.

| Gate | Result |
|---|---|
| Target identity matched approved reference | `NOT RUN` |
| Recovery point verified | `NOT RUN` |
| Migration parity matched frozen manifest | `NOT RUN` |
| Candidate hash matched | `NOT RUN` |
| Administrator/editor/inactive identity states matched | `NOT RUN` |
| Rollback-only candidate exit | `NOT RUN` |
| Role assertions | `NOT RUN` |
| Audit ledger | `NOT RUN` |
| Independent residue proof | `NOT RUN` |
| Production contact ended | `NOT RUN` |

Accepted candidate evidence is exactly:

- `69` passed checks;
- `0` failed checks;
- outcome `pass`;
- empty failed-role-assertion list;
- `36` scoped audit rows and `36` exact allocations;
- stopped allocation range `0..37`;
- independent residue counts all zero.

Stop on any mismatch. Do not repair, retry, reset sequences, disable triggers, or issue compensating deletes during the window.

## Final Acceptance

- [ ] Operator recorded bounded aggregate evidence only.
- [ ] Independent reviewer confirmed zero residue in a separate connection.
- [ ] Maintainer accepted or rejected the production evidence explicitly.
- [ ] Public admin navigation decision was made separately.

Task 5.2 remains pending until the production execution and final acceptance above are complete. Task 5.3 remains a separate fixture-migration and fallback-retirement step.
