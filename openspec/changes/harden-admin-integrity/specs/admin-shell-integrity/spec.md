# Admin Shell Integrity Specification

## Purpose

Provide one professional, accessible, responsive, themed administration experience in consistent Rioplatense Spanish.

## Requirements

### Requirement: One keyboard-navigable main region

Every administrative route MUST expose exactly one `main` landmark and a first-practical, stable skip control that moves visible focus there. Route changes MUST place focus predictably at the destination heading or main start.

#### Scenario: User skips or changes route

- GIVEN a keyboard user enters or changes an administrative route
- WHEN the skip control or destination completes
- THEN exactly one main target MUST exist and visible focus MUST move predictably to destination content

### Requirement: Keyboard, focus, and announcements

Navigation, forms, confirmations, status controls, reconciliation, and continuations MUST be keyboard operable with logical order, visible focus, non-overlapping usable targets, and accessible confirmation focus containment/return. Validation and `confirmed`, `rejected`, `unknown`, or failed-readback feedback MUST be announced and expose the next safe action without repeated focus theft.

#### Scenario: Command flow uses only a keyboard

- GIVEN a user validates, confirms, cancels, or reconciles a command without a pointer
- WHEN feedback or a dialog appears
- THEN focus MUST remain predictable and visible, cancellation MUST return it, and status plus continuation MUST be announced

### Requirement: Responsive shell

The shell and shared primitives MUST remain usable at 320 px and 390 px. Navigation overflow MUST be visible and keyboard accessible; text, controls, and targets MUST reflow without clipping, overlap, precision gestures, hidden required actions, or two-dimensional page scrolling.

#### Scenario: Narrow viewport

- GIVEN an administrative route is displayed at 320 px or 390 px
- WHEN navigation, forms, feedback, and confirmation are used
- THEN every destination and required action MUST remain visible, reflowed, and keyboard operable without horizontal page scrolling

### Requirement: Complete theme behavior

All shell and route states across the eight administrative modules MUST support light and dark themes with applicable contrast and non-color-only outcomes. A keyboard-accessible control MUST persist explicit preference; absent one, the system preference MUST apply consistently without mixed-theme surfaces.

#### Scenario: Theme source is resolved

- GIVEN a persisted preference exists, or only the system color preference exists
- WHEN an administrative route loads, changes, or the user selects a theme
- THEN the chosen source MUST govern all states, persist user selection, and preserve contrast and visible focus

### Requirement: Professional Rioplatense Spanish

All navigation, labels, validation, confirmations, announcements, errors, unavailable states, and continuations MUST use one reviewed professional Rioplatense Spanish voice. Copy MUST NOT mix voseo and tuteo, expose technical secrets, call unavailable data empty, or name a continuation that cannot run.

#### Scenario: Outcome is presented

- GIVEN a command is rejected, confirmed with failed readback, or unknown
- WHEN shared feedback appears
- THEN it MUST consistently distinguish “no se guardó”, “se guardó pero no se pudo recargar”, or “estado desconocido” and name a runnable safe action

### Requirement: Shared primitives preserve integrity

Landmark, focus, confirmation, theme, and outcome behavior MUST use shared semantics across routes. Each incremental adoption MUST remain runnable and reversible without re-enabling forbidden or uncertain commands.

#### Scenario: One route adopts shared behavior

- GIVEN adopted and unadopted routes coexist temporarily
- WHEN either route is used or the adoption is reverted
- THEN valid main, keyboard, theme, and safe-continuation paths MUST remain available
