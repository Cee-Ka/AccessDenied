## Context

See proposal.md for motivation. The current state that shapes the approach:

- **Single store**: all state, including persistence, lives in `src/store/useGameStore.ts` (~800 lines, Zustand + immer). Persistence is two ad-hoc localStorage keys: `access_denied_stars_v1` and `access_denied_theme_v1`.
- **Edges**: `network.ts` treats an edge as connecting both ways (`e.source === a && e.target === b || e.target === a && e.source === b`). The edge renderer `AnimatedPacketEdge` draws a `BaseEdge` with no marker. All existing level `initialEdges` already point caller → callee, and most levels start with no edges.
- **Deletion**: deletion goes through `removeNodeFromBoard` and React Flow's `onNodesChange` remove changes. No node carries an "essential" flag.
- **Theme**: CSS variables in `src/index.css` (`--color-obsidian-*`) are switched by a `.dark` class. Tailwind reads them through `obsidian.*`.
- **Icons**: Lucide is used everywhere.
- **Packaging**: both `package-lock.json` and `pnpm-lock.yaml` exist, CI uses `npm ci`, and `pnpm-workspace.yaml` only sets `allowBuilds`.
- **Constraints** (from the project rules):
  - The engine stays deterministic and free of network calls.
  - Nothing is loaded from a CDN at runtime.
  - Every level needs initial-state and solution tests.
  - No commits without explicit permission.

## Goals / Non-Goals

**Goals:**
- Keep `src/engine/` pure. The only engine change is directed edges in `network.ts`. Persistence, history and onboarding live outside the engine.
- Shrink, or at least not grow, the single store by splitting new concerns into Zustand slices or modules.

**Non-Goals:**
- Accounts, cloud sync or any backend. "Current user" means a local profile only.
- Moving the app into `apps/web`. The monorepo step only adds `packages/*` (see Decision 6).
- Any neobrutalism code in the repo. The PM showcase is a standalone HTML page kept outside the repo (see Decision 8).
- Fixing the engine-accuracy issues from the earlier review (`NotAction`, policy variables, VPC-scoped endpoints, unused star criteria). Those belong in a separate change.

## Decisions

### 1. Persistence: one versioned record managed by a small storage module
- Add `src/persistence/` with a `SaveV2` type:
  - `{ version: 2, profile, progress: { stars, boards, onboarding }, settings }`
  - `load()` and `save()` wrap every storage access in try/catch.
  - A `migrate()` step reads the legacy v1 keys once.
- Saves are debounced (about 300 ms) through a store subscription. Saved boards contain node data and edges only. Transient simulation fields (`isSimulating`, results) are stripped first.
- A newer stored version is never overwritten. Corrupt data is copied to `access_denied_save_corrupt_backup` before defaults are used.
- *Alternative considered:* Zustand's `persist` middleware. Rejected because it gives less control over migrating the legacy keys, quarantining corrupt data and the newer-version rule. It would also put the whole store, including transient sim state, into storage unless every field were carefully partialized.
- *Alternative considered:* IndexedDB. Rejected because boards are small (a few KB per level), and localStorage keeps saving synchronous and simple.

### 2. Essential nodes: data flag plus one guard function
- `GameLevel.initialNodes[].essential?: boolean` defaults to `true`. It is copied into node data as `data.essential`.
- Nodes added from the dock get `essential: false`.
- One pure helper, `filterDeletableNodeIds(ids, nodes)`, is used in three places: `removeNodeFromBoard`, the `remove` branch of `onNodesChange`, and board import.
- React Flow's `deletable: false` is also set on essential nodes, so the built-in Backspace handling skips them. The store guard still covers programmatic paths.
- *Why both:* `deletable` alone does not cover the inspector button or import, and the guard alone would let React Flow briefly drop the node from its internal state.

### 3. Directed edges
- `network.ts` changes its edge check to `e.source === src && e.target === dst`. The intermediate-routing check already uses `e.source === sourceNode.id`, so it stays.
- When no forward edge exists but a reverse edge does, the trace gives a specific "points the wrong way" summary.
- Arrows come from React Flow's `markerEnd` with `MarkerType.ArrowClosed`, colored by a CSS variable so they follow the theme.
- `runSimulation`'s edge highlight becomes directional as well.
- *Alternative considered:* keep engine reachability two-way and only draw arrows. Rejected because an arrow the engine ignores teaches the wrong mental model, which defeats the point of the change.

### 4. Undo/redo: snapshot history slice
- A `history` slice keeps `past` and `future` stacks of `{ nodes, edges }` snapshots, capped at 50 entries.
- A snapshot is pushed before each recorded action. Drags are recorded once, on `dragStop`.
- Snapshots share structure through immer, so memory cost is small.
- History clears on level change, Start over and import.
- *Alternative considered:* command/inverse-operation history. It would be more precise, but every action would need an inverse. Snapshots are simpler and the boards are small.

### 5. Run/skip
- `runSimulation` checks a `skipRequested` flag between packets. When the flag is set, the remaining packets are evaluated synchronously with no delay.
- The evaluation path is unchanged, so results match a full run, as the spec requires.

### 6. Monorepo shape: root app + `packages/aws-icons`
- `pnpm-workspace.yaml` gains `packages: ['packages/*']`. The root stays the app and depends on `"@access-denied/aws-icons": "workspace:*"`.
- `packages/aws-icons` contents:
  - `svg/` holds the curated official SVGs, unmodified.
  - `src/index.ts` exports a `NodeType → IconComponent` map and `<AwsIcon type=… />`.
  - `LICENSE-NOTICE.md` records the AWS Architecture Icons release version and the AWS terms that apply.
  - `scripts/sync-icons.mjs` copies the selected files from a locally downloaded official icon zip. It is never fetched at build time.
- SVGs are imported through Vite as URLs and inlined into the build output. No `svgr` dependency is added.
- *Alternative considered:* full `apps/web` + `packages/*` restructure. Rejected for now because moving `src/`, `tests/`, configs and CI paths creates a lot of churn for little gain while the app is the only app. The layout above can grow into that later.
- *Icon selection:* only node types in `NodeType` plus Organizations, the external client and the public/private subnet variants. That is about 18 icons.

### 7. Dark-cyan theme tokens
- **Dark-cyan tokens** replace the `.dark` block. Values are hue-locked to 180°:

  | Token | Value |
  |---|---|
  | `950` (base) | `#001F1F` |
  | `900` (cards) | `#002929` |
  | `850` | `#003333` |
  | `800` (hover) | `#003D3D` |
  | `border` | `#0B4A4A` |
  | `text` | `#E6FFFB` |
  | `muted` | `#8FBFBF` (≈ 7:1 on base) |

  Contrast is checked by a unit test that computes the ratios from the token file.

### 8. PM showcase stays outside the repo
- The neobrutalism showcase is one self-contained HTML file (inline CSS, no external requests) that recreates the key surfaces: top bar, dock entry, principal and resource nodes with a directional edge, inspector policy tab, coach modal, victory modal and button states. It shows the current style and the neobrutalism style side by side, in light and dark-cyan.
- It lives in the session scratchpad and is shared as a private link for the PM. It is not committed, not built and not deployed.
- *Alternative considered:* a Vite multi-page entry using the real components. Rejected for this phase because the user wants nothing neobrutalism-related in the repo until the PM approves. If approved, a follow-up change adds a scoped `[data-style="neo"]` layer.

### 9. Onboarding and glossary content
- `src/content/concepts.ts` holds the glossary as typed data. Coverage of dock types and trace stages is enforced by tests.
- Round 0 lives in `src/levels/round0-cloud-basics.ts`, with `onboardingSteps: { id, title, body, target: selector|nodeId, completeWhen: predicate-id }[]`.
- Completion predicates are named, pure functions over store state, for example `edgeExists(a,b)` or `policyHasDeny(nodeId)`. That keeps level files serializable.
- `isLevelUnlocked` special-cases `roundNumber === 0` (always unlocked) and makes Round 1 independent of Round 0.
- The coach-mark overlay is a lightweight in-house component (a positioned popover plus a highlight ring). No tour library is added.

### 10. GonnaCrash features: adopted vs deferred
| GonnaCrash mechanic | Decision | Notes |
|---|---|---|
| Fail → learn → fix loop, red mark on broken part, coach explains | Already present | Keep |
| Tiered hints (nudge → fix) | Already present | Keep |
| Undo/redo, Run-again-to-skip, Ctrl/⌘+Enter | **Adopt** | Decisions 4–5 |
| Import/export board, Start over | **Adopt** | Uses the same `SaveV2.boards` shape |
| Concept tags on level cards | **Adopt** | Shares the glossary IDs |
| Hollow return tokens (e.g. 429) | **Adopt** as 403 / timeout return packets | Edge renderer adds a reverse animation |
| Pager-style twist: shows the symptom, not the cause | **Adopt** | Banner copy stored per level |
| "Ask your agent" tutor prompt | **Adopt** | Decision 12 |
| Plain, short copy | **Adopt** as a writing rule | Added to AGENTS.md content guidelines |
| Hints earned by passing rounds and quick-check quizzes | Defer | Needs a quiz content model. Next change. |
| Escalating multi-round levels (more traffic each round) | Defer | Needs an engine "round" concept |
| Scale-up/scale-out of a box | Not applicable | IAM is not about capacity |
| "Real systems" levels from public post-mortems | Already started (Capital One) | More levels in a later change |
| Sign-in / cloud progress | Out of scope | Local profile only |

### 11. Agent rules and pnpm
- `AGENTS.md` at the root becomes the primary rules file. It merges `.agents/rules/iam-development-guidelines.md` and `.claude/rules/iam-development-guidelines.md`, and adds:
  - pnpm only
  - the workspace layout
  - plain-copy writing rules
  - the theme token rules
- `CLAUDE.md` contains `@AGENTS.md` plus Claude-specific notes: the skills under `.claude/skills` and the OpenSpec workflow.
- The old rules files are replaced with a one-line pointer to `AGENTS.md`, so the two copies cannot drift.
- `package.json` gets `"packageManager": "pnpm@<pinned>"` and `engines`. `package-lock.json` is deleted.
- CI uses `pnpm/action-setup` and `pnpm install --frozen-lockfile`.

### 12. Ask your agent: pure prompt builder
- `src/tutor/buildTutorPrompt.ts` is a pure function `(level, nodes, edges, packets, results, earnedStars, totalCost) → string`. It has no store access, so it can be unit-tested and gives the same output for the same input.
- Mermaid IDs are generated as `n1…nN` in board order, with node labels escaped (`"` → `#quot;`, brackets and angle brackets → HTML entities). Edges are emitted in their stored source → target order.
- Each part's role sentence comes from the concept glossary (`src/content/concepts.ts`), so the prompt and the info popovers use the same wording.
- Policies are serialized with `JSON.stringify` (single line). If one prompt grows past ~12k characters, policies longer than 1,500 characters are truncated with a `…(truncated)` marker.
- The UI is a small `AskAgentPanel`, opened from the coach and victory modals. It shows a read-only `<textarea>`, and Copy uses `navigator.clipboard.writeText`, falling back to selecting the text.
- The prompt is never sent anywhere. That keeps the app offline-first and avoids holding API keys.
- *Alternative considered:* calling an LLM API from the app. Rejected because it would need keys, network access and cost, and it would break the offline-first rule.

## Risks / Trade-offs

- [A player wires an edge backwards and gets confused by a network failure] → The "points the wrong way" trace message, a one-click Reverse action, and a Round 0 step that teaches direction explicitly.
- [Saved boards made under old level definitions break after a level is edited] → Store a `levelRevision` hash with each saved board. On mismatch, offer "Your saved board is from an older version of this level. Start over?" instead of loading it silently.
- [localStorage quota (~5 MB) is exceeded] → Boards are small. Saves are caught on failure, and an "unable to save" notice is shown.
- [AWS icon license terms] → Use only the official, unmodified icons for representing AWS services in architecture diagrams, keep the notice file, and do not use the AWS logo or trademarks as app branding.
- [Undo snapshots plus debounced saves cost too much during drags] → Snapshot only on drag stop, and skip saving while a drag is in progress.
- [Tutor prompts leak the answer through policy JSON in the initial setup] → Acceptable. The prompt describes the player's own board, and the closing instructions tell the agent not to give the fix.
- [The store grows further] → New logic goes into `src/persistence/`, `src/store/slices/history.ts` and `src/onboarding/`. The store only wires them together.

## Migration Plan

1. Ship the persistence module with v1 → v2 migration first. Existing stars and theme carry over. The legacy keys stay in place for one release so a rollback can still read them.
2. Directed edges and the level audit ship in the same release as the arrow rendering, so behavior and visuals never disagree.
3. CI switches to pnpm in the same PR that deletes `package-lock.json`.
4. Rollback: revert the release. v1 keys are still present because migration does not delete them, so the old build keeps working. Boards saved in v2 are simply ignored by the old build.

## Open Questions

- The exact AWS Architecture Icons release to pin (the latest quarterly package at implementation time). This only affects `LICENSE-NOTICE.md` and the files copied.
- Final dark-cyan hex values for status colors after the contrast test runs. The token names and the rule stay fixed.
