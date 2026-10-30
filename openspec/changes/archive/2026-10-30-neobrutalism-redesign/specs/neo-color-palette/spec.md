## Purpose

Defines the "Squid & Smile" color palette for the neobrutalism style: AWS-inspired ink, surface and accent tokens for both themes, the job each accent does, and the contrast each pairing guarantees.

## ADDED Requirements

### Requirement: Palette tokens per theme
The app SHALL define these tokens for each theme, and components MUST use them instead of hard-coded colors:

| Token | Light | Dark |
|---|---|---|
| background | `#f8fafc` | `#001F1F` |
| surface (cards, bars, drawers) | `#FFFFFF` | `#002B2B` |
| raised (hover, inset, secondary) | `#F1F4F7` | `#003838` |
| ink (text, borders, edges) | `#232F3E` | `#E6FFFB` |
| muted text | `#4B5867` | `#9CC7C3` |
| shadow | `#232F3E` | `#00A1C9` |

#### Scenario: Tokens resolve per theme
- **WHEN** the player switches from light to dark
- **THEN** every token above changes to its dark value without a reload

#### Scenario: No hard-coded surface colors
- **WHEN** component source files are scanned
- **THEN** no component sets a surface, border or text color with a raw hex value outside the token definitions

### Requirement: Accent fills with fixed roles
The app SHALL use six flat accent fills, the same in both themes, each with one job:

| Accent | Hex | Role |
|---|---|---|
| Smile Orange | `#FF9900` | primary actions, legitimate packets, active selection in navigation |
| Prime Yellow | `#FFD814` | highlights: stars, "new" badges, pager banner, guide progress |
| Lambda Lilac | `#B69CFF` | selected node, focused tab, information chips |
| Glacier Sky | `#7FD8EC` | concept tags, guide card, neutral info |
| Storage Lime | `#A7D34B` | pass, allowed, success |
| Security Coral | `#FF6B7A` | deny, exploit, breach, destructive actions |

Text and icons on an accent fill MUST use dark ink (`#232F3E` in light, `#001F1F` in dark), never white. Accents MUST NOT be used as text color on the background.

#### Scenario: Status uses role colors
- **WHEN** a trace step is DENIED and another PASSES in the coach modal
- **THEN** the denied step uses the Security Coral fill and the passed step uses the Storage Lime fill

#### Scenario: Text on accent
- **WHEN** a primary button is shown in either theme
- **THEN** it has a Smile Orange fill with dark ink text

### Requirement: Palette contrast guarantees
Every listed pairing SHALL meet these minimums in both themes, and an automated test MUST check them:
- ink on background, surface and raised: at least 7:1
- muted text on background, surface and raised: at least 4.5:1
- dark ink on every accent fill: at least 4.5:1
- shadow against background and surface: at least 3:1
- ink borders against background and surface: at least 3:1

#### Scenario: Contrast test covers both themes
- **WHEN** the theme test suite runs
- **THEN** it computes every pairing above for light and dark and fails if any is below its minimum

### Requirement: AWS icons keep their own colors
The palette SHALL NOT recolor the official AWS icons. Icons MUST sit on a white tile with an ink border in both themes.

#### Scenario: Icon tile in dark
- **WHEN** an S3 node is shown in the dark theme
- **THEN** its icon sits on a white tile with a `#E6FFFB` border and keeps its original colors
