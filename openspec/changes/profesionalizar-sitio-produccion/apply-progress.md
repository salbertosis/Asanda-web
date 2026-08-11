# Apply Progress: Professionalize ASANDA for Production

## Structured Status

- Artifact store: OpenSpec (`openspec/changes/...`).
- Apply state: ready; PR3 and task 4.1 are proven and checked; task 4.2 remains pending because the deployed build is stale, Lighthouse has a measured regression, and field INP evidence is unavailable.
- Assigned boundary: Phase 4 release proof — baseline checks, preview/deployed production checks, Lighthouse, and Web Vitals baseline/regression evidence.
- Delivery: `ask-on-risk`, resolved by the user as a separate final PR with `feature-branch-chain`.
- Child branch: `feat/profesionalizar-sitio-produccion-05-release-proof`.
- Target branch: `feat/profesionalizar-sitio-produccion` (tracker).
- Testing mode: Standard (`strict_tdd: false`; no strict-TDD runner is configured).
- Native attempt/review: parent owns settlement; corrective successor revision `sha256:c27fa9b1879251121c9174893526ee5a246a9ebe33f1b0b4a72477185ee84bd8` and attempt token remain parent-owned. This executor ran no `sdd-attempt` operation, reset, rescope, native review, commit, push, or PR.

## Cumulative Status

- Checked: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, and 4.1.
- Pending: 4.2 (corrective rerun attempted; release gate remains closed).
- PR1, PR2, PR3, and the initial Phase 4 attempt are retained below; task 4.2 is not reported complete.

## Completed Tasks

- [x] **1.1–1.3** PR1 routing, independent crawl resources, defensive headers, and regression coverage remain complete.
- [x] **2.1** Added focused approval, placeholder, URL, malformed-config, and legal-content validation coverage.
- [x] **2.2** PR2a delivered the validated public-site/content modules, safe `RouteHead`, unavailable Spanish legal/privacy pages, and approval-filtered footer. PR2b delivered the remaining shell portion: `AppShell`, `SkipLink`, and shell integration in `src/App.jsx`.
- [x] **2.3** `tests/e2e/accessible-shell.spec.js` covers one `main`/H1 per view (16 routes), keyboard skip focus, 44px footer targets, approved legal-link integrity, accessible demo disclosure/noindex with scoped lifecycle, and mobile-menu preservation.
- [x] **2.4** Shell migration: `App.jsx` rewires routes through `AppShell`; 12 route pages plus `PublicidadDemoPage` return content only; `Footer` links meet 44×44 px; ads, dark mode, menu, responsive layout, and lazy images preserved.
- [x] **2.5** `LegalContentPage` centralizes legal/privacy approval filtering and headings; duplicate calendar `<h1>` demoted to `<h2>`; substantive legal content renders only from approved text.

## Historical PR1 Evidence

Strict TDD was not active. These results preserve the completed PR1 evidence:

| Task | RED | GREEN | REFACTOR |
|---|---|---|---|
| 1.1 | Readiness initially failed 2/2 because `/atletas` was blank and `/robots.txt` was HTML. | `npm run test:e2e -- readiness` passed 2/2. | Shared route/resource fixtures kept routing cases focused. |
| 1.2 | Initial production checks failed before Vercel rules and crawl resources existed. | `npm run test:e2e -- production` passed 1/1; preview check passed. | Deployment assertions and HTTP checks stayed separate. |
| 1.3 | N/A — behavior-preserving refactor. | Readiness passed 2/2 after refactor. | Missing `/assets/` requests remain guarded in local routing tests. |

## PR2a Evidence

| Task | Truthful evidence |
|---|---|
| 2.1 | `tests/e2e/trust-shell.spec.js` injects an approved config fixture through Vite and proves its copyright/legal controls render in the footer; it also proves a cross-origin critical asset is rejected while the valid canonical origin and local asset remain accepted. Malformed containers, placeholder/credential URLs, literal approval, and structural legal-content validation remain covered. |
| 2.2 (PR2a portion) | The focused suite renders unavailable `/legal` and `/privacidad`, confirms semantic mains and hidden unapproved footer values, and verifies `RouteHead` restoration. |

## Codex Hook Fix Evidence

Maintainer-authorized corrections applied to the PR2a candidate; no task checkbox changed at that time.

| Fix | Evidence |
|---|---|
| Canonical-origin normalization | `validatePublicSite` now normalizes an accepted canonical origin through `normalizeCanonicalOrigin` (`URL.origin`), so `https://asanda.org.ve` and `https://asanda.org.ve/` compare identically for same-origin critical assets. Fail-closed checks (HTTPS-only, no credentials, no path/query/hash, placeholder rejection) are unchanged; unaccepted origins still normalize to `null`. |
| Focused coverage | `trust-shell` test proves a trailing-slash canonical origin yields zero issues, normalizes to the slashless origin, and preserves all valid same-origin `criticalAssets`. |
| Footer heading semantics | The three footer section headings (`Deportes`, `Enlaces`, `PATROCINADORES GLOBALES`) changed from `<h4>` to `<h2>` with identical Tailwind classes — no visual regression. |

## PR2b Evidence

Standard Mode (`strict_tdd: false`); RED/GREEN/REFACTOR intent executed truthfully:

| Task | RED | GREEN | REFACTOR |
|---|---|---|---|
| 2.3 | `npm run test:e2e -- accessible-shell` initially failed 4/6: zero `main` landmarks on most views, no skip link, footer targets under 44px, and the mobile-menu main assertion. Legal-link integrity and demo disclosure/noindex passed at RED because PR2a delivered those foundations. | After the shell migration the focused suite passed 6/6. | Assertion messages carry route/link context; the route table drives every-view coverage without per-route test duplication. |
| 2.4 | N/A — implementation task gated by the 2.3 RED failures. | `AppShell`/`SkipLink` created; `App.jsx` rewires all routes through the shell with the skip link as first tab stop; 12 route pages plus `PublicidadDemoPage` return content only; footer links are 44×44 px. Full suite passed 21/21. | N/A |
| 2.5 | N/A — behavior-preserving refactor. | `LegalContentPage` centralizes approval filtering/headings; `CompetitionsCalendar` duplicate `<h1>` demoted to `<h2>`; focused and full suites re-passed (6/6 and 21/21). | Legal/privacy pages are now thin `kind` wrappers; duplication removed. |

### PR2b Deviations and Findings

- `src/main.jsx` and `src/components/HeaderModern.jsx` required no functional change for shell integration; skip link, landmark, and focus behavior live in `AppShell`/`SkipLink`/`App.jsx`. No behavior was skipped.
- Pre-existing crash fixed: `RecordEstadal` threw `TypeError` on 3 athletes without `recordPersonal`, blanking `/record-estadal` before this slice. A defensive filter now skips them per the repository malformed-static-data standard; task 2.3's every-view proof was impossible without it.
- `tests/e2e/ads.spec.js` empty-slot counts updated 7 → 11: the shell footer renders the 4-cell partner grid on `/?ads=demo` as well. Comments record the reason; slot assertions unchanged.
- Minimal-diff migration: pages keep background wrapper `div`s and inner indentation; only header/footer ownership moved to the shell.

## Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm run test:e2e -- accessible-shell` — passed, 6/6 in 28.8s (`PORT_4173_BEFORE=0`). |
| Runtime harness command/scenario | Final full Playwright run `npm run test:e2e` through Vite — passed 21/21 in 34.2s, including keyboard skip focus, 44px footer measurement, client-side legal navigation, demo noindex lifecycle, mobile menu at 390px, dark-mode toggle, and ads disclosure contrast. |
| Relevant regression suites | `npm run test:ads` — 12/12; trust-shell, readiness, production, and ads specs all included in the 21/21 full run. |
| Build | `npm run build` — passed; 1,424 modules transformed. |
| Diff check | `git diff --check` — passed (exit 0). |
| Runtime cleanup | One-off Vite probe on port 4199 was terminated: `PORT_4199_LISTENERS_AFTER=0`; resumed focused/full Playwright runs recorded `PORT_4173_BEFORE=0`, `PORT_4173_AFTER=0`. |
| Authored line count | Exactly 400 changed lines (232 tracked +/- + 168 new-file lines) including source, tests, and these OpenSpec updates; at budget, not exceeding. `.atl` local tooling state excluded and untouched. Evidence revision: `sha256:dd3437861e784279168f800caee1de5c7c74f0f99ae66a1f5404e7274dabcc56` (canonical path/blob manifest excludes this self-referential file and `.atl` state). |
| Rollback boundary | Revert `src/components/layout/{AppShell,SkipLink}.jsx`, `src/pages/LegalContentPage.jsx`, shell wiring in `src/App.jsx`, header/footer removal in the route pages and `PublicidadDemoPage.jsx`, 44px classes in `src/components/Footer.jsx`, the `<h2>` demotion in `src/components/CompetitionsCalendar.jsx`, the defensive filter in `src/components/RecordEstadal.jsx`, `tests/e2e/accessible-shell.spec.js`, the count update in `tests/e2e/ads.spec.js`, and these OpenSpec updates. PR1 routing and PR2a trust foundation remain intact. |

## PR2b Files

- Created: `src/components/layout/AppShell.jsx`, `src/components/layout/SkipLink.jsx`, `src/pages/LegalContentPage.jsx`, `tests/e2e/accessible-shell.spec.js`.
- Modified: `src/App.jsx`, `src/components/{Footer,CompetitionsCalendar,RecordEstadal}.jsx`, all 14 route pages under `src/pages/`, `tests/e2e/ads.spec.js`, `tasks.md`, and this progress file.

## Deferred Boundary

- Phase 4 release proof was deferred from PR3; task 4.1 is now proven in the final release-proof slice, while task 4.2, substantive approved legal text, and final release evidence remain pending.

## PR Boundary

- Strategy: auto-chain, `feature-branch-chain`.
- Starts from: the completed PR2b accessible-shell slice on the tracker branch.
- Ends with: an autonomous under-400-line PR3 slice with centralized metadata, local critical resources, lazy route chunks, fail-closed evidence helpers, and preserved Report-Only CSP.
- Out of scope: Phase 4 release proof, substantive approved legal text, commit/staging, push, PR creation, native review, and native attempt settlement.

## PR3 Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused tests | `npm run test:metadata` passed; `npm run test:e2e -- trust-shell` passed 9/9; `npm run test:e2e -- accessible-shell` passed 6/6. Runtime `npm run test:e2e` passed 22/22. |
| Runtime and Web Vitals harness | `node scripts/production-check.mjs http://127.0.0.1:4174` passed against the built preview. Exact native harness: `node --input-type=module -e "import { loadWebVitals } from './src/metrics/webVitals.js'; const seen = []; class Observer { static supportedEntryTypes = ['layout-shift', 'largest-contentful-paint', 'event']; constructor(callback) { this.callback = callback; } observe({ type }) { const entries = type === 'layout-shift' ? [{ value: 0.1, hadRecentInput: false }] : type === 'largest-contentful-paint' ? [{ startTime: 123 }] : [{ duration: 45 }]; this.callback({ getEntries: () => entries }); } } globalThis.PerformanceObserver = Observer; const registered = await loadWebVitals((metric) => seen.push(metric)); if (!registered || seen.map(({ name }) => name).join(',') !== 'CLS,LCP,INP') throw new Error('native Web Vitals fallback failed'); console.log('Native Web Vitals fallback passed: ' + seen.map(({ name }) => name).join(',') + '.');"` → `Native Web Vitals fallback passed: CLS,LCP,INP.` |
| Build, baseline, and asset-path deviation | `npm run build` passed with 1,426 modules; `npm run test:ads` passed 12/12. Design names `public/assets/hero.webp`, `public/assets/favicon.svg`, and `public/assets/social-card.webp`; implementation uses `public/assets/hero.svg`, root `public/favicon.svg`, and `public/assets/social-card.svg`. This is an explicit, unapproved deviation: existing checks and code use dependency-free SVGs, and no evidence authorizes inventing or converting WebP brand assets. |
| Diff, budget, and risks | `git diff --check` passed (exit 0; line-ending warnings only). Exact PR3 budget: **400/400 authored changed lines**, excluding unrelated `.atl` state. Risks: production generation fails closed because approved canonical/identity/legal values are unavailable; Lighthouse CLI/script evidence remains unavailable and task 4.2 is pending. |
| Rollback boundary | Revert PR3 hunks in `index.html`, `package.json`, `vercel.json`, `vite.config.js`, `src/App.jsx`, `src/main.jsx`, `src/config/publicSite.js`, `src/metrics/webVitals.js`, `src/seo/routeMetadata.js`, `src/components/{HeroBackground,PageHero}.jsx`, `src/components/layout/{AppShell,RouteHead}.jsx`, `scripts/{generate-public-assets,performance-regression,production-check}.mjs`, `lighthouserc.cjs`, `public/{robots.txt,manifest.webmanifest,sitemap.xml,assets/{hero.svg,social-card.svg}}`, PR3 assertions in `tests/{metadata-regression.mjs,e2e/{accessible-shell,production,readiness,trust-shell}.spec.js}`, and PR3 checkbox/evidence rows in `openspec/changes/profesionalizar-sitio-produccion/{tasks,apply-progress}.md`; this removes metadata, local-resource, lazy-chunk, and evidence behavior while preserving PR1 routing and PR2 trust/shell behavior. |

## Phase 4 Release Proof — Attempt 1 / Initial Slice

**Work unit**: `phase-4-release-proof`; Standard Mode (`strict_tdd: false`).

### Completed Task

- [x] **4.1** Baseline commands completed successfully and exact results recorded below.
- [ ] **4.2** Release evidence remains blocked; no checkbox change is claimed until deployed, Lighthouse, and measured Web Vitals evidence are available.

### Baseline Evidence — Task 4.1

| Command | Exact result |
|---|---|
| `npm run test:ads` | Exit 0; `ads regression: 12/12 passed`. The command emitted the existing malformed-entry warning for one unapproved fixture and did not fail. |
| `npm run test:e2e` | Exit 0; Playwright Chromium `22 passed` in 34.8s. The web server emitted only the existing stale Browserslist data warning. |
| `npm run build` | Exit 0; Vite 5.4.21 transformed 1,426 modules and completed in 5.16s. `prebuild` completed successfully. |
| `git diff --check` | Initial task 4.1 run exited 0 with no whitespace errors; the final artifact recheck also exited 0. Git emitted only LF-to-CRLF warnings (initially `.atl/skill-registry.md` and generated public text files; finally `.atl/skill-registry.md`, `apply-progress.md`, and `tasks.md`). |

### Task 4.2 Evidence and Blockers

| Evidence | Exact result |
|---|---|
| Preview production check | `node scripts/production-check.mjs http://127.0.0.1:4174` — exit 0; `Production routing checks passed for http://127.0.0.1:4174`. It ran against the built `dist/` through `node scripts/production-preview.mjs 4174`; the preview process was terminated after the check. |
| Deployed production check | `PRODUCTION_URL_SET=false`; `node scripts/production-check.mjs` — exit 1 with `Error: Usage: node scripts/production-check.mjs <base-url>`. No approved deployed URL was available, so no external result is claimed. |
| Approval gate | `node scripts/generate-public-assets.mjs --check` — exit 1 with `Unapproved public-site configuration: canonicalOrigin, identity, copyright, legal`. Release evidence correctly fails closed because the required production approvals remain absent. |
| Lighthouse | `npx --no-install lhci autorun --config=lighthouserc.cjs` — exit 1; npm reported `npx canceled due to missing packages and no YES option: ["lhci@4.1.2"]`. No Lighthouse baseline or regression result is claimed. |
| Web Vitals capability/regression guard | `npm run test:metadata` — exit 0; `Metadata/resource regression passed: 15 routes, one origin, crawl assets, local resources, and baseline guard.` The suite proves missing measurements and worse score/LCP values fail closed, and Web Vitals registration is local-only. |
| Native Web Vitals fallback | `node --input-type=module -e "import { loadWebVitals } from './src/metrics/webVitals.js'; const seen = []; class Observer { static supportedEntryTypes = ['layout-shift', 'largest-contentful-paint', 'event']; constructor(callback) { this.callback = callback; } observe({ type }) { const entries = type === 'layout-shift' ? [{ value: 0.1, hadRecentInput: false }] : type === 'largest-contentful-paint' ? [{ startTime: 123 }] : [{ duration: 45 }]; this.callback({ getEntries: () => entries }); } } globalThis.PerformanceObserver = Observer; const registered = await loadWebVitals((metric) => seen.push(metric)); if (!registered || seen.map(({ name }) => name).join(',') !== 'CLS,LCP,INP') throw new Error('native Web Vitals fallback failed'); console.log('Native Web Vitals fallback passed: ' + seen.map(({ name }) => name).join(',') + '.');"` — exit 0; `Native Web Vitals fallback passed: CLS,LCP,INP.` This is a capability check, not a measured production baseline. |

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | Task 4.1 baseline: `npm run test:ads` exit 0 (12/12), `npm run test:e2e` exit 0 (22/22), `npm run build` exit 0 (1,426 modules), and `git diff --check` exit 0. Supporting `npm run test:metadata` also exited 0. |
| Runtime harness command/scenario and exact result | Local built-preview HTTP harness passed (`node scripts/production-check.mjs http://127.0.0.1:4174`, exit 0). Deployed runtime, Lighthouse, and measured Web Vitals runtime evidence are unavailable; therefore task 4.2 and final release proof remain incomplete. |
| Rollback boundary | Revert only the Phase 4 changes in `openspec/changes/profesionalizar-sitio-produccion/tasks.md` and this appended Phase 4 section in `apply-progress.md`. No application, test, deployment, or tooling source files were changed in this slice; PR3 behavior remains intact. |
| Review budget | 68 authored changed lines (58 additions + 8 deletions in `apply-progress.md`, 1 addition + 1 deletion in `tasks.md`); below the 400-line limit. `.atl/skill-registry.md` and `.atl/.skill-registry.cache.json` are excluded and untouched by this slice. |

### Deviations and Blockers

- No implementation deviation was introduced; the repository remains in Standard Mode as configured.
- Historical attempt-1 blocker: approved canonical origin, institutional/legal approvals, deployed URL, Lighthouse CLI, and measured production baseline were unavailable at that time.
- Synthetic/native Web Vitals checks are recorded as capability evidence only. They MUST NOT be promoted to a production baseline.

### Stable Evidence Revision

The final revision is a SHA-256 over a sorted path/blob manifest of the candidate Git tree, excluding this self-referential `apply-progress.md` and all `.atl` local tooling state. The manifest contains 123 paths and 8,739 UTF-8 bytes.

**Stable evidence revision**: `sha256:1509576fe55c789525d8b09631ff8ef2a53fd0e372ef11a5fb56388ee5b37860`.

## Phase 4 Release Proof — Corrective Rerun (Attempt 2 of 2)

**Work unit**: `phase-4-release-proof-corrective-rerun`; narrower successor scope authorized by the maintainer.

**Rescope revision**: `sha256:c27fa9b1879251121c9174893526ee5a246a9ebe33f1b0b4a72477185ee84bd8`.

### Approved Values Persisted

- `src/config/publicSite.js` now contains the approved HTTPS origin, `ASANDA` identity, approved 2026 copyright notice, empty social catalog, and only existing local same-origin assets (`/favicon.svg`, `/assets/hero.svg`, `/assets/social-card.svg`).
- `src/content/legalContent.js` now contains the exact approved Spanish legal and privacy text with explicit `approved: true` flags.
- Legal/privacy route metadata now uses substantive titles rather than unavailable-state titles.
- `public/robots.txt` and `public/sitemap.xml` were regenerated from the approved origin.

### Reproducible Evidence Tooling

- Added `npm run test:lighthouse`, pinned to `@lhci/cli@0.15.1` through `npx --yes`; `lighthouserc.cjs` now supports local preview or `LIGHTHOUSE_URL` without relying on a global executable.
- Added `npm run test:web-vitals` and `scripts/web-vitals-check.mjs`, a Playwright browser-lab check that records CLS/LCP and explicitly reports field-only INP as unavailable.
- Added `.lighthouseci` to `.gitignore`; Lighthouse reports and temporary baseline files were removed after evidence capture.
- `package-lock.json` was intentionally unchanged: adding `@lhci/cli` directly produced 5,208 lockfile changes and would violate the 400-line slice budget.

### Focused and Baseline Checks

| Command | Exact result |
|---|---|
| `npm run test:metadata` | Exit 0; `Metadata/resource regression passed: 15 routes, one origin, crawl assets, local resources, and baseline guard.` |
| `npm run test:ads` | Exit 0; `ads regression: 12/12 passed`. |
| `npm run test:e2e -- trust-shell` | Exit 0; 9/9 passed, including approved legal/privacy text and copyright rendering. |
| `npm run test:e2e` | Exit 0; 22/22 passed in 21.9s. |
| `npm run build` | Exit 0; Vite 5.4.21 transformed 1,426 modules and completed in 3.70s. |
| `git diff --check` | Final exit 0; no whitespace errors, with only expected LF-to-CRLF warnings on changed tracked files. |
| `node scripts/generate-public-assets.mjs --check` | Exit 0; approved configuration accepted with no output. |
| Approved release configuration harness | Exit 0; origin, identity, copyright, legal/privacy approval, empty social links, and local critical assets passed. |

### Runtime Evidence

| Evidence | Exact result |
|---|---|
| Local preview | `node scripts/production-check.mjs http://127.0.0.1:4174` — exit 0; `Production routing checks passed for http://127.0.0.1:4174`. |
| Approved deployed URL routing | `node scripts/production-check.mjs https://asanda-web.vercel.app` — exit 0; `Production routing checks passed for https://asanda-web.vercel.app`. |
| Deployed approved-content proof | Playwright browser proof — exit 1; `Deployed approval proof failed: /: approved home identity/metadata missing; /legal: approved legal content missing; /privacidad: approved privacy content missing`. The deployed URL still serves the previous build (`no disponible` titles, no canonical, and no approved text). |

### Lighthouse Baseline and Regression Evidence

- Local final `npm run test:lighthouse` — exit 1. `/resultados` performance score was `0.57` versus required `0.8`; LCP was `5332.17936 ms` and CLS `0.6780072904009721`.
- Deployed final PowerShell command `$env:LIGHTHOUSE_URL="https://asanda-web.vercel.app"; npm run test:lighthouse; $code=$LASTEXITCODE; Remove-Item Env:LIGHTHOUSE_URL; exit $code` — exit 1. `/resultados` performance score was `0.57`; LCP was `5295.502 ms` and CLS `0.6780072904009721`.
- The first deployed run supplied a measured lab baseline: worst performance `0.8`, accessibility `0.96`, FCP `1418.2055 ms`, LCP `4818.9865 ms`, CLS `0`, and TBT `115 ms`.
- `node scripts/performance-regression.mjs C:\Users\salbe\AppData\Local\Temp\opencode\asanda-lighthouse-current-final-attempt2.json C:\Users\salbe\AppData\Local\Temp\opencode\asanda-lighthouse-baseline-attempt2.json` — exit 1; performance `0.57 < 0.8`, FCP `1477.8530000000003 > 1418.2055`, LCP `5295.502 > 4818.9865`, CLS `0.6780072904009721 > 0`, and TBT `125 > 115`. Temporary JSON inputs were removed after capture.

### Web Vitals Evidence and Field INP Boundary

- `npm run test:web-vitals` — exit 0; final browser-lab sample reported `CLS: 0`, `LCP: 800`, and `unavailableFieldMetrics: ["INP"]`.
- Deployed browser-lab baseline/current comparison used `scripts/web-vitals-check.mjs`: baseline `CLS: 0`, `LCP: 10624`; current `CLS: 0`, `LCP: 856`; regression comparison exited 0.
- These are lab observations, not field data. Lighthouse's `interaction-to-next-paint-insight` had no numeric value, and this non-transmitting application has no approved field RUM source. INP therefore remains an explicit unmet requirement rather than a fabricated PASS.

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `npm run test:metadata` exit 0, `npm run test:ads` exit 0 (12/12), `npm run test:e2e` exit 0 (22/22), `npm run build` exit 0 (1,426 modules), and approval gate exit 0. |
| Runtime harness command/scenario and exact result | Local and deployed routing checks exit 0; deployed approved-content proof exits 1 because the URL serves a stale build. Final Lighthouse exits 1 from the measured performance regression. |
| Rollback boundary | Revert only attempt-2 changes in `.gitignore`, `lighthouserc.cjs`, `package.json`, `scripts/web-vitals-check.mjs`, approved config/content/metadata, generated crawl files, focused tests, and the attempt-2 evidence section. Preserve PR3 and the prior 68-line attempt-1 evidence. |
| Process cleanup | `.lighthouseci` removed, temporary JSON/log evidence removed, and final probes reported `PORT_4173_LISTENING=False`, `PORT_4174_LISTENING=False`. `.atl` state was excluded and untouched. |
| Review budget | 229 authored changed lines total, including the prior 68-line attempt-1 slice and the 30-line `scripts/web-vitals-check.mjs`; below the 400-line cap with no size exception. |

### Corrective Rerun Outcome

- Task 4.2 remains `[ ]`; it is not fully proven because deployed approved content is stale, final Lighthouse assertions/regression fail, and field INP is unavailable.
- No further corrective loop is permitted. The parent must not route to verify/archive until the deployed build and performance/field-evidence blockers are resolved.

The current revision is a SHA-256 over a sorted path/blob manifest of the candidate tree, including the intended `scripts/web-vitals-check.mjs`, excluding this self-referential file and all `.atl` state. The manifest contains 124 paths and 8,809 UTF-8 bytes.

**Current stable evidence revision**: `sha256:6b81a93f0ff38239b8cc6b4654022fe6718715054a065f5dd97ac73e4fb1a034`.

## Phase 4 Performance Remediation — Authorized Successor

**Work unit**: `phase-4-performance-remediation`; local-only objective. No deployed production or field-INP attempt was made.

### Measured Diagnosis

- The pre-remediation Lighthouse report identified the `/resultados` LCP element as the `ResultsHero` remote Unsplash background `<div>`. Its `lcp-phases` report showed `3,836.3788 ms` resource load duration, and the image transferred `438,253` bytes; Lighthouse also reported that the LCP request was not discoverable in the initial document.
- The pre-remediation report identified exactly one layout shift with score `0.6780072904009721`, attributed to `body > div#root > footer.bg-gray-900`. A browser `PerformanceObserver` reproduced the footer shift from the short lazy-route fallback position (`previousRect y=265, height=558`) while the resolved `/resultados` page placed it below the route content.
- The `unsized-images` audit found `/asanda.png`, but it was not the reported layout-shift source; no unrelated image refactor was introduced.

### Minimal Correction

- `ResultsHero` now uses the existing local `/assets/hero.svg` as an eager, high-priority `<img>` instead of a remote CSS background. This removes the remote critical image from the LCP path and makes the request discoverable.
- `AppShell` now owns the Suspense boundary around the route `<main>` and `Footer`; its fallback preserves one main landmark and does not render a footer at the short lazy-route height. `App.jsx` no longer owns a competing route-only Suspense boundary.
- Approved canonical, identity, copyright, legal/privacy text, social-empty policy, and local critical assets were not changed.

### Post-Correction Local Evidence

| Command | Exact result |
|---|---|
| `npm run test:metadata` | Exit 0; 15 routes and approved-origin regression checks passed. |
| `npm run test:ads` | Exit 0; 12/12 passed. |
| `npm run test:e2e` | Exit 0; 22/22 passed in 21.6s. |
| `npm run build` | Exit 0; Vite 5.4.21 transformed 1,426 modules and completed in 3.78s. |
| `node scripts/production-check.mjs http://127.0.0.1:4174` | Exit 0; local preview routing/resource checks passed. |
| `node scripts/web-vitals-check.mjs http://127.0.0.1:4174` | Exit 0; browser-lab `CLS: 0`, `LCP: 172`, `INP` explicitly unavailable. |
| `npm run test:lighthouse` | Exit 0. Error-level assertions passed: `/` performance `0.92`, `/resultados` performance `0.96`, and both CLS values `0`. Warning-level LCP budgets remain: `/` `3364.4995 ms`, `/resultados` `2759.22185 ms` versus `2500 ms`. |
| `node scripts/performance-regression.mjs <local-current> <local-pre-remediation-baseline>` | Exit 0; performance improved from `0.55` to `0.92`, LCP from `5383.11962 ms` to `3364.4995 ms`, and CLS from `0.6780072904009721` to `0`. Temporary inputs were removed. |
| `git diff --check` | Exit 0; only expected LF-to-CRLF warnings. |

### Lighthouse Reported Result

- `/resultados` post-correction report: performance `0.96`, accessibility `0.96`, LCP `2759.22185 ms`, CLS `0`, zero layout-shift entries. Its LCP element is the local hero heading rather than the remote background.
- The candidate is locally deployable and the prior performance/CLS regression is corrected. The remaining local blocker is the warning-level LCP budget (`<=2500 ms`), so no stronger performance claim is made.

### Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `npm run test:metadata` exit 0, `npm run test:ads` exit 0 (12/12), and `npm run test:e2e` exit 0 (22/22). |
| Runtime harness command/scenario and exact result | Local preview routing and browser Web Vitals checks exit 0; local Lighthouse error assertions exit 0 with the documented LCP warnings. No deployed or field evidence was attempted. |
| Rollback boundary | Revert only the remediation hunks in `src/App.jsx`, `src/components/layout/AppShell.jsx`, `src/components/ResultsHero.jsx`, and this remediation evidence section. Preserve approved content/configuration and the prior release-proof history. |
| Review budget | 317 authored changed lines total, including the prior 229-line final slice; 83 lines remain under the 400-line cap. |
| Cleanup | `.lighthouseci`, temporary evidence, preview logs, and preview processes were removed; final probes reported ports 4173 and 4174 not listening. `.atl` remained excluded. |

### Remediation Outcome

- Task 4.2 remains `[ ]`. This successor corrected the local performance and CLS regression but intentionally did not claim deployed production or field INP evidence.
- The remaining local warning is measured LCP above the configured `2500 ms` warning budget. Per the authorized no-loop instruction, stop here rather than tuning blindly.

The remediation revision is a SHA-256 over the sorted path/blob manifest of the candidate tree, including the intended `scripts/web-vitals-check.mjs`, excluding this self-referential file and all `.atl` state. The manifest contains 124 paths and 8,809 UTF-8 bytes.

**Current remediation evidence revision**: `sha256:cc8e3c7b25f907df876645368d4fc42529489f5574719c7827d7ad9b569cbffb`.
