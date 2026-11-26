## Why

AccessDenied ships as an offline-first static Single Page Application (`dist/` ~1.5 MB) with 222 Vitest checks. While the engine and UI are well-tested, the repository lacked pull-request CI verification, reproducible container packaging, automated offline-bundle compliance checks, audit-gated static release archives for manual cloud hosting uploads, and operational documentation.

## What Changes

- **GitHub Actions CI/CD**:
  - Add `.github/workflows/ci.yml` to run TypeScript typechecking, Vitest (with JUnit XML output), Python tool tests, production build, offline bundle auditing, deterministic release packaging, and live container smoke testing on pull requests and branch pushes.
  - Harden `.github/workflows/deploy.yml` with least-privilege job-scoped permissions, `typecheck`, `test:ci`, `test:tools`, and `audit:bundle` before GitHub Pages deployment.
- **Containerized Runtime**:
  - Add a multi-stage `Dockerfile` (`node:20-alpine` builder via Corepack pnpm → non-root `nginxinc/nginx-unprivileged:1.27-alpine` on port `8080` with `HEALTHCHECK`).
  - Add `docker/nginx.conf` and `docker/security-headers.conf` (`/healthz`, SPA fallback, immutable `/assets/` caching, and offline-enforcing CSP headers), `.dockerignore`, and hardened `docker-compose.yml`.
- **Python Automation & Release Packaging (`tools/`)**:
  - Add standard-library Python 3 CLI tools: `tools/junit.py`, `tools/audit_bundle.py`, `tools/smoke_test.py`, `tools/package_release.py`, and `tools/ci_gate.py`.
  - Add `public/healthz` for uniform HTTP health verification across Nginx containers and static cloud hosting.
  - Add `tests/python/test_tools.py` (`unittest`) covering JUnit XML output, offline bundle auditing, live HTTP smoke testing, and deterministic release packaging.
  - Add `test:ci`, `test:tools`, `audit:bundle`, and `package:release` scripts in `package.json`, and ignore `reports/`, `__pycache__/`, and `*.pyc` in `.gitignore`.
- **Engineering Documentation**:
  - Add `README.md`, `docs/ci-cd-and-operations.md`, and `docs/aws-deployment.md` (manual AWS Console S3 + CloudFront OAC hosting guide).

## Capabilities

### New Capabilities
- `ci-cd-pipelines`: Pull-request and branch CI in GitHub Actions, hardened GitHub Pages deployment, and unified JUnit XML reporting.
- `containerized-runtime`: Multi-stage non-root Docker image, Nginx serving with offline CSP and `/healthz`, `.dockerignore`, and hardened `docker-compose.yml`.
- `python-automation-tooling`: Zero-dependency Python 3 verification CLI tools (`junit.py`, `audit_bundle.py`, `smoke_test.py`, `ci_gate.py`) and `unittest` coverage.
- `release-packaging`: Static `public/healthz`, audit-gated deterministic `tools/package_release.py` (`access-denied-static.zip` + `manifest.json`), and CI artifact archiving.
- `engineering-documentation`: Root `README.md`, `docs/ci-cd-and-operations.md`, and `docs/aws-deployment.md` for local dev, containers, CI/CD, and manual AWS hosting.

### Modified Capabilities
- None. Existing IAM engine, curriculum, theme, and UI component specifications remain unchanged.

## Impact

- **CI/CD**: `.github/workflows/ci.yml` (new), `.github/workflows/deploy.yml` (updated).
- **Containers**: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker/nginx.conf`, `docker/security-headers.conf`.
- **Automation & Tests**: `public/healthz`, `tools/__init__.py`, `tools/junit.py`, `tools/audit_bundle.py`, `tools/smoke_test.py`, `tools/package_release.py`, `tools/ci_gate.py`, `tests/python/test_tools.py`.
- **Config & Docs**: `package.json`, `.gitignore`, `README.md`, `docs/ci-cd-and-operations.md`, `docs/aws-deployment.md`.
- **Not affected**: `src/`, `packages/aws-icons/`, `tests/*.test.ts`, and `tests/*.test.tsx`.
