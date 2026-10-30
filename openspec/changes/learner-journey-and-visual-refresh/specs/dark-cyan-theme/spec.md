## Purpose

Changes the dark theme from near-black to a dark-cyan palette built on `#001F1F`, with readable, accessible contrast across all UI surfaces.

## ADDED Requirements

### Requirement: Dark-cyan base palette
With the dark theme active, the app background SHALL be `#001F1F`. Every raised surface (cards, nav bar, dock, inspector, modals), border and muted surface MUST use tokens derived from the same cyan hue. The previous near-black values (`#09090b`, `#121215`, `#18181b`) MUST NOT remain in dark-theme surfaces.

#### Scenario: Background color
- **WHEN** the dark theme is active
- **THEN** the computed background color of the app root is `rgb(0, 31, 31)`

#### Scenario: No legacy near-black surfaces
- **WHEN** the dark theme is active and the inspector, dock, top bar and a modal are open
- **THEN** none of their background colors is `#09090b`, `#121215` or `#18181b`

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

### Requirement: Light theme unchanged
The light theme's colors SHALL stay as they are.

#### Scenario: Light theme regression
- **WHEN** the light theme is active
- **THEN** the app background is still `#f8fafc`
