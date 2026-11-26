"""Post-build auditor verifying offline-first invariants and bundle budgets."""

from __future__ import annotations

import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import time
from typing import Iterable

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.junit import CheckResult, write_junit_xml

BANNED_CDN_HOSTS: tuple[str, ...] = (
    "unpkg.com",
    "cdn.jsdelivr.net",
    "cdnjs.cloudflare.com",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "ajax.googleapis.com",
    "esm.sh",
    "skypack.dev",
    "ga.jspm.io",
)

REQUIRED_FONT_PREFIXES: tuple[str, ...] = (
    "archivo",
    "ibm-plex-sans",
    "ibm-plex-mono",
)

EXTERNAL_URL_RE = re.compile(r"https?://[^\s\"'()<>`\\]+", re.IGNORECASE)


class _AssetRefParser(HTMLParser):
    """Extracts local src/href references from built HTML."""

    def __init__(self) -> None:
        super().__init__()
        self.refs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if key in {"src", "href"} and value:
                self.refs.append(value)


def _timed_check(
    name: str,
    classname: str,
    fn,
) -> CheckResult:
    start = time.monotonic()
    try:
        passed, message, details = fn()
    except Exception as exc:  # pragma: no cover - defensive guard
        return CheckResult(
            name=name,
            classname=classname,
            passed=False,
            duration_s=time.monotonic() - start,
            message=str(exc),
            details=repr(exc),
        )
    return CheckResult(
        name=name,
        classname=classname,
        passed=passed,
        duration_s=time.monotonic() - start,
        message=message,
        details=details,
    )


def _resolve_local_ref(dist_dir: Path, ref: str) -> Path | None:
    clean = ref.split("#", 1)[0].split("?", 1)[0]
    if not clean or clean.startswith(("data:", "http://", "https://", "//")):
        return None
    normalized = clean.removeprefix("./") if clean.startswith("./") else clean.lstrip("/")
    return (dist_dir / normalized).resolve()


def _find_banned_hosts(files: Iterable[Path], dist_dir: Path) -> list[str]:
    hits: list[str] = []
    for file_path in files:
        content = file_path.read_text(encoding="utf-8", errors="ignore").lower()
        rel = file_path.relative_to(dist_dir)
        for host in BANNED_CDN_HOSTS:
            if host in content:
                hits.append(f"{rel}: contains banned CDN host '{host}'")
    return hits


def run_audit(
    dist_dir: Path,
    max_total_kb: int = 5120,
    max_js_kb: int = 2048,
    max_css_kb: int = 256,
) -> tuple[list[CheckResult], dict[str, object]]:
    """Run all offline and structural checks against a Vite dist directory."""
    classname = "accessdenied.bundle_audit"
    resolved_dist = dist_dir.resolve()
    assets_dir = resolved_dist / "assets"

    all_files = (
        sorted(p for p in resolved_dist.rglob("*") if p.is_file())
        if resolved_dist.is_dir()
        else []
    )
    asset_files = (
        sorted(p for p in assets_dir.rglob("*") if p.is_file())
        if assets_dir.is_dir()
        else []
    )
    js_files = [p for p in asset_files if p.suffix == ".js"]
    css_files = [p for p in asset_files if p.suffix == ".css"]
    woff2_files = [p for p in asset_files if p.suffix == ".woff2"]
    svg_files = [p for p in asset_files if p.suffix == ".svg"]
    text_files = [p for p in all_files if p.suffix in {".html", ".css", ".js"}]

    def check_required_files() -> tuple[bool, str, str]:
        missing: list[str] = []
        if not (resolved_dist / "index.html").is_file():
            missing.append("index.html")
        if not (resolved_dist / "shield.svg").is_file():
            missing.append("shield.svg")
        if not js_files:
            missing.append("assets/*.js")
        if not css_files:
            missing.append("assets/*.css")
        if missing:
            return False, f"Missing required bundle files: {', '.join(missing)}", "\n".join(missing)
        return True, "Required entry files and JS/CSS assets are present", ""

    def check_bundled_fonts_and_icons() -> tuple[bool, str, str]:
        font_names = [p.name.lower() for p in woff2_files]
        missing_fonts = [
            prefix
            for prefix in REQUIRED_FONT_PREFIXES
            if not any(name.startswith(prefix) for name in font_names)
        ]
        issues: list[str] = []
        if missing_fonts:
            issues.append(f"Missing bundled .woff2 font families: {', '.join(missing_fonts)}")
        if not svg_files:
            issues.append("No bundled .svg AWS icon assets found in assets/")
        if issues:
            return False, "; ".join(issues), "\n".join(issues)
        return (
            True,
            f"Found {len(woff2_files)} bundled woff2 files and {len(svg_files)} SVG icon assets",
            "",
        )

    def check_index_refs() -> tuple[bool, str, str]:
        index_path = resolved_dist / "index.html"
        if not index_path.is_file():
            return False, "index.html missing", "dist/index.html does not exist"
        parser = _AssetRefParser()
        parser.feed(index_path.read_text(encoding="utf-8", errors="ignore"))
        broken: list[str] = []
        checked = 0
        for ref in parser.refs:
            target = _resolve_local_ref(resolved_dist, ref)
            if target is None:
                continue
            checked += 1
            try:
                target.relative_to(resolved_dist)
            except ValueError:
                broken.append(f"{ref} escapes dist directory")
                continue
            if not target.is_file():
                broken.append(f"{ref} -> missing {target.relative_to(resolved_dist)}")
        if broken:
            return False, f"Broken local references in index.html ({len(broken)})", "\n".join(broken)
        return True, f"All {checked} local references in index.html resolve inside dist/", ""

    def check_html_css_external_urls() -> tuple[bool, str, str]:
        candidates = [p for p in [resolved_dist / "index.html", *css_files] if p.is_file()]
        violations: list[str] = []
        for file_path in candidates:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            matches = sorted(set(EXTERNAL_URL_RE.findall(content)))
            if matches:
                rel = file_path.relative_to(resolved_dist)
                violations.append(f"{rel}: {', '.join(matches)}")
        if violations:
            return False, "External HTTP(S) URLs found in HTML/CSS", "\n".join(violations)
        return True, "Zero external HTTP(S) URLs in HTML and CSS assets", ""

    def check_no_banned_cdns() -> tuple[bool, str, str]:
        hits = _find_banned_hosts(text_files, resolved_dist)
        if hits:
            return False, f"Detected banned CDN host references ({len(hits)})", "\n".join(hits)
        return True, "Zero banned CDN hostnames across HTML, CSS, and JS assets", ""

    def check_size_budgets() -> tuple[bool, str, str]:
        total_bytes = sum(p.stat().st_size for p in all_files)
        largest_js_bytes = max((p.stat().st_size for p in js_files), default=0)
        largest_css_bytes = max((p.stat().st_size for p in css_files), default=0)
        violations: list[str] = []
        if total_bytes > max_total_kb * 1024:
            violations.append(f"Total size {total_bytes / 1024:.1f} KB exceeds {max_total_kb} KB")
        if largest_js_bytes > max_js_kb * 1024:
            violations.append(f"Largest JS chunk {largest_js_bytes / 1024:.1f} KB exceeds {max_js_kb} KB")
        if largest_css_bytes > max_css_kb * 1024:
            violations.append(f"Largest CSS bundle {largest_css_bytes / 1024:.1f} KB exceeds {max_css_kb} KB")
        if violations:
            return False, "; ".join(violations), "\n".join(violations)
        return (
            True,
            (
                f"Bundle budgets passed (total={total_bytes / 1024:.1f} KB, "
                f"max_js={largest_js_bytes / 1024:.1f} KB, max_css={largest_css_bytes / 1024:.1f} KB)"
            ),
            "",
        )

    results = [
        _timed_check("required_entry_files", classname, check_required_files),
        _timed_check("bundled_fonts_and_icons", classname, check_bundled_fonts_and_icons),
        _timed_check("index_local_references", classname, check_index_refs),
        _timed_check("html_css_no_external_urls", classname, check_html_css_external_urls),
        _timed_check("no_banned_cdn_hosts", classname, check_no_banned_cdns),
        _timed_check("bundle_size_budgets", classname, check_size_budgets),
    ]

    summary: dict[str, object] = {
        "dist": str(resolved_dist),
        "passed": all(r.passed for r in results),
        "file_count": len(all_files),
        "total_bytes": sum(p.stat().st_size for p in all_files),
        "woff2_count": len(woff2_files),
        "svg_count": len(svg_files),
        "checks": [
            {"name": r.name, "passed": r.passed, "message": r.message}
            for r in results
        ],
    }
    return results, summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Audit built AccessDenied bundle for offline-first compliance.")
    parser.add_argument("--dist", type=Path, default=Path("dist"), help="Path to Vite dist output directory")
    parser.add_argument("--max-total-kb", type=int, default=5120, help="Maximum total dist size in KB")
    parser.add_argument("--max-js-kb", type=int, default=2048, help="Maximum single JS chunk size in KB")
    parser.add_argument("--max-css-kb", type=int, default=256, help="Maximum single CSS bundle size in KB")
    parser.add_argument("--junit-out", type=Path, default=None, help="Optional path to write JUnit XML")
    parser.add_argument("--json-out", type=Path, default=None, help="Optional path to write JSON summary")
    args = parser.parse_args(argv)

    results, summary = run_audit(
        args.dist,
        max_total_kb=args.max_total_kb,
        max_js_kb=args.max_js_kb,
        max_css_kb=args.max_css_kb,
    )

    if args.junit_out is not None:
        write_junit_xml(args.junit_out, "bundle-audit", results)
    if args.json_out is not None:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    for res in results:
        status = "PASS" if res.passed else "FAIL"
        print(f"[{status}] {res.name}: {res.message}")

    return 0 if summary["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
