# ASANDA Web Agent Guide

This file defines the repository standards for human contributors, coding agents, and automated reviewers such as Gentleman Guardian Angel (GGA). Prefer small, testable changes that preserve the portal's accessibility, privacy, and visual consistency.

## Quick path

1. Inspect `git status` and the affected code before editing.
2. Make the smallest coherent change that solves the approved problem.
3. Run the checks required by the verification matrix below.
4. Review the final diff for scope, accessibility, privacy, and unintended generated files.
5. Use Conventional Commits and link an approved issue in every pull request.

## Project snapshot

| Area | Standard |
|---|---|
| Application | React 18 single-page application using functional components and hooks |
| Language | JavaScript and JSX with native ES modules |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 with responsive, dark-mode, and reduced-motion variants |
| Routing | React Router 6 |
| Data | Static modules under `src/data/`; no application backend |
| Runtime tests | Dependency-free Node regressions and Playwright Chromium E2E |
| Specifications | OpenSpec artifacts under `openspec/` |

## Repository map

| Path | Responsibility |
|---|---|
| `src/components/` | Reusable presentation and interaction components |
| `src/components/ads/` | Fictional demonstration advertising UI |
| `src/pages/` | Route-level page composition |
| `src/hooks/` | Reusable React lifecycle and state behavior |
| `src/services/` | Framework-light domain and selection logic |
| `src/data/` | Static, versioned application data |
| `src/config/` | External service and application configuration |
| `scripts/` | Deterministic repository checks and utilities |
| `tests/e2e/` | Browser-level Playwright scenarios |
| `openspec/` | Proposals, specifications, designs, tasks, and verification evidence |

## Engineering standards

### JavaScript and React

- Use functional components and hooks; do not introduce class components.
- Keep components focused on rendering and interaction. Move reusable domain behavior into hooks or services.
- Preserve native ESM. Use explicit `.js` extensions for modules that must also execute directly in Node.
- Prefer immutable transformations and deterministic functions over shared mutable state.
- Do not introduce timers, browser storage, or network calls without a documented product requirement.
- Handle malformed static data safely: warn or render a stable fallback instead of crashing the application.
- Keep route-level orchestration in pages or `App.jsx`; keep reusable UI out of route definitions.

### UI, accessibility, and content

- Preserve the existing Spanish user-facing language and ASANDA terminology.
- Use semantic HTML, accessible names, visible keyboard focus, and keyboard-operable controls.
- Respect `prefers-reduced-motion`; animation must never be required to understand or operate the UI.
- Support light and dark themes with WCAG AA text contrast where content is functional or informational.
- Reserve dimensions for asynchronous or variable content to avoid cumulative layout shift.
- Build mobile-first layouts and verify that narrow viewports do not create horizontal overflow.
- Use Lucide React for interface icons instead of adding a second icon system.

### Data, privacy, and advertising

- Treat athlete and organization data as public-facing content: add only information approved for publication.
- Never add credentials, private identifiers, private contact details, or environment values to source or fixtures.
- Advertising in this repository is fictional demonstration content only.
- Admit sponsors through the versioned approved identity catalog; do not rely on name markers alone.
- Do not add real brands, external ad networks, tracking pixels, behavioral profiling, or third-party ad scripts.
- Advertising destinations must remain internal demo routes and must retain clear disclosure labels.
- Demo detail pages must preserve their scoped `noindex` lifecycle without affecting normal routes.

## Change discipline

- Understand the existing architecture before adding dependencies or abstractions.
- Extend an existing pattern when it is sound; do not create parallel component, icon, styling, or state systems.
- Keep implementation, focused tests, and necessary documentation in the same reviewable work unit.
- Split pull requests above 400 authored additions plus deletions unless a maintainer explicitly approves a size exception.
- Never edit generated output under `dist/` or dependencies under `node_modules/`.
- Treat `.gga`, local environment files, temporary reports, and Playwright output as local tooling state; do not commit them.
- Do not modify or bypass repository hooks, RDD mode, review authority, or delivery policy without explicit maintainer authorization.

## Verification matrix

Run the smallest applicable set, then always run the baseline checks.

| Change | Required checks |
|---|---|
| Any source or configuration change | `npm run build` and `git diff --check` |
| Advertising data, validation, or selection | `npm run test:ads` |
| Browser behavior, accessibility, routing, dark mode, or reduced motion | `npm run test:e2e` |
| OpenSpec evidence only | Validate the artifact with the applicable Gentle AI/OpenSpec validator and run `git diff --check` |

The repository currently has no general lint, formatter, unit-test, or coverage command. Do not claim those checks ran. Do not introduce or run a source-mutating formatter across unrelated files.

### Expected commands

```bash
npm run test:ads
npm run test:e2e
npm run build
git diff --check
```

If a required check cannot run, report the exact blocker and leave the result unverified; never substitute static inspection for runtime evidence.

## Git and pull requests

- Branch names must use `type/short-description`, for example `feat/demo-advertising`.
- Commits must follow Conventional Commits, for example `feat: add competition sponsor badge`.
- Never add `Co-Authored-By` or automated AI attribution trailers.
- Every pull request must link an issue carrying `status:approved` using `Closes #N`, `Fixes #N`, or `Resolves #N`.
- Apply exactly one `type:*` label that matches the pull request's primary outcome.
- State scope, exclusions, verification evidence, rollback boundary, and dependent pull requests in the description.
- Merge dependent pull requests in order and retarget each child only after its parent reaches `main`.
- Do not merge with failing, missing, or ambiguous required checks.

## Review checklist

Reviewers and automated agents must confirm:

- [ ] The change solves the linked approved issue without unrelated scope.
- [ ] Architecture and naming match the surrounding code.
- [ ] User-facing Spanish remains clear and consistent.
- [ ] Keyboard access, semantics, reduced motion, dark mode, and responsive behavior are preserved.
- [ ] No private data, real-brand advertising, trackers, secrets, or local tooling state were added.
- [ ] Required runtime checks passed and their results are reported truthfully.
- [ ] The rollback boundary is clear and does not remove unrelated behavior.
- [ ] Commits and pull request metadata follow repository policy.

## Decision hierarchy

When instructions conflict, follow this order:

1. Explicit maintainer direction for the current task.
2. Security, privacy, and repository delivery policy.
3. Approved issue and current OpenSpec requirements.
4. This guide.
5. Existing local conventions in the affected code.

Do not silently guess when a higher-priority source leaves a material product, privacy, or delivery decision unresolved.
