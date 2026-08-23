# Tasks: Authorized Administration Panel MVP

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | Historical implementation: 3,500–5,500; remaining closeout: under 400 |
| 400-line budget risk | Low for the remaining work |
| Chained PRs recommended | No for closeout |
| Delivery strategy | Existing stacked-to-main implementation; direct closeout |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Phase 1: Security Foundation

- [x] 1.1 Add SQL denials for anonymous/inactive writes, editor escalation, and protected audit data.
- [x] 1.2 Add immutable audit records and active-role RLS behavior.
- [x] 1.3 Implement fail-closed staff role transitions and focused regressions.
  - [x] 1.3a Add the service-role-only transactional staff-profile RPC and SQL regression.
  - [x] 1.3b1 Add deterministic staff orchestration and recovery tests.
  - [x] 1.3b2 Wire the Edge Function and verify staging contention and cleanup.
- [x] 1.4 Add login, session recovery, guarded `/admin` routes, noindex, sign-out, and responsive shell.
- [x] 1.5 Add publication, consent, source-mapping, and atomic-write contracts.
- [x] 1.6 Add server-signed Cloudinary uploads without exposing secrets to the SPA.

## Phase 2: News

- [x] 2.1a Add validated news, image, and featured-athlete domain behavior with regressions.
- [x] 2.1b Add E2E coverage for editorial workflows.
- [x] 2.2a Add RLS-backed news, media, and featured-athlete services.
- [x] 2.2b Add news list/editor/preview UI with loading, empty, and error states.
- [x] 2.2c Add the signed media-upload UI and asset list.
- [x] 2.2d Add featured-athlete administration UI.
- [x] 2.3 Read published news from Supabase on public routes.

## Phase 3: Athletes and Clubs

- [x] 3.1 Add SQL/E2E coverage for consent, categories, memberships, contacts, and archival.
- [x] 3.2 Add athlete creation/editing for public profile, photo, consent, categories, disciplines, and club membership.
- [x] 3.3 Add the supporting club identity, contact, logo, publication, and archival workflow.

## Phase 4: Calendar and Results

- [x] 4.1 Add sanitized HY3 fixtures and parser privacy/error regressions.
- [x] 4.2 Add venue, competition, and ordered event-program administration.
- [x] 4.3 Add local HY3 parsing, reconciliation, sanitized preview, and CSV fallback.
- [x] 4.4 Add SQL/E2E coverage for mappings, consent, duplicates, conflicts, rollback, and media fallbacks.
- [x] 4.5 Add atomic result import, manual correction, audit reason, summary, and public result query.

## Phase 5: MVP Closeout

- [x] 5.1 Verify the delivered slices with focused regressions, full E2E, build, SQL checks, migration parity, and residue proof in staging.
- [ ] 5.2 With explicit authorization, back up and identify production, prove migration parity, validate anonymous/inactive denial plus administrator/editor access to news, athletes, calendar, and results in a rollback-only run, then independently prove zero residue.
- [ ] 5.3 Migrate approved fixtures for the four public domains, compare public output, remove only accepted static fallbacks, and document login, publishing, HY3 import, recovery, and rollback.

## Closeout Order

Complete 5.2 without enabling public admin navigation. Complete 5.3 domain by domain. Then run the baseline suite, write `verify-report.md`, obtain maintainer acceptance, and archive the change.
