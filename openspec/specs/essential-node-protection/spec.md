# essential-node-protection Specification

## Purpose

Stops players from deleting the starting nodes a level depends on, so a scenario cannot be broken by removing the principals or resources its traffic targets.

## Requirements

### Requirement: Essential nodes are declared per level
Each level's starting nodes SHALL be essential by default. A level MAY mark a specific starting node as non-essential, for example a NAT Gateway the player is expected to remove. Nodes the player adds from the dock MUST NOT be essential.

#### Scenario: Starting nodes default to essential
- **WHEN** a level loads with starting nodes that have no explicit essential setting
- **THEN** every one of those nodes is treated as essential

#### Scenario: Level opts a node out
- **WHEN** Round 7 marks its starting NAT Gateway as non-essential
- **THEN** the player can delete that NAT Gateway

#### Scenario: Player-added nodes are deletable
- **WHEN** the player drags an S3 bucket from the dock onto the board
- **THEN** that bucket can be deleted

### Requirement: Essential nodes cannot be deleted
The system SHALL block deleting essential nodes through every path: keyboard Delete or Backspace, inspector delete buttons, multi-selection delete, and board import. Essential nodes MUST still be movable, selectable and configurable, and their policies MUST still be editable.

#### Scenario: Keyboard delete is blocked
- **WHEN** an essential node is selected and the player presses Delete
- **THEN** the node stays on the board and a short notice explains that the node is required by this scenario

#### Scenario: Mixed selection delete
- **WHEN** the player selects one essential node and one player-added node and presses Delete
- **THEN** only the player-added node is removed and the notice names the essential node that was kept

#### Scenario: Essential node remains configurable
- **WHEN** the player edits the bucket policy of an essential S3 node
- **THEN** the change is applied

#### Scenario: Import cannot drop essential nodes
- **WHEN** the player imports a board JSON for the current level that omits an essential node
- **THEN** the import restores that node from the level's initial state and reports that it was restored

### Requirement: Essential nodes are visibly marked
The system SHALL show a lock indicator on essential nodes and hide or disable delete controls for them. The lock indicator MUST have an accessible label.

#### Scenario: Lock badge shown
- **WHEN** a level loads
- **THEN** every essential node shows a lock badge whose tooltip and accessible label read "Required by this scenario — cannot be deleted"

#### Scenario: Inspector delete disabled
- **WHEN** an essential node is open in the inspector
- **THEN** the delete button is disabled and its tooltip explains why

### Requirement: Edges stay deletable
The system SHALL allow deleting any edge, including edges present at level start.

#### Scenario: Remove a starting edge
- **WHEN** the player deletes an edge included in the level's initial edges
- **THEN** the edge is removed
