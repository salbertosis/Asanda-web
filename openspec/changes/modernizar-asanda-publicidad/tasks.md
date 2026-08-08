# Tasks: Modernizar ASANDA Publicidad — Demo Advertising System

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~810 (PR 1: ~610 additions, PR 2: ~55 additions + ~150 deletions) |
| 400-line budget risk | Medium (PR 1 exceeds per-PR 400-line budget) |
| 1200-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Wiring) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Fixture catalog, resolver seam, hooks, 4 slot components, demo detail route, isolated preview | PR 1 | `npm run build` passes; `grep -ri speedo src/data src/services src/components/ads src/hooks src/pages/PublicidadDemoPage.jsx` → 0 hits | Load `/?ads=demo` → all 4 slots render; click creative → `/publicidad/demo/aquaflow-demo` with `noindex` meta | Remove `src/data/{sponsors,campaigns,adPlacements}.js`, `src/services/ads.js`, `src/hooks/use{AdPlacement,Noindex}.js`, `src/components/ads/`, `src/pages/PublicidadDemoPage.jsx`; revert `App.jsx` route + preview additions |
| 2 | Replace legacy placeholders, delete Speedo/dead components, wire all pages, final checks | PR 2 | `npm run build` passes; `grep -ri speedo src` → 0 hits globally; `grep -ri SidebarAd src` → 0 hits | Load home → hero+leaderboard; footer → partner grid; calendar/results → competition badge; tab through all slots → focus rings; dark mode → `dark:` variants | Revert `App.jsx`/`Footer.jsx`/`CalendarioPage.jsx`/`ResultadosPage.jsx` swaps; restore deleted files from git history |

## Phase 1: Data & Validation (PR 1)

- [ ] 1.1 Create `src/data/sponsors.js` — 4 fictional brands (aquatic equipment, sports health, hydration, training) with `id`, `slug`, `name`, `category`, `creative:{url,alt,width,height}`, `disclosure`, `badge` per design contract. No real brand names.
  - **Verify:** `node -e "const s = require('./src/data/sponsors.js'); console.log(s.sponsors.length)"` → 4; visual scan: no real brand names.
- [ ] 1.2 Create `src/data/campaigns.js` — campaign fixtures linking `sponsorId` → `placementId` with `startDate`/`endDate`/`priority`.
  - **Verify:** All `sponsorId` values match sponsor ids; all dates parseable via `new Date()`.
- [ ] 1.3 Create `src/data/adPlacements.js` — 4 placement definitions (`hero-sponsor`, `leaderboard`, `partner-grid`, `competition-sponsor`) with reserved dimensions per design contract.
  - **Verify:** Each placement has `id`, `kind`, `dimensions` matching design data contracts.
- [ ] 1.4 Create `src/services/ads.js` — `resolveAd(placementId, { routeKey })` with hash-based rotation (`hash(placementId + routeKey + loadCounter) % active.length`), `validateSponsors()`, `validateCampaigns()`, `isActive(campaign, today)`. Malformed → `console.warn('[ads]', ...)`, never throws. Expired → excluded. Empty → `{ isEmpty: true, reason }`.
  - **Verify:** Node script: malformed sponsor (missing `name`) → `console.warn` logged, entry skipped; expired campaign (`endDate` past) → excluded; empty catalog → `{ isEmpty: true }`.

## Phase 2: Hooks, Components & Route (PR 1)

- [ ] 2.1 Create `src/hooks/useNoindex.js` — on mount: insert `<meta name="robots" content="noindex">`; on unmount: restore prior meta or remove tag.
  - **Verify:** Mount → meta present in `document.head`; unmount → prior meta restored or tag removed.
- [ ] 2.2 Create `src/hooks/useAdPlacement.js` — wraps `resolveAd`, returns `{ ad, isEmpty, isLoading: false }`. Stable across re-renders for same `placementId`+`routeKey`.
  - **Verify:** Hook returns same `ad` object reference on re-render when inputs unchanged.
- [ ] 2.3 Create `src/components/ads/AdSlotFrame.jsx` — shared slot frame: `role="complementary"`, `aria-label="Publicidad: {name}"`, disclosure label, demo badge, reserved `min-h`+`aspect-[X/Y]`, anchor `rel="sponsored noopener"`, `focus-visible:ring-2`, `motion-safe:` animations, `dark:` variants.
  - **Verify:** DOM inspection: `role`, `aria-label`, disclosure text, badge text, `rel` attribute all present.
- [ ] 2.4 Create `src/components/ads/EmptySlotTile.jsx` — reserved dimensions matching active slot, "Espacio disponible" text, no link, no badge, no disclosure.
  - **Verify:** Renders with same `min-height` as active slot; no `<a>` element in DOM.
- [ ] 2.5 Create `src/components/ads/HeroSponsorSlot.jsx` — hero placement using `AdSlotFrame` with `useAdPlacement('hero-sponsor')`.
- [ ] 2.6 Create `src/components/ads/LeaderboardSlot.jsx` — responsive: full-width banner ≥768px, compact card <768px. Uses `AdSlotFrame` + `useAdPlacement('leaderboard')`.
  - **Verify:** Resize browser: layout switches at 768px; reserved height prevents CLS in both modes.
- [ ] 2.7 Create `src/components/ads/PartnerGridSlot.jsx` — 4-cell grid using `AdSlotFrame` for footer integration.
- [ ] 2.8 Create `src/components/ads/CompetitionSponsorBadge.jsx` — inline badge for calendar/results pages using `AdSlotFrame`.
- [ ] 2.9 Create `src/pages/PublicidadDemoPage.jsx` — internal demo detail page: fictional explanation, sponsor name from `:slug` param, `useNoindex` hook, back navigation link.
  - **Verify:** Navigate to `/publicidad/demo/aquaflow-demo` → page renders fictional explanation; `<meta name="robots" content="noindex">` in head; navigate away → meta removed.
- [ ] 2.10 Register `/publicidad/demo/:slug` route in `src/App.jsx` (additive — route only, no existing component changes).
  - **Verify:** `npm run build` passes; route accessible at `/publicidad/demo/aquaflow-demo`.
- [ ] 2.11 Add `?ads=demo` preview support — when query param present, render all 4 slots in an isolated preview layout for PR 1 verification without modifying existing pages.
  - **Verify:** Load `/?ads=demo` → all 4 slot types visible; load `/` without param → no change to existing page.

## Phase 3: Integration & Wiring (PR 2)

- [ ] 3.1 Replace `<HeroSponsor>` with `<HeroSponsorSlot>` and `<BannerAd>` instances with `<LeaderboardSlot>` in `src/App.jsx`.
  - **Verify:** Home page renders hero slot + leaderboard with disclosure labels + demo badges; creative click → internal demo page.
- [ ] 3.2 Replace footer ad placeholders with `<PartnerGridSlot>` in `src/components/Footer.jsx`.
  - **Verify:** Footer shows partner grid with 4 cells, each with disclosure label.
- [ ] 3.3 Add `<CompetitionSponsorBadge>` to `src/pages/CalendarioPage.jsx` — global rotating inventory, no per-event exclusivity.
  - **Verify:** Calendar page shows inline sponsor badge; same badge across different events.
- [ ] 3.4 Add `<CompetitionSponsorBadge>` to `src/pages/ResultadosPage.jsx`.
  - **Verify:** Results page shows inline sponsor badge.

## Phase 4: Cleanup & Final Verification (PR 2)

- [ ] 4.1 Delete `src/components/HeroSponsor.jsx` (Speedo), `src/components/BannerAd.jsx`, `src/components/SidebarAd.jsx` (dead code). Remove all imports referencing these files.
  - **Verify:** `grep -ri speedo src` → 0 hits; `grep -ri "SidebarAd\|BannerAd\|HeroSponsor" src` → 0 hits.
- [ ] 4.2 Final verification checklist (manual + DOM + DevTools):
  - `npm run build` passes clean — no warnings or errors.
  - **No external ad-network calls:** DevTools Network tab → 0 requests to ad-network domains.
  - **No timers for rotation:** `grep -rE "setInterval|setTimeout" src/components/ads src/services/ads.js` → 0 hits.
  - **No localStorage for ads:** `grep -r "localStorage" src/services/ads.js src/hooks/useAdPlacement.js` → 0 hits.
  - **Rotation stability:** View home page → creative unchanged during scroll/interaction; navigate to calendar and back → creative may differ; reload page → creative may differ.
  - **Keyboard navigation:** Tab through all slots → visible `focus-visible` ring on each creative link; Enter activates link → navigates to demo page.
  - **Reduced motion:** Set `prefers-reduced-motion: reduce` → no slide-in/fade-in animations on any slot.
  - **Dark mode:** Toggle dark mode → all slots render with `dark:` variants; text/background contrast meets WCAG AA.
  - **Responsive:** Viewport <768px → leaderboard compact card; ≥768px → full banner; no CLS (DevTools Layout Shift = 0 for ad slots).
  - **noindex scope:** Demo pages have `<meta name="robots" content="noindex">`; root `index.html` and all non-demo pages have no `noindex` addition.
  - **Empty state:** Temporarily empty campaigns fixture → "Espacio disponible" tile with reserved dimensions, no badge/link.
  - **Source-mutating normalization:** None — no formatter configured or introduced in this change.
