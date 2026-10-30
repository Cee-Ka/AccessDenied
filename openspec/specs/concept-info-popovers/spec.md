# concept-info-popovers Specification

## Purpose

Gives players short, consistent explanations of AWS services and IAM concepts wherever those terms appear in the game, all drawn from one shared glossary.

## Requirements

### Requirement: Shared concept glossary
The system SHALL keep one glossary of concept entries. Each entry has a stable ID, a title, a one-sentence summary, a short plain-language explanation (at most about 80 words), an optional minimal JSON example, and an optional link to the AWS documentation. It MUST cover at least: IAM user, IAM role, identity policy, resource policy, trust policy, permission boundary, SCP, explicit deny, implicit deny, condition keys, VPC endpoint, NAT gateway, KMS key policy, IMDSv2, `sts:ExternalId` and `iam:PassRole`, plus every service in the dock.

#### Scenario: Every dock service has an entry
- **WHEN** the glossary is checked against the dock's service list in tests
- **THEN** every dock service type has a matching glossary entry

#### Scenario: Every trace stage has an entry
- **WHEN** the glossary is checked against the evaluation trace stages (Network, Explicit Deny, SCP, Resource Policy, Trust Policy, Identity Policy, Permission Boundary, Condition)
- **THEN** every stage has a matching glossary entry

### Requirement: Info popovers in context
The system SHALL show an info control ("ⓘ") that opens the matching glossary popover in these places:
- each dock service
- each inspector policy tab (Identity, Resource, Trust, Permission Boundary, SCP)
- each stage row in the evaluation trace
- concept tags on level cards and report cards

#### Scenario: Policy tab popover
- **WHEN** the player opens the ⓘ next to the "Permission Boundary" tab in the inspector
- **THEN** a popover shows the Permission Boundary title, summary and explanation

#### Scenario: Trace stage popover
- **WHEN** a simulation fails at the SCP stage and the player opens the ⓘ on that trace row
- **THEN** the SCP popover opens

### Requirement: Accessible, non-blocking popovers
Popovers SHALL open on click or tap and on keyboard focus with Enter or Space, close on Escape or an outside click, and return focus to the trigger on close. They MUST NOT block canvas interaction while closed and MUST stay within the viewport.

#### Scenario: Keyboard access
- **WHEN** the player tabs to an ⓘ control and presses Enter
- **THEN** the popover opens, and Escape closes it and returns focus to the control

#### Scenario: Escape precedence
- **WHEN** a popover is open and the player presses Escape
- **THEN** only the popover closes, and the node selection and other drawers are unchanged

### Requirement: Offline content
Glossary content SHALL ship with the app bundle. Documentation links MAY open external AWS pages, but popover content MUST render without network access.

#### Scenario: Offline popover
- **WHEN** the app runs with no network connection and the player opens any popover
- **THEN** the popover content renders in full
