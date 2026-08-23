# Production RLS Approval Envelope — MVP

> **Status: PREPARED / NOT AUTHORIZED**
>
> This worksheet records the frozen candidate and the approvals still required. It does not authorize a production connection, database mutation, deployment, navigation change, or retry.

## Frozen Candidate

| Evidence | Frozen value |
|---|---|
| Prepared at | `2026-08-23T18:39:15Z` |
| Repository | `salbertosis/Asanda-web` |
| `main` Git SHA | `19aea476694fd67c5cd7eaeceb50413457596193` |
| Source PRs | `#116`, `#117`, `#118` |
| Migration count | `25` |
| Migration tip | `20260820152000_fix_result_import_entry_conflict.sql` |
| Migration manifest SHA-256 | `d2a39a38d20a902efa77877109a06d56e30b6ba70420ab90074d7c656b1a4f15` |
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

- [ ] Production target reference or approved target hash: `PENDING`
- [ ] Recovery point or backup reference and timestamp: `PENDING`
- [ ] Production migration manifest parity with the frozen hash: `PENDING`
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
