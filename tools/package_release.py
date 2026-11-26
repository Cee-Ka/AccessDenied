"""Audit-gated deterministic release packager for manual static hosting uploads."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import zipfile

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.audit_bundle import run_audit

IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"
ENTRY_CACHE_CONTROL = "no-cache, must-revalidate"
FIXED_ZIP_TIMESTAMP = (2025, 1, 1, 0, 0, 0)

CONTENT_TYPES_BY_SUFFIX: dict[str, str] = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}


def _recommend_cache_control(rel_path: str) -> str:
    return IMMUTABLE_CACHE_CONTROL if rel_path.startswith("assets/") else ENTRY_CACHE_CONTROL


def _recommend_content_type(file_path: Path, rel_path: str) -> str:
    if rel_path == "healthz":
        return "text/plain; charset=utf-8"
    return CONTENT_TYPES_BY_SUFFIX.get(file_path.suffix.lower(), "application/octet-stream")


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def package_release(
    dist_dir: Path,
    out_dir: Path,
    archive_name: str = "access-denied-static.zip",
) -> tuple[bool, dict[str, object]]:
    """Audit dist_dir and write a deterministic release zip and manifest.json."""
    results, audit_summary = run_audit(dist_dir)
    if not audit_summary["passed"]:
        failed = [
            {"name": r.name, "message": r.message}
            for r in results
            if not r.passed
        ]
        return False, {
            "passed": False,
            "error": "Offline bundle audit failed; release archive was not created.",
            "failed_checks": failed,
        }

    resolved_dist = dist_dir.resolve()
    resolved_out = out_dir.resolve()
    resolved_out.mkdir(parents=True, exist_ok=True)

    archive_path = resolved_out / archive_name
    manifest_path = resolved_out / "manifest.json"

    files = sorted(p for p in resolved_dist.rglob("*") if p.is_file())
    manifest_entries: list[dict[str, object]] = []
    total_bytes = 0

    with zipfile.ZipFile(archive_path, mode="w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for file_path in files:
            rel_path = file_path.relative_to(resolved_dist).as_posix()
            raw = file_path.read_bytes()
            digest = _sha256_bytes(raw)
            size = len(raw)
            total_bytes += size

            info = zipfile.ZipInfo(filename=rel_path, date_time=FIXED_ZIP_TIMESTAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            zf.writestr(info, raw)

            manifest_entries.append(
                {
                    "path": rel_path,
                    "bytes": size,
                    "sha256": digest,
                    "cache_control": _recommend_cache_control(rel_path),
                    "content_type": _recommend_content_type(file_path, rel_path),
                }
            )

    archive_sha256 = _sha256_bytes(archive_path.read_bytes())
    manifest: dict[str, object] = {
        "passed": True,
        "archive": archive_name,
        "archive_sha256": archive_sha256,
        "total_files": len(manifest_entries),
        "total_bytes": total_bytes,
        "cache_policy": {
            "assets/*": IMMUTABLE_CACHE_CONTROL,
            "root_files": ENTRY_CACHE_CONTROL,
        },
        "files": manifest_entries,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return True, manifest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Audit dist/ and create a deterministic static release zip + manifest.json."
    )
    parser.add_argument("--dist", type=Path, default=Path("dist"), help="Path to built Vite dist directory")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("reports/release"),
        help="Output directory for release archive and manifest.json",
    )
    parser.add_argument(
        "--archive-name",
        default="access-denied-static.zip",
        help="Output zip filename inside --out-dir",
    )
    args = parser.parse_args(argv)

    ok, result = package_release(args.dist, args.out_dir, archive_name=args.archive_name)
    if not ok:
        print(f"[FAIL] {result['error']}")
        for item in result.get("failed_checks", []):  # type: ignore[union-attr]
            print(f"  - {item['name']}: {item['message']}")
        return 1

    print(
        f"[PASS] Packaged {result['total_files']} files ({result['total_bytes']} bytes) "
        f"-> {args.out_dir / args.archive_name} (sha256={result['archive_sha256']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
