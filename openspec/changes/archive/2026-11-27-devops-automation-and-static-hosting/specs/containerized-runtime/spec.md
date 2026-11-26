## Purpose

Defines a reproducible, non-root, offline-enforcing container image and Compose runtime for serving the built AccessDenied web application.

## ADDED Requirements

### Requirement: Multi-stage non-root Dockerfile
`Dockerfile` SHALL compile the production bundle in a `node:20-alpine` builder stage via Corepack pnpm (`--frozen-lockfile`, `pnpm typecheck && pnpm build`) and copy only static assets and Nginx config into an `nginxinc/nginx-unprivileged:1.27-alpine` runtime stage running as UID `101` on port `8080`.

#### Scenario: Workspace package resolution in cached layer
- **WHEN** Docker builds the builder stage
- **THEN** root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `packages/aws-icons/package.json` are copied before `pnpm install --frozen-lockfile`

#### Scenario: Container health check probes /healthz
- **WHEN** the container runs
- **THEN** its `HEALTHCHECK` probes `http://127.0.0.1:8080/healthz` and reports healthy once Nginx returns HTTP `200`

### Requirement: Hardened Nginx configuration with offline CSP
`docker/nginx.conf` and `docker/security-headers.conf` SHALL serve `/usr/share/nginx/html` on port `8080` with gzip, `/healthz`, SPA fallback (`try_files $uri $uri/ /index.html`), immutable `/assets/` caching, and security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, offline `Content-Security-Policy`).

#### Scenario: Security headers present on HTML and asset responses
- **WHEN** an HTTP client requests `/` or a bundled asset under `/assets/`
- **THEN** the response includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `Content-Security-Policy` starting with `default-src 'self'`

### Requirement: Build context exclusion and Compose runtime
`.dockerignore` SHALL exclude VCS, `node_modules`, test suites, docs, and local reports, and `docker-compose.yml` SHALL run the `app` service with `read_only: true`, `no-new-privileges:true`, writable `tmpfs` mounts (`/tmp`, `/var/cache/nginx`), configurable `APP_PORT`, and `/healthz` healthcheck.

#### Scenario: Compose starts read-only container
- **WHEN** `docker compose up --build` starts `app`
- **THEN** the container serves the app on `APP_PORT` with a read-only root filesystem and reaches `healthy` status
