# Apply Progress: Professionalize ASANDA for Production

## Structured Status

- Artifact store: OpenSpec (`openspec/changes/...`).
- Apply state: ready; PR3 is complete. Tasks 3.1–3.3 are proven and checked; Phase 4 remains pending.
- Assigned boundary: PR3 — metadata, canonical/JSON-LD, local resources, lazy routes, Web Vitals/Lighthouse evidence, and origin/font cleanup.
- Delivery: auto-chain with `feature-branch-chain`.
- Child branch: `feat/profesionalizar-sitio-produccion-04-metadata-resources`.
- Target branch: `feat/profesionalizar-sitio-produccion` (tracker).
- Testing mode: Standard (`strict_tdd: false`; no strict-TDD runner is configured).
- Native attempt/review: parent owns settlement; this executor ran no `sdd-attempt` operation and no native review. The previous RDD receipt remains invalidated by the PR2a correction.

## Cumulative Status

- Checked: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, and 3.3.
- Pending: 4.1–4.2.
- PR1 and PR2 history is retained below; no Phase 4 task is reported complete.

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

- Phase 4 release proof (4.1–4.2), substantive approved legal text, and final release evidence remain pending.

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
