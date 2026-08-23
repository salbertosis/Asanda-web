# Proposal: ASANDA Administration Panel MVP

## Intent

Give authorized staff one panel to publish news, athletes, calendars, and results without editing code, with the minimum security needed for production and private athlete data.

## Scope

### In Scope
- Login and guarded `/admin` routes for administrator and editor roles.
- Publish and archive news and public athlete records with approved images.
- Manage supporting clubs, venues, competitions, and event programs.
- Enter results manually or import sanitized HY3 data after identity reconciliation and preview.
- RLS, atomic imports, basic audit evidence, backup/rollback, and fixture migration.
- Responsive, keyboard-operable Spanish administration UI.

### Out of Scope
- Self-registration, athlete or club-manager accounts, billing, mobile apps, rankings, and rich HTML authoring.
- Approval machinery beyond one authorization, operator, reviewer, and reproducible record.
- Private contact/identity data, raw HY3 storage, or secrets in the SPA.
- Exposing `/admin` in public navigation before production validation and maintainer acceptance.

## Capabilities

### New Capabilities
- `admin-access`: Login, roles, protected routes, and auditability.
- `editorial-management`: News and approved media publication.
- `athlete-administration`: Consent-gated public athlete records.
- `club-administration`: Supporting club records and archival.
- `competition-administration`: Calendars and event programs.
- `result-administration`: Manual and sanitized HY3 result publication.

### Modified Capabilities

None.

## Approach

Retain the delivered React modules and Supabase authority. Keep secrets server-side, enforce RLS, sanitize HY3 locally, and commit results atomically. Run one bounded production permission check, then migrate public reads after fixture parity.

## Affected Areas

| Area | Impact |
|---|---|
| `src/admin/`, `src/services/` | Admin UI and services |
| `supabase/` | Auth, RLS, RPCs, functions, tests |
| `src/data/`, public routes | Retire accepted fallbacks |
| `tests/e2e/` | Staff and public workflows |

## Risks

| Risk | Mitigation |
|---|---|
| Unauthorized writes | Guarded routes, RLS, denial tests |
| Invalid/private data | Consent, preview, invariants, atomic import |
| Production regression | Backup, parity, rollback-only validation |

## Rollback Plan

Keep fallbacks until each domain passes parity. Disable admin access if validation fails. Correct applied database migrations only through reviewed forward migrations.

## Success Criteria

- [ ] Administrator and editor can sign in and manage news, athletes, calendars, and results without a code deployment.
- [ ] Anonymous and inactive identities cannot write; editors cannot manage accounts or elevate privileges.
- [ ] Published public pages expose only approved records and no private HY3 or athlete data.
- [ ] Production target, backup, migration parity, rollback-only role checks, and independent zero-residue proof are accepted.
- [ ] Approved fixtures are migrated domain by domain; accepted fallbacks are removed and recovery operations are documented.
