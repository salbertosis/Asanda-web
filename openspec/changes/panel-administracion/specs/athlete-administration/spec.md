# Delta for athlete-administration

## ADDED Requirements

### Requirement: Draft-first athlete creation

Authorized staff MUST create public athlete records as drafts and MUST NOT collect private identity fields in v1.

#### Scenario: Editor creates athlete
- GIVEN valid public profile fields
- WHEN an editor saves a new athlete
- THEN the athlete exists as a non-public draft

### Requirement: Consent-gated publication

The system MUST prevent publication without active public-profile consent, MUST require photo consent when a photo is linked, and MUST require results-publication consent before an athlete's official performance becomes public.

#### Scenario: Missing minor consent
- GIVEN a pre-infant athlete without required active consent
- WHEN publication is requested
- THEN the database rejects publication

#### Scenario: Missing results consent
- GIVEN an athlete without active results-publication consent
- WHEN an official performance would become public
- THEN the public query omits that performance

### Requirement: Category and discipline history

Authorized staff MUST assign effective-dated categories and up to two simultaneous disciplines while preserving existing non-overlap rules.

#### Scenario: Overlapping category assignment
- GIVEN an athlete with an active category period
- WHEN an overlapping category is submitted
- THEN the database rejects the assignment

### Requirement: Membership invariants

Authorized staff MUST manage associated and federated periods by club. Federation MUST remain covered by association, and pre-infant athletes MUST NOT be federated.

#### Scenario: Valid federation
- GIVEN an active associated period for the same athlete and club
- WHEN a covered federated period is added
- THEN both memberships remain active

#### Scenario: Invalid pre-infant federation
- GIVEN an active pre-infant category
- WHEN federation is attempted
- THEN the database rejects the operation

### Requirement: Stable failure behavior

Forms MUST preserve entered non-sensitive values after validation failures and MUST identify the rejected business rule.

#### Scenario: Save violates domain rule
- GIVEN a completed athlete form
- WHEN the server rejects a membership invariant
- THEN the form remains usable and explains the conflict
