## Why

AccessDenied's engine and 9 levels work, but the game is hard to get into. A new player lands in Round 1 with no introduction to what an identity policy, resource policy, permission boundary or SCP is. Progress other than stars is lost on reload. A player can delete the starting nodes a level depends on. Connections have no visible direction. The visuals are generic: Lucide icons and a near-black dark theme. GonnaCrash, which inspired the game, has since shown which onboarding and quality-of-life mechanics make a simulation game easy to learn. This change brings the most useful of them over and gives the app a clearer AWS look before more levels are added.

## What Changes

- **Player progress persistence**: save a local player profile (display name, first-run flag, last level played) and gameplay progress: stars, per-level unlocks, the in-progress board for each level, completed onboarding steps and settings. Everything goes into one versioned localStorage record with migration from the current `access_denied_stars_v1` and `access_denied_theme_v1` keys. There is no backend and no account.
- **Essential node protection**: each level's starting nodes are marked essential. They can be moved and configured but not deleted, whether through the Delete/Backspace keys, the inspector or a canvas selection. They show a lock badge, and trying to delete one shows a short explanation.
- **New learner journey**:
  - A first-run welcome flow leads into a new **Round 0 "Cloud Basics" (S0)** starter level. S0 introduces principal, resource, identity policy, resource policy, explicit deny, permission boundary and SCP, one concept per guided step.
  - **Concept info popovers** ("ⓘ") open from the dock, the inspector policy tabs, the evaluation trace stages and the coach modal. They all draw on one shared concept glossary.
- **Directional connections**: edges show an arrowhead pointing from caller to callee. The network check treats edges as directed (source → target). The inspector gets a "reverse direction" action. **BREAKING** for any board with edges wired resource → principal. Level data that relies on the old two-way behavior gets corrected.
- **AWS icon library**: add a pnpm workspace package, `packages/aws-icons`, holding a curated subset of the official AWS Architecture Icons (only the services the game uses), exposed as typed React components. Nodes and the dock use these icons in place of Lucide.
- **GonnaCrash-inspired mechanics** (in scope):
  - undo/redo
  - pressing Run during a run skips to the end, and Ctrl/⌘+Enter also starts a run
  - board import/export as JSON, plus "Start over"
  - concept tags on level cards
  - "hollow" return packets that show a 403 coming back to the caller
  - a pager-style twist banner that shows the symptom, not the cause
  - **Ask your agent**: after a run, copy a ready-made tutor prompt (level, Mermaid diagram of the design, parts with their policies, run result) to paste into the player's own AI assistant. It explains the outcome without giving the fix.

  Other GonnaCrash ideas are covered in design.md and deferred.
- **Dark theme recolor**: the dark theme moves to a dark-cyan base of `#001F1F`, with derived surface, border and text tokens that meet WCAG AA contrast.
- **Neobrutalism style preview (outside the repo)**: a standalone HTML showcase comparing the current style with a neobrutalism version, shared privately with the PM for approval. It is not added to the repo in this phase. If approved, adopting it becomes a separate change.
- **Tooling**: pnpm is the only package manager. `package-lock.json` is removed, `packageManager` is pinned, and CI switches to pnpm. Root `AGENTS.md` becomes the primary agent rules file, and `CLAUDE.md` imports it. The existing `.agents/rules` and `.claude/rules` guidelines are merged into `AGENTS.md`.

## Capabilities

### New Capabilities
- `player-progress-persistence`: local player profile and versioned gameplay save (stars, boards, onboarding, settings), with migration from the legacy keys
- `essential-node-protection`: level starting nodes cannot be deleted; lock badge and feedback when deletion is attempted
- `guided-onboarding`: first-run welcome flow and the Round 0 "Cloud Basics" starter level with step-by-step concept introduction
- `concept-info-popovers`: shared AWS concept glossary shown as info popovers across the dock, inspector, trace and coach
- `directional-connections`: arrowheaded edges and source → target semantics in network reachability
- `aws-icon-library`: workspace package of curated AWS Architecture Icons consumed by canvas nodes and the dock
- `gameplay-controls`: GonnaCrash-inspired controls (undo/redo, run/skip, shortcuts, import/export, start over, concept tags, return packets, twist pager)
- `dark-cyan-theme`: `#001F1F`-based dark theme tokens
- `ask-your-agent`: copyable tutor prompt built from the level, the board and the last run result

### Modified Capabilities
<!-- None: openspec/specs/ is empty, so there are no existing capability specs to modify. -->

## Impact

- **Code**:
  - `src/store/useGameStore.ts`: persistence, history, essential-node guards, run/skip
  - `src/engine/network.ts`: directed edges
  - `src/components/canvas/**`: arrows, icons, lock badge, return packets
  - `src/components/dock`, `inspector`, `coach`, `hud`
  - `src/index.css` and `tailwind.config.js`: dark-cyan tokens
  - `src/levels/`: new `round0-cloud-basics.ts`, an `essential` flag on initial nodes, concept tags, edge direction fixes
- **New code**: `src/content/concepts.ts` (glossary), `packages/aws-icons/`, `src/tutor/` (prompt builder)
- **Types**: `GameLevel` gains `conceptTags` and `onboardingSteps`; initial nodes gain `essential`
- **Tests**:
  - `tests/levels.test.ts` covers S0 and re-verifies every level under directed edges
  - new tests for the persistence migration, essential-node guards and undo/redo
- **Dependencies**: no new runtime dependencies are expected. The icons are bundled locally as SVG. The AWS icon terms of use must be followed, and the icons are not modified beyond resizing.
- **Tooling/CI**:
  - `pnpm-workspace.yaml` gains `packages/*`
  - `.github/workflows/deploy.yml` switches to `pnpm install --frozen-lockfile`
  - `package-lock.json` is deleted
  - new `AGENTS.md` and `CLAUDE.md`
- **User data**: existing stars and theme carry over through a one-time migration. Saved boards start empty.
