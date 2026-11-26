"""Unit tests for AccessDenied Python automation and smoke-test tools."""

from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import tempfile
import threading
import unittest
import xml.etree.ElementTree as ET

from tools.audit_bundle import run_audit
from tools.junit import CheckResult, write_junit_xml
from tools.package_release import ENTRY_CACHE_CONTROL, IMMUTABLE_CACHE_CONTROL, package_release
from tools.smoke_test import run_smoke_tests


def _create_valid_dist(root: Path) -> Path:
    dist = root / "dist"
    assets = dist / "assets"
    assets.mkdir(parents=True, exist_ok=True)

    (dist / "shield.svg").write_text("<svg xmlns='http://www.w3.org/2000/svg'/>", encoding="utf-8")
    (assets / "index-abc123.js").write_text("console.log('ok');", encoding="utf-8")
    (assets / "index-abc123.css").write_text("body{color:#232F3E;}", encoding="utf-8")
    (assets / "archivo-latin-700-normal-1.woff2").write_bytes(b"woff2")
    (assets / "ibm-plex-sans-latin-400-normal-1.woff2").write_bytes(b"woff2")
    (assets / "ibm-plex-mono-latin-400-normal-1.woff2").write_bytes(b"woff2")
    (assets / "s3-icon.svg").write_text("<svg/>", encoding="utf-8")
    (dist / "index.html").write_text(
        """<!doctype html>
<html>
  <head>
    <link rel="icon" href="./shield.svg" />
    <link rel="stylesheet" href="./assets/index-abc123.css" />
    <script type="module" src="./assets/index-abc123.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>
""",
        encoding="utf-8",
    )
    return dist


class JUnitWriterTests(unittest.TestCase):
    def test_writes_valid_junit_xml_with_failure_details(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "nested" / "report.xml"
            write_junit_xml(
                out,
                "sample-suite",
                [
                    CheckResult(name="pass_case", classname="suite.test", passed=True, duration_s=0.12),
                    CheckResult(
                        name="fail_case",
                        classname="suite.test",
                        passed=False,
                        duration_s=0.34,
                        message='Bad <tag> & "quote"',
                        details="Expected 200, got 500",
                    ),
                ],
            )
            tree = ET.parse(out)
            root = tree.getroot()
            self.assertEqual(root.tag, "testsuite")
            self.assertEqual(root.attrib["tests"], "2")
            self.assertEqual(root.attrib["failures"], "1")
            cases = root.findall("testcase")
            self.assertEqual(len(cases), 2)
            failure = cases[1].find("failure")
            self.assertIsNotNone(failure)
            assert failure is not None
            self.assertEqual(failure.attrib["message"], 'Bad <tag> & "quote"')
            self.assertEqual(failure.text, "Expected 200, got 500")


class BundleAuditorTests(unittest.TestCase):
    def test_valid_offline_bundle_passes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dist = _create_valid_dist(Path(tmp))
            results, summary = run_audit(dist)
            self.assertTrue(summary["passed"], [r for r in results if not r.passed])
            self.assertEqual(len(results), 6)

    def test_detects_banned_cdn_host_in_js(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dist = _create_valid_dist(Path(tmp))
            (dist / "assets" / "index-abc123.js").write_text(
                'fetch("https://cdn.jsdelivr.net/npm/pkg");',
                encoding="utf-8",
            )
            results, summary = run_audit(dist)
            self.assertFalse(summary["passed"])
            by_name = {r.name: r for r in results}
            self.assertFalse(by_name["no_banned_cdn_hosts"].passed)

    def test_detects_external_font_url_in_css_and_broken_html_link(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dist = _create_valid_dist(Path(tmp))
            (dist / "assets" / "index-abc123.css").write_text(
                "@import url('https://fonts.googleapis.com/css2?family=Inter');",
                encoding="utf-8",
            )
            (dist / "assets" / "index-abc123.js").unlink()
            results, summary = run_audit(dist)
            self.assertFalse(summary["passed"])
            by_name = {r.name: r for r in results}
            self.assertFalse(by_name["html_css_no_external_urls"].passed)
            self.assertFalse(by_name["index_local_references"].passed)

    def test_detects_js_budget_overflow(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dist = _create_valid_dist(Path(tmp))
            (dist / "assets" / "index-abc123.js").write_bytes(b"x" * (4 * 1024))
            results, summary = run_audit(dist, max_js_kb=2)
            self.assertFalse(summary["passed"])
            by_name = {r.name: r for r in results}
            self.assertFalse(by_name["bundle_size_budgets"].passed)

    def test_preserves_dotfile_and_blocks_dot_slash_traversal(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dist = _create_valid_dist(root)
            (dist / ".well-known").mkdir(parents=True, exist_ok=True)
            (dist / ".well-known" / "app.json").write_text("{}", encoding="utf-8")
            (root / "secret.txt").write_text("secret", encoding="utf-8")

            html = (dist / "index.html").read_text(encoding="utf-8")
            (dist / "index.html").write_text(
                html.replace("</head>", '<link rel="manifest" href="./.well-known/app.json" /></head>'),
                encoding="utf-8",
            )
            results, summary = run_audit(dist)
            self.assertTrue(summary["passed"], [r for r in results if not r.passed])

            (dist / "index.html").write_text(
                html.replace("</head>", '<link rel="icon" href="./../secret.txt" /></head>'),
                encoding="utf-8",
            )
            results, summary = run_audit(dist)
            self.assertFalse(summary["passed"])
            by_name = {r.name: r for r in results}
            self.assertIn("escapes dist directory", by_name["index_local_references"].details)


class SmokeTestRunnerTests(unittest.TestCase):
    def _start_server(self, handler_cls: type[BaseHTTPRequestHandler]) -> tuple[ThreadingHTTPServer, str]:
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler_cls)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        host, port = server.server_address
        return server, f"http://{host}:{port}"

    def test_smoke_passes_on_compliant_server(self) -> None:
        class GoodHandler(BaseHTTPRequestHandler):
            def log_message(self, format: str, *args: object) -> None:  # noqa: A002
                return

            def _send_sec_headers(self) -> None:
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("X-Frame-Options", "DENY")
                self.send_header("Referrer-Policy", "no-referrer")
                self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'")

            def do_GET(self) -> None:
                if self.path == "/healthz":
                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain")
                    self._send_sec_headers()
                    self.end_headers()
                    self.wfile.write(b"ok\n")
                elif self.path in {"/", "/levels/nonexistent-smoke-route"}:
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self._send_sec_headers()
                    self.end_headers()
                    self.wfile.write(
                        b"<!doctype html><title>AccessDenied</title>"
                        b'<link rel="stylesheet" href="/assets/app.css"/>'
                        b'<script type="module" src="/assets/app.js"></script>'
                        b'<div id="root"></div>'
                    )
                elif self.path == "/assets/app.css":
                    self.send_response(200)
                    self.send_header("Content-Type", "text/css")
                    self._send_sec_headers()
                    self.end_headers()
                    self.wfile.write(b"body{}")
                elif self.path == "/assets/app.js":
                    self.send_response(200)
                    self.send_header("Content-Type", "application/javascript")
                    self._send_sec_headers()
                    self.end_headers()
                    self.wfile.write(b"console.log(1);")
                else:
                    self.send_response(404)
                    self.end_headers()

        server, url = self._start_server(GoodHandler)
        try:
            results, summary = run_smoke_tests(url, timeout_s=3.0)
            self.assertTrue(summary["passed"], [r for r in results if not r.passed])
            self.assertEqual(len(results), 5)
        finally:
            server.shutdown()
            server.server_close()

    def test_smoke_fails_when_headers_or_assets_missing(self) -> None:
        class BrokenHandler(BaseHTTPRequestHandler):
            def log_message(self, format: str, *args: object) -> None:  # noqa: A002
                return

            def do_GET(self) -> None:
                if self.path == "/healthz":
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b"ok")
                elif self.path == "/":
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html")
                    self.end_headers()
                    self.wfile.write(
                        b"<title>AccessDenied</title>"
                        b'<script src="/assets/missing.js"></script>'
                        b'<div id="root"></div>'
                    )
                else:
                    self.send_response(404)
                    self.end_headers()

        server, url = self._start_server(BrokenHandler)
        try:
            results, summary = run_smoke_tests(url, timeout_s=3.0)
            self.assertFalse(summary["passed"])
            by_name = {r.name: r for r in results}
            self.assertFalse(by_name["security_headers"].passed)
            self.assertFalse(by_name["referenced_local_assets"].passed)
            self.assertFalse(by_name["spa_route_fallback"].passed)
            json.dumps(summary)
        finally:
            server.shutdown()
            server.server_close()


class ReleasePackagerTests(unittest.TestCase):
    def test_packages_valid_dist_with_checksums_and_cache_headers(self) -> None:
        import hashlib
        import zipfile

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dist = _create_valid_dist(root)
            (dist / "healthz").write_text("ok\n", encoding="utf-8")
            out_dir = root / "release"

            ok, manifest = package_release(dist, out_dir)
            self.assertTrue(ok, manifest)

            archive_path = out_dir / "access-denied-static.zip"
            manifest_path = out_dir / "manifest.json"
            self.assertTrue(archive_path.is_file())
            self.assertTrue(manifest_path.is_file())

            with zipfile.ZipFile(archive_path, "r") as zf:
                names = set(zf.namelist())
                self.assertIn("index.html", names)
                self.assertIn("healthz", names)
                self.assertIn("assets/index-abc123.js", names)

            files_by_path = {entry["path"]: entry for entry in manifest["files"]}  # type: ignore[index]
            self.assertEqual(files_by_path["index.html"]["cache_control"], ENTRY_CACHE_CONTROL)
            self.assertEqual(files_by_path["healthz"]["cache_control"], ENTRY_CACHE_CONTROL)
            self.assertEqual(files_by_path["healthz"]["content_type"], "text/plain; charset=utf-8")
            self.assertEqual(files_by_path["assets/index-abc123.js"]["cache_control"], IMMUTABLE_CACHE_CONTROL)

            expected_sha = hashlib.sha256((dist / "index.html").read_bytes()).hexdigest()
            self.assertEqual(files_by_path["index.html"]["sha256"], expected_sha)

    def test_blocks_release_when_bundle_audit_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dist = _create_valid_dist(root)
            (dist / "assets" / "index-abc123.js").write_text(
                'import "https://unpkg.com/bad-pkg";',
                encoding="utf-8",
            )
            out_dir = root / "release"

            ok, result = package_release(dist, out_dir)
            self.assertFalse(ok)
            self.assertFalse((out_dir / "access-denied-static.zip").exists())
            self.assertFalse((out_dir / "manifest.json").exists())
            self.assertTrue(result["failed_checks"])


if __name__ == "__main__":
    unittest.main()
