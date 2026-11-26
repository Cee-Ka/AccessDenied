# python-automation-tooling Specification

## Purpose
Defines zero-dependency Python 3 automation scripts under `tools/` for post-build offline auditing, live container smoke testing, and unified CI gate orchestration, backed by unit tests in `tests/python/`.

## Requirements

### Requirement: Standard-library Python 3 implementation
All scripts in `tools/` (`__init__.py`, `junit.py`, `audit_bundle.py`, `smoke_test.py`, `package_release.py`, `ci_gate.py`) SHALL use only the Python 3 standard library so they execute on any runner without `pip` package installation.

#### Scenario: Tools run in clean Python 3 environment
- **WHEN** any script in `tools/` is invoked with `python3` without third-party site-packages
- **THEN** it imports and executes without `ModuleNotFoundError`

### Requirement: Offline bundle auditor
`tools/audit_bundle.py` SHALL inspect `dist/`, verify required entry files (`index.html`, `shield.svg`, JS/CSS assets), bundled fonts (`archivo`, `ibm-plex-sans`, `ibm-plex-mono`), AWS icons, local link resolution, offline URL/CDN compliance, and size budgets, and emit optional JUnit XML and JSON reports with a non-zero exit code on failure.

#### Scenario: Bundled assets and offline URLs validated
- **WHEN** `audit_bundle.py` inspects `dist/`
- **THEN** it confirms HTML/CSS contain zero `http(s)://` URLs, HTML/CSS/JS contain zero banned CDN hostnames, and total/JS/CSS size budgets hold

#### Scenario: Remote CDN or missing asset fails the audit
- **WHEN** `audit_bundle.py` inspects a bundle with a banned CDN host or broken local asset link
- **THEN** it exits with code `1` and records the failure in JUnit XML and JSON outputs

### Requirement: Live HTTP smoke tester
`tools/smoke_test.py` SHALL probe `--base-url` to verify `/healthz` returns `200`, `/` serves HTML with `<div id="root">` and `AccessDenied` without external script/link tags, security headers are present, referenced local assets return `200`, and unknown routes fall back to SPA HTML.

#### Scenario: Missing security header or broken asset fails smoke test
- **WHEN** `smoke_test.py` targets a server missing `Content-Security-Policy` or returning `404` for a referenced asset
- **THEN** it exits with code `1` and records the failure in JUnit XML

### Requirement: Unified CI gate orchestrator and unit tests
`tools/ci_gate.py` SHALL run `typecheck`, `unit-tests`, `python-tool-tests`, `build`, `bundle-audit`, `package-release`, `openspec-validate`, and optional `container-smoke` with cleanup, write `reports/ci-gate-summary.json`, and exit non-zero on failure. `tests/python/test_tools.py` SHALL cover `junit`, `audit_bundle`, `smoke_test`, and `package_release`.

#### Scenario: Python unit tests validate automation tools
- **WHEN** `pnpm test:tools` runs
- **THEN** all `unittest` cases in `tests/python/test_tools.py` pass
