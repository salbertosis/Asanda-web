# Production Site Readiness Specification

## Purpose

Define ASANDA production behavior while preserving its Spanish responsive experience.

## Requirements

### Requirement: Direct public navigation

The system MUST serve the SPA for public routes directly and on reload, while static assets and crawl endpoints MUST resolve independently.

#### Scenario: Reloading a public route
- GIVEN a deployed public route
- WHEN it is loaded directly or reloaded
- THEN it returns the application without a server error.

#### Scenario: Requesting a static resource
- GIVEN an asset, robots.txt, sitemap.xml, or manifest
- WHEN the browser requests its URL
- THEN it MUST NOT receive the SPA document.

### Requirement: Legal routes and link integrity

The system MUST provide substantive Spanish /legal and /privacidad routes, and every visible internal link MUST resolve to a route or resource.

#### Scenario: Opening legal information
- GIVEN a visitor opens either legal route
- WHEN the page renders
- THEN it presents meaningful legal or privacy content and a coherent heading.

#### Scenario: Following a visible link
- GIVEN a visible navigation or footer link
- WHEN it is activated
- THEN it does not lead to a broken page.

### Requirement: Canonical public identity

The system MUST use one approved canonical origin in metadata, JSON-LD, social images, robots.txt, sitemap.xml, favicon, and manifest. These assets MUST be reachable from that origin.

#### Scenario: Inspecting a public route
- GIVEN an approved canonical origin
- WHEN route metadata and structured data are read
- THEN every absolute public URL uses that origin.

#### Scenario: Crawling identity assets
- GIVEN the deployed canonical origin
- WHEN its crawl and brand asset URLs are requested
- THEN each configured resource returns successfully.

### Requirement: Accessible page framing

Each view MUST have one main landmark, a keyboard-operable skip link, and coherent headings. Footer controls MUST provide at least 44 by 44 pixel targets. The advertising demo shell MUST disclose demo status accessibly and remain noindex.

#### Scenario: Keyboard entry
- GIVEN a keyboard user loads any view
- WHEN they activate the skip link
- THEN focus moves to main content.

#### Scenario: Opening a demo page
- GIVEN a visitor opens an advertising demonstration view
- WHEN its document and shell are inspected
- THEN its disclosure is accessible and indexing is prevented.

### Requirement: Verified institutional content

The system MUST display institutional identity, contacts, social channels, and copyright data only if approved; unavailable or placeholder values MUST be hidden.

#### Scenario: Missing approval
- GIVEN a proposed institutional value lacks approval
- WHEN its relevant page renders
- THEN the value is not shown.

### Requirement: Defensive delivery

The deployment MUST apply defensive response headers and stage CSP in Report-Only until its resource inventory is validated. The policy MUST NOT prevent the supported application from rendering.

#### Scenario: Initial CSP rollout
- GIVEN CSP dependencies have not been fully validated
- WHEN deployment headers are inspected
- THEN CSP is Report-Only and the application remains usable.

### Requirement: Resilient resources and loading

Critical user-facing resources MUST be self-hosted or deployment-controlled. Public route code SHOULD load independently where practical without regressing responsive layout, dark mode, accessible advertising disclosure, mobile menu, or lazy images.

#### Scenario: Offline third-party dependency
- GIVEN an uncontrolled third-party resource is unavailable
- WHEN a supported view loads
- THEN critical interface content remains available.

### Requirement: Production evidence

Automation MUST verify routing, resources, legal links, metadata, headers, local critical resources, and route loading. It MUST record Lighthouse and Web Vitals evidence against a measured baseline; later runs MUST NOT regress it without an approved exception.

#### Scenario: Evidence regression
- GIVEN a baseline and later production check
- WHEN a required measure worsens
- THEN automation reports the regression rather than claiming success.
