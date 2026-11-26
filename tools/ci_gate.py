"""Unified local and CI verification gate orchestrator for AccessDenied."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time


def _pnpm_cmd() -> list[str]:
    if shutil.which("corepack"):
        return ["corepack", "pnpm"]
    if shutil.which("pnpm"):
        return ["pnpm"]
    raise RuntimeError("Neither 'corepack' nor 'pnpm' was found in PATH")


def _run_step(name: str, cmd: list[str], cwd: Path) -> dict[str, object]:
    print(f"\n=== [{name}] $ {' '.join(cmd)} ===", flush=True)
    start = time.monotonic()
    completed = subprocess.run(cmd, cwd=str(cwd), check=False)
    duration = round(time.monotonic() - start, 3)
    status = "PASS" if completed.returncode == 0 else "FAIL"
    print(f"=== [{name}] {status} ({duration:.2f}s) ===", flush=True)
    return {
        "name": name,
        "command": cmd,
        "status": status,
        "exit_code": completed.returncode,
        "duration_s": duration,
    }


def _run_container_smoke(
    repo_root: Path,
    reports_dir: Path,
    image: str,
    port: int,
) -> list[dict[str, object]]:
    stages: list[dict[str, object]] = []
    build_res = _run_step("docker-build", ["docker", "build", "-t", image, "."], repo_root)
    stages.append(build_res)
    if build_res["exit_code"] != 0:
        return stages

    container_name = f"access-denied-ci-smoke-{port}"
    subprocess.run(["docker", "rm", "-f", container_name], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    start_res = _run_step(
        "docker-run",
        [
            "docker",
            "run",
            "-d",
            "--rm",
            "--name",
            container_name,
            "-p",
            f"127.0.0.1:{port}:8080",
            image,
        ],
        repo_root,
    )
    stages.append(start_res)
    if start_res["exit_code"] != 0:
        return stages

    try:
        smoke_res = _run_step(
            "container-smoke",
            [
                sys.executable,
                "tools/smoke_test.py",
                "--base-url",
                f"http://127.0.0.1:{port}",
                "--junit-out",
                str(reports_dir / "smoke-junit.xml"),
                "--json-out",
                str(reports_dir / "smoke.json"),
            ],
            repo_root,
        )
        stages.append(smoke_res)
    finally:
        subprocess.run(
            ["docker", "rm", "-f", container_name],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    return stages


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run full AccessDenied CI verification gate.")
    parser.add_argument("--reports-dir", type=Path, default=Path("reports"), help="Directory for JUnit/JSON outputs")
    parser.add_argument("--skip-docker", action="store_true", help="Skip Docker image build and smoke tests")
    parser.add_argument("--skip-openspec", action="store_true", help="Skip openspec strict validation")
    parser.add_argument("--image", default="access-denied:ci", help="Docker image tag for smoke testing")
    parser.add_argument("--port", type=int, default=18080, help="Host loopback port for container smoke test")
    args = parser.parse_args(argv)

    repo_root = Path(__file__).resolve().parent.parent
    reports_dir = (repo_root / args.reports_dir) if not args.reports_dir.is_absolute() else args.reports_dir
    reports_dir.mkdir(parents=True, exist_ok=True)

    pnpm = _pnpm_cmd()
    stages: list[dict[str, object]] = []

    planned: list[tuple[str, list[str]]] = [
        ("typecheck", [*pnpm, "typecheck"]),
        ("unit-tests", [*pnpm, "test:ci"]),
        (
            "python-tool-tests",
            [sys.executable, "-m", "unittest", "discover", "-s", "tests/python", "-p", "test_*.py", "-v"],
        ),
        ("build", [*pnpm, "build"]),
        (
            "bundle-audit",
            [
                sys.executable,
                "tools/audit_bundle.py",
                "--dist",
                "dist",
                "--junit-out",
                str(reports_dir / "bundle-audit-junit.xml"),
                "--json-out",
                str(reports_dir / "bundle-audit.json"),
            ],
        ),
        (
            "package-release",
            [
                sys.executable,
                "tools/package_release.py",
                "--dist",
                "dist",
                "--out-dir",
                str(reports_dir / "release"),
            ],
        ),
    ]

    for name, cmd in planned:
        stages.append(_run_step(name, cmd, repo_root))

    if not args.skip_openspec and shutil.which("openspec"):
        stages.append(
            _run_step(
                "openspec-validate",
                ["openspec", "validate", "--all", "--no-interactive"],
                repo_root,
            )
        )
    else:
        stages.append({"name": "openspec-validate", "command": [], "status": "SKIPPED", "exit_code": 0, "duration_s": 0.0})

    if not args.skip_docker:
        stages.extend(_run_container_smoke(repo_root, reports_dir, args.image, args.port))
    else:
        stages.append({"name": "container-smoke", "command": [], "status": "SKIPPED", "exit_code": 0, "duration_s": 0.0})

    overall_passed = all(s["status"] in {"PASS", "SKIPPED"} for s in stages)
    summary = {"passed": overall_passed, "stages": stages}
    (reports_dir / "ci-gate-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print("\n=== CI Gate Summary ===")
    for stage in stages:
        print(f"  {stage['status']:7s} | {stage['name']:20s} | {stage['duration_s']:.2f}s")

    return 0 if overall_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
