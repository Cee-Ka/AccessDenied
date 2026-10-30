## Purpose

Saves the local player profile and all gameplay progress in the browser, so a returning player continues where they stopped without an account or backend.

## ADDED Requirements

### Requirement: Local player profile
The system SHALL keep a local player profile containing a display name, the date it was created, a first-run-completed flag and the ID of the last level played. The profile MUST NOT be sent to any network service.

#### Scenario: First visit creates a profile
- **WHEN** the app loads and no saved profile exists
- **THEN** the system creates a profile with the first-run-completed flag set to false and starts the first-run welcome flow

#### Scenario: Returning player resumes last level
- **WHEN** the app loads and a saved profile has a last-level ID for an unlocked level
- **THEN** the system opens that level instead of the default first level

#### Scenario: Display name is editable
- **WHEN** the player changes their display name in settings
- **THEN** the new name is saved and shown in the top bar after a reload

### Requirement: Gameplay progress save
The system SHALL save, per level, the best star rating and the player's current board (nodes, node configuration, policies and edges). It SHALL also save completed onboarding steps and settings: theme, sound and simulation speed.

#### Scenario: Board survives reload
- **WHEN** the player edits a policy on a level's node and reloads the page
- **THEN** reopening that level shows the edited policy, not the level's initial policy

#### Scenario: Best stars are kept
- **WHEN** a player who earned 3 stars on a level later finishes it with 1 star
- **THEN** the saved rating for that level stays at 3

#### Scenario: Settings survive reload
- **WHEN** the player switches to the dark theme, turns sound off and reloads
- **THEN** the app starts in the dark theme with sound off

### Requirement: Versioned save with migration
The system SHALL store progress as one versioned record. On load it MUST import data from the legacy `access_denied_stars_v1` and `access_denied_theme_v1` keys if no versioned record exists, and it MUST NOT lose stars or the theme choice during that migration.

#### Scenario: Legacy stars are migrated
- **WHEN** the app loads with only `access_denied_stars_v1` = `{"round-1":2}` and `access_denied_theme_v1` = `dark` in storage
- **THEN** the versioned record contains 2 stars for `round-1` and the dark theme, and the game shows round 2 as unlocked

#### Scenario: Unknown future version is not overwritten
- **WHEN** the stored record has a version number higher than the app supports
- **THEN** the app runs with default progress for the session and does not overwrite the stored record

### Requirement: Resilient storage access
The system SHALL keep working when browser storage is unavailable, full or holds corrupt data. If storage is unavailable, it MUST keep progress in memory for the session and tell the player progress will not be saved.

#### Scenario: Corrupt record
- **WHEN** the stored record is not valid JSON
- **THEN** the app starts with default progress, keeps the corrupt value under a backup key, and does not crash

#### Scenario: Storage blocked
- **WHEN** reading browser storage throws an error (for example in a private window with storage blocked)
- **THEN** the game is fully playable and a notice says progress will not be saved

### Requirement: Reset progress
The system SHALL let the player reset either a single level's board or all progress, with a confirmation step before reset-all.

#### Scenario: Reset all progress
- **WHEN** the player confirms "Reset all progress" in settings
- **THEN** all stars, saved boards and onboarding state are cleared, the profile's first-run flag is set to false, and the welcome flow starts again
