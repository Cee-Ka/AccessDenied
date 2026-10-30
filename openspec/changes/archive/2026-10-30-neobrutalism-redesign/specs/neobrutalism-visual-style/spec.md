## Purpose

Makes neobrutalism the app's default visual style, as the PM approved: thick ink borders, hard offset shadows, flat fills, tight corners, bold display type and tactile buttons, across every surface of the game.

## ADDED Requirements

### Requirement: Neobrutalism is the default style
The app SHALL render in the neobrutalism style for every player, with no setting to switch back to the previous soft style. Layout, flows, game rules and the IAM engine MUST NOT change.

#### Scenario: Default on first load
- **WHEN** a new player opens the app
- **THEN** cards, buttons, nodes and modals use ink borders and hard shadows

#### Scenario: Gameplay unchanged
- **WHEN** the full test suite runs after the restyle
- **THEN** every engine, level, persistence and control test passes unchanged

### Requirement: Visual language
Styled surfaces SHALL follow these rules:
- **Borders**: solid ink borders, 2px on small controls and chips, 3px on cards, nodes, drawers and modals
- **Shadows**: offset with no blur, 2px on chips, 4px on buttons and nodes, 6px on modals, in the theme's shadow token
- **Corners**: at most 6px radius; chips and inputs may be square
- **Fills**: flat only; no gradients, glows or `backdrop-blur` on any surface
- **Typography**:
  - headings, button labels and level titles in the display face at weight 800 or more
  - body text in the body face
  - ARNs, policy JSON and telemetry in the mono face

#### Scenario: No gradients or blur
- **WHEN** component class names are scanned
- **THEN** none uses `bg-gradient-*`, `backdrop-blur*` or a blurred colored shadow

#### Scenario: Modal frame
- **WHEN** the coach modal is open
- **THEN** it has a 3px ink border, a 6px hard shadow and a heading in the display face

### Requirement: Tactile buttons
Buttons SHALL press into their shadow: on hover the fill brightens, on press the button moves toward its shadow and the shadow offset shrinks to at most 1px. Disabled buttons MUST show a dashed border, no shadow and muted text. With `prefers-reduced-motion: reduce`, the press MUST change only the shadow, with no movement.

#### Scenario: Pressed button
- **WHEN** the player presses the Simulate button
- **THEN** the button shifts toward its shadow and the shadow shrinks while pressed

#### Scenario: Reduced motion
- **WHEN** reduced motion is on and the player presses a button
- **THEN** the shadow shrinks but the button does not move

### Requirement: Coverage of every surface
The style SHALL apply to:
- the top bar and level picker
- the service dock
- canvas nodes, container nodes, edges, edge labels and the edge action buttons
- the inspector, its tabs, config toggles and the policy editor frame
- the hint drawer
- the coach, victory, report card, welcome, settings and Ask-your-agent modals
- info popovers, toasts, the pager banner and the guide card

#### Scenario: Every overlay restyled
- **WHEN** each overlay listed above is opened in turn
- **THEN** each one shows ink borders and a hard shadow

### Requirement: Simulation visuals in neobrutalism
Edges SHALL be ink lines at least 2.5px wide with a solid ink arrowhead. Packets and return packets MUST have a 2px ink outline: legitimate packets in Smile Orange, exploit packets in Security Coral, allowed returns filled with Storage Lime, and denied or timed-out returns hollow. Selected and simulating edges MUST stay distinguishable from idle edges by color, not only by width.

#### Scenario: Packet visible on light background
- **WHEN** a legitimate packet animates on the light theme
- **THEN** it is an orange dot with an ink outline that stays visible against `#f8fafc`

#### Scenario: Exploit edge
- **WHEN** an exploit packet is animating
- **THEN** the edge and its arrowhead are drawn in Security Coral

### Requirement: Bundled fonts
The display, body and mono faces SHALL be bundled with the app build and MUST NOT load from any remote host. Each face MUST declare a system fallback stack.

#### Scenario: Offline fonts
- **WHEN** the built app runs with no network access
- **THEN** headings render in the display face and no font request leaves the origin

### Requirement: Accessible focus
Every focusable control SHALL show a visible focus ring at least 3px wide in Prime Yellow with an ink outline, so it stays visible on every surface and accent fill.

#### Scenario: Keyboard focus on a primary button
- **WHEN** the player tabs to the Simulate button
- **THEN** a yellow focus ring with an ink outline is visible around it
