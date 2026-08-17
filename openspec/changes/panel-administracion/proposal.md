# Proposal: Authorized Administration Panel

## Intent

Replace code-based content updates with a secure operational panel for authorized ASANDA staff. Administrators manage access and all domains; editors manage and directly publish approved public content without managing accounts.

## Scope

### In Scope
- Email/password authentication, protected `/admin` routes, session recovery, and role enforcement.
- Administrator-only account invitation, activation, deactivation, and role assignment.
- CRUD and publication workflows for news, curated featured athletes, athletes, memberships, categories, clubs, calendars, events, and results.
- Signed Cloudinary image uploads with database media references.
- Manual correction and native HY3 result import with sanitized preview, identity reconciliation, atomic commit, audit evidence, and optional CSV fallback.
- Responsive, keyboard-operable Spanish administration UI.

### Out of Scope
- Public self-registration, club-manager access, athlete logins, and public account profiles.
- Storing Cloudinary or Supabase service-role secrets in the SPA.
- Rich HTML authoring, automated athlete rankings, billing, or mobile applications.
- Persisting exact national IDs, exact birth dates, addresses, phones, emails, guardian contacts, or raw HY3 files in v1.

## Capabilities

### New Capabilities
- `admin-access`: Authorized authentication, roles, account lifecycle, route protection, and auditability.
- `editorial-management`: News, media, and curated featured-athlete publication.
- `athlete-administration`: Public athlete records, consent gates, categories, disciplines, and memberships.
- `club-administration`: Club identity, contacts, logo, and publication lifecycle.
- `competition-administration`: Calendars, venues, competitions, and event programs.
- `result-administration`: Manual correction and HY3-first result sanitization, reconciliation, atomic import, media enrichment, and publication; CSV remains a fallback.

### Modified Capabilities

None.

## Approach

Keep Supabase Auth and RLS as the authority. Parse HY3 locally without persisting the raw file, discard private fields, reconcile source identifiers to ASANDA entities, then submit only sanitized rows to an atomic database RPC. Use Edge Functions for account administration and signed Cloudinary uploads. Migrate public reads only after each domain is validated.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/pages/admin/` | New | Login and management screens |
| `src/services/` | Modified | Auth, writes, media, and migrated reads |
| `supabase/` | Modified | Schema, RLS, RPCs, functions, tests |
| `tests/e2e/` | Modified | Authorized and denied workflows |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Privilege escalation | Medium | RLS, server-side role checks, no self-registration |
| Invalid sports data | High | Database invariants and atomic imports |
| Private-data exposure | Medium | Exclude private details; consent-gated publication |
| HY3 format drift | Medium | Version detection, sanitized fixtures, fail-closed parser |

## Rollback Plan

Disable admin routes/functions, revoke write policies, and retain public read paths per domain until its migration is accepted. Database migrations use additive tables/functions before fixture removal.

## Dependencies

- Supabase Auth, PostgreSQL, and Edge Functions.
- Existing Cloudinary account and server-side API secret.
- Sanitized HY3 fixtures representing the supported Hy-Tek exports.

## Success Criteria

- [ ] Unauthorized and inactive users cannot read admin data or perform writes.
- [ ] Authorized staff manage every requested domain without code deployment.
- [ ] Raw HY3 private fields never reach public storage, logs, fixtures, or browser-visible responses.
- [ ] Invalid memberships, consent states, unresolved identities, and result imports fail atomically.
- [ ] Public pages show only published, approved records.
