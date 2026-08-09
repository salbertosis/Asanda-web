# Apply Progress: Professionalize ASANDA for Production

## Cumulative Status

- Completed: 1.1, 1.2, 1.3
- Remaining: 2.1–2.5, 3.1–3.3, 4.1–4.2
- Previous apply progress: none
- PR slice: 1 — Delivery and routing

## Completed Tasks

- [x] **1.1** Added direct-load/reload Playwright coverage for public routes, independent crawl resources, and a missing dotted asset. `production.spec.js` also asserts the Vercel filesystem-first declaration.
- [x] **1.2** Added Vercel Report-Only defensive headers, minimal independent crawl resources, and HTTP/content-type verification plus a built-file runtime preview harness.
- [x] **1.3** Consolidated the missing-static-asset development guard and preserved routing assertions without changing advertising behavior, dark mode, mobile navigation, responsive layout, or lazy-image coverage.

## TDD Cycle Evidence

| Task | RED (test first) | GREEN | REFACTOR |
|---|---|---|---|
| 1.1 | `npm run test:e2e -- readiness` failed: public rendering exposed the existing blank `/atletas` route and `/robots.txt` was served as HTML. | Same focused command passed: 2/2. | Shared route/resource fixtures and independent-resource assertion keep cases concise. |
| 1.2 | The initial readiness run failed 2/2 before `vercel.json` and crawl resources existed; `/robots.txt` returned the SPA document. | `npm run test:e2e -- production` passed 1/1; production preview check passed. | Kept deployment assertion in its own focused spec and HTTP checks in a dependency-free script. |
| 1.3 | N/A — behavior-preserving refactor; existing focused coverage was green before and after the extraction. | `npm run test:e2e -- readiness` passed 2/2 after refactor. | One Vite middleware function guards missing `/assets/` requests during local routing tests. |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `npm run test:e2e -- readiness` — passed, 2/2. |
| Deployment declaration test | `npm run test:e2e -- production` — passed, 1/1. |
| Advertising regression | `npm run test:ads` — passed, 12/12; `npm run test:e2e -- ads` — passed, 4/4. |
| Build | `npm run build` — passed; 1,416 modules transformed. |
| Runtime harness | `node scripts/production-preview.mjs 4174` + `node scripts/production-check.mjs http://127.0.0.1:4174` — passed; direct routes returned HTML 200, crawl resources and hashed assets returned non-HTML 200, and the missing dotted asset returned non-HTML 404. |
| Cleanup | Preview was stopped: `PREVIEW_STOPPED=True`, `PORT_4174_LISTENERS=0`. |
| Diff check | `git diff --check` — passed. |

## Implementation Notes

- `vercel.json` uses a filesystem handler before a dotted-path 404 rule and SPA fallback. Headers remain Report-Only for CSP as designed.
- Minimal `robots.txt`, `sitemap.xml`, manifest, and SVG favicon deliberately avoid canonical-origin or metadata work reserved for later tasks.
- The direct `/atletas` check revealed three records with no `tiempo`; those known records are normalized to the explicit unavailable value `N/D`, without inventing a result.

## Scope and Rollback

- **Rollback boundary:** revert `vercel.json`, the four independent public resources, routing tests/scripts, Vite local test guard, and the targeted athlete-data privacy/availability normalizations (one removed `cedula`, three `N/D` values, and three local-photo fallbacks). This leaves later identity, legal, metadata, shell, asset, and performance work intact.
- **Deviation:** none from the PR 1 design. Commit-hook corrections restore `AtletasPage.jsx` to tracker content and normalize only the identified unavailable/private athlete data needed to keep direct-route coverage and public privacy safety within this slice.
- **Authored change count:** 253 additions plus deletions (245 additions, 8 deletions), below the 400-line PR slice limit.

## PR Boundary

- Strategy: feature-branch-chain
- Child branch: `codex/profesionalizar-sitio-produccion-01-routing`
- Target branch: `codex/profesionalizar-sitio-produccion`
- This slice does not commit, push, or create a pull request.

## Commit-Hook Correction

- The first GGA commit attempt reported pre-existing file-wide concerns in `AtletasPage.jsx` (semantics, labels, motion, theme, contrast, category/duration parsing, and remote imagery).
- This correction does not expand PR 1 for those concerns; it restores the page file and moves only the candidate-causal missing-time normalization into static data.
- The second GGA commit attempt found one public `cedula` field and three CCE photo filenames with plausible personal identifiers in the touched static-data file. The field is removed and only those three photo values now use the existing neutral `/asanda.png` asset; broader identity work remains out of scope.
- Privacy-correction verification: `npm run test:e2e -- readiness` passed 2/2; `npm run test:ads` passed 12/12; `npm run test:e2e -- production` passed 1/1; `npm run build`, `git diff --check HEAD`, and the built-file production preview/check passed with port 4174 cleaned up.
