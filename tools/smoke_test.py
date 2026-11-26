"""Live HTTP smoke tester for the containerized AccessDenied runtime."""

from __future__ import annotations

import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tools.junit import CheckResult, write_junit_xml

REQUIRED_SECURITY_HEADERS: dict[str, str] = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "deny",
    "referrer-policy": "no-referrer",
}


class _HtmlAssetExtractor(HTMLParser):
    """Collects script src and stylesheet/icon link href references from HTML."""

    def __init__(self) -> None:
        super().__init__()
        self.asset_refs: list[str] = []
        self.external_refs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        ref = attr_map.get("src") if tag == "script" else attr_map.get("href") if tag == "link" else None
        if not ref:
            return
        if ref.startswith(("http://", "https://", "//")):
            self.external_refs.append(ref)
        elif not ref.startswith("data:"):
            self.asset_refs.append(ref)


def _http_get(url: str, timeout: float = 5.0) -> tuple[int, dict[str, str], bytes]:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        headers = {k.lower(): v for k, v in resp.headers.items()}
        return resp.status, headers, resp.read()


def wait_for_healthz(base_url: str, timeout_s: float) -> CheckResult:
    """Poll /healthz until HTTP 200 'ok' or timeout expires."""
    start = time.monotonic()
    deadline = start + max(0.5, timeout_s)
    health_url = urllib.parse.urljoin(base_url.rstrip("/") + "/", "healthz")
    last_error = "no response"

    while time.monotonic() < deadline:
        try:
            status, _headers, body = _http_get(health_url, timeout=3.0)
            text = body.decode("utf-8", errors="ignore").strip()
            if status == 200 and "ok" in text.lower():
                return CheckResult(
                    name="healthz_endpoint",
                    classname="accessdenied.smoke",
                    passed=True,
                    duration_s=time.monotonic() - start,
                    message=f"GET /healthz returned 200 ({text})",
                )
            last_error = f"HTTP {status}: {text}"
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = str(exc)
        time.sleep(0.25)

    return CheckResult(
        name="healthz_endpoint",
        classname="accessdenied.smoke",
        passed=False,
        duration_s=time.monotonic() - start,
        message=f"/healthz did not become healthy within {timeout_s:.1f}s",
        details=last_error,
    )


def run_smoke_tests(base_url: str, timeout_s: float = 30.0) -> tuple[list[CheckResult], dict[str, object]]:
    """Run live HTTP integration checks against a running AccessDenied server."""
    classname = "accessdenied.smoke"
    normalized_base = base_url.rstrip("/") + "/"
    results: list[CheckResult] = []

    health_result = wait_for_healthz(normalized_base, timeout_s)
    results.append(health_result)

    root_status = 0
    root_headers: dict[str, str] = {}
    root_html = ""
    root_start = time.monotonic()
    try:
        root_status, root_headers, raw_body = _http_get(normalized_base, timeout=5.0)
        root_html = raw_body.decode("utf-8", errors="ignore")
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        results.append(
            CheckResult(
                name="root_html_document",
                classname=classname,
                passed=False,
                duration_s=time.monotonic() - root_start,
                message=f"GET / failed: {exc}",
                details=str(exc),
            )
        )
        return results, {"base_url": normalized_base, "passed": False}

    extractor = _HtmlAssetExtractor()
    extractor.feed(root_html)

    content_type = root_headers.get("content-type", "").lower()
    html_issues: list[str] = []
    if root_status != 200:
        html_issues.append(f"Expected HTTP 200, got {root_status}")
    if "text/html" not in content_type:
        html_issues.append(f"Unexpected Content-Type: {content_type or 'missing'}")
    if '<div id="root">' not in root_html:
        html_issues.append('Missing <div id="root"> mount container')
    if "AccessDenied" not in root_html:
        html_issues.append("Missing AccessDenied title marker")
    if extractor.external_refs:
        html_issues.append(f"External script/link tags present: {', '.join(extractor.external_refs)}")

    results.append(
        CheckResult(
            name="root_html_document",
            classname=classname,
            passed=not html_issues,
            duration_s=time.monotonic() - root_start,
            message="Root HTML valid with local-only tags" if not html_issues else "; ".join(html_issues),
            details="\n".join(html_issues),
        )
    )

    sec_start = time.monotonic()
    sec_issues: list[str] = []
    for header, expected in REQUIRED_SECURITY_HEADERS.items():
        actual = root_headers.get(header, "").lower()
        if actual != expected:
            sec_issues.append(f"{header}={actual or '<missing>'} (expected {expected})")
    csp = root_headers.get("content-security-policy", "")
    if "default-src 'self'" not in csp.lower():
        sec_issues.append(f"content-security-policy missing default-src 'self' ({csp or '<missing>'})")

    results.append(
        CheckResult(
            name="security_headers",
            classname=classname,
            passed=not sec_issues,
            duration_s=time.monotonic() - sec_start,
            message="All required security and CSP headers present" if not sec_issues else "; ".join(sec_issues),
            details="\n".join(sec_issues),
        )
    )

    assets_start = time.monotonic()
    asset_issues: list[str] = []
    if not extractor.asset_refs:
        asset_issues.append("No local script or link assets referenced in / HTML")
    for ref in extractor.asset_refs:
        asset_url = urllib.parse.urljoin(normalized_base, ref.lstrip("/"))
        try:
            status, _headers, body = _http_get(asset_url, timeout=5.0)
            if status != 200 or len(body) == 0:
                asset_issues.append(f"{ref} returned HTTP {status} ({len(body)} bytes)")
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            asset_issues.append(f"{ref} fetch error: {exc}")

    results.append(
        CheckResult(
            name="referenced_local_assets",
            classname=classname,
            passed=not asset_issues,
            duration_s=time.monotonic() - assets_start,
            message=(
                f"Fetched {len(extractor.asset_refs)} referenced local assets (HTTP 200)"
                if not asset_issues
                else "; ".join(asset_issues)
            ),
            details="\n".join(asset_issues),
        )
    )

    spa_start = time.monotonic()
    spa_url = urllib.parse.urljoin(normalized_base, "levels/nonexistent-smoke-route")
    spa_issues: list[str] = []
    try:
        spa_status, _spa_headers, spa_body = _http_get(spa_url, timeout=5.0)
        spa_text = spa_body.decode("utf-8", errors="ignore")
        if spa_status != 200:
            spa_issues.append(f"Expected HTTP 200 on SPA fallback route, got {spa_status}")
        if '<div id="root">' not in spa_text:
            spa_issues.append("SPA fallback route did not serve app index.html")
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        spa_issues.append(f"SPA fallback request failed: {exc}")

    results.append(
        CheckResult(
            name="spa_route_fallback",
            classname=classname,
            passed=not spa_issues,
            duration_s=time.monotonic() - spa_start,
            message="Unknown routes fall back to SPA index.html" if not spa_issues else "; ".join(spa_issues),
            details="\n".join(spa_issues),
        )
    )

    summary: dict[str, object] = {
        "base_url": normalized_base,
        "passed": all(r.passed for r in results),
        "asset_count": len(extractor.asset_refs),
        "checks": [
            {"name": r.name, "passed": r.passed, "message": r.message}
            for r in results
        ],
    }
    return results, summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run HTTP smoke checks against a running AccessDenied container.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8080", help="Target server base URL")
    parser.add_argument("--timeout", type=float, default=30.0, help="Seconds to wait for /healthz")
    parser.add_argument("--junit-out", type=Path, default=None, help="Optional path to write JUnit XML")
    parser.add_argument("--json-out", type=Path, default=None, help="Optional path to write JSON summary")
    args = parser.parse_args(argv)

    results, summary = run_smoke_tests(args.base_url, timeout_s=args.timeout)

    if args.junit_out is not None:
        write_junit_xml(args.junit_out, "container-smoke", results)
    if args.json_out is not None:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    for res in results:
        status = "PASS" if res.passed else "FAIL"
        print(f"[{status}] {res.name}: {res.message}")

    return 0 if summary["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
