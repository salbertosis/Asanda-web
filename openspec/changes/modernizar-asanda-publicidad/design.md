# Design: Modernizar ASANDA Publicidad — Demo Advertising System

## Technical Approach

Fixtures-only with one `resolveAd(placementId, context)` seam. Two chained PRs under 1200-line budget. PR 1 (Foundation): data, seam, four slot components, demo detail route, `?ads=demo` preview — no edits to existing visible components. PR 2 (Wiring): swap `HeroSponsor`/`BannerAd`/footer placeholders with slots, delete `SidebarAd` dead code, remove hardcoded Speedo.

## Architecture Decisions

| # | Decision | Choice | Rejected |
|---|----------|--------|----------|
| D1 | Click destination | Internal `/publicidad/demo/:slug`; sponsor carries `slug` only, no URL field | External URL (forbidden) |
| D2 | Rotation | `pick = hash(placementId + routeKey + loadCounter) % active.length`; `loadCounter` is module-level, resets on reload, increments on first `resolveAd` per placement per load. Deterministic, stable during page lifecycle, changes on nav/reload, no timers | `setInterval`; `localStorage` cap |
| D3 | Slot primitive | `AdSlotFrame` wraps disclosure + demo badge + reserved dimensions + reduced motion + a11y | Bespoke per slot (CLS drift) |
| D4 | `noindex` | `useNoindex` mutates `document.head`; captures prior `<meta name="robots">`, restores on unmount | `react-helmet-async` |
| D5 | Sponsor authority | `validateSponsors()` requires exact membership in the versioned closed authority (`id`, `slug`, `name`, `category`) plus structural checks; it warns and skips without throwing | Marker-only demo checks or a universal brand-text blacklist |
| D6 | Reduced motion | Tailwind `motion-safe:` + existing `index.css` global rule | Per-component queries |
| D7 | Dark mode | Tailwind `dark:`; reuse `dark.surface` token | Custom CSS |
| D8 | Expired campaigns | `isActive(campaign, today)`; empty → `EmptySlotTile` | Cron purging |

## Data Flow

`sponsors/campaigns/adPlacements.js` → `services/ads.js` (`resolveAd`: filter `placementId` + `isActive`, validate+warn, hash pick) → `useAdPlacement` → `<AdSlotFrame>` → four slots (hero, leaderboard×2, partner-grid, competition-sponsor). Click → `/publicidad/demo/:slug` → `useNoindex` mounts `<meta name="robots" content="noindex">`, restores on unmount.

## Data Contracts (plain JS, JSDoc only)

```js
// sponsors.js — 4 fictional brands (aquatic, health, hydration, training)
export const sponsors = [
  { id:'aq-1', slug:'aquaflow-demo', name:'AQUAFLOW Demo', category:'equipo-acuatico',
    creative:{url, alt, width:800, height:200}, disclosure:'presentado-por', badge:'demo' },
];
export const campaigns = [
  { id:'c-1', sponsorId:'aq-1', placementId:'hero-sponsor',
    startDate:'2025-01-01', endDate:'2099-12-31', priority:1 },
];
export const adPlacements = [
  { id:'hero-sponsor', kind:'hero', dimensions:{ desktop:{w:800,h:200,aspect:'4/1'}, mobile:{w:320,h:160,aspect:'2/1'} } },
  { id:'leaderboard', kind:'leaderboard', dimensions:{ desktop:{w:728,h:90,aspect:'728/90'}, mobile:{w:320,h:120,aspect:'8/3'} } },
  { id:'partner-grid', kind:'partner-grid', dimensions:{ cell:{w:160,h:160,aspect:'1/1'} } },
  { id:'competition-sponsor', kind:'competition-sponsor', dimensions:{ inline:{w:240,h:64,aspect:'15/4'} } },
];
// services/ads.js: resolveAd(placementId, { routeKey }) → ResolvedAd | { isEmpty: true, reason }
```

Validation: `validateSponsors()` requires `name`, `slug` matching `/^[a-z0-9-]+$/`, `creative.url`, `category` in the known set, and exact membership in the versioned closed authority by `id`, `slug`, `name`, and `category`. `validateCampaigns()` requires resolvable ids, parseable dates, `endDate >= startDate`. Failures `console.warn('[ads]', 'Skipping malformed entry', { index, missing })` — never throw.

## File Changes

`Create` (13): `src/data/{sponsors,campaigns,adPlacements}.js`, `src/services/ads.js`, `src/hooks/{useAdPlacement,useNoindex}.js`, `src/components/ads/{AdSlotFrame,HeroSponsorSlot,LeaderboardSlot,PartnerGridSlot,CompetitionSponsorBadge,EmptySlotTile}.jsx`, `src/pages/PublicidadDemoPage.jsx`. `Modify` (5): `src/App.jsx` (PR1: register `/publicidad/demo/:slug`; PR2: swap `HeroSponsor`+2×`BannerAd`), `src/components/Footer.jsx` (PR2: 4-box → `<PartnerGridSlot>`), `src/pages/CalendarioPage.jsx` + `src/pages/ResultadosPage.jsx` (PR2: add `<CompetitionSponsorBadge>`). `Delete` (3): `HeroSponsor.jsx` (Speedo), `BannerAd.jsx`, `SidebarAd.jsx` (dead code).

## Interfaces / Contracts

- `useAdPlacement(placementId): { ad, isEmpty, isLoading: false }` — `isLoading` reserved seam for future fetch; `ad` stable unless `placementId`/`routeKey` change.
- `<AdSlotFrame placement ad isEmpty>` — `role="complementary"`, `aria-label="Publicidad: {sponsor.name}"` (or `Espacio disponible`); disclosure from `placement.disclosure`/`ad.disclosure`; demo badge when not empty; anchor `rel="sponsored noopener"`; reserved via `min-h` + `aspect-[X/Y]`; `motion-safe:translate-x-0 motion-safe:opacity-100`; focus ring `focus-visible:ring-2 focus-visible:ring-blue-500`.
- `<EmptySlotTile placement>` — same dimensions, no link, no badge, no disclosure (per spec).

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Static | `npm run build` passes | Manual |
| Visual | Reserved dimensions; leaderboard <768px; dark AA; reduced-motion no slide-in | Checklist in `verify-report.md` |
| Behavioral | Click → `/publicidad/demo/:slug` with `noindex`; nav/reload may rotate; empty → `Espacio disponible` | Manual + DOM |
| Data | Closed-authority identity admission; malformed sponsor skipped + warn; expired filtered; no real-brand fixture (`grep -ri speedo src`) | Node regression script + grep |

`openspec/config.yaml` `strict_tdd: false`; no new test infrastructure.

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, or process-integration boundary. New route is internal React Router rendering static markup; no external fetches.

## Migration / Rollout

No migration. Chained PRs are the rollout. Rollback: revert PR 2 hides slots; revert PR 1 removes data/seam/route. No schema or SEO changes outside demo pages; root `index.html` metadata untouched.

## Chained PR Boundaries (1200-line budget)

| PR | Scope | Lines |
|----|-------|-------|
| PR 1 — Foundation | data, seam, 4 slots, demo page, route, `?ads=demo` preview | ~600–750 |
| PR 2 — Wiring | `App.jsx` swap, `Footer.jsx`, calendar/results, delete 3 legacy | ~150–300 |

Per-PR 400-line risk: Low. Total budget risk: Low.

## Open Questions

None. The five product questions from `exploration.md` were resolved in `proposal.md` (no tiers, global rotating inventory, internal demo pages, fictional only, fixed disclosure). The contract tension — spec mentions "destination URL" but every click must be internal — is resolved by replacing external URLs with a sponsor `slug` field that maps to `/publicidad/demo/:slug`. No external URL exists in the system.
