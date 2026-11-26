## 1. Shared modal hook & styles

- [x] 1.1 Create `src/components/common/useModalDialog.ts` (initial focus, Tab trap, topmost-dialog Escape, focus restore)
- [x] 1.2 Update `src/styles/neo.css` (`.neo-icon-btn` to `w-8 h-8`, preserve `:focus-visible` ring on `.neo-input:focus`)

## 2. Layout, navigation & drawer fixes

- [x] 2.1 Fix `ComponentDock.tsx` (`top-0`, collapse `aria-label` + `aria-expanded`, `text-[10px]` badge)
- [x] 2.2 Fix `InspectorDrawer.tsx` (`top-0`, `max-w-[calc(100vw-3rem)]`, close `aria-label`, `role="tablist"`/`tab`/`aria-selected`, remove `animate-in`)
- [x] 2.3 Fix `HintDrawer.tsx` (reset `unlockedTier` on level change, `absolute top-0 bottom-0`, `max-w`, close `aria-label`, `aria-expanded`, `text-xs`, fix hover, remove `animate-in`)
- [x] 2.4 Update `TopNav.tsx` (remove duplicate Settings trigger, show Telemetry from `md`, `aria-pressed` on mode buttons, `aria-label` on icon buttons, `motion-reduce:animate-none` on spinner) and `App.tsx` Escape fallback
- [x] 2.5 Update `LevelPicker.tsx` (replace Unicode `★` with `<Star />`) and `Notifications.tsx` (remove `w-6 h-6` shrink override)

## 3. Accessible modals, forms, editor & node polish

- [x] 3.1 Update `IAMCoachModal.tsx`, `MissionReportCardModal.tsx`, `VictoryModal.tsx`, `SettingsModal.tsx`, `AskAgentPanel.tsx`, and `WelcomeModal.tsx` with `useModalDialog`, dialog ARIA attributes, hover/focus fixes, `text-xs` body copy, and no dead `animate-in`
- [x] 3.2 Update `ConfigToggles.tsx` (`role="switch"`, `aria-checked`, `<label htmlFor>`, clipboard catch, `text-xs`, focus ring)
- [x] 3.3 Update `PolicyEditor.tsx` (`role="alert"` + `bg-neo-coral neo-on-accent` on parse error, warning toast on invalid JSON actions, truncated ARN chips)
- [x] 3.4 Upgrade node badges in `PrincipalNode.tsx` and `ResourceNode.tsx` from `text-[9px]` to `text-[10px]`

## 4. Tests, verification & archive

- [x] 4.1 Create `tests/uiAccessibility.test.tsx` covering `HintDrawer`, modals, `ConfigToggles`, `PolicyEditor`, and `TopNav`
- [x] 4.2 Run `typecheck`, full Vitest suite (including `styleGuard` & `theme`), Python tests, `build`, and `audit:bundle`
- [x] 4.3 Validate and archive `ui-ux-accessibility-and-layout-fixes` via OpenSpec
