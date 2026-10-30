# guided-onboarding Specification

## Purpose

Introduces a new player to the game controls and the core AWS IAM concepts through a first-run welcome flow and a guided starter level (Round 0, "Cloud Basics"), before the scored rounds begin.

## Requirements

### Requirement: First-run welcome flow
On first run the system SHALL show a welcome flow that asks for an optional display name, explains the loop in three short steps (build, run, fix) and offers to start Round 0. The player MUST be able to skip it, and it MUST NOT appear again after it is completed or skipped, unless progress is reset.

#### Scenario: New player is welcomed
- **WHEN** a player opens the app for the first time
- **THEN** the welcome flow opens before any level is playable, and choosing "Start" opens Round 0

#### Scenario: Skip welcome
- **WHEN** the player chooses "Skip" in the welcome flow
- **THEN** the flow closes, Round 1 opens, and the welcome flow does not show on the next visit

### Requirement: Round 0 "Cloud Basics" starter level
The system SHALL provide a Learn-track level numbered 0, ordered before Round 1, that teaches these concepts in order, one per step: principal, resource, connection (who calls whom), identity policy, resource policy, explicit deny, permission boundary and SCP. Round 0 MUST be unlocked for every player and MUST use the same simulation engine as other levels.

#### Scenario: Round 0 is first in the Learn track
- **WHEN** the player opens the level picker
- **THEN** Round 0 appears first in the Learn track and is unlocked

#### Scenario: Round 0 does not gate Round 1
- **WHEN** the player has earned no star on Round 0
- **THEN** Round 1 is still unlocked, so experienced players are not forced through the tutorial, and Rounds 2 to 8 keep their existing one-star-on-the-previous-round gating

#### Scenario: Engine parity
- **WHEN** Round 0's target solution is applied
- **THEN** the simulation passes all legitimate packets, blocks all exploit packets and stays under budget, verified by the level test suite like every other level

### Requirement: Guided steps with coach marks
Each Round 0 step SHALL highlight the relevant UI element, give a short plain-language instruction and advance only when the player completes the action or chooses "Next" on a read-only step. The player MUST be able to go back a step, leave the guide, and resume at the last step.

#### Scenario: Action-gated step
- **WHEN** the step "Connect the app to the bucket" is active and the player draws an edge from the app node to the bucket node
- **THEN** the step is marked complete and the next step starts

#### Scenario: Resume guide
- **WHEN** the player leaves Round 0 during step 4 and returns later
- **THEN** the guide resumes at step 4

#### Scenario: Guide does not block the board
- **WHEN** a coach mark is shown
- **THEN** the player can still pan, zoom and select nodes

### Requirement: Concept introduction in report cards
For each Learn level after Round 0, the pre-level report card SHALL list the concepts that level relies on, and each concept MUST link to its info popover.

#### Scenario: Report card concept links
- **WHEN** the Round 4 report card opens
- **THEN** it lists "Permission Boundary" and "iam:PassRole", and choosing either opens its info popover
