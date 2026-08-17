# Delta for club-administration

## ADDED Requirements

### Requirement: Club lifecycle

Authorized staff MUST create, edit, publish, archive, and list club organizations with unique slugs.

#### Scenario: Editor publishes club
- GIVEN a valid club name and unique slug
- WHEN an editor publishes it
- THEN public club listings may return it

#### Scenario: Duplicate slug
- GIVEN an existing organization slug
- WHEN another club uses that slug
- THEN the system rejects the save without replacing the existing club

### Requirement: Public contacts

Authorized staff MUST manage typed contacts and explicitly choose which contacts are public.

#### Scenario: Private contact
- GIVEN a contact marked non-public
- WHEN an anonymous client reads the club
- THEN that contact is omitted

### Requirement: Club logo

Authorized staff MAY link a validated Cloudinary logo with alternative text. Missing logos MUST retain the existing stable fallback.

#### Scenario: Club without logo
- GIVEN a published club with no logo
- WHEN its card renders
- THEN the short-name fallback remains visible

### Requirement: Safe archival

The system MUST NOT hard-delete a club referenced by memberships, competitions, or historical results.

#### Scenario: Referenced club removal
- GIVEN a club with historical references
- WHEN removal is requested
- THEN the system offers archival and preserves those references
