# AccessDenied

AccessDenied is an interactive browser game for learning AWS IAM and cloud security. Players fix misconfigured AWS architectures on a visual canvas, author least-privilege IAM policies, and run deterministic traffic simulations where legitimate workloads must pass and exploits must be blocked within a monthly cost budget.

## Key Features

- **Deterministic 7-Step IAM & Network Engine** (`src/engine/`): Evaluates requests strictly offline in order — **Network → Explicit Deny → SCP → Resource Policy → Identity Policy → Permissions Boundary → Conditions** — and emits a full `EvaluationTraceStep[]` trace for every simulated packet.
- **6-Stage, 16-Level Curriculum + Sandbox** (`src/levels/`): Progresses from basic IAM roles and S3 bucket policies to cross-account trust, IMDSv1/SSRF exploits, permission boundaries, NAT Gateway cost traps, AWS Organizations SCPs, and real-world incident reconstructions.
- **Neobrutalism "Squid & Smile" Design System** (`src/styles/neo.css`): Light and dark-cyan themes powered by CSS tokens (`--neo-*`), bundled `@fontsource/*` fonts (`Archivo`, `IBM Plex Sans`, `IBM Plex Mono`), and curated official AWS icons (`packages/aws-icons/`).
- **Offline-First & Verified Build**: Zero runtime CDN dependencies; every production build is audited for self-contained assets and validated inside a non-root Nginx container.

## Workspace Layout

```text
.
├── src/
│   ├── engine/         # Pure deterministic IAM + network evaluation engine
│   ├── levels/         # 16 curriculum levels across 6 stages + sandbox
│   ├── store/          # Zustand state slices, undo/redo history, essential guards
│   ├── persistence/    # Versioned localStorage save & board import/export
│   ├── onboarding/     # Stage 1 guided onboarding predicates
│   ├── content/        # Concept glossary (single source of truth for copy)
│   ├── tutor/          # Pure prompt builder for "Ask your agent"
│   └── components/     # React 19 + @xyflow/react + CodeMirror 6 UI
├── packages/
│   └── aws-icons/      # @access-denied/aws-icons local workspace package
├── tools/              # Zero-dependency Python 3 CI & release packaging tools
├── docker/             # Nginx runtime & security header configuration
├── tests/              # 17 Vitest suites (222 tests) + Python unittest suite
├── openspec/           # Spec-driven change proposals, specs, design, tasks
├── docs/               # Operational, CI/CD, and AWS hosting documentation
├── Dockerfile          # Multi-stage non-root production container
├── docker-compose.yml  # Hardened local container runtime
└── .github/workflows/  # GitHub Actions CI & GitHub Pages deployment
```

## Prerequisites

- **Node.js** `>= 20` with **Corepack** (`pnpm@10.32.1` pinned in `package.json`)
- **Python** `>= 3.10` (standard library only; no `pip` install required)
- **Docker** (optional, required for containerized runtime and container smoke tests)

## Quick Start

### Local Development

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open `http://127.0.0.1:5173`.

### Containerized Runtime (Docker Compose)

```bash
docker compose up --build
```

The production Nginx container serves the app on `http://localhost:8080` (override with `APP_PORT=9090 docker compose up --build`) as non-root UID `101` with a read-only root filesystem, `/healthz` healthcheck, and strict offline Content Security Policy headers.

## Verification & Quality Gates

| Check | Command | Output |
|---|---|---|
| TypeScript typecheck | `corepack pnpm typecheck` | Zero type errors |
| Vitest suite (222 tests) | `corepack pnpm test` | 17 test suites |
| Vitest with JUnit XML | `corepack pnpm test:ci` | `reports/vitest-junit.xml` |
| Python tooling tests | `corepack pnpm test:tools` | `tests/python/test_tools.py` |
| Production build | `corepack pnpm build` | `dist/` |
| Offline bundle audit | `corepack pnpm audit:bundle` | `reports/bundle-audit*.{xml,json}` |
| Package static release | `corepack pnpm package:release` | `reports/release/access-denied-static.zip` + `manifest.json` |
| Full local CI gate | `python3 tools/ci_gate.py` | All checks + release zip + Docker smoke test |

Use `--skip-docker` with `python3 tools/ci_gate.py --skip-docker` in environments without a Docker daemon.

## CI/CD & Static Hosting

GitHub Actions handles automated verification and GitHub Pages deployment without extra CI infrastructure, while release packaging prepares verified static archives for manual AWS S3 + CloudFront uploads:

- **GitHub Actions CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): Runs `verify` (typecheck, Vitest JUnit, Python tests, build, offline bundle audit, release packaging) followed by `container-smoke` (Docker build + live `tools/smoke_test.py`) on pull requests and branch pushes.
- **GitHub Pages CD** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)): Re-runs full verification and offline bundle auditing before deploying `dist/` to GitHub Pages with job-scoped permissions.
- **Manual AWS S3 + CloudFront Hosting**: Use `reports/release/access-denied-static.zip` and `manifest.json` for manual uploads to a private S3 bucket behind CloudFront OAC.

See [`docs/ci-cd-and-operations.md`](docs/ci-cd-and-operations.md) for pipeline operations and [`docs/aws-deployment.md`](docs/aws-deployment.md) for AWS Console setup and manual release uploads.

## Spec-Driven Development

Changes in this repository follow OpenSpec (`openspec/`):

```bash
openspec list
openspec validate --all --no-interactive
```
