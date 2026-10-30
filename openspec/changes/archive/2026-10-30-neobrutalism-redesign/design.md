## Context

See proposal.md for motivation. The current state that shapes the approach:

- **Tokens**: theme colors live in `src/index.css` as `--color-obsidian-*`, each with a `-rgb` channel twin so Tailwind opacity modifiers work. Tailwind exposes them as `obsidian-*`. `tests/theme.test.ts` parses `index.css` and checks contrast.
- **Styling**: components carry long, hand-written utility strings. The same card, button and chip recipes are repeated in about 20 files, with gradients (`bg-gradient-to-r from-orange-500…`), `backdrop-blur`, `rounded-xl/2xl/3xl` and colored blurred shadows (`shadow-orange-500/25`).
- **Canvas**: edge colors come from CSS variables (`--color-edge`, `--color-exploit`, …). Packets are SVG circles in `AnimatedPacketEdge.tsx`. AWS icons render on a white tile.
- **Fonts**: none are loaded. The Google Fonts links were removed for the offline rule, so the app uses system fonts.
- **Constraints**:
  - offline-first: no CDN
  - SVG only for images; fonts may be woff2
  - text contrast and UI-boundary contrast are tested
  - engine and gameplay must not change

## Goals / Non-Goals

**Goals:**
- One set of style primitives that every component uses, so neobrutalism is defined once and the components only state their role.
- A palette that reads as AWS (Squid Ink, Smile Orange and the architecture-icon category hues), passes the contrast rules in both themes, and gives each accent one job.
- Keep the two theme backgrounds exactly as they are.

**Non-Goals:**
- Changing layout, copy, flows or interactions.
- A style switcher or keeping the old soft style. The PM approved replacing it.
- Recoloring AWS icons. The icon terms forbid it.

## Decisions

### 1. Palette: "Squid & Smile"

The palette is built from AWS's own colors and kept on the existing backgrounds:

| Token | Light | Dark | Source |
|---|---|---|---|
| `bg` | `#f8fafc` | `#001F1F` | kept |
| `surface` | `#FFFFFF` | `#002B2B` | |
| `raised` | `#F1F4F7` | `#003838` | Squid-tinted / cyan step |
| `ink` | `#232F3E` | `#E6FFFB` | AWS Squid Ink / cyan-white |
| `muted` | `#4B5867` | `#9CC7C3` | |
| `shadow` | `#232F3E` | `#00A1C9` | Squid Ink / AWS Sky |

The accents are the same in both themes. Text on any fill uses dark ink.

| Accent | Hex | Derived from | Dark ink on it |
|---|---|---|---|
| Smile Orange | `#FF9900` | AWS orange | 6.3:1 |
| Prime Yellow | `#FFD814` | Amazon button yellow | 9.8:1 |
| Lambda Lilac | `#B69CFF` | networking violet `#8C4FFF`, lightened | 5.9:1 |
| Glacier Sky | `#7FD8EC` | AWS Sky `#00A1C9`, lightened | 8.4:1 |
| Storage Lime | `#A7D34B` | storage green `#7AA116`, lightened | 7.8:1 |
| Security Coral | `#FF6B7A` | security red `#DD344C`, lightened | 4.9:1 |

Measured pairs:
- **Ink:** 13:1 on light backgrounds and 12.4:1 or better on dark.
- **Muted text:** 6.8:1 or better on light and 7.0:1 or better on dark.
- **AWS Sky shadow:** 5.0:1 on the dark surface and 5.7:1 on the dark background.

*Why lightened category hues:* the raw AWS category colors (`#8C4FFF`, `#DD344C`, `#7AA116`) pass only about 4.3:1 with ink text. Lightening them keeps the hue and gives fills that read well with dark ink, which is the neobrutalism convention.

*Why AWS Sky for dark shadows:* a black shadow is invisible on `#001F1F` (1.2:1). Ink-colored shadows would make every element look doubly outlined. Sky adds a second brand hue, so orange buttons on a sky shadow stay clearly separate.

*Alternative considered:* the preview's mint and lemon accents. Rejected because they are not tied to AWS, and the user asked for an AWS-inspired palette.

### 2. Tokens: rename to semantic names, keep compatibility
- Add `--neo-*` tokens with `-rgb` twins:
  - `bg`, `surface`, `raised`, `ink`, `muted`, `shadow`
  - `orange`, `yellow`, `lilac`, `sky`, `lime`, `coral`
- Map Tailwind colors `neo.*` to them.
- Point the existing `--color-obsidian-*` tokens at the matching `--neo-*` values for one release, so unmigrated classes still render correctly. Remove them once the component sweep is done (task 6.x).
- *Alternative considered:* overwriting `obsidian-*` in place. Rejected because the names describe the old dark look, and semantic names make the role rules enforceable in review.

### 3. Primitives as Tailwind `@layer components`
`src/styles/neo.css` defines the primitives:

| Class | Use |
|---|---|
| `neo-card` | 3px ink border, surface fill, 4px shadow, 6px radius |
| `neo-panel` | drawers and bars: border on one side only, no shadow |
| `neo-modal` | 3px border, 6px shadow |
| `neo-btn` | base button, plus variants `neo-btn-primary` (orange), `neo-btn-secondary` (surface), `neo-btn-danger` (coral), `neo-btn-ghost` (no shadow) |
| `neo-icon-btn` | |
| `neo-chip` | 2px border, 2px shadow optional |
| `neo-tab` / `neo-tab-active` | lilac fill when active |
| `neo-input` | |
| `neo-badge-*` | `pass`, `deny`, `info`, `new` |
| `neo-focus` | shared focus ring |

- The press and hover behavior lives in `neo-btn`: `:active` translates by the shadow offset, and a `prefers-reduced-motion` override keeps only the shadow change.
- Tailwind config adds:
  - `boxShadow`: `neo-sm` (2px), `neo` (4px), `neo-lg` (6px), all `var(--neo-shadow)` with no blur
  - `borderWidth`: 3
  - `fontFamily`: `display`, `sans`, `mono`
- *Alternative considered:* a React `<Button variant>` component library. Rejected for this change because it would touch every call site's props and structure. Class primitives restyle with smaller diffs and no behavior risk. A component library can come later.

### 4. Fonts bundled from npm
- `@fontsource/archivo` (700, 800, 900), `@fontsource/ibm-plex-sans` (400, 500, 600) and `@fontsource/ibm-plex-mono` (400, 600), imported in `main.tsx`. Vite emits the woff2 files into `dist/assets`, so they load from the same origin.
- Only the Latin subsets: about 120 KB in total.
- Fallback stacks:
  - `display`: Archivo, `"Arial Black"`, system-ui
  - `sans`: IBM Plex Sans, system-ui
  - `mono`: IBM Plex Mono, ui-monospace
- *Alternative considered:* system fonts only. Rejected because the display face carries most of the neobrutalism personality the PM approved in the preview.

### 5. Canvas
- `AnimatedPacketEdge` edge stroke widths: 2.5px idle, 3.5px selected or simulating. Colors:
  - idle: ink
  - selected: lilac
  - legitimate run: orange
  - exploit run: coral
- The arrowhead uses the stroke color, as it does now.
- `PacketDot` gets `stroke: ink, strokeWidth 2`. Return packets: an allowed return is filled lime; a denied or timed-out return is hollow (surface fill) with a coral or yellow stroke.
- Edge labels and edge action buttons become `neo-chip` and `neo-icon-btn`.
- The canvas grid changes from dots to a faint line grid in `raised`, as in the preview. React Flow `Controls` get the neo border and shadow through the existing `.react-flow__controls-button` CSS.
- Nodes use `neo-card`. A selected node gets a lilac fill strip and a 6px shadow, not just an orange ring. The essential lock badge becomes a yellow `neo-chip`.

### 6. Migration order (low risk to high)
1. Tokens, fonts and primitives, with `obsidian-*` aliased.
2. Leaf components: chips, badges, toasts, popovers.
3. Bars: top bar, dock, inspector, hint drawer.
4. Modals.
5. Canvas.
6. Remove the aliases and assert no `obsidian-*`, `bg-gradient`, `backdrop-blur` or `shadow-*-500/` classes remain.

Each step leaves the app working.

## Risks / Trade-offs

- [Heavy borders crowd the dense top bar at narrow widths] → Use 2px borders on top-bar controls (as for small controls), check at 1024px and 1280px widths, and keep the existing `hidden lg:` breakpoints.
- [Hard shadows on many nodes make the canvas noisy] → Nodes use a 4px shadow, idle edges stay ink with no shadow, and only the selected node gets the larger shadow.
- [Coral text contrast is the tightest pair, 4.9:1] → Coral is only ever a fill with dark ink text, never text on the background. The test enforces this pairing.
- [The font payload grows the first load by about 120 KB] → Latin subsets only, `font-display: swap`, and real fallback stacks.
- [A missed hard-coded class leaves an old-style element] → The final sweep test greps components for banned class patterns.

## Migration Plan

This is a pure UI restyle with no data or storage migration. Saved boards and progress are untouched. Rollback is a revert of the change.

## Open Questions

- Whether the selected-node style should use a lilac fill strip or a full lilac fill. Both pass contrast. Decide visually during apply, since neither choice changes the specs or tasks.
