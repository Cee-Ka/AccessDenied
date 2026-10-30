## 1. Palette tokens and fonts

- [x] 1.1 Add `--neo-*` tokens (bg, surface, raised, ink, muted, shadow + six accents) with `-rgb` twins for light and dark in `src/index.css`; keep `#f8fafc` and `#001F1F` backgrounds
- [x] 1.2 Alias `--color-obsidian-*` to the matching `--neo-*` values so unmigrated components keep rendering
- [x] 1.3 Extend `tailwind.config.js`: `neo.*` colors (with `<alpha-value>`), `boxShadow` neo-sm/neo/neo-lg (no blur, `var(--neo-shadow)`), `borderWidth` 3, `fontFamily` display/sans/mono with fallbacks
- [x] 1.4 `pnpm add @fontsource/archivo @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono`; import Latin weights (Archivo 700/800/900, Plex Sans 400/500/600, Plex Mono 400/600) in `src/main.tsx`
- [x] 1.5 Update `tests/theme.test.ts`: assert both backgrounds, every contrast pairing from the `neo-color-palette` spec in light and dark, and that dark shadow is `#00A1C9`

## 2. Style primitives

- [x] 2.1 Create `src/styles/neo.css` (`@layer components`) with `neo-card`, `neo-panel`, `neo-modal`, `neo-btn` (+ primary/secondary/danger/ghost), `neo-icon-btn`, `neo-chip`, `neo-tab`/`neo-tab-active`, `neo-input`, `neo-badge-pass|deny|info|new`, `neo-focus`; import it from `index.css`
- [x] 2.2 Implement press/hover/disabled behavior in `neo-btn` with a `prefers-reduced-motion` override that changes only the shadow
- [x] 2.3 Implement the shared yellow + ink focus ring and apply it globally to `:focus-visible`

## 3. Leaf components

- [x] 3.1 Restyle `InfoPopover` (trigger chip + panel) and `ConceptTags`
- [x] 3.2 Restyle `ToastHost` and `TwistPagerBanner` (pager uses Prime Yellow)
- [x] 3.3 Restyle node badges, the essential lock badge (yellow chip) and `ServiceIconTile` (white tile, ink border)

## 4. Bars and drawers

- [x] 4.1 Restyle `TopNav` (2px borders on compact controls, Simulate as `neo-btn-primary`, Skip state) and `LevelPicker` panel/rows
- [x] 4.2 Restyle `ComponentDock` items, NEW badge and locked state
- [x] 4.3 Restyle `InspectorDrawer`, tabs (lilac active), `ConfigToggles` switches and the `PolicyEditor` frame/status line
- [x] 4.4 Restyle `HintDrawer`

## 5. Modals and overlays

- [x] 5.1 Restyle `IAMCoachModal` (trace rows: lime pass / coral denied fills) and `AskAgentPanel`
- [x] 5.2 Restyle `VictoryModal` (yellow stars) and `MissionReportCardModal`
- [x] 5.3 Restyle `WelcomeModal`, `SettingsModal` (confirm bar uses `neo-btn-danger`) and `GuideOverlay` (Glacier Sky card)

## 6. Canvas

- [x] 6.1 Restyle `PrincipalNode`, `ResourceNode`, `ContainerNode` with `neo-card`; selected node uses lilac accent + 6px shadow
- [x] 6.2 Update `AnimatedPacketEdge`: ink 2.5px idle edges, lilac selected, orange legit, coral exploit; arrowhead follows stroke; edge label/action buttons as chips
- [x] 6.3 Give `PacketDot` a 2px ink outline; lime filled allow returns, hollow coral/yellow deny/timeout returns
- [x] 6.4 Switch canvas background to a faint `raised` line grid; restyle React Flow controls and handles

## 7. Cleanup and guards

- [x] 7.1 Remove `--color-obsidian-*` aliases and migrate any remaining `obsidian-*` classes to `neo-*`
- [x] 7.2 Add a test that scans `src/components/**` for banned patterns: `bg-gradient-`, `backdrop-blur`, `shadow-*-500/`, `rounded-(xl|2xl|3xl)`, `obsidian-`, raw hex surface colors
- [x] 7.3 Update `AGENTS.md` theme section: Squid & Smile palette, accent roles, neo primitives rule

## 8. Verification

- [x] 8.1 `pnpm test`, `pnpm typecheck` and `pnpm build` pass; built `dist/` contains the woff2 files and no remote font URLs
- [x] 8.2 Run the app and check in light and dark: top bar at 1024/1280px, level picker, dock, nodes/edges during a run (legit, exploit, return packets), inspector + policy editor, every modal, popover, toast, pager, guide; keyboard focus ring and reduced-motion press
- [x] 8.3 `openspec validate neobrutalism-redesign --strict` passes
