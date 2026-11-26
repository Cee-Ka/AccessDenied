## Context

AccessDenied renders its HUD (`TopNav`), workspace (`ComponentDock`, `FlowCanvas`, `InspectorDrawer`, `HintDrawer`), and overlays/modals on top of Zustand state and the "Squid & Smile" neobrutalism CSS system (`src/styles/neo.css`, enforced by `tests/styleGuard.test.ts` and `tests/theme.test.ts`).

## Goals / Non-Goals

**Goals:**
- Fix layout offset bugs (`top-14` inside a `flex-1 relative` container below `TopNav`) and cross-level state leakage in `HintDrawer`.
- Standardize keyboard and screen-reader accessibility across all modals, drawers, switches, inputs, tabs, and icon-only buttons.
- Provide clear error feedback in `PolicyEditor` and clean up typography, touch targets, reduced-motion, and dead utility classes without violating `tests/styleGuard.test.ts`.

**Non-Goals:**
- Changing the Squid & Smile color palette, shadows, or corner radii.
- Modifying the IAM engine, level curriculum, or store persistence schema.

## Decisions

### 1. Shared `useModalDialog` hook over per-modal listeners
A single `useModalDialog(isOpen, onClose)` hook in `src/components/common/useModalDialog.ts` handles initial focus, `Tab`/`Shift+Tab` cycling, topmost `[role="dialog"]` `Escape` closing, and focus restoration. Checking `dialogs[dialogs.length - 1] === container` ensures nested overlays (`InfoPopover` or `AskAgentPanel` opened over `IAMCoachModal`/`VictoryModal`) intercept `Escape` first without dismissing underlying modals.

### 2. Placing `HintDrawer` inside the workspace flex area
Moving `HintDrawer` from `fixed inset-y-0 z-50` to `absolute top-0 bottom-0 right-0 z-30` inside `App.tsx`'s `flex-1 relative` container keeps `TopNav` unobstructed and matches `InspectorDrawer` geometry.

### 3. Style-guard-safe error highlighting
In `PolicyEditor.tsx`, `parseError ? 'bg-neo-coral neo-on-accent' : 'bg-neo-raised'` keeps `neo-on-accent` in the exact same string literal as `bg-neo-coral`, satisfying `tests/styleGuard.test.ts` and maintaining WCAG AA dark-ink contrast in both light and dark themes.

## Risks / Trade-offs

- **Global `Escape` handler order:** `App.tsx` still runs a window `keydown` fallback for clearing node selection or closing `HintDrawer`; keeping `useModalDialog` checking `isTopmostDialog()` and calling `e.stopPropagation()` prevents `App.tsx` from clearing canvas selection behind an open modal.
