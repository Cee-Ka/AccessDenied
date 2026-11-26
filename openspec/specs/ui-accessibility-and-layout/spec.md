# ui-accessibility-and-layout Specification

## Purpose
Defines workspace layout alignment, hint state hygiene, modal keyboard/focus management, ARIA semantics, editor error feedback, and visual polish requirements for the AccessDenied React UI.

## Requirements

### Requirement: Workspace drawer alignment and hint isolation
`ComponentDock`, `InspectorDrawer`, and `HintDrawer` SHALL align at `top-0` inside the workspace container with `max-w-[calc(100vw-3rem)]` width bounds, `HintDrawer` MUST reset its unlocked tier on level change, and `TopNav` SHALL display telemetry from `md` upward without duplicate Settings triggers.

#### Scenario: Side drawers align flush under the top bar
- **WHEN** `ComponentDock`, `InspectorDrawer`, or `HintDrawer` renders inside the workspace
- **THEN** each uses `top-0` instead of `top-14` and caps width for narrow viewports

#### Scenario: Switching levels resets unlocked hints
- **WHEN** the player unlocks hint tiers on one level and switches to a different level
- **THEN** `HintDrawer` resets back to tier `0`

### Requirement: Accessible modal dialog behavior
`IAMCoachModal`, `MissionReportCardModal`, `VictoryModal`, `SettingsModal`, `AskAgentPanel`, and `WelcomeModal` SHALL expose `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`, move focus inside on open, trap `Tab` focus, close the topmost dialog on `Escape`, and restore focus on close.

#### Scenario: Pressing Escape closes any open modal
- **WHEN** `IAMCoachModal`, `MissionReportCardModal`, or `VictoryModal` is open and the user presses `Escape`
- **THEN** that modal closes and restores focus to its opener

### Requirement: Accessible controls, switches, forms, and tabs
Icon-only buttons SHALL define `aria-label`, toggle switches SHALL expose `role="switch"` and `aria-checked`, form controls SHALL associate `<label htmlFor>`, inspector tabs SHALL expose `role="tablist"`/`role="tab"`/`aria-selected`, and inputs MUST preserve the `:focus-visible` focus ring.

#### Scenario: Screen-reader semantics on inspector and navigation controls
- **WHEN** `TopNav`, `InspectorDrawer`, or `ConfigToggles` renders
- **THEN** icon buttons have accessible names, switches expose `aria-checked`, and inputs have explicit `<label>` associations

### Requirement: Editor feedback, typography, and motion polish
`PolicyEditor` SHALL render `role="alert"` with `bg-neo-coral neo-on-accent` on invalid JSON and warn on invalid-JSON template actions, narrative copy SHALL use `text-xs`, `.neo-icon-btn` SHALL be `w-8 h-8`, spinners SHALL honor `prefers-reduced-motion`, `LevelPicker` SHALL use `<Star />` instead of Unicode `★`, and unused `animate-in` classes SHALL be removed.

#### Scenario: Invalid JSON policy actions inform the user
- **WHEN** the user enters malformed JSON in `PolicyEditor` and clicks `+ Allow`, `+ Deny`, or `Format`
- **THEN** the footer shows `role="alert"` and a warning toast explains the syntax issue
