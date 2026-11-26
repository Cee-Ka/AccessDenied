## Context

AccessDenied is an offline-first browser game built with React 19, Vite 6, TypeScript, Tailwind CSS 3, Zustand 5, `@xyflow/react` 12, and CodeMirror 6. Its compiled output (`dist/`) is ~1.5 MB of self-contained static assets with zero backend dependencies.

## Goals / Non-Goals

**Goals:**
- Enforce automated quality gates (TypeScript, Vitest, Python tooling tests, Vite production build, offline bundle audit, release packaging, OpenSpec validation, and live container smoke testing) locally and in GitHub Actions without introducing unnecessary CI servers.
- Package the app as a minimal, non-root, read-only-capable Nginx container for offline/local runtime parity and CI integration testing.
- Produce deterministic, audit-gated static release archives (`access-denied-static.zip` + `manifest.json`) for manual AWS Console S3 + CloudFront OAC uploads.
- Keep all Python automation scripts runnable on bare Python 3 installations with zero third-party packages.

**Non-Goals:**
- Operating standalone self-hosted CI controllers for a static SPA hosted on GitHub.
- Maintaining unused Infrastructure-as-Code templates or automated AWS CLI deployment scripts when static releases are uploaded manually via the AWS Console.
- Modifying the IAM engine, curriculum levels, or UI components.

## Decisions

### 1. GitHub Actions as the single CI/CD platform
Running CI (`ci.yml`) and GitHub Pages CD (`deploy.yml`) directly in GitHub Actions with `contents: read` least-privilege permissions avoids maintaining external CI infrastructure for a small static web application while keeping local parity via `tools/ci_gate.py`.

### 2. Zero-dependency Python 3 standard-library tooling (`tools/`)
Using only Python 3 stdlib (`urllib.request`, `html.parser`, `xml.etree.ElementTree`, `zipfile`, `hashlib`, `subprocess`, `http.server`) lets `audit_bundle.py`, `smoke_test.py`, `package_release.py`, and `ci_gate.py` run cleanly in CI and local developer environments with no virtualenv or `pip` dependencies.

### 3. Multi-stage `node:20-alpine` + `nginxinc/nginx-unprivileged:1.27-alpine`
Building with Corepack-enabled Node 20 and serving static assets from `nginxinc/nginx-unprivileged:1.27-alpine` as UID `101` on port `8080` supports read-only root filesystems (`docker-compose.yml`). Shared security headers live in `docker/security-headers.conf` and are included in both `server` and `location /assets/` so Nginx `location`-level `add_header Cache-Control` does not drop CSP headers.

### 4. Dual-runtime `/healthz` and manual AWS release packaging
Adding `public/healthz` (`ok`) ensures `/healthz` responds uniformly on both Nginx containers and static object storage origins (S3 + CloudFront). `tools/package_release.py` gates on `audit_bundle.py` and writes deterministic zip archives plus `manifest.json` so manual S3 Console uploads apply `immutable` caching to hashed `assets/*` and `no-cache, must-revalidate` to root entry files (`index.html`, `shield.svg`, `healthz`).

## Risks / Trade-offs

- **Bundle size budgets:** `audit_bundle.py` defaults to `5120 KB` total, `2048 KB` max single JS chunk, and `256 KB` max single CSS file (configurable via CLI flags if future dependencies expand).
- **Manual AWS Console header entry:** Uploading manually requires setting `Cache-Control` per `manifest.json` (`assets/*` vs root files); `docs/aws-deployment.md` documents the exact two-group rules.
