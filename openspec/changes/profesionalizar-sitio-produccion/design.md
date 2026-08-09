# Design: Professionalize ASANDA for Production

## Technical Approach

Refactor around one accessible shell, validated site configuration, and lazy routes. Generate crawl assets from that configuration, serve them before the SPA fallback, and verify browser and deployed HTTP behavior. Approval-dependent values remain unpublished; fixtures unblock technical work, while production evidence fails closed until approval.

## Architecture Decisions

| # | Choice | Alternatives / rationale |
|---|---|---|
| D1 | `src/config/publicSite.js` is the sole canonical-origin and approved-identity source; `scripts/generate-public-assets.mjs` validates it and creates crawl files before build. | Prevents URL drift. Missing approval is allowed in development but fails production evidence. |
| D2 | `vercel.json` uses filesystem-first routing, then `/index.html`; crawl/assets are tested as non-HTML. | A blind catch-all masks missing assets. Add nosniff, strict referrer, restrictive permissions and framing denial. CSP starts `Content-Security-Policy-Report-Only` with observed sources; enforce only after clean deployed inventory. |
| D3 | `AppShell` owns skip link, `Header`, one focusable `<main id="main-content">`, `Footer`, and metadata. Pages return content only. | Prevents landmark drift while preserving menu, dark mode, ads, and lazy images. |
| D4 | `React.lazy`/`Suspense` splits public routes; `RouteHead` owns title, description, canonical, Open Graph, robots, and JSON-LD from a registry. | Deterministic DOM updates need neither a heavy SEO dependency nor SSR before measurement. |
| D5 | `/legal` and `/privacidad` read approval-stamped Spanish content from `src/content/legalContent.js`. | Never infer legal claims. Unapproved sections/links stay hidden; fixtures prove approved behavior, while release waits for substantive approved text. |
| D6 | Footer identity and copyright notice pass through approval selectors; the year is computed only inside an approved notice. Empty fields render nothing; controls are at least 44×44 px. | Hiding beats publishing placeholders. |
| D7 | Remove unused Google Fonts; self-host hero, logo/favicon, and social preview under `public/assets/`. Keep approved editorial images remote and lazy pending ownership/measurements. | Removes critical third-party dependency without presenting generic photos as institutional. |
| D8 | Strict TDD: applicable cases run RED, GREEN, refactor. Deployed-preview checks plus opt-in, non-transmitting `web-vitals` and Lighthouse establish the baseline before budgets. | Build size is not performance evidence. |

## Component Hierarchy and Data Flow

```text
BrowserRouter -> App -> AppShell -> SkipLink + Header + main(Route) + Footer
publicSite + routeRegistry -> RouteHead -> document.head / JSON-LD
publicSite -> generator -> robots.txt + sitemap.xml + manifest.webmanifest
approved identity/legal/copyright content -> selectors -> Footer / LegalPage / PrivacyPage
```

## File Changes

| Files | Action | Purpose |
|---|---|---|
| `vercel.json`, `src/config/publicSite.js`, `src/seo/routeMetadata.js`, `src/components/layout/{AppShell,RouteHead,SkipLink}.jsx`, `src/content/legalContent.js`, `src/metrics/webVitals.js`, `src/pages/{Home,Legal,Privacy}Page.jsx`, `scripts/{generate-public-assets,production-check}.mjs`, `tests/e2e/{readiness,production}.spec.js`, `lighthouserc.cjs`, `public/{robots.txt,sitemap.xml,manifest.webmanifest}`, `public/assets/{hero.webp,favicon.svg,social-card.webp}` | Create (22) | Delivery, shell, content, resources, evidence. |
| `src/App.jsx`, `src/main.jsx`, `src/components/{Footer,HeaderModern,HeroBackground}.jsx`, `src/pages/{Album,AtletasAsociados,AtletasFederados,Atletas,Calendario,Clubes,Fotos,Noticias,PublicidadDemo,RecordEstadal,Resultados,Videos}Page.jsx`, `index.html`, `src/index.css`, `package.json`, `package-lock.json`, `playwright.config.js`, `vite.config.js` | Modify (23) | Lazy routes, framing, identity/resources, scripts, tests. |
| `public/asanda.png` | Replace/move (1) | Versioned critical brand asset set; generated crawl files are build outputs. |

## Interfaces / Contracts

`publicSite = { canonicalOrigin, identity: { value, approved }, copyright: { notice, approved }, social: [...], legal: { legalApproved, privacyApproved } }`. Validators reject non-HTTPS origins, cross-origin canonical/crawl/critical assets, placeholders, and visible unapproved values; approved remote editorial images remain valid. `RouteHead` uses only `canonicalOrigin + pathname`; demo pathname/query variants force `noindex,nofollow`.

## Testing Strategy

| Layer | RED coverage |
|---|---|
| Node | Config approval/placeholder rejection, crawl generation, identity/copyright filtering, route manifest completeness. |
| Playwright | Direct load/reload, visible links, one main/H1, skip focus, 44 px targets, route metadata/JSON-LD, demo noindex/disclosure, mobile menu, dark mode, ads and lazy images. |
| Production | HTTP status/content-type, headers/CSP report-only, asset independence, route chunks, Lighthouse and Web Vitals baseline/regression report. |

## Threat Matrix

| Boundary | Applicability | Safe / failure behavior | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A: no executable classification | Files are never executed | None |
| Git repository selection | N/A: no Git automation | Repository selection unchanged | None |
| Commit state | N/A: no commit automation | Index semantics unchanged | None |
| Push state | N/A: no push automation | Ref resolution unchanged | None |
| PR commands | N/A: no PR automation | Command ownership unchanged | None |
| Browser request routing | Applicable | Existing file/crawl endpoint wins; known SPA route returns HTML; missing asset remains 404, never HTML | RED tests for deep reload, dotted/missing asset, robots, sitemap, manifest, favicon, and hashed chunk |

## Migration / Rollout

Ship reversible slices: shell/routing; approved content/config; metadata/assets; Report-Only headers; performance evidence. Enforce CSP only after clean preview evidence. Production waits for origin, legal/privacy, identity, and brand approvals; implementation does not.

## Open Questions

- [ ] Which canonical origin, legal/privacy texts, institutional fields, and brand files are formally approved?
- [ ] What measured Lighthouse/Web Vitals deltas will become budgets after the first baseline?
