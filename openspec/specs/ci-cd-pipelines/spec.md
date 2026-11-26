# ci-cd-pipelines Specification

## Purpose
Defines automated GitHub Actions CI and CD workflows so every pull request, branch push, and Pages deployment runs deterministic verification and container smoke checks while publishing JUnit XML reports.

## Requirements

### Requirement: Pull-request and branch CI workflow
`.github/workflows/ci.yml` SHALL trigger on `pull_request` (`master`, `main`), `push` (`master`, `main`, `feat/**`), and `workflow_dispatch`, using `contents: read` permissions and per-ref concurrency cancellation.

#### Scenario: Verification job validates code, bundle, and release archive
- **WHEN** the `verify` job executes in GitHub Actions
- **THEN** it runs `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test:ci`, `pnpm test:tools`, `pnpm build`, `pnpm audit:bundle`, and `pnpm package:release`, and uploads `reports/` even on failure

#### Scenario: Container smoke job verifies built image
- **WHEN** the `verify` job succeeds
- **THEN** `container-smoke` builds the Docker image, starts an isolated container on `127.0.0.1:18080`, runs `tools/smoke_test.py`, cleans up unconditionally, and uploads smoke reports

### Requirement: Hardened GitHub Pages deployment
`.github/workflows/deploy.yml` SHALL restrict top-level permissions to `contents: read`, scope `pages: write` and `id-token: write` to the `deploy` job, and run `typecheck`, `test:ci`, `test:tools`, `build`, and `audit:bundle` before uploading `./dist`.

#### Scenario: Failing check blocks GitHub Pages deployment
- **WHEN** `typecheck`, tests, or `audit:bundle` fails during deployment
- **THEN** the workflow fails before `actions/upload-pages-artifact` runs

### Requirement: Unified JUnit XML reporting
Test and automation scripts SHALL emit standard JUnit XML reports under `reports/` (`vitest-junit.xml`, `bundle-audit-junit.xml`, `smoke-junit.xml`) without altering the default behavior of `pnpm test`.

#### Scenario: Local test command remains unchanged
- **WHEN** a developer runs `pnpm test`
- **THEN** Vitest runs its standard suite without extra flags, while `pnpm test:ci` produces `reports/vitest-junit.xml`
