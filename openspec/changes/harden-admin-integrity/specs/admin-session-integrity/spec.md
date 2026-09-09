# Admin Session Integrity Specification

## Purpose

Define fail-closed administrative identity and authority without confusing service failure with an authorization decision.

## Requirements

### Requirement: Current identity wins

Every session or staff-profile resolution MUST carry its initiating identity and monotonically current generation. Only results matching the current identity and generation MAY affect authority; sign-out, account change, or expiry MUST invalidate earlier work.

#### Scenario: Resolutions complete out of order

- GIVEN identity A is resolving when sign-out, expiry, or a switch to identity B advances the generation
- WHEN A's result or auth event arrives afterward
- THEN it MUST be ignored, and only a fresh current-generation result MAY authorize access

### Requirement: Outcomes remain distinct

The system MUST distinguish confirmed anonymous, confirmed denied (absent/inactive profile or insufficient role), password recovery, and authority unavailable because identity or profile lookup failed. Every unresolved state MUST fail closed; unavailable MUST NOT be presented as anonymous or denied and SHOULD offer a safe read retry.

#### Scenario: Authority lookup is unavailable

- GIVEN session or staff-profile authority cannot be determined because its service is unavailable
- WHEN the administrative guard presents its decision
- THEN it MUST block protected use and provide recoverable Spanish guidance without claiming anonymous or denied status

#### Scenario: Authority is authoritatively denied

- GIVEN the current identity is absent, has no active staff profile, or lacks the required role
- WHEN authority is evaluated
- THEN access MUST be reported as anonymous or denied as applicable, while recovery state MUST remain non-authorizing

### Requirement: Sign-out is recoverable

Sign-out MUST revoke local authority immediately. Remote failure MUST settle into a recoverable state, MUST NOT remain indefinitely loading, and MUST NOT allow stale events to restore authority; any continuation MUST avoid protected writes.

#### Scenario: Remote sign-out fails

- GIVEN an authorized user begins sign-out
- WHEN remote sign-out fails
- THEN local authority MUST remain revoked and actionable Spanish recovery guidance MUST be shown

### Requirement: Server authority is fresh

Every protected server read and command MUST derive identity from the current authenticated server context and freshly require an active `administrator` or `editor` role according to operation policy. Client claims, routes, and hidden controls MUST NOT grant authority; administrator-only operations, including Logros administration, MUST reject editors.

#### Scenario: Direct invocation tests role authority

- GIVEN an anonymous, inactive, or editor caller directly invokes an administrative operation
- WHEN the server evaluates current identity and role
- THEN it MUST reject unauthorized cases and MAY execute an editor-allowed case only after fresh active-role confirmation

### Requirement: Feedback protects privacy

Session, authorization, recovery, and evidence messages MUST use reviewed Spanish and MUST NOT expose credentials, tokens, connection strings, raw claims, or private profile data.

#### Scenario: Session failure is reported

- GIVEN a session, profile, recovery, or sign-out operation fails
- WHEN UI and evidence describe the result
- THEN both MUST state the outcome without secrets, raw claims, or private rows
