# Apply Progress: Professionalize ASANDA for Production

## Structured Status

- Artifact store: OpenSpec (`openspec/changes/...`).
- Apply state: ready; PR2a is complete, but task 2.2 remains partial and unchecked.
- Assigned boundary: PR2a — safe trust validators, unavailable legal/privacy routes, approval-filtered footer, and focused tests.
- Correction: two maintainer-authorized Codex hook fixes applied in place — canonical-origin normalization in `src/config/publicSite.js` with focused coverage, and footer section headings `<h4>` → `<h2>` in `src/components/Footer.jsx` without class changes.
- Delivery: auto-chain with `feature-branch-chain`.
- Child branch: `codex/profesionalizar-sitio-produccion-02-trust-shell`.
- Target branch: `codex/profesionalizar-sitio-produccion`.
- Testing mode: Standard (`strict_tdd: false`; no strict-TDD runner is configured).
- Native attempt/review: parent owns settlement; this executor ran no `sdd-attempt` operation and no native review. The previous RDD receipt remains invalidated by this correction.

## Cumulative Status

- Checked: 1.1, 1.2, 1.3, and 2.1.
- Partial and unchecked: 2.2 (PR2a delivered the trust/content subset only).
- Pending: the remainder of 2.2, 2.3–2.5, 3.1–3.3, and 4.1–4.2.
- PR1 history is retained below; no task after 2.1 is reported complete.

## Completed Tasks

- [x] **1.1–1.3** PR1 routing, independent crawl resources, defensive headers, and regression coverage remain complete.
- [x] **2.1** Added focused approval, placeholder, URL, malformed-config, and legal-content validation coverage.
- [ ] **2.2 (partial)** Added the validated public-site/content modules, safe `RouteHead`, unavailable Spanish legal/privacy pages, and approval-filtered footer. `AppShell` and `SkipLink` were removed from this candidate; shell integration belongs to PR2b.

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
| 2.2 | Partial only: the focused suite renders unavailable `/legal` and `/privacidad`, confirms semantic mains and hidden unapproved footer values, and verifies `RouteHead` restoration. Shell primitives and integration are deferred. |

## Codex Hook Fix Evidence

Maintainer-authorized corrections applied to the PR2a candidate; no task checkbox changed.

| Fix | Evidence |
|---|---|
| Canonical-origin normalization | `validatePublicSite` now normalizes an accepted canonical origin through `normalizeCanonicalOrigin` (`URL.origin`), so `https://asanda.org.ve` and `https://asanda.org.ve/` compare identically for same-origin critical assets. Fail-closed checks (HTTPS-only, no credentials, no path/query/hash, placeholder rejection) are unchanged; unaccepted origins still normalize to `null`. |
| Focused coverage | New `trust-shell` test proves a trailing-slash canonical origin yields zero issues, normalizes to the slashless origin, and preserves all valid same-origin `criticalAssets`. |
| Footer heading semantics | The three footer section headings (`Deportes`, `Enlaces`, `PATROCINADORES GLOBALES`) changed from `<h4>` to `<h2>` with identical Tailwind classes — no visual regression. |

## Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm run test:e2e -- trust-shell` — passed, 8/8. |
| Runtime harness command/scenario | The same Playwright command passed 8/8 through Vite, including approved-config injection and footer rendering, both unavailable routes, and client-side `RouteHead` title/robots cleanup. |
| Relevant regression suites | `npm run test:e2e -- readiness` — 2/2; `npm run test:e2e -- production` — 1/1; `npm run test:e2e -- ads` — 4/4; `npm run test:ads` — 12/12. |
| Build | `npm run build` — passed; 1,421 modules transformed. |
| Production preview/check | `$preview = Start-Process -FilePath node -ArgumentList @('scripts/production-preview.mjs','4174') -PassThru; node scripts/production-check.mjs http://127.0.0.1:4174` — passed (`CHECK_EXIT=0`); direct routes and independent resources verified. |
| Diff and cleanup | `git diff --check HEAD` — passed; `PREVIEW_STOPPED=True`; `PORT_4174_LISTENERS=0`. |
| Complete authored line count | 359 additions/deletions vs `HEAD` (`56eebc0`) including this evidence update; `.gga` excluded; under 400. |
| Rollback boundary | Revert `src/config/publicSite.js`, `src/content/legalContent.js`, `src/components/layout/RouteHead.jsx`, `src/pages/{Legal,Privacy}Page.jsx`, the legal/privacy routes in `src/App.jsx`, approval filtering and `<h2>` headings in `src/components/Footer.jsx`, `tests/e2e/trust-shell.spec.js`, and these OpenSpec updates. PR1 routing remains intact. |

## PR2a Files

- Added: `src/components/layout/RouteHead.jsx`, `src/config/publicSite.js`, `src/content/legalContent.js`, `src/pages/LegalPage.jsx`, `src/pages/PrivacyPage.jsx`, `tests/e2e/trust-shell.spec.js`.
- Modified: `src/App.jsx`, `src/components/Footer.jsx`, `openspec/changes/profesionalizar-sitio-produccion/tasks.md`, and this progress file.
- Deleted from candidate and absent from the final worktree/index: `src/components/layout/AppShell.jsx`, `src/components/layout/SkipLink.jsx`.

## Deferred Boundary

- PR2b owns `src/components/layout/AppShell.jsx`, `src/components/layout/SkipLink.jsx`, shell integration in `src/App.jsx`, and migration of the remaining views.
- 2.3 remains pending: no completion proof is recorded for every-view main/H1 structure, skip focus, 44px footer targets, legal-link integrity, or demo disclosure/noindex.
- 2.4–2.5, phases 3–4, substantive approved legal text, and final release evidence remain pending.

## PR Boundary

- Strategy: auto-chain, `feature-branch-chain`.
- Starts from: PR1 routing state at `56eebc0` plus the prior uncommitted trust-foundation candidate.
- Ends with: an autonomous under-400-line PR2a trust/content slice without shell primitives or shell integration.
- Out of scope: PR2b shell work, 2.3+, commit/staging, push, PR creation, native review, and native attempt settlement.
