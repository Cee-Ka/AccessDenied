## 1. Repository configuration, health probe & scripts

- [x] 1.1 Update `.gitignore` to exclude `reports/`, `__pycache__/`, and `*.pyc`
- [x] 1.2 Add `public/healthz` (`ok`) for uniform HTTP health checks
- [x] 1.3 Add `test:ci`, `test:tools`, `audit:bundle`, and `package:release` scripts to `package.json` while keeping `test` unchanged

## 2. Containerized runtime

- [x] 2.1 Create `docker/security-headers.conf` and `docker/nginx.conf` (port `8080`, `/healthz`, SPA fallback, gzip, immutable `/assets/` caching, offline CSP)
- [x] 2.2 Create multi-stage `Dockerfile` (`node:20-alpine` builder -> `nginxinc/nginx-unprivileged:1.27-alpine` UID `101` with `HEALTHCHECK`)
- [x] 2.3 Create `.dockerignore` and hardened `docker-compose.yml` (`read_only`, `tmpfs`, `no-new-privileges`, `APP_PORT`)

## 3. Python automation, release packaging & tests

- [x] 3.1 Create `tools/__init__.py` and `tools/junit.py`
- [x] 3.2 Create `tools/audit_bundle.py` (required files, bundled fonts/icons, local ref resolution, zero external URLs in HTML/CSS, zero banned CDN hosts, bundle budgets, JUnit/JSON reports)
- [x] 3.3 Create `tools/smoke_test.py` (`/healthz` wait loop, root HTML, security headers, local asset HTTP 200 checks, SPA fallback, JUnit/JSON reports)
- [x] 3.4 Create `tools/package_release.py` (audit gate, deterministic zip `reports/release/access-denied-static.zip`, `manifest.json` with SHA-256 and `Cache-Control`/`Content-Type`)
- [x] 3.5 Create `tools/ci_gate.py` orchestrating all local verification stages and container smoke tests
- [x] 3.6 Create `tests/python/test_tools.py` covering `junit`, `audit_bundle`, `smoke_test`, and `package_release`

## 4. GitHub Actions & documentation

- [x] 4.1 Create `.github/workflows/ci.yml` (`verify` + `container-smoke`, minimal permissions, `reports/` upload)
- [x] 4.2 Harden `.github/workflows/deploy.yml` with job-scoped permissions and pre-deploy verification gates
- [x] 4.3 Create `README.md`, `docs/ci-cd-and-operations.md`, and `docs/aws-deployment.md`

## 5. Verification & archive

- [x] 5.1 Run `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm test:tools`
- [x] 5.2 Validate and archive `devops-automation-and-static-hosting` with OpenSpec
