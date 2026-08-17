# Delta for competition-administration

## ADDED Requirements

### Requirement: Competition lifecycle

Authorized staff MUST create, edit, publish, postpone, cancel, complete, and archive competitions with valid date ranges.

#### Scenario: Published competition
- GIVEN valid identity, sport, dates, organizer, venue, and status
- WHEN an editor publishes the competition
- THEN it appears in the public calendar at the correct date

#### Scenario: Invalid date range
- GIVEN an end date before the start date
- WHEN save is attempted
- THEN the database rejects the competition

### Requirement: Venue reuse

Authorized staff MUST select an existing venue or create a reusable venue without duplicating an exact existing identity.

#### Scenario: Existing venue selected
- GIVEN a stored venue
- WHEN it is assigned to a competition
- THEN public detail uses the stored location fields

### Requirement: Event program

Authorized staff MUST define ordered competition events from active event definitions, categories, sex classes, rounds, and schedules.

#### Scenario: Duplicate sequence
- GIVEN an event already using a sequence number
- WHEN another event in that competition uses the same sequence
- THEN the database rejects the duplicate

### Requirement: Referential safety

The system MUST preserve historical competitions and MUST prevent destructive changes that invalidate published results.

#### Scenario: Event has results
- GIVEN a competition event with entries or performances
- WHEN deletion is requested
- THEN the system blocks deletion and offers status-based correction
