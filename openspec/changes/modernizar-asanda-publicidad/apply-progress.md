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

## PR 2 — Wiring Completion
**Slice**: `pr2-wiring-completion`; stacked-to-main on the preserved wiring branch; tasks 3.1–3.4 and 4.1–4.2 only.
**Status**: 6/6 PR 2 tasks complete; cumulative 21/21 tasks complete.
**Changed-line accounting**: 186 total authored additions/deletions (48 additions, 138 deletions); source diff 152 plus artifact updates 34; within the 200-line cap.
### Completed Tasks
- [x] 3.1–3.4 Home, footer, calendar, and results slots wired to the PR 1 components.
- [x] 4.1 Legacy ad files deleted; source imports and legacy references removed.
- [x] 4.2 Build, deterministic checks, cleanup searches, and contract inspection completed.
### Work Unit Evidence (Unit 2 — PR 2)
| Evidence | Value |
|---|---|
| Focused test command and exact result | `node --input-type=module -e ...` → exit 0, 9/9 PASS; `$env:BROWSERSLIST_IGNORE_OLD_DATA='true'; npm run build` → exit 0, 1413 modules, 13.74s. |
| Runtime harness command/scenario and exact result | N/A — no test runner or configured browser/native runtime capability; implementation contracts were inspected statically. |
| Rollback boundary | Revert the seven preserved wiring changes; restore the three deleted legacy files from Git history. |
| Deterministic checks | Legacy source refs 0; ad timer/storage refs 0; external ad-network refs 0; `git diff --check` passed. |
| Contract inspection | Disclosure/Demo/rel/role, internal route, noindex, reserved responsive dimensions, `motion-safe`, `dark:`, and empty fallback are present. |
| Process evidence | No formatter configured; no commit, push, PR, review, archive, or native-attempt settlement performed. |
**Issue**: Raw `npm run build` also exited 0 but emitted the existing stale Browserslist data warning; the clean rerun suppressed only that environment warning.
**Next**: Parent-owned attempt settlement, then `sdd-verify`.

## Bounded Remediation — PR 2
**Work unit**: `pr2-bounded-remediation`; one maintainer-authorized correction, max 80 changed lines.
**Attempt**: `sha256:b1855573ea64c5e9647faf156fb01bf765b3f9cf868ccd23ee8896bc2c4c6ec4` (parent-owned; not settled here).
**Binding**: failed evidence `sha256:d7429322ac3fa3ea79dcfe02301316b1ab6e0690d6fa2c0f116cf78354629224`; objective `sha256:5c5ccf9f1f6158a60e0f9ef706fa24194d13f2ca05547f8590ee395a01b2c7ae`; generation 7.
**Scope**: Only the real-brand/demo-contract guard and reload-seed defects were corrected; task checkboxes and `verify-report.md` were not changed.
**Implementation**: `src/services/ads.js` now requires demo identity markers (`badge`, name, and slug) and hashes a per-load crypto seed for single ads and grids. The seed is stable for a page module and can be supplied as a deterministic test seam; no persistent or timed state was added.

### Work Unit Evidence (Unit 3 — bounded remediation)
| Evidence | Value |
|---|---|
| Focused test command and exact result | Inline `node --input-type=module -` harness: pre-fix RED `0/2`, exit 1; post-fix GREEN `8/8`, exit 0. Proved real-brand rejection, warning/no-throw handling, empty state, internal destination, same-route stability, default-seed reload variation, and grid variation. |
| Runtime harness command/scenario and exact result | N/A — no configured browser/native harness exists; no browser evidence was manufactured. |
| Rollback boundary | Revert only the remediation hunk in `src/services/ads.js` and this appended evidence section; PR1/PR2 wiring remains intact. |
| Changed-line count | 59 authored additions/deletions (37 source + 22 artifact); within the 80-line cap. |
| Cleanup evidence | Harness ran through stdin; no temporary files or processes remain. Tasks checkboxes, `verify-report.md`, commits, pushes, PRs, review, archive, formatter, and native attempt state were not changed. |
| Process evidence | `npm run build` exit 0 (1413 modules; existing stale Browserslist warning); source constraints 0 hits; `git diff --check` exit 0 with only existing line-ending warnings. |

```json
{"schema":"gentle-ai.remediation-result/v1","attempt_token":"sha256:b1855573ea64c5e9647faf156fb01bf765b3f9cf868ccd23ee8896bc2c4c6ec4","lineage_id":"sha256:5c5ccf9f1f6158a60e0f9ef706fa24194d13f2ca05547f8590ee395a01b2c7ae","generation":7,"fix_batch":"pr2-bounded-remediation","failed_evidence_revision":"sha256:d7429322ac3fa3ea79dcfe02301316b1ab6e0690d6fa2c0f116cf78354629224","outcome_recommendation":"passed","changed_lines":59}
{"schema":"gentle-ai.remediation-evidence/v1","attempt_token":"sha256:b1855573ea64c5e9647faf156fb01bf765b3f9cf868ccd23ee8896bc2c4c6ec4","lineage_id":"sha256:5c5ccf9f1f6158a60e0f9ef706fa24194d13f2ca05547f8590ee395a01b2c7ae","generation":7,"fix_batch":"pr2-bounded-remediation","failed_evidence_revision":"sha256:d7429322ac3fa3ea79dcfe02301316b1ab6e0690d6fa2c0f116cf78354629224","outcome_recommendation":"passed","changed_lines":59,"focused_harness":"pre-fix RED 0/2 exit 1; post-fix GREEN 8/8 exit 0","build":"npm run build exit 0; 1413 modules; stale Browserslist warning","constraints":"legacy/ad-network 0; timer/storage 0; git diff --check exit 0","runtime_harness":"N/A: browser harness unavailable","cleanup":"stdin harness; no temporary files or processes","process":"no formatter/commit/push/PR/review/archive/native settlement"}
```
**Canonical evidence revision**: `sha256:fc9684fa0954a01fef7beffb3dbb40eeb7cde250981d6dee1d1b1191473ec51e` (837-byte UTF-8 JSON line plus trailing LF; hash covers the immediately preceding evidence object).

## Bounded Remediation — PR 2 Approved Sponsor Catalog
**Work unit**: `pr2-approved-sponsor-catalog`; stacked-to-main, auto-chain; maximum 200 changed lines.
**Attempt**: `sha256:d74e3b8b839acc0feb70107a473a0852a53727e4b446c8b8588e45f115907fc2`; **lineage**: `sha256:003dbee2536cd276b903851f9581b33359a9ec14022ec4801c1ef6f55fbc959e`; **generation**: 9; **failed evidence**: `sha256:047fdc417d53e2ae5a8e87010aa44fd8e8d0e8b3da21b18557ed23449b53fbf1`.
**Status**: Passed; exact identity admission, adversarial regressions, and preserved resolver contracts implemented without changing `verify-report.md`.
### Completed Task
- [x] 5.1 Closed versioned sponsor authority and permanent dependency-free Node regression coverage.
### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused tests | `npm run test:ads` → RED exit 1 (`Speedo Demo`, 1 !== 0); GREEN exit 0, `ads regression: 12/12 passed`. |
| Runtime harness | `N/A` — no browser/native harness is configured and this resolver has no runtime boundary. |
| Rollback boundary | Revert `scripts/ads-regression.mjs`, `package.json` `test:ads`, the authority/validation hunk, and this remediation section only. |
| Build/source/diff | `npm run build` exit 0, 1413 modules, existing stale Browserslist warning; source constraints exit 0 with zero hits; `git diff --check` exit 0. |
| Cleanup/process | No temporary files or processes; no commit, push, PR, review, archive, or attempt settlement. RED preceded production code; GREEN followed it. |
| Changed-line count | 198 authored additions/deletions introduced by this unit; within the 200-line cap. |
```json
{"schema":"gentle-ai.remediation-result/v1","attempt_token":"sha256:d74e3b8b839acc0feb70107a473a0852a53727e4b446c8b8588e45f115907fc2","lineage_id":"sha256:003dbee2536cd276b903851f9581b33359a9ec14022ec4801c1ef6f55fbc959e","generation":9,"fix_batch":"pr2-approved-sponsor-catalog","failed_evidence_revision":"sha256:047fdc417d53e2ae5a8e87010aa44fd8e8d0e8b3da21b18557ed23449b53fbf1","outcome_recommendation":"passed","changed_lines":198}
{"schema":"gentle-ai.remediation-evidence/v1","attempt_token":"sha256:d74e3b8b839acc0feb70107a473a0852a53727e4b446c8b8588e45f115907fc2","lineage_id":"sha256:003dbee2536cd276b903851f9581b33359a9ec14022ec4801c1ef6f55fbc959e","generation":9,"fix_batch":"pr2-approved-sponsor-catalog","failed_evidence_revision":"sha256:047fdc417d53e2ae5a8e87010aa44fd8e8d0e8b3da21b18557ed23449b53fbf1","outcome_recommendation":"passed","changed_lines":198,"red":"npm run test:ads exit 1; Speedo Demo accepted (1 !== 0)","green":"npm run test:ads exit 0; ads regression 12/12 passed","build":"npm run build exit 0; 1413 modules; stale Browserslist warning","constraints":"exit 0; legacy/real-brand 0, timer/storage 0, external ad-network 0","diff_check":"git diff --check exit 0; no whitespace errors (line-ending warnings only)","runtime_harness":"N/A: no browser/native harness configured","rollback_boundary":"Revert scripts/ads-regression.mjs, package.json test:ads, the authority/validation hunk, and this remediation artifact section","cleanup":"No temporary files or processes; no commit, push, PR, review, archive, or attempt settlement","process":"RED before production code; GREEN after; no formatter; only scoped files changed"}
```
**Canonical evidence revision**: `sha256:110a541190aade3daae576e6f1bb83d1b5f5aa2879f19841ade902629ebe53b1` (1219-byte UTF-8 JSON line plus trailing LF; hash covers the immediately preceding evidence object).

## Bounded Remediation — Playwright E2E Runtime Proof
**Work unit**: `pr2-playwright-e2e-remediation`; Standard Mode; max 400 authored additions/deletions.
**Completed task**: [x] 5.2 Minimal Chromium-only `@playwright/test` harness with Vite lifecycle management.

### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command and exact result | `npm run test:e2e` → exit 0, 4/4 passed; output hash `sha256:4f652fdd4476539ba2f584b21db93240e789f54a41c90cab44fc074cb94439de`. Before wiring the existing dark-mode control into the app, the dark-mode assertion failed because no accessible `Activar modo oscuro` button was rendered. |
| Runtime harness command/scenarios and exact result | Chromium starts Vite at `127.0.0.1:4173` and proves: intercepted empty `campaigns.js` renders 7 reserved fallback tiles with no links/badges/disclosures; reduced motion has no animation; Enter navigates to `/publicidad/demo/:slug`; real `DarkModeToggle` activation produces AA-or-better computed disclosure/badge contrast. |
| Supporting checks | `npm run test:ads` → exit 0, 12/12, hash `sha256:b11fc0b301e6ec3fade427f2d4071e56db08e7cde4c26731b2bd0e00b0f42fec`; `npm run build` → exit 0, 1416 modules, hash `sha256:f339fdbd476bc643025205b570e9537b0c18dc7d3c3d95531965c7b03f4bc264`. |
| Rollback boundary | Revert `playwright.config.js`, `tests/e2e/ads.spec.js`, Playwright package/script/ignore entries, and the `DarkModeToggle` mount in `src/App.jsx`; existing advertising behavior remains intact. |
| Cleanup/process | Playwright owned and terminated Vite; port 4173 had no listener after the green suite. No commit, push, PR, review, archive, branch change, or native attempt settlement. |

**Files**: `playwright.config.js`, `tests/e2e/ads.spec.js`, `package.json`, `package-lock.json`, `.gitignore`, `src/App.jsx`, this progress file, and `tasks.md`.
**Production behavior change**: the already-implemented `DarkModeToggle` is now mounted globally so the actual dark-mode preference control is available; no advertising production behavior changed.
**Next**: parent may settle this bounded remediation and refresh SDD verification evidence.
