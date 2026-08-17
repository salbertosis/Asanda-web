# Delta for admin-access

## ADDED Requirements

### Requirement: Authorized sign-in

The system MUST authenticate staff with email and password and MUST NOT offer public registration.

#### Scenario: Active staff signs in
- GIVEN an active administrator or editor account
- WHEN valid credentials are submitted
- THEN the system opens the authorized admin workspace

#### Scenario: Invalid or inactive account
- GIVEN invalid credentials or an inactive profile
- WHEN sign-in is attempted
- THEN the system shows a generic denial and exposes no admin data

### Requirement: Server-enforced roles

The system MUST enforce permissions through database and server policies; route guards alone MUST NOT authorize writes.

#### Scenario: Editor manages content
- GIVEN an active editor session
- WHEN the editor creates or publishes domain content
- THEN the authorized write succeeds

#### Scenario: Editor attempts account management
- GIVEN an active editor session
- WHEN an account-management operation is requested
- THEN the server denies the operation

### Requirement: Administrator account lifecycle

Administrators MUST be able to invite, assign a role, deactivate, and reactivate staff without exposing privileged secrets.

#### Scenario: Administrator invites editor
- GIVEN an authenticated administrator
- WHEN a valid email and editor role are submitted
- THEN an invitation is issued and an inactive duplicate is not created

### Requirement: Session safety

The system MUST support sign-out, password recovery, session restoration, and generic authentication errors. Admin routes MUST be `noindex`.

#### Scenario: Session expires
- GIVEN an open admin route
- WHEN the session becomes invalid
- THEN protected content is cleared and the user returns to sign-in

### Requirement: Auditability

Privileged mutations MUST produce immutable actor, action, entity, and timestamp evidence.

#### Scenario: Published record changes
- GIVEN an authorized mutation
- WHEN it commits
- THEN an audit record identifies the actor and affected entity
