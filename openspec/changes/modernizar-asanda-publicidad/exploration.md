# Exploration: modernizar-asanda-publicidad

> Phase: `sdd-explore` only. No proposal, no specs, no design, no tasks, no product code yet.
> Artifact store: `openspec`. Change root: `openspec/changes/modernizar-asanda-publicidad/`.

## Topic

Modernize the ASANDA Web portal and ship a test-only advertising model (direct sponsorships and competition sponsorships) so the visual direction can be reviewed against realistic professional formats. Programmatic ad networks (AdSense, header bidding) are explicitly out of the first scope; an abstraction layer must allow them to be added later without rewriting the placements.

## Current State

### Stack and architecture

- SPA: React 18 + Vite 5 + JavaScript JSX (no TypeScript).
- Styling: Tailwind CSS 3 (utility-first, `darkMode: 'class'`), `Inter` from Google Fonts, custom `dark` palette in `tailwind.config.js`.
- Routing: `react-router-dom` v6 with `BrowserRouter` (no `HashRouter`; Tauri compatibility is not a stated concern here).
- Icons: `lucide-react` only.
- Data: 100% static modules in `src/data/*.js` (`atletas.js`, `noticias.js`, `resultados.js`, `resultados2025.js`, `resultados2026.js`, `calendario.js`, `calendario2025.js`, `calendario2026.js`, `clubes.js`, `albumes.js`, `videos.js`). Largest fixture is `atletas.js` (~16 KB, 555 lines).
- Media: `src/config/cloudinary.js` defines `getCloudinaryUrl` / `getAtletaFotoUrl`, but `cloudName` is the placeholder `'tu-cloud-name'`. In practice most images are hardcoded Unsplash URLs.
- SEO: `index.html` already has `Schema.org` `SportsOrganization`, Open Graph, Twitter cards, viewport, and preconnect to Google Fonts. Good baseline.
- No testing framework, no linter, no formatter, no type-checker (`openspec/config.yaml` `strict_tdd: false`).
- Dark mode: `useDarkMode` hook exists and persists to `localStorage`, but `DarkModeToggle` does not appear to be mounted in `App.jsx`. Worth confirming during design but out of scope for this change.

### Home composition (what exists today)

From `src/App.jsx` (`HomePage` function):

1. `<Header />` — sticky, with `Deportes`, `Lo Último` dropdowns and primary nav (Calendario, Resultados, Atletas, Récord Estadal).
2. Hero section: `<HeroBackground useVideo={false} />` (parallax image, respects `prefers-reduced-motion`), `<HeroStats />` (counter cards, also respects reduced motion), `<HeroSponsor />` at the bottom-left.
3. `<NewsSection />` — 3 latest news cards from `getUltimasNoticias(3)`.
4. `<BannerAd />` — first banner placeholder, 728x90.
5. `<AthletesSection />` — top 6 athletes, opens `<AthleteModal />`.
6. `<BannerAd />` — second banner placeholder.
7. `<VideoSection />` and `<PhotoGallery />`.
8. `<Footer />` — with a hardcoded "PATROCINADORES GLOBALES" block of four generic boxes.
9. `<AthleteModal />` mounted at the end.

Routes: `/`, `/noticias`, `/videos`, `/fotos`, `/fotos/album/:id`, `/calendario`, `/resultados`, `/atletas`, `/atletas-asociados`, `/atletas-federados`, `/clubes`, `/record-estadal`. None of the inner pages include any ad component today.

### Existing ad-related components (very thin)

| Component | Bytes | What it does | What it does not do |
|---|---|---|---|
| `BannerAd.jsx` | 709 | Dashed-border gradient box, text "ESPACIO PUBLICITARIO / Banner Principal - 728x90 / Patrocinador Principal". Fixed size, no props. | No data, no creative, no label semantics, no CLS reservation, no label color contrast, no `role`. |
| `SidebarAd.jsx` | 652 | Same language as BannerAd, 300x600, "Sidebar Ad". | Imported in `App.jsx` but **never used** in `HomePage`. Dead code. |
| `HeroSponsor.jsx` | 2941 | IntersectionObserver-driven slide-in, glass-morphism card, "Patrocinador Principal" caption, **hardcoded "Speedo" branding** with Unsplash image and a `SP` circle fallback. | Hardcoded brand, no props, no click target, no `rel="sponsored"`, no test/fake disclaimer. |
| Footer sponsors block | 92 | "PATROCINADORES GLOBALES" — 4 generic `bg-white/10` boxes with text "Patrocinador 1..4". | Not data-driven, not accessible, no logos. |

### Performance and accessibility baseline

- `index.css` already defines a global `prefers-reduced-motion: reduce` rule that nulls animations and smooth-scroll.
- `HeroBackground` and `HeroStats` both branch on `prefers-reduced-motion`.
- `AlbumPage` uses `loading="lazy"` on gallery images.
- However: news cards, athlete cards, and the hero background are all rendered without explicit `width`/`height` or `aspect-ratio` on `<img>` tags, which will hurt CLS once we add more content blocks. Cloudinary helper supports `width`, `height`, `quality`, `format` but is not used in the existing image sources.
- Hero parallax uses `will-change-transform` correctly.
- Bundle is tiny (only 4 runtime dependencies), so adding advertising logic is not a bundle-size risk.

### What the previous audit and recommendations already established (memory)

- Direction: "Autoridad acuática regional" — institutional, editorial, anchored in Anzoátegui. No gradient overload, no generic SaaS look. Not a visual copy of World Aquatics.
- Recommended model: hybrid advertising centered on direct sponsorships and competition sponsorships first, with AdSense/programmatic as a future complement behind an abstraction.
- Recommended future step (separate change): relational DB once content becomes editable. For this change, fixtures stay local.
- All current data is test/demo data.

## Affected Areas

Primary touch points (read-mostly for this phase; the real edits will happen in `sdd-propose` and beyond):

- `src/components/BannerAd.jsx` — replace placeholder with data-driven component; reserve CLS space.
- `src/components/SidebarAd.jsx` — either rewire into a real placement (e.g. competition page sidebar) or delete as dead code.
- `src/components/HeroSponsor.jsx` — remove hardcoded "Speedo" branding, accept sponsor data, add `Presentado por` label and `rel="sponsored"` semantics.
- `src/components/Footer.jsx` — turn the static "PATROCINADORES GLOBALES" block into a data-driven partners grid.
- `src/App.jsx` — the two `BannerAd` instances on the home page are the primary in-page placements; placements in other pages will need to be added at the layout level.
- `src/components/HeroBackground.jsx` — keep as is; ensure the hero still owns the LCP and the new `HeroSponsor` does not steal it.
- `src/components/NewsSection.jsx` and any news/result/calendar feed — candidates for an in-feed sponsored card insertion point.
- `src/components/CompetitionsCalendar.jsx` and `src/pages/CalendarioPage.jsx` — natural home for "Patrocinador de la competencia" badges.
- `src/components/AthletesSection.jsx` — possible "Atleta patrocinado por" disclosure row inside the modal.
- `src/data/*.js` — new fixture files for sponsors and campaigns: `src/data/sponsors.js`, `src/data/campaigns.js`, `src/data/adPlacements.js`. No changes to existing data.
- `tailwind.config.js` — possibly extend `theme.extend` with named tokens for "Publicidad" pills, sponsor tier colors (oro / plata / bronce), and `aspect-ratio` utilities for ad slots.
- `openspec/config.yaml` — the `apply` rules should be updated to mention "all advertising UI strings stay in Spanish and use neutral demo data" if not already covered.

## Approaches

### Approach A — Fixtures-only with a thin abstraction layer

Model sponsors, placements, campaigns, and creatives as plain JS modules under `src/data/`. A small `useAdPlacement(placementId)` hook reads a fixture, applies date and priority logic, and returns the resolved creative. Each placement is a dedicated React component (`<HeroSponsorSlot/>`, `<LeaderboardSlot/>`, `<SidebarSlot/>`, `<InFeedSlot/>`, `<PartnerGridSlot/>`, `<CompetitionSponsorBadge/>`) that:

- Declares an aspect-ratio / fixed height to reserve CLS space.
- Renders a visible label: `Publicidad`, `Contenido patrocinado` or `Presentado por`.
- Wraps the link in `rel="sponsored noopener noreferrer"`.
- Has a `role="complementary"` and a descriptive `aria-label`.
- Respects `prefers-reduced-motion` (no slide-in if reduced).
- Falls back to a clearly labeled "Espacio disponible" tile when no creative matches.

A `src/services/ads.js` module exposes a single async `resolveAd(placementId, context)` function. Internally it returns fixtures now, but the signature is compatible with a future fetch.

- **Pros**: Zero new runtime dependencies, fits a JSX-only project, no build pipeline changes, fully reversible by deleting the new files, easy to evolve to a real API by swapping the implementation of `resolveAd` only.
- **Cons**: No live preview of rotation, all "testing" of campaign lifecycle must happen by editing fixtures, easy to ship "real-looking" creatives that look like a real production site (need a visible `[DEMO]` watermark rule).
- **Effort**: Low.

### Approach B — Fixtures + localStorage-driven rotation

Same as A, but `resolveAd` persists impressions in `localStorage` so creatives rotate per user across visits and a tiny "last shown" cap is enforced. A `src/services/ads.js` module owns the rotation state and a `useAdRotation(placementId)` hook. No analytics backend, no network calls.

- **Pros**: Lets reviewers see different sponsors across page loads (closer to a real production impression), demonstrates frequency-cap behavior the spec will eventually need.
- **Cons**: Adds invisible state and a new localStorage key, requires a small unit of tests if we ever add them, and a rotation policy is product design work that does not exist today.
- **Effort**: Low/Medium.

### Approach C — Fixtures + JSON catalog at build time

Replace JS modules with a JSON catalog (e.g. `src/data/catalog/sponsors.json`) consumed via a generated `src/data/catalog.generated.js`. Components import the generated module. The catalog is easy to diff, easier to hand to a non-engineer, and trivial to swap for a real fetch later.

- **Pros**: Editor-friendly, makes the "this is a fake ad model" visible at the catalog level, easier to align with a future CMS.
- **Cons**: A new build step (even if a one-line `node scripts/build-catalog.mjs`) increases project complexity, and a JSX-only Vite project can already import JSON directly. Slight risk of being misread as a real production data layer.
- **Effort**: Medium.

## Recommendation

**Approach A — Fixtures-only with a thin abstraction layer.**

Reasons:

1. The project's current shape (static JS fixtures, no backend, no build-time data pipeline) does not justify a build-time catalog.
2. The user's mandate is "publicidad ficticia de ejemplo/prueba para visualizar formatos profesionales". What matters is that the formats are visible and editable; rotation state is not.
3. A single `resolveAd(placementId, context)` function is the only seam needed to graduate to an API later. Keeping that contract narrow protects the rest of the codebase.
4. The biggest real risk is the HeroSponsor hardcoded "Speedo" image; Approach A removes that with a one-prop edit while also giving every other placement a real, reviewable component.
5. Lowest review budget pressure. Approach A fits the chained-PR strategy with a single first PR: "data model + slots, no copy edits elsewhere".

A and B are not mutually exclusive. If a reviewer asks for "show me what a rotation looks like", Approach A can grow into B in a follow-up without changing component contracts. Approach C adds tooling for a benefit the product does not yet have.

## Risks

- **Brand impersonation**: the current `HeroSponsor` hardcodes "Speedo". Any modernization must replace that with clearly demo-only sponsor names (e.g. "Patrocinador Demo A") and a visible "DEMO" or "Ejemplo" affordance, otherwise the change could be misread as a real sponsorship announcement.
- **CLS regression**: adding ad slots without reserved height will tank the Lighthouse score the user already cares about (audit previously flagged performance/UX debt). Every slot must declare an aspect-ratio or a fixed min-height.
- **A11y regressions**: if a slot is wrapped in a `<div>` with no role, screen readers will read "link" with no context. Each slot must carry `role="complementary"` and a Spanish `aria-label` like "Publicidad: Patrocinador X".
- **Density creep**: World-Aquatics-style pages quickly become ad-heavy. We need a hard cap (e.g. max 2 in-page ad placements per above-the-fold view) defined in the spec, not the design.
- **Dark mode inconsistency**: the existing ad placeholders ignore dark mode. New slots must use Tailwind `dark:` variants or a shared token, otherwise they will look broken at night.
- **Scope creep into a real ad server**: AdSense / GAM / Prebid are easy to add later but should not be in this PR. The abstraction layer exists to keep that door closed, not ajar.
- **Inferred outdated context from previous audits**: prior memos mention the user wants the design to feel like World Aquatics, **not a visual copy**. Any new layout must be checked against that constraint; we are shipping formats, not a clone.
- **i18n / copywriting drift**: ad-related strings live in three categories (`Publicidad`, `Contenido patrocinado`, `Presentado por`). If the proposal introduces English or marketing-speak (`Sponsored`, `Ad`, `Partner`) the user has already rejected that.

## Open Product Questions (must be answered before `sdd-propose`)

These are the 3–5 questions the orchestrator should put to the user. They are about product and scope, not tooling.

1. **Modelo de monetización esperado en esta fase**: ¿publicidad 100% ficticia para visualizar formatos profesionales, o queremos dejar lista la abstracción para vender patrocinios reales a partir de este cambio (es decir, con un campo `contactEmail` por sponsor y una página `/publicidad` o un CTA visible)?
2. **Inventario de placements**: ¿la lista de placements a incorporar es exactamente (a) hero sponsor, (b) leaderboard banner, (c) sidebar en páginas internas, (d) in-feed en noticias/resultados, (e) partner grid en footer, (f) badge "Patrocinador de la competencia" en calendario y resultados? ¿O se prioriza un subconjunto para la primera entrega (por ejemplo, hero + leaderboard + partner grid, dejando sidebar e in-feed para una segunda iteración)?
3. **Tiers y jerarquía visual**: ¿queremos ya un modelo de tiers (oro / plata / bronce) con jerarquía visual (tamaño, posición, badge) o por ahora todos los patrocinadores se muestran al mismo nivel para no sesgar la review visual?
4. **Comportamiento de las creatividades**: ¿se rotan automáticamente entre patrocinadores en el mismo placement (para visualizar cómo se ve una campaña viva), o se mantiene 1 sponsor fijo por placement hasta que el editor cambie el fixture?
5. **Disclosure y compliance**: ¿qué nivel de etiquetado es obligatorio en este producto? Mínimo viable (etiqueta visible `Publicidad` y `rel="sponsored"`) vs. editorial (añadir también "Por qué vemos esto" en `/publicidad`, y un link a una política de publicidad desde el footer).

## Preliminary Size and Risk Estimate

- **Review budget**: 1200 lines cap (per session preflight).
- **Estimated touched lines (additions + deletions)** for the first PR under Approach A:
  - New files: `src/data/sponsors.js`, `src/data/campaigns.js`, `src/data/adPlacements.js`, `src/services/ads.js`, `src/hooks/useAdPlacement.js`, components for each slot (≈6 small components, each 60–150 lines). Roughly 600–900 lines of additions, scattered across many small files.
  - Edits to existing files: `src/App.jsx` (wire new slot components in place of the two `BannerAd` calls), `src/components/Footer.jsx` (data-driven partners grid), `src/components/HeroSponsor.jsx` (remove hardcoded brand, accept props). Roughly 50–120 lines of edits.
  - Total: ~700–1000 lines changed. Comfortably under 1200, but the diff will be spread across many small files. That argues for **two chained PRs**:
    1. **PR 1 — Foundation**: data model + `services/ads.js` + `useAdPlacement` + slots in isolation under a new `AdSlot` test page (or behind a `?ads=demo` flag). No edits to existing visible components. Estimated 400–550 lines.
    2. **PR 2 — Wiring**: replace `BannerAd` usage in `App.jsx`, replace `HeroSponsor` hardcoded brand, replace Footer placeholder, add the competition sponsor badge. Estimated 200–350 lines.
- **Decision needed before apply**: Yes — once `sdd-tasks` runs, the orchestrator must confirm whether to ship as chained PRs or as a single PR.
- **Chained PRs recommended**: Yes.
- **400-line budget risk**: Low.
- **1200-line budget risk**: Low.
- **Risk class**: Visual/UX. No backend, no auth, no schema, no data loss surface. Highest risk is the brand-impersonation trap (Speedo hardcoded brand must be removed) and CLS regression if slots are not given reserved height.

## Out of Scope (for the first change)

To keep the change reviewable, the following are explicitly out of scope and should land in later changes or behind a clearly labeled "future" item:

- Real ad network integration (AdSense, GAM, Prebid, header bidding, SSPs).
- Billing, invoicing, contracts, sponsor onboarding portal.
- Admin panel or CMS for sponsors and campaigns (today's "admin" is editing the fixture file).
- A real database. A future change should evaluate SQLite or a managed Postgres; this change keeps data in `src/data/*.js`.
- Analytics, conversion tracking, A/B testing frameworks.
- Personalization or audience segmentation.
- Notifications, email capture, or "request a quote" forms on sponsor cards.
- Changing the dark-mode toggle, route structure, or hero architecture (these belong to a separate `modernizar-asanda-ux` change if the user wants one).

## Ready for Proposal

**Status**: ready, with the 5 product questions above as the only blocking item.

The orchestrator should:

1. Surface the 5 product questions to the user in a single round, in Spanish, one at a time or as a tight numbered list. The user asked for an "interactive" session, so the answers need to come back before `sdd-propose` is launched.
2. After the answers, the recommended next phase is `sdd-propose` against this change. `sdd-propose` should explicitly call out the chained-PR strategy and the 1200-line budget.
3. `sdd-propose` should also note that the open memory items "Recomendó publicidad directa por patrocinio" and "Definió dirección visual autoridad acuática regional" are now constraints of the change, not new decisions.

## Skill Resolution

- `sdd-explore` SKILL: loaded from registry path `~/.config/opencode/skills/sdd-explore/SKILL.md` (resolved to `C:\Users\salbe\.config\opencode\skills\sdd-explore\SKILL.md`).
- `frontend-ui-engineering` SKILL: requested path did not exist at the user-wide config location. The same skill is available at the project-scoped path `C:\edunet-tauri\.opencode\skills\frontend-ui-engineering\SKILL.md` (cross-project file) and was loaded from there.
- `ui-ux-pro-max` SKILL: same resolution — loaded from `C:\edunet-tauri\.opencode\skills\ui-ux-pro-max\SKILL.md`.
- `performance-optimization` SKILL: same resolution — loaded from `C:\edunet-tauri\.opencode\skills\performance-optimization\SKILL.md`.
- `api-and-interface-design` SKILL: same resolution — loaded from `C:\edunet-tauri\.opencode\skills\api-and-interface-design\SKILL.md`.

The active `Asanda_web/.atl/skill-registry.md` does **not** list these four user-level skills under project conventions. They were resolved via the cross-project paths exposed in the session's `available_skills` block. Recommend updating the Asanda_web skill registry on a follow-up so future sessions resolve them locally.
