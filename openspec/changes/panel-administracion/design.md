# Design: Authorized Administration Panel

## Technical Approach

Extend the current React/Supabase architecture instead of adding a parallel backend. Supabase Auth establishes identity; `profiles`, RLS, constraints, triggers, and RPCs enforce authorization and invariants. The SPA performs simple content writes through domain services. Authenticated Edge Functions hold privileged Supabase Auth and Cloudinary signing secrets.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Authorization | Supabase Auth + profile role + RLS | UI guards; custom API auth | Existing schema supports it; policies remain authoritative if UI is bypassed. |
| Login identity | Email/password, invitation only | Usernames; public signup | Native recovery and no duplicate identity system. |
| Writes | Direct RLS writes for simple CRUD; RPCs for atomic workflows | All browser writes; full API facade | Minimizes infrastructure without risking partial athlete/result updates. |
| Privileged operations | Edge Functions for account lifecycle and signed upload | Service role/API secret in Vite | Secrets never enter browser bundles. |
| Media | Cloudinary binary + `media_assets` reference | Store URLs; second media system | Reuses transforms and preserves portable metadata. |
| Article body | Plain text/limited Markdown rendered safely | Raw HTML; full rich-text editor | Prevents stored XSS and keeps v1 reviewable. |
| Featured athletes | New curated validity table | Automatic ranking; athlete boolean | Supports six ordered, scheduled selections without changing athlete identity. |
| Results source | HY3 primary; CSV fallback | CSV-only; raw file upload | HY3 preserves native meet/result semantics; fallback remains available. |
| HY3 privacy boundary | Local byte parsing and strict field whitelist | Store raw export; parse server-side | Keeps embedded identity/contact data out of storage, logs, and network payloads. |
| Result commit | Sanitized preview + authoritative transactional RPC | Independent table writes | Guarantees idempotent all-or-nothing imports and repeat validation. |
| Source reconciliation | Explicit Hy-Tek team/athlete mappings | Match names automatically | Prevents silent identity collisions and enables photo/logo joins. |

## Component Hierarchy

```text
AdminGuard
└── AdminShell
    ├── AdminSidebar / AdminHeader
    └── Routes
        ├── Dashboard
        ├── News / FeaturedAthletes
        ├── Athletes / Clubs
        ├── Competitions / Events
        ├── Results / CsvImport
        └── Staff (administrator only)
```

## Data Flow

```text
Login form -> Supabase Auth -> profiles role/is_active -> AdminGuard
Admin form -> domain service -> RLS table write or atomic RPC -> audit trigger
Image -> signature Edge Function -> Cloudinary -> media_assets -> domain row
HY3 bytes -> Windows-1252 parser -> private-field filter -> reconciliation
          -> sanitized preview + checksum -> import RPC
          -> entries + performances + import evidence

Official result -> athlete/photo + represented organization/logo -> public result row
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/pages/admin/*` | Create | Login and domain screens |
| `src/components/admin/*` | Create | Shell, tables, forms, states, CSV preview |
| `src/hooks/useAdminSession.js` | Create | Session/profile lifecycle |
| `src/services/admin/*.js` | Create | Domain commands and normalization |
| `src/services/admin/hy3Parser.js` | Create | Fixed-width record parser and field whitelist |
| `src/workers/hy3Import.worker.js` | Create | Local parsing without blocking the admin UI |
| `src/App.jsx` | Modify | Lazy protected routes |
| `src/seo/routeMetadata.js` | Modify | Admin `noindex` metadata |
| `supabase/migrations/*_admin_panel.sql` | Create | Featured table, source mappings, audit, constraints, RPCs, RLS |
| `supabase/functions/manage-staff/` | Create | Administrator-only Auth operations |
| `supabase/functions/sign-media-upload/` | Create | Short-lived Cloudinary signature |
| `tests/e2e/admin-*.spec.js` | Create | Auth, roles, CRUD, responsive workflows |
| `supabase/tests/admin-*.sql` | Create | RLS, invariants, atomic imports |
| `tests/fixtures/hy3/*.hy3` | Create | Synthetic sanitized compatibility fixtures only |

## Interfaces / Contracts

- `AdminProfile`: `{ id, displayName, role: 'administrator'|'editor', isActive }`.
- `FeaturedAthlete`: athlete UUID, unique order 1–6, `starts_at`, optional `ends_at`.
- HY3 parser output contains only meet/event/result fields, source aliases, non-sensitive display names, public birth year when allowed, and parser diagnostics. It excludes raw IDs, exact dates, and contacts.
- Source mappings bind `(provider, organization, external_code)` to ASANDA organization/athlete UUIDs; unresolved mappings never auto-publish.
- Result import RPC input: competition UUID, expected revision, sanitized normalized rows, source checksum, mappings, and correction reason.
- Edge Functions require a valid bearer token and repeat active-role checks server-side.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Database | RLS, consent, membership, archival, import atomicity | Dependency-free SQL regressions |
| Service | HY3 record types, encoding, decimal times, relays, DQ notes, sanitization, checksum, CSV fallback | Dependency-free Node scripts with synthetic fixtures |
| E2E | Login, role denial, CRUD, upload failure, mobile/keyboard | Playwright with routed Supabase/function responses |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Admin routing | Applicable | `AdminGuard` waits for session/profile authority and fails closed | Anonymous deep link, inactive profile, wrong role, expired session |
| Documentation-like paths | N/A: no executable classification | None | None |
| Git repository selection | N/A: no VCS integration | None | None |
| Commit state | N/A: no VCS integration | None | None |
| Push state | N/A: no VCS integration | None | None |
| PR commands | N/A: no PR automation | None | None |

Safe routing renders no protected data until authorization resolves. Failure redirects to sign-in or access denied, clears stale domain state, and never weakens RLS.

## Migration / Rollout

Ship additive schema and hidden admin routes first. Migrate one public domain at a time after data validation: news/featured, athletes/clubs, calendar, then results. Never migrate or retain the raw HY3 sample; create synthetic fixtures that preserve record geometry without real identities. Keep public fixture fallback only until each domain is accepted.

## Open Questions

- [x] Use sequential stacked-to-main PRs.
- [ ] Confirm whether all participating clubs export the same HY3 family/version or provide additional sanitized format samples.
