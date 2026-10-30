## Purpose

Lets a player copy a ready-made tutor prompt that describes the current level, their design and the last run's result, so they can ask their own AI assistant to explain the outcome without being handed the solution.

## ADDED Requirements

### Requirement: Ask your agent action
After a simulation run completes, the system SHALL offer an "Ask your agent" action in the result view (coach modal and victory modal). Choosing it MUST show the generated prompt in a read-only preview with a "Copy" button that puts the full prompt on the clipboard. The game MUST NOT send the prompt to any network service itself.

#### Scenario: Copy prompt after a failed run
- **WHEN** a run fails and the player chooses "Ask your agent" and then "Copy"
- **THEN** the full prompt is on the clipboard and a confirmation says it was copied

#### Scenario: Not available before a run
- **WHEN** no run has completed on the current board since the last edit
- **THEN** the "Ask your agent" action is disabled with a tooltip saying to run the simulation first

#### Scenario: Clipboard unavailable
- **WHEN** clipboard access is denied
- **THEN** the prompt text in the preview is selected so the player can copy it by hand, and a notice explains this

### Requirement: Prompt content
The generated prompt SHALL contain, in this order:
- a tutor role line, plus instructions not to redesign the setup or give a finished answer
- a statement that the game uses its own simplified model of AWS, and that the data below should be trusted over real-world details
- a `<level>` block with the mode, round number, title, goal, threat or twist, budget and current monthly cost
- a `<design>` block with a Mermaid `flowchart LR` of every node (label, service, cost) and every edge in source → target direction, followed by the line "Arrows show the direction requests travel."
- a `<parts>` block with one line per node: label, service, a one-sentence role taken from the concept glossary, incoming and outgoing connections, key configuration such as IMDS version, Block Public Access or private subnet, and attached policies as compact JSON
- a `<result>` block with the outcome (passed with N stars, or failed), each legitimate packet that failed and each exploit that got through, the stage that decided each one, and the trace summary
- closing instructions that depend on the outcome

#### Scenario: Design block lists directed edges
- **WHEN** the board has an edge from `web-server-ec2` to `invoices-bucket`
- **THEN** the `<design>` block contains a Mermaid line linking the two node IDs with `-->` from the EC2 node to the bucket node

#### Scenario: Policies are included
- **WHEN** `invoices-bucket` has a bucket policy
- **THEN** its `<parts>` line includes that policy as single-line JSON labeled "Resource policy"

#### Scenario: Result names the deciding stage
- **WHEN** the legitimate packet "Web server reads invoice" was denied at the Identity Policy stage
- **THEN** the `<result>` block names that packet, says "denied at Identity Policy" and includes the trace summary text

### Requirement: Outcome-specific closing instructions
For a failed run, the closing instructions SHALL ask the agent to explain why the design failed using the data given, not to say which node or policy to change, to ask one or two leading questions, and to stay under 200 words in short sentences. For a passed run below 3 stars, they SHALL ask the agent to explain what stands between this design and the next star (security or cost) without giving the change. For a 3-star run, they SHALL ask the agent to quiz the player with two questions about why the design works.

#### Scenario: Failed run instructions
- **WHEN** the prompt is generated after a failed run
- **THEN** it ends with instructions to explain the failure, avoid naming the fix, ask one or two questions and stay under 200 words

#### Scenario: Two-star run instructions
- **WHEN** the prompt is generated after a 2-star run
- **THEN** the closing instructions mention the budget and least-privilege criteria for the third star and forbid giving the finished change

### Requirement: Deterministic, bounded prompt
The same board and results SHALL always produce the same prompt text. Node IDs used in the Mermaid diagram MUST be safe identifiers, and labels MUST have Mermaid-breaking characters escaped. The prompt MUST NOT include the player's display name or any other profile data.

#### Scenario: Deterministic output
- **WHEN** the prompt is generated twice for an unchanged board and result
- **THEN** both outputs are identical

#### Scenario: Label escaping
- **WHEN** a node label contains a double quote or square bracket
- **THEN** the Mermaid block is still valid and the label is shown with those characters escaped
