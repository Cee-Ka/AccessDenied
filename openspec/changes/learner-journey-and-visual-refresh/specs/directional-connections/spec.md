## Purpose

Makes connections between nodes directional, pointing from caller to callee, both on screen and in the network check, so the board shows who calls whom.

## ADDED Requirements

### Requirement: Arrowheaded edges
Every edge on the canvas SHALL be drawn with an arrowhead at its target end. The arrowhead MUST stay visible in the light theme and the dark theme, and while a packet animation is running.

#### Scenario: New connection shows direction
- **WHEN** the player drags from the Lambda node's handle to the S3 node
- **THEN** the new edge shows an arrowhead pointing at the S3 node

#### Scenario: Arrow color reflects simulation
- **WHEN** an exploit packet is animating along an edge
- **THEN** the edge and its arrowhead use the exploit color, and they return to the default color after the run

### Requirement: Directed reachability
The network check SHALL treat an edge as a path from its source node to its target node only. A packet from A to B is connected only if there is an edge from A to B, or from A to an intermediate routing node (NAT gateway, VPC endpoint or IAM role) that applies under the existing rules. An edge from B to A MUST NOT count.

#### Scenario: Correct direction passes
- **WHEN** a legitimate packet goes from `web-server-ec2` to `invoices-bucket` and an edge exists from `web-server-ec2` to `invoices-bucket`
- **THEN** the network stage passes

#### Scenario: Reversed edge fails with guidance
- **WHEN** the only edge between the two nodes goes from `invoices-bucket` to `web-server-ec2`
- **THEN** the network stage fails and the trace says the connection points the wrong way and how to reverse it

#### Scenario: External actors still need no edge
- **WHEN** an exploit packet comes from an `external_vendor` node with no edges
- **THEN** connectivity is evaluated as before (external actors are not required to be wired)

### Requirement: Reverse connection action
The system SHALL let the player reverse a selected edge's direction in one action. The reversal MUST be recorded in undo history.

#### Scenario: Reverse an edge
- **WHEN** the player selects an edge from S3 to Lambda and chooses "Reverse direction"
- **THEN** the edge now goes from Lambda to S3, its arrowhead points at S3, and undo restores the original direction

### Requirement: Level data uses caller-to-callee direction
Every level's initial edges SHALL point from the calling principal or compute node to the resource or role it calls. The level test suite MUST verify that each level's target solution still passes under directed reachability.

#### Scenario: Level suite under directed edges
- **WHEN** the level test suite runs
- **THEN** every level's initial-state test and target-solution test passes with directed reachability active
