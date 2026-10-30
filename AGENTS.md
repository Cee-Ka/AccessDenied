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

## Theme tokens

- Colors come from CSS variables in `src/index.css` (`--color-obsidian-*`), which Tailwind exposes as `obsidian-*`. Do not hard-code hex surface colors in components.
- The dark theme is dark cyan, built on `#001F1F`. Text needs at least 4.5:1 contrast and UI boundaries at least 3:1. `tests/theme.test.ts` checks this.
- Brand accent: AWS orange `#ff9900`.

## Writing in-game copy

Write the way GonnaCrash does: short sentences and plain words, one idea per sentence. Explain the symptom before the cause. Glossary entries (`src/content/concepts.ts`) are the single source for concept wording. Reuse them; don't write new copy for the same concept.
