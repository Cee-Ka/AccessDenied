"""Minimal zero-dependency JUnit XML writer for CI reporting."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import xml.etree.ElementTree as ET


@dataclass(frozen=True)
class CheckResult:
    """Represents the outcome of a single automated verification check."""

    name: str
    classname: str
    passed: bool
    duration_s: float = 0.0
    message: str = ""
    details: str = ""


def write_junit_xml(path: Path, suite_name: str, results: list[CheckResult]) -> None:
    """Write a list of CheckResult entries to a standard JUnit XML file."""
    failures = sum(1 for item in results if not item.passed)
    total_time = sum(max(0.0, item.duration_s) for item in results)

    suite = ET.Element(
        "testsuite",
        attrib={
            "name": suite_name,
            "tests": str(len(results)),
            "failures": str(failures),
            "errors": "0",
            "skipped": "0",
            "time": f"{total_time:.3f}",
        },
    )

    for item in results:
        case = ET.SubElement(
            suite,
            "testcase",
            attrib={
                "name": item.name,
                "classname": item.classname,
                "time": f"{max(0.0, item.duration_s):.3f}",
            },
        )
        if not item.passed:
            failure = ET.SubElement(
                case,
                "failure",
                attrib={
                    "message": item.message or "Check failed",
                    "type": "AssertionError",
                },
            )
            failure.text = item.details or item.message or "Check failed"

    tree = ET.ElementTree(suite)
    ET.indent(tree, space="  ")
    path.parent.mkdir(parents=True, exist_ok=True)
    tree.write(path, encoding="utf-8", xml_declaration=True)
