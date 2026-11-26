## Why

A UI/UX and accessibility audit of the AccessDenied interface identified several layout, keyboard, screen-reader, and visual-feedback defects: side drawers offset 56px below `TopNav`, `HintDrawer` retaining unlocked hint tiers across levels, a duplicate Settings trigger on `TopNav`, modals missing dialog semantics/focus trapping/`Escape` dismissal, unlabeled icon buttons and switches, silent error swallowing in `PolicyEditor`, dead animation classes, and undersized text/icon targets.

## What Changes

- **Workspace Layout & Drawer Fixes**:
  - Align `ComponentDock`, `InspectorDrawer`, and `HintDrawer` to `top-0` inside the main workspace container (`flex-1 relative`) and bound drawer widths with `max-w-[calc(100vw-3rem)]`.
  - Reset `HintDrawer` unlocked tier to `0` whenever `currentLevel.id` changes.
  - Remove the duplicate `openSettings` trigger from `TopNav` and keep the Telemetry HUD visible from `md` (`>=768px`) upward.
- **Accessible Modal Dialogs**:
  - Add a shared `useModalDialog` hook (`src/components/common/useModalDialog.ts`) providing focus entry, `Tab` focus trapping, topmost-dialog `Escape` handling, and focus restoration.
  - Apply `useModalDialog`, `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` across `IAMCoachModal`, `MissionReportCardModal`, `VictoryModal`, `SettingsModal`, `AskAgentPanel`, and `WelcomeModal`.
- **Controls, Forms, Feedback & Polish**:
  - Add `aria-label` to all icon-only buttons, `aria-pressed` to mode/IMDS toggles, `role="switch"` + `aria-checked` to configuration switches, `<label htmlFor>` to inputs/selects, and `role="tablist"`/`role="tab"`/`aria-selected` to inspector tabs.
  - Restore the shared `:focus-visible` yellow+ink focus ring on inputs and textareas, and fix no-op hover classes.
  - Add error-state styling (`bg-neo-coral neo-on-accent`, `role="alert"`), invalid-JSON toast feedback on template actions, and truncated ARN chips in `PolicyEditor`.
  - Upgrade narrative body copy from `11px` to `text-xs`, node/dock `9px` badges to `text-[10px]`, `.neo-icon-btn` to `w-8 h-8`, replace Unicode `★` with Lucide `<Star />`, add `motion-reduce:animate-none` to spinners, and remove unused `animate-in` classes.

## Capabilities

### New Capabilities
- `ui-accessibility-and-layout`: Workspace drawer alignment, hint-state reset, accessible modal dialog focus/keyboard behavior, ARIA semantics for buttons/switches/tabs/forms, error feedback, and neobrutalism polish.

### Modified Capabilities
- None. Existing palette tokens (`neo-color-palette`) and neobrutalism surface/shadow rules (`neobrutalism-visual-style`) remain unchanged and enforced.

## Impact

- **Components**: `src/App.tsx`, `src/styles/neo.css`, `src/components/common/useModalDialog.ts` (new), `dock/ComponentDock.tsx`, `inspector/InspectorDrawer.tsx`, `inspector/ConfigToggles.tsx`, `inspector/PolicyEditor.tsx`, `coach/HintDrawer.tsx`, `coach/IAMCoachModal.tsx`, `coach/MissionReportCardModal.tsx`, `coach/AskAgentPanel.tsx`, `hud/TopNav.tsx`, `hud/LevelPicker.tsx`, `hud/Notifications.tsx`, `modals/VictoryModal.tsx`, `modals/SettingsModal.tsx`, `modals/WelcomeModal.tsx`, `canvas/nodes/PrincipalNode.tsx`, `canvas/nodes/ResourceNode.tsx`.
- **Tests**: `tests/uiAccessibility.test.tsx` (new); existing `tests/styleGuard.test.ts`, `tests/theme.test.ts`, `tests/controls.test.ts`, and `tests/infoPopover.test.tsx` remain green.
