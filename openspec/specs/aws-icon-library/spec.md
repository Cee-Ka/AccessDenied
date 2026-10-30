# aws-icon-library Specification

## Purpose

Gives canvas nodes and the service dock recognizable AWS service icons from a curated, locally bundled set, kept in its own workspace package.

## Requirements

### Requirement: Curated AWS icon package
The repository SHALL contain a workspace package of official AWS Architecture Icons limited to the services and concepts the game uses. It MUST include at least: IAM user, IAM role, EC2, Lambda, Cognito, S3, DynamoDB, RDS, KMS, Secrets Manager, AWS account, Organizations, VPC, subnet (private and public), NAT gateway, VPC endpoint and a generic external client. Icons MUST NOT be recolored or altered other than by scaling. The package MUST record the icon set version and the AWS terms that apply to the icons.

#### Scenario: Every node type has an icon
- **WHEN** the icon package is checked against the game's node types in tests
- **THEN** every node type resolves to an icon and none falls back to a placeholder

#### Scenario: Unused icons are excluded
- **WHEN** the package contents are listed
- **THEN** it contains only icons mapped to a game node type, dock entry or concept, not the full AWS icon set

### Requirement: Icons bundled locally
Icons SHALL be bundled into the app build and MUST NOT be fetched from a CDN or any remote host at runtime.

#### Scenario: Offline rendering
- **WHEN** the built app is served with no network access
- **THEN** every node and dock icon renders

### Requirement: Icons used on canvas and dock
Canvas nodes and dock entries SHALL show the AWS icon for their service, with the service name as accessible text. Icons MUST stay legible in the light theme and the dark-cyan theme, for example by sitting on a tile with enough contrast.

#### Scenario: Node shows AWS icon
- **WHEN** an S3 node is on the board
- **THEN** it shows the AWS S3 icon, and screen readers announce "Amazon S3"

#### Scenario: Dark theme legibility
- **WHEN** the dark-cyan theme is active
- **THEN** each icon sits on a surface that gives its outline at least 3:1 contrast
