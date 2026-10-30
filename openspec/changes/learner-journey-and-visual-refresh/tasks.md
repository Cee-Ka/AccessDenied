## 1. Tooling, pnpm and agent rules

- [x] 1.1 Add `"packageManager": "pnpm@<current stable>"` and `engines.node` to `package.json`; delete `package-lock.json`; run `pnpm install` and commit-ready `pnpm-lock.yaml`
- [x] 1.2 Update `.github/workflows/deploy.yml` to use `pnpm/action-setup`, `cache: 'pnpm'`, `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`
- [x] 1.3 Add `packages: ['packages/*']` to `pnpm-workspace.yaml` (keep `allowBuilds`)
- [x] 1.4 Write root `AGENTS.md` merging both `iam-development-guidelines.md` copies, plus pnpm-only, workspace layout, plain-copy writing rules and theme token rules
- [x] 1.5 Write root `CLAUDE.md` (`@AGENTS.md` + Claude skills/OpenSpec notes); replace `.agents/rules/…` and `.claude/rules/…` bodies with a pointer to `AGENTS.md`
- [x] 1.6 Verify `pnpm test` and `pnpm build` pass on a clean checkout

## 2. Player progress persistence

- [x] 2.1 Create `src/persistence/` with `SaveV2` type, safe `load()`/`save()` (try/catch), and `migrate()` from `access_denied_stars_v1` / `access_denied_theme_v1`
- [x] 2.2 Handle corrupt JSON (backup key + defaults), newer-version records (read-only session) and blocked storage (in-memory + notice flag)
- [x] 2.3 Add profile (display name, createdAt, firstRunCompleted, lastLevelId) and settings (theme, sound, simSpeed) to the store, hydrated from `load()`
- [x] 2.4 Save per-level boards (nodes + edges, transient sim fields stripped) with `levelRevision` hash via a debounced store subscription; skip saves mid-drag
- [x] 2.5 Restore saved board on `loadLevel`; on revision mismatch offer "Start over" instead of loading
- [x] 2.6 Open `lastLevelId` on startup when unlocked; show display name in TopNav; add settings panel (name, sound, theme, reset level, reset all with confirm)
- [x] 2.7 Remove old ad-hoc `STORAGE_KEY`/`THEME_STORAGE_KEY` code paths from `useGameStore.ts`
- [x] 2.8 Tests: migration, corrupt record, newer version, blocked storage, best-stars retention, board round-trip through save/load

## 3. Essential node protection

- [x] 3.1 Add `essential?: boolean` to `GameLevel.initialNodes` and `CloudNodeData`; default starting nodes to `true`, dock nodes to `false`
- [x] 3.2 Mark Round 7's starting NAT Gateway (and any other intended-removal node found in the audit) `essential: false`
- [x] 3.3 Implement `filterDeletableNodeIds` and apply it in `removeNodeFromBoard`, `onNodesChange` remove branch, and board import (restore missing essentials from level)
- [x] 3.4 Set React Flow `deletable: false` on essential nodes when building the node list
- [x] 3.5 Add lock badge with accessible label to node components; disable inspector delete with tooltip; toast naming kept nodes on blocked delete
- [x] 3.6 Tests: keyboard/remove-change path, mixed selection, inspector path, import restore, essential node still editable, edges still deletable

## 4. Directional connections

- [x] 4.1 Change `network.ts` edge check to directed (source → target); add "points the wrong way" trace when only a reverse edge exists
- [x] 4.2 Make `runSimulation` edge highlight directional
- [x] 4.3 Add `markerEnd` (`ArrowClosed`) to all edges with a theme-driven color variable, including during exploit/legit animation
- [x] 4.4 Add "Reverse direction" action for a selected edge (recorded in undo history)
- [x] 4.5 Audit every level's `initialEdges` and solution wiring in `tests/levels.test.ts` for caller → callee direction; fix any reversed data
- [x] 4.6 Tests: forward passes, reverse fails with guidance, external actor unchanged, reverse action; full level suite green

## 5. AWS icon library package

- [x] 5.1 Scaffold `packages/aws-icons` (`package.json` name `@access-denied/aws-icons`, `src/index.ts`, `svg/`, `LICENSE-NOTICE.md`)
- [x] 5.2 Download the official AWS Architecture Icons package manually; add `scripts/sync-icons.mjs` that copies the curated list (~18 icons) from the local zip; record release version in the notice
- [x] 5.3 Export `NodeType → icon` map and `<AwsIcon type label />` with accessible text; add root dependency `"@access-denied/aws-icons": "workspace:*"`
- [x] 5.4 Replace Lucide service icons in `PrincipalNode`, `ResourceNode`, `ContainerNode` and `ComponentDock` with `AwsIcon` on a contrast tile; keep Lucide for generic UI glyphs
- [x] 5.5 Tests: every `NodeType` resolves to an icon; package contains only mapped icons; build output has no remote icon URLs

## 6. Concept glossary and info popovers

- [x] 6.1 Create `src/content/concepts.ts` with typed entries for all required concepts, every dock service and every trace stage
- [x] 6.2 Build accessible `InfoPopover` (click/Enter/Space open, Escape/outside close, focus return, viewport clamping, Escape handled before App-level handler)
- [x] 6.3 Wire ⓘ into dock entries, inspector policy tabs, evaluation trace rows (coach modal) and report card concept lists
- [x] 6.4 Tests: glossary coverage for dock types and trace stages; popover keyboard behavior

## 7. Guided onboarding and Round 0

- [x] 7.1 Add `conceptTags` and optional `onboardingSteps` to `GameLevel`; add concept tags to all existing levels
- [x] 7.2 Author `src/levels/round0-cloud-basics.ts` (principal, resource, connection, identity policy, resource policy, explicit deny, boundary, SCP) with packets, criteria, hints and target solution; register first in `ALL_LEVELS`
- [x] 7.3 Update `isLevelUnlocked`: Round 0 always unlocked, Round 1 independent of Round 0; update `tests/progression.test.ts`
- [x] 7.4 Implement named completion predicates (`edgeExists`, `policyHasDeny`, `boundaryAttached`, `scpAttached`, `simulationRun`, …) in `src/onboarding/`
- [x] 7.5 Build coach-mark overlay (highlight ring + step card, Back/Next/Exit, non-blocking canvas) with step progress persisted in `SaveV2.progress.onboarding`
- [x] 7.6 Build first-run welcome flow (optional name, 3-step loop explainer, Start Round 0 / Skip) driven by `profile.firstRunCompleted`
- [x] 7.7 Add Round 0 initial-state and target-solution tests to `tests/levels.test.ts`

## 8. GonnaCrash-inspired gameplay controls

- [x] 8.1 Add history slice (`past`/`future`, cap 50, snapshot before recorded actions, drag recorded on stop, cleared on level change/reset/import, disabled during sim)
- [x] 8.2 Bind Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, Ctrl+Y; skip when focus is in inputs or CodeMirror; add undo/redo buttons to TopNav
- [x] 8.3 Add `skipRequested` to `runSimulation`; Run button and Ctrl/⌘+Enter start or skip; keep Space
- [x] 8.4 Implement board export (JSON download) and import (level ID check, `PolicyDocument`/`Effect` validation, node type validation, essential restore)
- [x] 8.5 Add "Start over" with confirmation (resets board + history, keeps stars)
- [x] 8.6 Show up to 3 concept tags + "+N" on level picker cards, each opening its popover
- [x] 8.7 Add return-packet animation in `AnimatedPacketEdge`: hollow "403"/"timeout" for denies, filled for allows
- [x] 8.8 Add per-level `twistPager` copy and pager banner (sticky on first view, auto-hide after; seen-state persisted)
- [x] 8.9 Tests: undo/redo of policy edit, edge add, reverse; skip results equal full run; import round-trip, wrong level, invalid Effect; start over keeps stars

## 9. Dark-cyan theme

- [x] 9.1 Replace `.dark` tokens in `src/index.css` with the `#001F1F` hue-locked palette; replace hard-coded `aws.dark/card/squid/border` usages with tokens
- [x] 9.2 Theme canvas background, grid dots, minimap, controls, edge and arrow colors via tokens
- [x] 9.3 Tune status colors against dark-cyan surfaces
- [x] 9.4 Add a contrast unit test computing ratios for text/muted/status tokens against surfaces (≥4.5:1 text, ≥3:1 UI); assert light-theme tokens unchanged
- [x] 9.5 Grep for and remove remaining `#09090b`/`#121215`/`#18181b` in dark-theme styles

## 10. Ask your agent

- [x] 10.1 Implement pure `src/tutor/buildTutorPrompt.ts` (role + simplified-model note, `<level>`, Mermaid `<design>` with escaped labels and directed edges, `<parts>` with glossary role, connections, key config and compact policy JSON, `<result>` with failing packets and deciding stage, outcome-specific closing instructions, truncation guard)
- [x] 10.2 Track a "results are current" flag in the store (cleared on any board edit) to enable/disable the action
- [x] 10.3 Build `AskAgentPanel` (read-only preview, Copy with clipboard fallback and confirmation) and open it from the coach and victory modals
- [x] 10.4 Tests: determinism, directed Mermaid edges, label escaping, policy inclusion, deciding stage in result, failed vs 2-star vs 3-star closing text, no profile data in output

## 11. Neobrutalism PM showcase (outside the repo)

- [x] 11.1 Build a self-contained `neobrutalism.html` in the session scratchpad (not in the repo) showing current vs neobrutalism styles side by side in light and dark-cyan for: top bar, dock entry, nodes + directional edge, inspector policy tab, coach modal, victory modal, button states
- [x] 11.2 Publish it as a private artifact link for the PM to review

## 12. Verification

- [x] 12.1 Run `pnpm test` and `pnpm exec tsc --noEmit`; all green
- [x] 12.2 Run the app and manually walk: first-run welcome → Round 0 guide → Round 1 with arrows/icons/popovers → reload persists board and stars → delete-essential blocked → undo/redo → export/import → dark-cyan → Ask your agent copy
- [x] 12.3 `openspec validate learner-journey-and-visual-refresh --strict` passes
