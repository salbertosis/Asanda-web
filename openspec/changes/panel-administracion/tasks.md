# Tasks: Authorized Administration Panel

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 3,500–5,500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Foundation → Editorial → Athletes/Clubs → Calendar → HY3 Results → Public migration |
| Delivery strategy | auto-chain (resolved) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Auth, RLS, shell, audit | PR 1 | `npx playwright test tests/e2e/admin-auth.spec.js` | Login/denial E2E | Admin routes, auth services, foundation migration |
| 2 | Media, news, featured | PR 2 | `npx playwright test tests/e2e/admin-editorial.spec.js` | Publish news E2E | Editorial UI/services and featured migration |
| 3 | Athletes and clubs | PR 3 | `npx playwright test tests/e2e/admin-athletes.spec.js tests/e2e/admin-clubs.spec.js` | Consent/membership E2E | Roster and club modules |
| 4 | Calendar and events | PR 4 | `npx playwright test tests/e2e/admin-calendar.spec.js` | Publish competition E2E | Calendar admin module |
| 5 | Manual and HY3 results | PR 5 | `node scripts/hy3-regression.mjs && npx playwright test tests/e2e/admin-results.spec.js` | Sanitized preview and atomic import E2E | HY3 worker/parser, mappings, RPC, result UI |
| 6 | Public read migration | PR 6 | `npm run test:e2e` | Full public/admin suite | New read services and fixture removal |

## Phase 1: Security Foundation

- [x] 1.1 Add RED SQL tests for anonymous and inactive writes, editor account escalation, and audit evidence.
- [x] 1.2 Add immutable audit storage/triggers and lock current active-role RLS behavior.
- [x] 1.3 Correct `manage-staff` with serialized profile authority and fail-closed Auth ordering.
  - [x] 1.3a Add the service-role-only transactional staff profile transition RPC and focused SQL regression.
  - [x] 1.3b1 Add dependency-injected fail-closed staff orchestration and deterministic recovery tests.
  - [x] 1.3b2 Wire the Edge Function and prove staging contention, restoration, and cleanup.
- [x] 1.4 Create `useAdminSession`, `AdminGuard`, lazy `/admin` routes, noindex lifecycle, login, recovery, sign-out, and responsive shell.
- [x] 1.5 Add featured athletes, publication/consent guards, source mappings, grants, and atomic RPC contracts.
- [x] 1.6 Create the `sign-media-upload` Edge Function with repeated active-role checks and Cloudinary secret isolation.

## Phase 2: Editorial Operations

- [x] 2.1a Add the pure editorial domain core (validation, safe body, images, featured windows) with service-level RED tests.
- [x] 2.1b Add E2E RED tests for editorial workflows (lands with the UI unit).
- [x] 2.2a Add admin news, media, and featured services with the RLS regression.
- [x] 2.2b Add the admin news UI (list, editor form, safe-body preview) with loading, empty, and error states.
- [x] 2.2c Add the admin media UI (asset list and signature upload flow) with loading, empty, and error states.
- [x] 2.2d Add the admin featured-athletes UI with loading, empty, and error states.
- [x] 2.3 Migrate homepage and `/noticias` reads to published Supabase articles and add `/noticias/:slug`.

## Phase 3: Athletes and Clubs

- [x] 3.1 Add RED SQL/E2E tests for consent gates, category overlap, federation coverage, pre-infant rejection, contacts, and archival.
- [x] 3.2 Create athlete wizard for public profile, media, consent confirmation, categories, disciplines, and memberships.
- [x] 3.3 Create club identity, contact, logo, publication, and safe archival workflows.

## Phase 4: Calendar and Results

- [x] 4.1 Create synthetic HY3 fixtures and RED tests for A/B/C/D/E/F/H records, Windows-1252, decimal times, relays, DQ notes, malformed versions, and zero private-field leakage.
- [ ] 4.2 Create venue, competition, and ordered event-program administration.
- [ ] 4.3 Create local HY3 worker/parser, checksum, team/athlete reconciliation UI, source mappings, sanitized preview, and optional CSV fallback.
- [ ] 4.4 Add RED SQL/E2E tests for unresolved mappings, results consent, duplicate checksum, revision conflicts, atomic rollback, and media fallbacks.
- [ ] 4.5 Create transactional import RPC, manual correction, audit reason, summary, and public photo/logo-enriched result query.

## Phase 5: Verification and Rollout

- [ ] 5.1 Run SQL regressions, focused Node checks, `npm run build`, full `npm run test:e2e`, and `git diff --check` for every PR.
- [ ] 5.2 Validate production RLS with administrator, editor, inactive, and anonymous accounts before enabling navigation.
- [ ] 5.3 Migrate approved fixtures domain-by-domain, remove accepted fallbacks, and document account, media, HY3 sanitization, reconciliation, and result operations.

## Delivery Order

Each PR targets `main` and merges only after its focused runtime scenario, baseline checks, and rollback boundary pass. Order: security foundation → editorial → athletes/clubs → calendar → results → public migration.
