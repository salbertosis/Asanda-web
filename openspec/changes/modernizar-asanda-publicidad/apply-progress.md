# Apply Progress: Modernizar ASANDA Publicidad — PR 1 Foundation

**Change**: modernizar-asanda-publicidad
**Mode**: Standard (strict_tdd: false, no test runner)
**Slice**: PR 1 — Foundation (tasks 1.1–1.4, 2.1–2.11). Stacked-to-main, branch `feat/modernizar-asanda-publicidad-foundation`.
**Budget**: 632 / 750 changed lines (14 new files = 617 exact; `src/App.jsx` = +13/−2 = 15). Baseline was already dirty by maintainer decision; `git diff` cannot isolate PR 1, so measurement = exact line counts of new files + manual hunk count of App.jsx.

## Completed Tasks

- [x] 1.1 `src/data/sponsors.js` — 4 fictional sponsors (AQUAFLOW/VITALSPORT/HIDRAFLUX/ENTRENAX Demo), full contract fields
- [x] 1.2 `src/data/campaigns.js` — 16 campaigns (4 placements × 4 sponsors), equal priority
- [x] 1.3 `src/data/adPlacements.js` — 4 placements with reserved dimensions + `getPlacement`
- [x] 1.4 `src/services/ads.js` — `resolveAd`/`resolveAds`/`validateSponsors`/`validateCampaigns`/`isActive`/`getSponsorBySlug`; hash rotation `hash(placementId:routeKey:loadCounter) % active.length`; warns, never throws
- [x] 2.1 `src/hooks/useNoindex.js` — mount: `noindex` meta; unmount: restore/remove
- [x] 2.2 `src/hooks/useAdPlacement.js` — `{ ad, isEmpty, reason, placement, isLoading: false }`, `useMemo` on placementId+pathname; `useAdPlacements` grid variant
- [x] 2.3 `src/components/ads/AdSlotFrame.jsx` — `role="complementary"`, `aria-label="Publicidad: {name}"`, disclosure, Demo badge, `min-h`+`aspect-[X/Y]`, `rel="sponsored noopener"`, `focus-visible:ring-2`, `motion-safe:animate-fade-in`, `dark:` variants
- [x] 2.4 `src/components/ads/EmptySlotTile.jsx` — same reserved dims, "Espacio disponible", no link/badge/disclosure
- [x] 2.5 `HeroSponsorSlot.jsx` · [x] 2.6 `LeaderboardSlot.jsx` (compact card <768px) · [x] 2.7 `PartnerGridSlot.jsx` (4 cells) · [x] 2.8 `CompetitionSponsorBadge.jsx`
- [x] 2.9 `src/pages/PublicidadDemoPage.jsx` — fictional explanation, `:slug` lookup, `useNoindex`, back link, unknown-slug state
- [x] 2.10 Route `/publicidad/demo/:slug` registered in `src/App.jsx` (additive)
- [x] 2.11 `?ads=demo` isolated preview via `HomeGate` + `src/components/ads/AdsDemoPreview.jsx`; `/` without param unchanged

## Work Unit Evidence (Unit 1 — PR 1)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `node %TEMP%\opencode\ads-check.mjs` → exit 0, **20/20 PASS** (catalog=4, no real brands, 16 campaigns resolvable, 4 placements, malformed sponsor skipped with `[ads]` warn, expired excluded, all-expired ⇒ `{isEmpty:true, reason:'no-active-campaigns'}`, internal `/publicidad/demo/:slug` destination, stable pick per routeKey, unknown placement safe, grid = 4 distinct) |
| Runtime harness command/scenario and exact result | `npm run build` (vite build) → **exit 0, built in 3.82s**, 1416 modules, no errors/warnings from new code. Browser/DOM runtime harness **not executed** (no runner in project); manual `/?ads=demo` visual check deferred to PR 2 verify checklist |
| Rollback boundary | Delete the 14 new files listed below; revert the 3 additive hunks in `src/App.jsx` (imports, `HomeGate`, route). Zero pre-existing files touched otherwise; baseline modifications preserved untouched |

## Constraint Greps (new paths only)

- Real brands / ad networks (`speedo|arena|nike|adidas|mizuno|gatorade|powerade|adsense|doubleclick|googlesyndication|prebid|adsbygoogle`) → **0 hits**
- `setInterval|setTimeout|localStorage` in `src/components/ads`, `src/services/ads.js`, `src/hooks/use{AdPlacement,Noindex}.js`, data fixtures → **0 hits**
- `complimentary` typo across `src` → **0 hits**; exact `role="complementary"` in AdSlotFrame + EmptySlotTile ✓
- Wiring: route + `HomeGate` + `ads==='demo'` present in `src/App.jsx` ✓

## Module-Format Note

`package.json` is `"type": "module"` and Node v22.11.0 cannot `require()` ESM, so tasks.md's `node -e "require(...)"` verifies were adapted to an equivalent ESM script with dynamic `import()`. Consequence: `src/services/ads.js` uses explicit `.js` import extensions (Node requirement; Vite-neutral). New-file-only limitation: components/hooks were not Node-executed (React/Router deps) — covered by build instead.

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `src/data/sponsors.js` | Created | 4 fictional sponsor fixtures + categories |
| `src/data/campaigns.js` | Created | 16 demo campaigns |
| `src/data/adPlacements.js` | Created | 4 placement definitions + `getPlacement` |
| `src/services/ads.js` | Created | Resolver seam, validation, rotation |
| `src/hooks/useNoindex.js` | Created | noindex meta lifecycle |
| `src/hooks/useAdPlacement.js` | Created | `useAdPlacement` + `useAdPlacements` |
| `src/components/ads/AdSlotFrame.jsx` | Created | Shared slot frame (a11y, CLS, dark, motion) |
| `src/components/ads/EmptySlotTile.jsx` | Created | Empty fallback |
| `src/components/ads/HeroSponsorSlot.jsx` | Created | Hero slot |
| `src/components/ads/LeaderboardSlot.jsx` | Created | Responsive leaderboard |
| `src/components/ads/PartnerGridSlot.jsx` | Created | Footer grid (4 cells) |
| `src/components/ads/CompetitionSponsorBadge.jsx` | Created | Inline competition badge |
| `src/components/ads/AdsDemoPreview.jsx` | Created | Isolated `?ads=demo` preview |
| `src/pages/PublicidadDemoPage.jsx` | Created | Internal noindex demo detail page |
| `src/App.jsx` | Modified (+13/−2) | Demo route + `HomeGate` preview gate |
| `openspec/changes/modernizar-asanda-publicidad/tasks.md` | Modified | `[x]` on 1.1–2.11 |

## Deviations from Design

1. Added `resolveAds(placementId, count, context)` + `useAdPlacements` — partner-grid needs 4 distinct creatives; `resolveAd` returns one. Offset-rotation from the same deterministic hash; `loadCounter` untouched by grid.
2. Added `src/components/ads/AdsDemoPreview.jsx` (not in design's 13-file list) — required by task 2.11; keeps `App.jsx` diff minimal.
3. Explicit `.js` extensions in `src/services/ads.js` imports (Node-verifiability; see Module-Format Note).
4. `resolveAd` context accepts optional `today` — deterministic test seam for expired/empty scenarios.

## Issues Found

- Dirty pre-existing baseline (dozens of modified/untracked files) preserved untouched per maintainer decision; PR-size measurement uses per-file counting, not `git diff`.
- Comment in `ads.js` initially contained literal `localStorage`/`timers` tokens — reworded so PR 2's task 4.2 grep stays clean.

## Status

**15/15 PR 1 tasks complete.** Phases 3–4 (PR 2) untouched. Ready for orchestrator attempt finalization; next slice: PR 2 (wiring + legacy removal).
