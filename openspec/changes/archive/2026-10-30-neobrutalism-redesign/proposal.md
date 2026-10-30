## Why

The PM approved the neobrutalism direction from the preview page. The app still uses the soft style: thin borders, blurred shadows and gradients. The preview's colors were also a stand-in (mint, lemon) with no tie to AWS. This change makes neobrutalism the default look, with a palette drawn from AWS's own colors. Both theme backgrounds stay as they are: `#f8fafc` in light and `#001F1F` in dark.

## What Changes

- **Neobrutalism becomes the default style** (**BREAKING** visual change, no opt-out). It brings:
  - thick ink borders
  - hard, unblurred offset shadows
  - flat fills with no gradients
  - tight corners
  - bold display type for headings
  - buttons that press into their shadow when clicked

  It covers the top bar, dock, canvas nodes and edges, inspector, policy editor frame, drawers, modals, popovers, toasts, the guide card and the level picker.
- **New AWS-inspired palette, "Squid & Smile"**:
  - AWS Squid Ink `#232F3E` as the light-theme ink.
  - Smile Orange `#FF9900` as the primary accent.
  - Five flat accents derived from AWS colors:
    - Prime Yellow `#FFD814`
    - Lambda Lilac `#B69CFF`, from the networking violet
    - Glacier Sky `#7FD8EC`, from AWS Sky
    - Storage Lime `#A7D34B`, from the storage green
    - Security Coral `#FF6B7A`, from the security red
  - In the dark theme, ink becomes `#E6FFFB` and shadows use AWS Sky `#00A1C9`.
  - Every color has a fixed job: primary, highlight, selection/info, pass, deny/exploit.
- **Backgrounds kept**: light `#f8fafc` and dark `#001F1F` do not change. Card and raised surfaces get new tokens that sit on those backgrounds.
- **Bundled typography**: Archivo for display, IBM Plex Sans for body text and IBM Plex Mono for code and telemetry. The font files are bundled locally from npm packages, with no web-font CDN, which keeps the offline rule.
- **Simulation visuals follow the style**: edges and arrowheads become ink lines. Packets and return packets get ink outlines, so they stay visible on light backgrounds. Status shows as flat fills.
- **Shared style primitives**: Tailwind component classes (`neo-card`, `neo-btn`, `neo-chip`, `neo-input`, `neo-tab` and others) replace the hand-written style strings repeated across components.

## Capabilities

### New Capabilities
- `neobrutalism-visual-style`: the visual language (borders, shadows, press behavior, corners, typography, motion limits) and the surfaces it must cover
- `neo-color-palette`: the "Squid & Smile" tokens for both themes, the job each accent does, and their contrast guarantees

### Modified Capabilities
- `dark-cyan-theme`:
  - The "Light theme unchanged" requirement becomes "Light theme background preserved": only the `#f8fafc` background is guaranteed, not every light token.
  - The dark base palette requirement now allows ink borders and AWS Sky shadows from the neo palette.

## Impact

- **Styles**:
  - `src/index.css`: tokens and a `@layer components` neo primitives block
  - `tailwind.config.js`: colors, `boxShadow`, `borderWidth`, `borderRadius` and `fontFamily` scales
- **Components**: every file in `src/components/**` has its style strings migrated to the primitives. No behavior changes.
- **Canvas**: `AnimatedPacketEdge.tsx` and the node components get new stroke, marker and packet styling.
- **Dependencies (runtime, bundled)**: `@fontsource/archivo`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`. These add about 120 KB of woff2 files to the build. Nothing loads from the network.
- **Tests**:
  - `tests/theme.test.ts` is updated for the new tokens and checks contrast for every listed pair in both themes.
  - The light-token assertions narrow to the background only.
- **Docs**: `AGENTS.md` theme section updated to the new palette and the neo primitives rule.
- **Not affected**: the engine, levels, persistence, store logic and game rules.
