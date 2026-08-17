# Delta for result-administration

## ADDED Requirements

### Requirement: Manual result entry

Authorized staff MUST enter or correct athlete entries and performances with event, club, status, time, place, and provenance.

#### Scenario: Official timed result
- GIVEN a confirmed athlete entry
- WHEN a positive time and official status are saved
- THEN the public result becomes readable after commit

#### Scenario: Status without time
- GIVEN a disqualified, DNS, DNF, or no-time result
- WHEN it is saved without a time
- THEN the valid status is retained without inventing a time

### Requirement: Native HY3 ingestion

The system MUST accept supported Hy-Tek HY3 exported-result files as the primary bulk format. It MUST detect unsupported or malformed variants and fail closed. CSV MAY remain an explicit fallback.

#### Scenario: Supported HY3 file
- GIVEN a supported HY3 export containing meet, club, athlete, event, result, relay, or disqualification records
- WHEN parsing completes
- THEN a structured preview preserves the supported sports data and reports record counts

#### Scenario: Unsupported HY3 variant
- GIVEN a file whose header, encoding, record lengths, or relationships are unsupported
- WHEN parsing is attempted
- THEN no import is enabled and the incompatibility is identified

### Requirement: Private-field sanitization

The system MUST NOT persist, log, publish, or include in test fixtures raw HY3 identity numbers, exact birth dates, addresses, phones, emails, or the raw source file. Only explicitly permitted sports fields and a checksum MAY leave the local parsing boundary.

#### Scenario: HY3 contains private fields
- GIVEN a valid export containing identity and contact records
- WHEN the preview is produced
- THEN private values are absent from the sanitized payload, UI, logs, and network requests

### Requirement: Identity reconciliation

The system MUST reconcile source club and athlete identifiers to ASANDA organizations and athletes before import. Unresolved or ambiguous identities MUST block affected rows and MUST NOT create published entities automatically.

#### Scenario: Known team and athlete
- GIVEN stored Hy-Tek mappings for the source team and athlete
- WHEN preview reconciliation runs
- THEN the row references the corresponding ASANDA UUIDs

#### Scenario: Unknown athlete
- GIVEN no unambiguous athlete mapping
- WHEN preview reconciliation runs
- THEN staff must link an existing athlete, create a draft, or exclude the row before import

### Requirement: Preview and validation

The system MUST report event mapping, identity, time, status, duplication, and consent errors before import.

#### Scenario: Invalid rows exist
- GIVEN a parsed file with one or more invalid or unresolved rows
- WHEN validation runs
- THEN no result is imported and each blocked row identifies its error

### Requirement: Atomic import

HY3 and fallback CSV imports MUST commit all accepted rows in one reviewed transaction or commit none. The server MUST repeat authoritative validation and MUST reject a previously imported source checksum.

#### Scenario: Concurrent conflict
- GIVEN a validated preview
- WHEN data changes before final import
- THEN the import fails atomically and requests a fresh preview

#### Scenario: Duplicate source file
- GIVEN a checksum already committed for the competition
- WHEN staff attempts the same import again
- THEN the server rejects it without duplicating results

### Requirement: Publication and correction

Authorized staff MUST distinguish provisional from official results and MUST preserve audit evidence for corrections.

#### Scenario: Provisional result
- GIVEN a saved provisional performance
- WHEN an anonymous client queries results
- THEN that performance is not returned

#### Scenario: Official correction
- GIVEN an existing official result
- WHEN an editor corrects it with a reason
- THEN the new value commits and the audit trail retains actor and reason

### Requirement: Result identity presentation

Public results SHOULD show the athlete photo and represented-club logo through existing media relationships. Missing media MUST use stable non-identifying fallbacks.

#### Scenario: Resolved media
- GIVEN an official result linked to an athlete and represented club with public media
- WHEN the result renders
- THEN the athlete photo and club logo use optimized Cloudinary delivery URLs

#### Scenario: Missing media
- GIVEN an official result without an available photo or logo
- WHEN the result renders
- THEN accessible initials or ASANDA fallbacks appear without layout shift
