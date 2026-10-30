# AGENTS.md: AccessDenied

This is the primary rules file for every coding agent (Claude Code, Codex, Cursor, …) working in this repository. `CLAUDE.md` imports it. If another rules file disagrees with this one, this file wins.

## Project

AccessDenied is a browser game that teaches AWS IAM and cloud security. Players fix broken AWS setups on a canvas, then run a simulation: legitimate requests must succeed and exploits must be blocked, within a monthly budget. The design is inspired by GonnaCrash.

- Stack: React 19, Vite 6, TypeScript, Tailwind 3, Zustand 5, `@xyflow/react` 12, CodeMirror 6 and Vitest 3.
- The product spec is in `plan.md`. Planned changes live in `openspec/changes/`.

## Package manager: pnpm only

- Use **pnpm** for every install, script and CI step. Never run `npm install`, `npm ci` or `yarn`, and never commit `package-lock.json` or `yarn.lock`.
- The version is pinned in `package.json` (`packageManager`). Common commands:
  - `pnpm install`
  - `pnpm dev`
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`
- Add a dependency with `pnpm add <pkg>`, or with `pnpm add <pkg> --filter <workspace>` for a workspace package.

## Workspace layout

```
.                       # the game (Vite app), root workspace package
├── src/
│   ├── engine/         # pure IAM + network evaluation (no React, no I/O)
│   ├── levels/         # one file per level; registered in levels/index.ts
│   ├── store/          # Zustand store (wires slices together)
│   ├── persistence/    # versioned localStorage save + migration
│   ├── onboarding/     # Round 0 guide predicates
│   ├── content/        # concept glossary (single source of truth for copy)
│   ├── tutor/          # "Ask your agent" prompt builder (pure)
│   └── components/     # UI
├── packages/
│   └── aws-icons/      # @access-denied/aws-icons: curated official AWS icons
├── tests/              # Vitest suites
└── openspec/           # change proposals, specs, design, tasks
```

New shared assets or libraries go in `packages/<name>` as `@access-denied/<name>`, and the app uses them through `workspace:*`.

## Rules

1. **Git commit safety.** Do NOT run `git commit` without explicit permission from the user. When a task is done, leave the changes uncommitted until the user asks for a commit.
2. **Deterministic IAM engine.** `src/engine/` must be 100% deterministic, with no network or SDK dependencies. Every decision returns an ordered `EvaluationTraceStep[]` in this order: Network → Explicit Deny → SCP → Resource → Identity → Boundary → Condition.
3. **Offline first.** Nothing may load from a remote CDN at runtime (unpkg, jsdelivr, web fonts, icon CDNs). Icons (`packages/aws-icons`) and editors (CodeMirror) are bundled locally.
4. **Strict policy types.** Validate policy JSON against `PolicyDocument` / `PolicyStatement`. Reject any `Effect` other than `'Allow' | 'Deny'`.
5. **Tests for every level.** Each level in `src/levels/` needs a test in `tests/levels.test.ts` showing that:
   - the initial state fails legitimate traffic or lets an exploit through;
   - the target solution passes 100% of legitimate traffic, blocks 100% of exploits and stays within budget.
6. **Directed edges.** An edge means "source calls target". Level data and solutions must wire caller → callee.
7. **Essential nodes.** A level's starting nodes cannot be deleted unless the level sets `essential: false` on that node, for example a NAT Gateway the player is meant to remove.
8. **AWS icons.** Use only the curated official icons in `packages/aws-icons`, unmodified except for scaling. Do not use AWS logos or trademarks as app branding.

## Visual style: neobrutalism, "Squid & Smile" palette

- **Tokens:** all colors are CSS variables in `src/index.css` (`--neo-*`), exposed to Tailwind as `neo-*`. Never hard-code hex colors or use raw Tailwind palette colors (`rose-500`, `zinc-800`…) in components. `tests/styleGuard.test.ts` enforces this.
- **Backgrounds are fixed:** light `#f8fafc`, dark `#001F1F`.
- **Ink:**
  - light: AWS Squid Ink `#232F3E`
  - dark: `#E6FFFB`
- **Shadows:**
  - light: Squid Ink
  - dark: AWS Sky `#00A1C9`
- **Accent roles:** each accent fill does one job. Never use an accent as text color on the background.

  | Color | Job |
  |---|---|
  | Smile Orange `#FF9900` | primary action, legitimate traffic |
  | Prime Yellow `#FFD814` | highlight, stars, NEW, pager, focus |
  | Lambda Lilac `#B69CFF` | selection, active tab |
  | Glacier Sky `#7FD8EC` | concept tags, guide |
  | Storage Lime `#A7D34B` | pass, allowed |
  | Security Coral `#FF6B7A` | deny, exploit, destructive |

- **On-accent scope:** any element with a solid accent fill must also carry `neo-on-accent`, which switches nested text to dark ink in both themes. The `neo-btn-primary`, `neo-btn-danger`, `neo-tab-active` and `neo-badge-*` primitives already include it.
- **Primitives:** use the primitives in `src/styles/neo.css` instead of hand-written style strings:
  - surfaces: `neo-card`, `neo-modal`, `neo-panel`, `neo-inset`
  - buttons: `neo-btn` with `-primary`, `-secondary`, `-danger` or `-ghost`; `neo-icon-btn`
  - small elements: `neo-chip`, `neo-tab`, `neo-input`, `neo-badge-*`
  - type: `neo-heading`
- **Banned:** gradients, `backdrop-blur`, blurred colored shadows, and `rounded-xl` or larger. Shadows are hard offsets: `shadow-neo-sm`, `shadow-neo` and `shadow-neo-lg`.
- **Fonts:** Archivo (`font-display`), IBM Plex Sans (`font-sans`) and IBM Plex Mono (`font-mono`), bundled through `@fontsource/*`.
- **Contrast:**
  - text: at least 7:1 for ink and 4.5:1 for muted text and text on fills
  - UI boundaries and shadows: at least 3:1
  - `tests/theme.test.ts` checks both themes.

## Writing in-game copy

Write the way GonnaCrash does: short sentences and plain words, one idea per sentence. Explain the symptom before the cause. Glossary entries (`src/content/concepts.ts`) are the single source for concept wording. Reuse them; don't write new copy for the same concept.
