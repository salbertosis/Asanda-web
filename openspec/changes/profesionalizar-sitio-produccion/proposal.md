# Proposal: Professionalize ASANDA for Production

## Intent

Resolve all verified audit findings while preserving ASANDA's responsive Spanish UI, dark mode, accessible ads, mobile navigation, and lazy images.

## Scope

### In Scope
- Make public routes load and reload directly; add approved `/legal` and `/privacidad` pages.
- Align canonical, route metadata, JSON-LD, social images, favicon, `robots.txt`, `sitemap.xml`, and manifest to one origin.
- Give every view one `<main>`, skip access, coherent headings, 44×44 px footer targets, and an accessible noindex demo shell.
- Replace or hide placeholder contact/social details; correct institutional identity and copyright year.
- Add defensive Vercel headers, local critical resources, route chunks, automated production checks, and Lighthouse/Web Vitals evidence.

### Out of Scope
- Backend, CMS, accounts, tracking, ad networks, unrelated redesign, or invented facts.
- SSR/prerendering unless measurements justify it.

## Capabilities

### New Capabilities
- `production-site-readiness`: reliable routing, legal identity, metadata/crawl assets, accessible structure, defensive delivery, resilient resources, and measured performance.

### Modified Capabilities
- None; `openspec/specs/` has no baseline capabilities.

## Approach

Deliver reversible slices: restore routing/trust; centralize origin/metadata; add accessible framing; then harden headers, localize assets, lazy-load routes, and measure production. Start CSP in Report-Only when inventory needs tuning.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `vercel.json`, `public/`, `index.html` | New/Modified | Rewrites, headers, crawl/brand assets |
| `src/App.jsx`, pages, layout/SEO | Modified | Routes, chunks, landmarks, metadata, demo shell |
| `src/components/Footer.jsx`, assets | Modified | Identity, targets, headings, local resources |
| `tests/e2e/`, scripts/config | Modified | Routing, metadata, accessibility, headers, performance |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Rewrite masks assets | Medium | Asset-first rules and endpoint tests |
| CSP/assets break rendering | Medium | Inventory, Report-Only, visual/E2E checks |
| Unapproved facts ship | High | Require approval; hide unknown channels |

## Rollback Plan

Revert deployment, metadata/layout, and asset/performance slices independently. Preserve verified routing; relax CSP to Report-Only without removing other headers.

## Dependencies

- Approved legal text, canonical origin, contact/social channels, and brand assets.

## Success Criteria

- [ ] Public routes/reloads return the SPA; no visible link is broken and legal pages are substantive.
- [ ] Favicon, manifest, robots, sitemap, canonical, route and structured/social metadata return 200 from one origin.
- [ ] Every view has one main landmark, skip access, coherent headings, and adequate targets.
- [ ] No placeholder facts remain; demo content stays disclosed, accessible, and noindex.
- [ ] Automation proves defensive headers, local critical resources, route chunks, and Lighthouse/Web Vitals baselines without regressing preserved strengths.
