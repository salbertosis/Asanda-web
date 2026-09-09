# Admin Runtime Evidence Specification

## Purpose

Require truthful, privacy-safe evidence across local, server, role, public, cleanup, and production boundaries.

## Requirements

### Requirement: Evidence labels and local gate are explicit

Every result MUST be labeled deterministic local regression, mocked browser contract, authorized server/SQL contract, authenticated role smoke, public-read verification, cleanup verification, or observed production fact. Mocked or historical evidence MUST NOT prove current runtime or production. One documented gate MUST run all named admin regressions, `npm run test:e2e`, and `npm run build`, recording commands, revision, environment, outcomes, mocks, and skips.

#### Scenario: Local evidence is evaluated

- GIVEN mocked, historical, or local checks run
- WHEN any required gate component fails or is skipped
- THEN its true layer and incomplete/failed status MUST be reported, without inferring runtime evidence

### Requirement: Local coverage is complete

Named deterministic checks MUST cover session generations, switches, expiry, availability, and logout; command states, readback, optional reads, rows, revisions, confirmation, result ambiguity/limits, and UTC conversion; plus keyboard, focus, one main, 320/390 widths, themes, contrast, overflow, and Spanish copy.

#### Scenario: Regression suite runs

- GIVEN session, command, domain, and shell regressions execute
- WHEN each failure state is induced
- THEN named assertions MUST identify the violated contract, including no retry of unknown writes

### Requirement: Authorized runtime boundaries are separate

Authorized non-production SQL/server checks MUST verify fresh anonymous/inactive/editor/administrator policy, server-derived authorship, transactions, rows, revisions, active record references, result atomicity/limits, media reconciliation, and data-access boundaries. Bounded reversible human smoke MUST cover both roles and all eight modules. Separate public reads and cleanup reads MUST verify visibility, privacy, historical policy, and final fixture state. Direct production SQL MUST NOT be required.

#### Scenario: Authorized smoke runs

- GIVEN approved identities, environment, and fixtures exist
- WHEN server, role, public, provider, and cleanup checks execute
- THEN each layer and module MUST be recorded separately, server denials MUST hold, and unknown writes or cleanup MUST stop further mutation

### Requirement: Evidence protects privacy and truth

Artifacts MUST omit credentials, tokens, connection strings, raw claims/UUIDs, private athlete rows, raw HY3, and unbounded provider identifiers; bounded redacted fixture references MAY support cleanup. Achievement disappearance, deployed parity/roles, production content, and historical media residue MUST remain unknown until separately authorized evidence establishes them; #207 MUST remain independently attributed.

#### Scenario: Evidence is reported

- GIVEN checks finish without complete authorized production proof
- WHEN artifacts and closure status are published
- THEN secrets MUST be absent and unproven production or achievement claims MUST remain explicitly unknown

### Requirement: Migrations and retirement stop safely

Migrations MUST require explicit target authorization and sequential review. Uncertain results MUST stop without retry or ledger edits; confirmed corrections MUST use new forward migrations, and `20260830121000` MUST NOT return. `AthleteEvidence` retirement MUST inventory strings, routes, dynamic consumers, helpers, contracts, migrations, and reused tests before consumer-first deletion.

#### Scenario: Execution evidence is incomplete

- GIVEN authorization, migration outcome, or consumer inventory is incomplete
- WHEN migration or retirement is considered
- THEN work MUST stop without substitution, retry, ledger change, provider deletion, or restoration

### Requirement: Review units are bounded

Each linked implementation unit MUST be runnable, reversible, at most 400 changed lines, and identify root cluster, closure tests, predecessor, successor, and rollback/stop boundary. It MUST NOT claim an unfinished cluster or alter static data or SEO without respecification.

#### Scenario: Unit exceeds scope

- GIVEN a unit exceeds 400 lines or requires static-data/SEO change
- WHEN reviewed
- THEN it MUST be split without parallel behavior or stopped for explicit respecification
