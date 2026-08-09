# Delta for demo-advertising

## ADDED Requirements

### Requirement: Fictional Sponsor Catalog

The system MUST maintain a catalog of exactly four fictional brands representing aquatic equipment, sports health, hydration, and training. All sponsors hold equal hierarchy — no tiers, no priority ordering. The catalog MUST expose a closed, versioned approval authority, and sponsor admission MUST require exact equality of `id`, `slug`, `name`, and `category` with one approved identity in addition to structural validation. The system MUST NOT reference real brands in production fixtures and MUST NOT make external ad-network calls (AdSense, GAM, Prebid, or any SSP).

#### Scenario: Catalog contains four fictional sponsors

- GIVEN the sponsor catalog is loaded
- WHEN the system enumerates sponsors
- THEN exactly four sponsors are returned, each with a name, category, creative asset, and destination URL
- AND no sponsor name matches a real-world brand

#### Scenario: Unapproved or altered sponsor identities are rejected

- GIVEN a structurally valid fixture contains a real-brand identity such as `Speedo Demo`, an altered approved field, or an unknown id copying approved fields
- WHEN the catalog is validated at load time
- THEN the entry is excluded and a console warning is logged

### Requirement: Placement Slots

The system MUST support four placement types: `hero-sponsor`, `leaderboard`, `partner-grid`, and `competition-sponsor`. Each slot MUST reserve fixed dimensions to prevent Cumulative Layout Shift (CLS). Each slot MUST render `role="complementary"` with a Spanish `aria-label` (e.g., "Publicidad: {sponsor name}").

#### Scenario: Hero sponsor renders with reserved dimensions

- GIVEN the hero-sponsor placement is requested on the home page
- WHEN the slot renders
- THEN a container with fixed height matching the creative aspect ratio is displayed
- AND the element has `role="complementary"` and `aria-label="Publicidad: {sponsor}"`

#### Scenario: Leaderboard collapses to compact card on mobile

- GIVEN the viewport width is below 768px
- WHEN the leaderboard slot renders
- THEN a compact card layout is displayed instead of the full-width banner
- AND reserved height prevents CLS during the transition

#### Scenario: Competition sponsor appears in calendar and results

- GIVEN a calendar or results page is loaded
- WHEN the competition-sponsor placement is resolved
- THEN a sponsor badge is displayed within the page content
- AND no per-event exclusivity is enforced — the same global rotating inventory applies

### Requirement: Rotation on Navigation/Reload Only

The system MUST rotate which sponsor creative appears in each placement only when the user navigates to a different route or reloads the page. The system MUST NOT rotate creatives on timers, intervals, or automatic background cycles. The resolved creative MUST remain stable for the entire page lifecycle.

#### Scenario: Creative persists during page interaction

- GIVEN a user is viewing the home page with a resolved hero sponsor
- WHEN the user scrolls, opens modals, or interacts with other components
- THEN the displayed sponsor creative does not change

#### Scenario: Creative changes on route navigation

- GIVEN the user navigates from the home page to the calendar page and back
- WHEN the home page re-renders
- THEN the hero sponsor may display a different sponsor from the catalog

#### Scenario: Creative changes on page reload

- GIVEN a user reloads the current page
- WHEN the page finishes loading
- THEN placements may resolve to different sponsors than the previous load

### Requirement: Disclosure and Demo Badging

Every ad slot MUST display a visible disclosure label in Spanish: "Publicidad", "Contenido patrocinado", or "Presentado por". Every creative MUST display a "Demo" or "Ejemplo" badge. Clicking any creative MUST open an internal detail page (not an external URL) that explains the sponsor and campaign are fictional. The detail page MUST include a `noindex` meta tag. All creative links MUST use `rel="sponsored noopener"`.

#### Scenario: Disclosure label and demo badge are visible

- GIVEN any placement slot renders a creative
- WHEN the slot is displayed
- THEN a disclosure label ("Publicidad", "Contenido patrocinado", or "Presentado por") is visible
- AND a "Demo" or "Ejemplo" badge is overlaid on or adjacent to the creative

#### Scenario: Clicking creative opens internal demo detail page

- GIVEN a user clicks on any sponsor creative
- WHEN the click is processed
- THEN the browser navigates to an internal route (not an external URL)
- AND the page explains that the sponsor and campaign are fictional examples
- AND the page includes `<meta name="robots" content="noindex">`

#### Scenario: Sponsored link attributes are present

- GIVEN a creative link is rendered
- WHEN the anchor element is inspected
- THEN it has `rel="sponsored noopener"`

### Requirement: Empty State Fallback

When no active campaign is available for a placement, the system MUST display an "Espacio disponible" fallback tile. The fallback MUST reserve the same dimensions as an active creative to prevent CLS. The fallback MUST NOT include clickable links or demo badges.

#### Scenario: Empty inventory shows fallback

- GIVEN the sponsor catalog has no active entries for a placement
- WHEN the placement slot renders
- THEN an "Espacio disponible" tile is displayed with reserved dimensions
- AND no demo badge or disclosure label is shown

#### Scenario: Malformed fixture is handled gracefully

- GIVEN a sponsor fixture entry has missing or invalid fields (no name, no creative URL)
- WHEN the placement resolver processes the catalog
- THEN the malformed entry is skipped
- AND a console warning is logged without crashing the application

### Requirement: Out-of-Date and Inactive Campaigns

Campaigns with `startDate` in the future or `endDate` in the past MUST be excluded from placement resolution. When all campaigns for a placement are inactive, the empty state fallback MUST be displayed.

#### Scenario: Expired campaign is excluded

- GIVEN a campaign has `endDate` before the current date
- WHEN the placement resolver evaluates active campaigns
- THEN the expired campaign is excluded from rotation

### Requirement: Responsive and Accessibility Compliance

The leaderboard placement MUST transition from full-width banner (≥768px) to a compact card layout (<768px). All placements MUST respect `prefers-reduced-motion` by disabling entrance animations. All interactive elements MUST be keyboard-navigable with visible focus indicators. Dark mode MUST be supported via Tailwind `dark:` variants.

#### Scenario: Reduced motion disables animations

- GIVEN the user has `prefers-reduced-motion: reduce` enabled
- WHEN any placement slot renders
- THEN no slide-in, fade-in, or other entrance animations are applied

#### Scenario: Keyboard navigation reaches all interactive elements

- GIVEN a user tabs through the page
- WHEN focus reaches an ad slot's creative link
- THEN the link receives a visible focus indicator
- AND pressing Enter activates the link

#### Scenario: Dark mode renders correctly

- GIVEN dark mode is active
- WHEN any placement slot renders
- THEN background, text, and border colors use `dark:` Tailwind variants
- AND contrast ratios meet WCAG 2.1 AA

### Requirement: No External Ad-Network Integration

The system MUST NOT load scripts, make HTTP requests, or establish connections to any external advertising network (AdSense, Google Ad Manager, Prebid, header bidding, or any SSP). All sponsor data MUST come from local fixture modules.

#### Scenario: No network calls to ad networks

- GIVEN the application loads any page with ad placements
- WHEN network traffic is monitored
- THEN no requests are made to ad-network domains
- AND all sponsor data originates from local JavaScript modules
