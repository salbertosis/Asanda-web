# Tasks: Professionalize ASANDA for Production

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Likely PR | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| Delivery/routing | PR 1 | `npm run test:e2e -- readiness` | preview deep reload + assets | `vercel.json`, routing/check scripts |
| Trust shell | PR 2 | `npm run test:e2e -- readiness` | keyboard/legal/footer checks | shell, content, config, metadata |
| Resources/evidence | PR 3 | `npm run test:e2e -- production` | preview HTTP + Lighthouse | assets, chunks, headers, metrics |

## Phase 1: Delivery and routing (PR 1)

- [x] 1.1 RED: add `tests/e2e/{readiness,production}.spec.js` coverage for direct/reload public routes and every Applicable routing-matrix case: dotted/missing asset stays 404/non-HTML; robots, sitemap, manifest, favicon, and hashed chunk resolve independently.
- [x] 1.2 GREEN: add filesystem-first SPA fallback and defensive Report-Only headers in `vercel.json`; implement `scripts/production-check.mjs` HTTP/content-type checks for those scenarios.
- [x] 1.3 REFACTOR: consolidate routing fixtures/selectors without changing preserved ads, dark mode, mobile menu, responsive layout, or lazy-image coverage.

## Phase 2: Approved identity and accessible shell (PR 2)

- [x] 2.1 RED: test `publicSite`/content rejection or hiding of non-HTTPS, cross-origin, placeholder, or unapproved identity/legal/social/copyright values; test approved fixture rendering.
- [x] 2.2 GREEN: approval-filtered config/content, safe `RouteHead`, and Spanish unavailable `Legal`/`Privacy` pages landed in PR2a; `AppShell`, `SkipLink`, and shell integration landed in PR2b.
- [x] 2.3 RED: cover every view's single `main`/H1, skip focus, 44px footer targets, legal-link integrity, and accessible demo disclosure/noindex.
- [x] 2.4 GREEN: refactor `src/App.jsx`, `src/main.jsx`, `src/components/{Footer,HeaderModern}.jsx`, and listed route pages to the shell while preserving ads, dark mode, menu, responsive layout, and lazy images.
- [x] 2.5 REFACTOR: centralize headings and approval filtering; render substantive legal routes only from approved text.

## Phase 3: Metadata, resources, and evidence (PR 3)

- [ ] 3.1 RED: test route-manifest completeness, one-origin metadata/JSON-LD/social URLs, demo query/path noindex, crawl generation, local critical resources, independent chunks, and baseline-regression reporting.
- [ ] 3.2 GREEN: add `src/seo/routeMetadata.js`, `scripts/generate-public-assets.mjs`, `public/{robots.txt,sitemap.xml,manifest.webmanifest,assets/*}`, lazy routes, `src/metrics/webVitals.js`, `lighthouserc.cjs`, and build hooks; remote editorial images stay approved and lazy.
- [ ] 3.3 REFACTOR: remove unused Google Fonts and centralize origin validation; keep CSP Report-Only until clean preview inventory.

## Phase 4: Release proof

- [ ] 4.1 Run `npm run test:ads`, `npm run test:e2e`, `npm run build`, and `git diff --check`; record exact results.
- [ ] 4.2 Run preview/deployed `scripts/production-check.mjs`, Lighthouse, and Web Vitals baseline/regression checks; fail release closed for missing approvals or regression.
