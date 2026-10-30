# dark-cyan-theme Specification

## Purpose

Changes the dark theme from near-black to a dark-cyan palette built on `#001F1F`, with readable, accessible contrast across all UI surfaces.

## Requirements

### Requirement: Dark-cyan base palette
With the dark theme active, the app background SHALL be `#001F1F`. Every raised surface (cards, nav bar, dock, inspector, modals) and muted surface MUST use tokens derived from the same cyan hue. Borders and text MUST use the dark-theme ink token, and hard shadows MUST use the dark-theme shadow token from the neo color palette. The previous near-black values (`#09090b`, `#121215`, `#18181b`) MUST NOT remain in dark-theme surfaces.

#### Scenario: Background color
- **WHEN** the dark theme is active
- **THEN** the computed background color of the app root is `rgb(0, 31, 31)`

#### Scenario: No legacy near-black surfaces
- **WHEN** the dark theme is active and the inspector, dock, top bar and a modal are open
- **THEN** none of their background colors is `#09090b`, `#121215` or `#18181b`

#### Scenario: Dark shadows use the palette token
- **WHEN** the dark theme is active and a card with a hard shadow is shown
- **THEN** its shadow color is the dark-theme shadow token (`#00A1C9`)

### Requirement: Accessible contrast
In the dark theme, body text SHALL have at least 4.5:1 contrast against the surface it sits on. Large text and UI component boundaries MUST have at least 3:1. Status colors (success, danger, warning, exploit red, legitimate green) MUST keep at least 3:1 against the dark-cyan surfaces.

#### Scenario: Muted text contrast
- **WHEN** muted secondary text is shown on the darkest surface
- **THEN** its contrast ratio is at least 4.5:1

### Requirement: Canvas follows the theme
The canvas background, grid dots, minimap, controls, edges and node cards SHALL use the dark-cyan tokens when the dark theme is active.

#### Scenario: Canvas grid
- **WHEN** the player switches from light to dark
- **THEN** the canvas background and grid change to dark-cyan tokens without a reload

### Requirement: Light theme background preserved
With the light theme active, the app background SHALL stay `#f8fafc`. Other light-theme tokens (cards, ink, borders, shadows, accents) MAY change, and come from the neo color palette.

#### Scenario: Light theme regression
- **WHEN** the light theme is active
- **THEN** the app background is still `#f8fafc`

#### Scenario: Light surfaces use the neo palette
- **WHEN** the light theme is active and a card is shown
- **THEN** its border and shadow use the light-theme ink token (`#232F3E`)
