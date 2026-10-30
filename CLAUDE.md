@AGENTS.md

## Claude Code notes

- The project skills in `.claude/skills/` cover this codebase:
  - `aws-iam-engine`: engine, conditions, SCPs, level authoring
  - `canvas-game-designer`: React Flow canvas, nodes, edges
  - `openspec-*`: change workflow
- Plan changes with OpenSpec: `/opsx:propose` → `/opsx:apply` → `/opsx:archive`. Specs live in `openspec/specs/`, and active changes in `openspec/changes/`.
- Before reporting work as done, run `pnpm test` and `pnpm typecheck`.
