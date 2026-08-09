# Proposal: Modernizar ASANDA Publicidad — Demo Advertising System

## Intent

Hardcoded real-brand sponsorship ("Speedo") can be mistaken for a real partnership; ad placeholders are not data-driven. Ship a demo-only advertising system — four fictional sponsors admitted through a closed, versioned exact-identity authority, four essential placements, and explicit disclosure — reviewable under the `Autoridad acuática regional` direction.

## Scope

### In Scope
- Four fictional brands (aquatic equipment, sports health, hydration, training), distinct identities in one ASANDA frame; equal hierarchy, no tiers.
- Placements: hero sponsor, responsive leaderboard (compact card on mobile), footer partner grid, competition sponsor in calendar/results (global rotating inventory, no per-event exclusivity).
- Rotation on navigation/reload only, never on timers.
- Disclosure: `Publicidad`/`Contenido patrocinado`/`Presentado por` labels, `rel="sponsored noopener"`, `role="complementary"` with Spanish `aria-label`.
- Every creative badged `Demo`/`Ejemplo`; clicks open an internal `noindex` page explaining sponsor/campaign are fictional.
- Empty state: `Espacio disponible` fallback; reserved slot dimensions prevent CLS.
- Remove hardcoded Speedo; delete dead `SidebarAd.jsx`; existing data and SEO metadata untouched except demo-page `noindex`.

### Out of Scope
- Sidebar/in-feed ads; programmatic networks (AdSense/GAM/Prebid); billing, analytics, personalization, conversion tracking.
- Admin panel, CMS, backend, API, database; sponsor contact capture; advertising policy page; unrelated redesign.

## Capabilities

### New Capabilities
- `demo-advertising`: fictional sponsor catalog, placement slots, per-navigation rotation, disclosure/demo badging, empty-slot fallback, internal demo detail pages.

### Modified Capabilities
- None — no existing specs in `openspec/specs/`.

## Approach

Exploration Approach A: fixtures-only with a thin abstraction. Static JS modules hold sponsors/campaigns; one `resolveAd(placementId, context)` seam resolves creatives per navigation/reload, enabling a future API swap without touching placements. Rollout: two chained PR slices (`auto-chain`, 1200-line budget): (1) catalog, seam, slots; (2) wiring, Speedo removal, footer grid, competition sponsor. Estimate ~700–1000 changed lines; final forecast: sdd-tasks.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/data/sponsors.js`, `src/data/campaigns.js` | New | Fictional fixtures |
| `src/services/ads.js`, `src/hooks/useAdPlacement.js` | New | `resolveAd` seam + hook |
| `src/components/`, demo detail page | New | HeroSponsorSlot, LeaderboardSlot, PartnerGridSlot, CompetitionSponsorBadge |
| `HeroSponsor.jsx`, `BannerAd.jsx`, `SidebarAd.jsx` | Removed | Speedo, placeholders superseded |
| `App.jsx`, `Footer.jsx`, `CalendarioPage.jsx`, `ResultadosPage.jsx` | Modified | Wire slots, partner grid, competition sponsor |

## Risks

- Demo ads read as real partnerships (Med) — fictional brands, `Demo` badge, `noindex` detail, Speedo removal.
- Scope creep toward real ad serving (Med) — non-goals enforced at spec/review; single narrow seam.
- CLS, dark-mode, a11y regressions (Low) — reserved dimensions, `dark:` variants, complementary role.

## Rollback Plan

Additive, frontend-only; no data/schema/SEO mutations. Revert both slices; reverting slice 2 alone hides all ads.

## Dependencies

- None.

## Success Criteria

- [ ] No real-brand fixtures are admitted; sponsor identities must match the closed versioned authority, and all creatives carry a `Demo`/`Ejemplo` badge + disclosure label.
- [ ] Four placements live (mobile leaderboard = compact card); rotation only on navigation/reload; empty inventory shows `Espacio disponible`.
- [ ] No CLS regression; `npm run build` passes; demo pages are `noindex`.
