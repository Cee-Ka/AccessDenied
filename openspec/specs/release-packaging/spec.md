# release-packaging Specification

## Purpose
Defines static health endpoint parity and audit-gated release packaging (`access-denied-static.zip` + `manifest.json`) for manual deployment to static cloud hosts such as Amazon S3 and CloudFront.

## Requirements

### Requirement: Static health probe file
The repository SHALL include `public/healthz` containing `ok` so Vite copies `/healthz` into `dist/healthz` for consistent HTTP health verification across Nginx and static object storage origins.

#### Scenario: Built dist contains healthz
- **WHEN** `pnpm build` completes
- **THEN** `dist/healthz` exists with body `ok`

### Requirement: Audit-gated deterministic release packager
`tools/package_release.py` SHALL invoke `run_audit` from `tools/audit_bundle.py` before packaging, write a deterministic zip (`reports/release/access-denied-static.zip`) and `reports/release/manifest.json` with SHA-256 digests, `Content-Type`, and recommended S3 `Cache-Control` headers, and exit non-zero without creating an archive if the audit fails.

#### Scenario: Release manifest assigns optimal cache policies
- **WHEN** `tools/package_release.py` packages a valid `dist/` directory
- **THEN** files under `assets/` receive `public, max-age=31536000, immutable` while root files (`index.html`, `shield.svg`, `healthz`) receive `no-cache, must-revalidate` in `manifest.json`

#### Scenario: Non-compliant bundle blocks release packaging
- **WHEN** `tools/package_release.py` runs against a `dist/` directory containing a banned CDN host
- **THEN** it exits with code `1` and creates no zip archive

### Requirement: CI release artifact packaging
`package.json` (`package:release`), `tools/ci_gate.py`, and `.github/workflows/ci.yml` SHALL execute `tools/package_release.py` and upload `reports/release/` as part of `reports/` artifacts.

#### Scenario: GitHub Actions CI archives manual upload bundle
- **WHEN** the `verify` job completes in GitHub Actions
- **THEN** `reports/release/access-denied-static.zip` and `reports/release/manifest.json` are uploaded in the `verify-reports` artifact
