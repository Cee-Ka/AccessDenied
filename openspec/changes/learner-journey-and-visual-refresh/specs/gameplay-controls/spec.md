## Purpose

Adds controls inspired by GonnaCrash that make building and iterating faster: undo/redo, run/skip, shortcuts, board import/export, start over, concept tags, return packets and a pager-style twist banner. The "Ask your agent" prompt is specified separately in `ask-your-agent`.

## ADDED Requirements

### Requirement: Undo and redo
The system SHALL support undo and redo for board edits: adding or removing a node or edge, moving a node (recorded once per drag), changing node configuration, editing a policy and reversing an edge. Shortcuts are Ctrl/⌘+Z for undo, and Ctrl/⌘+Shift+Z or Ctrl+Y for redo. History MUST be per level and cleared when the level changes or the board is reset. While a simulation is running, undo and redo MUST be disabled.

#### Scenario: Undo a policy edit
- **WHEN** the player edits a bucket policy and presses Ctrl/⌘+Z
- **THEN** the bucket policy returns to its previous content

#### Scenario: Redo after undo
- **WHEN** the player undoes adding an edge and then presses Ctrl/⌘+Shift+Z
- **THEN** the edge is back

#### Scenario: Shortcuts ignored while typing
- **WHEN** focus is inside the policy JSON editor and the player presses Ctrl/⌘+Z
- **THEN** the editor's own text undo runs, not board undo

### Requirement: Run and skip
Ctrl/⌘+Enter and the Run button SHALL start a simulation. Pressing either during a run MUST skip the remaining packet animations and show the final results at once. The results MUST match those of a run played to completion. The existing Space shortcut keeps working.

#### Scenario: Skip to end
- **WHEN** a run is in progress at packet 2 of 5 and the player presses Run again
- **THEN** packets 3 to 5 are evaluated without animation and the result summary and star rating appear right away

### Requirement: Board import and export
The system SHALL export the current board (level ID, nodes, configuration, policies, edges) as a downloadable JSON file. It SHALL import such a file for the same level after validating the policy documents and node types. Invalid files MUST be rejected with a clear message and leave the board unchanged.

#### Scenario: Round-trip
- **WHEN** the player exports a board, resets the level and imports the exported file
- **THEN** the board matches the exported state

#### Scenario: Wrong level
- **WHEN** the player imports a board file whose level ID is a different level
- **THEN** the import is rejected with a message naming the file's level

#### Scenario: Invalid policy
- **WHEN** the imported file has a policy statement with `"Effect": "Permit"`
- **THEN** the import is rejected and the message points to the invalid statement

### Requirement: Start over
The system SHALL provide "Start over", which restores the current level to its initial board after confirmation. Stars are kept.

#### Scenario: Start over keeps stars
- **WHEN** a player with 2 stars on Round 3 confirms "Start over"
- **THEN** the Round 3 board returns to its initial state and the rating stays at 2 stars

### Requirement: Concept tags on levels
Each level SHALL declare concept tags. The level picker MUST show up to three tags per level, plus a "+N" count for the rest. Each tag MUST open its glossary popover.

#### Scenario: Tags on level card
- **WHEN** the level picker shows Round 6
- **THEN** its card shows tags such as "KMS Key Policy" and "Secrets Manager", and choosing a tag opens its popover

### Requirement: Return packets for denied requests
When a packet is denied, the animation SHALL show a hollow return packet going from the denying node back to the caller, labeled with the outcome: 403 for an IAM deny, or "timeout" for an unreachable network. Allowed packets MUST show a filled return packet.

#### Scenario: 403 return
- **WHEN** a legitimate packet is denied at the identity-policy stage
- **THEN** a hollow packet labeled "403" travels back along the edge to the caller

### Requirement: Twist pager banner
When a level's threat or twist starts at the beginning of a run, the system SHALL show a pager-style banner that describes the symptom from the user's or on-call engineer's point of view without naming the root cause. The first time a twist is seen, the banner MUST stay until dismissed. After that it MUST auto-hide.

#### Scenario: First twist
- **WHEN** a player runs Round 2 for the first time
- **THEN** a pager banner reports a symptom such as "Unusual S3 reads from the preview service" and stays until dismissed

#### Scenario: Repeat run
- **WHEN** the player runs Round 2 again
- **THEN** the banner appears briefly and hides on its own
