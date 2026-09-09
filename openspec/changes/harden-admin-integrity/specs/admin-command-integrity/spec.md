# Admin Command Integrity Specification

## Purpose

Require truthful administrative outcomes and preserve authoritative domain lifecycles.

## Requirements

### Requirement: Command truth is separate from readback

Every mutation MUST report exactly `confirmed`, `rejected`, or `unknown` from authoritative commit evidence, without durable duplicate truth. Failed readback MUST preserve confirmation and offer “Volver a cargar”. Unknown MUST block mutation retry and allow only read reconciliation; idempotent reads MAY retry.

#### Scenario: Write and read outcomes differ

- GIVEN a command outcome is known or indeterminate
- WHEN feedback and readback occur
- THEN Spanish feedback MUST preserve the command truth, distinguish read failure, and never blindly retry an unknown write

### Requirement: Writes enforce safe boundaries

Overwrite-capable commands MUST enforce expected revisions. Existing-row commands MUST verify exact affected rows; inseparable work MUST commit transactionally or report partial/unknown. Destructive or consequential commands MUST receive accessible, named confirmation. Failed optional, identity, content, relation, or media reads MUST appear unavailable, never empty or writable.

#### Scenario: A boundary is unsatisfied

- GIVEN revision, row count, transaction completion, confirmation, or required read is unsatisfied
- WHEN editing or mutation is attempted
- THEN the system MUST prevent false success, overwrite, duplicate work, cancellation side effects, and clearing persisted values

### Requirement: Content and organization lifecycles remain intact

News MUST derive author from current server identity and preserve draft, scheduled, published, and load behavior. Clubs MUST save organization, contacts, and logo coherently without duplicate contacts; athlete relations MUST verify exact rows. Competition metadata MUST preserve status unless explicit publish, unpublish, or archive succeeds, retaining program and historical references.

#### Scenario: Lifecycle work is confirmed

- GIVEN authority, revision, references, and confirmation are valid
- WHEN News, Club, athlete-relation, or competition work completes
- THEN exact requested state MUST persist without implicit status change, duplication, or historical destruction

### Requirement: Records and Results enforce validity and privacy

Record draft and publication MUST remain separate and revision-aware, requiring active category, swimming event/definition, and discipline references. Results import MUST resolve ambiguity, reject stale competition/reference/mapping/input previews, and cap HY3 at 10 MiB (10,485,760 bytes) and 50,000 records. Raw HY3 MUST remain local; only sanitized data and necessary mappings MAY cross boundaries.

#### Scenario: Invalid import or record is submitted

- GIVEN references are inactive/wrong-discipline or an import is ambiguous, stale, or over either limit
- WHEN commit is requested
- THEN it MUST be rejected before mutation with Spanish guidance, and raw HY3 MUST NOT leave the browser

### Requirement: Featured and Media preserve meaning

Featured scheduling MUST convert explicit zoned local time to UTC and round-trip the same instant without a six-item limit. Unknown media registration MUST block repeat upload and allow bounded reconciliation; suspected residue MUST NOT be deleted without authorization. New public media MUST have meaningful alt text; legacy media without it MUST pass an explicit gate before new or renewed projection.

#### Scenario: Persistence meaning is uncertain

- GIVEN a featured instant, unknown upload registration, or media without required alt is handled
- WHEN persistence, retry, or publication is attempted
- THEN UTC meaning and all entries MUST persist, while repeat upload or projection MUST remain blocked pending reconciliation or meaningful alt

### Requirement: Retirement and migration boundaries hold

`AthleteEvidence` MUST be removed consumer-first only after repository-wide route, string, dynamic consumer, helper, contract, migration, and reused-test inventory proves it dead; `20260830121000` MUST stay withdrawn. #207 remains external: Logros adoption MUST preserve its landed regression and MUST NOT claim achievement disappearance fixed. Unknown migrations MUST stop; corrections to confirmed commits MUST use reviewed forward migrations, never ledger edits.

#### Scenario: A boundary is unresolved

- GIVEN a live consumer, uninventoried #207 behavior, or uncertain migration exists
- WHEN retirement, Logros adoption, or recovery is proposed
- THEN work MUST stop without deletion, hotfix duplication, retry, migration restoration, or closure claim
