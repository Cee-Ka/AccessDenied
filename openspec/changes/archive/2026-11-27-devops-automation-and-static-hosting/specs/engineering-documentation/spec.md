## Purpose

Defines repository documentation and operational runbooks for local development, containerized execution, GitHub Actions CI/CD, and manual AWS S3 + CloudFront hosting.

## ADDED Requirements

### Requirement: Repository README
`README.md` SHALL document the AccessDenied architecture, workspace layout, prerequisites (`Node 20`, `Corepack pnpm`, `Python 3`, `Docker`), local and Docker quick starts, test/audit/packaging commands, GitHub Actions workflows, and OpenSpec validation.

#### Scenario: Developer bootstraps project from README
- **WHEN** an engineer follows the commands in `README.md`
- **THEN** every command matches `package.json`, `docker-compose.yml`, `.github/workflows/`, and `tools/`

### Requirement: CI/CD and container operations runbook
`docs/ci-cd-and-operations.md` SHALL document the CI/CD pipeline architecture (with a Mermaid diagram), GitHub Actions triggers and hardening, container runtime hardening, Python CLI reference (`audit_bundle.py`, `smoke_test.py`, `package_release.py`, `ci_gate.py`), and a troubleshooting table.

#### Scenario: Operator diagnoses CI or container issue
- **WHEN** an operator consults `docs/ci-cd-and-operations.md`
- **THEN** they find exact CLI flags, report paths under `reports/`, and resolution steps

### Requirement: Manual AWS static hosting guide
`docs/aws-deployment.md` SHALL document the private S3 + CloudFront OAC hosting architecture, estimated monthly cost, AWS Console provisioning checklist (including offline CSP Response Headers Policy and SPA `403`/`404` fallback), manual release upload using `access-denied-static.zip` and `manifest.json`, CloudFront invalidation, and post-deploy `tools/smoke_test.py` verification.

#### Scenario: Operator deploys a release manually to AWS Console
- **WHEN** an operator follows `docs/aws-deployment.md`
- **THEN** they can configure S3 + CloudFront OAC in the AWS Console, upload the verified release archive with proper `Cache-Control` headers, invalidate `/*`, and run `smoke_test.py` against the live endpoint
