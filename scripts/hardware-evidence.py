#!/usr/bin/env python3
"""Build and validate user-supplied evidence from a completed host GPU run."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path
from typing import Any

MIB = 1024 * 1024
SUPPORTED_GPU_TYPES = {"discrete GPU", "integrated GPU"}
PATTERNS = {"solid AA", "solid 55", "address XOR"}
SCHEMA = "vram-fieldtest/hardware-evidence-1"


class EvidenceError(ValueError):
    pass


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise EvidenceError(f"Could not read JSON from {path}: {error}") from error


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    try:
        with path.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(block)
    except OSError as error:
        raise EvidenceError(f"Could not hash {path}: {error}") from error
    return digest.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise EvidenceError(message)


def host_adapters(inventory: Any, platform: str) -> list[dict[str, Any]]:
    require(isinstance(inventory, list), "inventory must be a JSON array")
    adapters = []
    for adapter in inventory:
        if not isinstance(adapter, dict):
            continue
        if adapter.get("device_type") not in SUPPORTED_GPU_TYPES:
            continue
        detected = adapter.get("detected_vram_mib")
        if not isinstance(detected, int) or isinstance(detected, bool) or detected <= 0:
            continue
        source = adapter.get("source", "")
        if platform == "linux" and not (
            re.fullmatch(r"Linux DRM card\d+ mem_info_vram_total", source)
            or source == "nvidia-smi reported memory.total"
        ):
            continue
        if platform == "windows" and source != "Windows DXGI DedicatedVideoMemory":
            continue
        adapters.append(adapter)
    return adapters


def validate_report(report: Any, inventory: Any, platform: str, version: str) -> None:
    require(isinstance(report, dict), "report must be a JSON object")
    require(report.get("schema") == "vram-fieldtest/report-1", "unexpected report schema")
    require(report.get("tool_version") == version, "report version does not match the release")
    require(report.get("host", {}).get("os") == platform, "report host OS does not match the evidence platform")

    adapter = report.get("adapter", {})
    require(adapter.get("device_type") in SUPPORTED_GPU_TYPES, "selected adapter is not a supported GPU detected on this host")
    detected = adapter.get("detected_vram_mib")
    require(isinstance(detected, int) and not isinstance(detected, bool) and detected > 0, "detected VRAM must be a positive integer")
    candidates = host_adapters(inventory, platform)
    require(any(
        candidate.get("index") == adapter.get("index")
        and candidate.get("vendor_id") == adapter.get("vendor_id")
        and candidate.get("device_id") == adapter.get("device_id")
        and candidate.get("detected_vram_mib") == detected
        and candidate.get("name") == adapter.get("name")
        and candidate.get("source") == adapter.get("source")
        for candidate in candidates
    ), "selected report adapter is not present in the host inventory")

    limits = report.get("limits", {})
    tested = limits.get("tested_mib")
    coverage = limits.get("coverage_percent")
    require(limits.get("detected_vram_mib") == detected, "report and adapter detected VRAM differ")
    require(isinstance(tested, int) and not isinstance(tested, bool) and tested > 0, "tested VRAM must be a positive integer")
    require(limits.get("requested_mib") == tested, "the completed run did not test its full request")
    require(isinstance(coverage, (int, float)) and not isinstance(coverage, bool), "completed coverage is missing")
    require(math.isfinite(coverage) and 90 <= coverage <= 100, "completed coverage must be between 90% and 100%")
    calculated = tested / detected * 100
    require(abs(coverage - calculated) <= 0.001, "coverage does not match tested and detected VRAM")
    require(limits.get("coverage_target_percent") == 90, "the host run must use the 90% target")
    require(limits.get("resident_mib") == tested, "resident memory does not equal tested memory")
    require(limits.get("thermal_limit_c") == 85, "the 85C automatic thermal stop was not active")

    residency = report.get("residency", {})
    require(residency.get("strategy") == "distinct live WebGPU allocations", "unexpected residency strategy")
    require(residency.get("retained_through_patterns") is True, "allocations were not retained through all patterns")
    require(residency.get("allocated_bytes") == tested * MIB, "resident allocation bytes do not equal tested VRAM")
    require(residency.get("allocation_count") == limits.get("resident_allocations"), "resident allocation counts differ")
    require(isinstance(residency.get("allocation_count"), int) and residency["allocation_count"] > 0, "resident allocation evidence is missing")

    patterns = report.get("patterns")
    require(isinstance(patterns, list) and len(patterns) == 3, "exactly three completed patterns are required")
    require({pattern.get("name") for pattern in patterns if isinstance(pattern, dict)} == PATTERNS, "the required three patterns are not present")
    for pattern in patterns:
        require(pattern.get("status") == "pass", f"pattern {pattern.get('name', '<unknown>')} did not pass")
        require(pattern.get("mismatches") == 0, f"pattern {pattern.get('name', '<unknown>')} has mismatches")
        require(pattern.get("bytes") == tested * MIB, f"pattern {pattern.get('name', '<unknown>')} did not cover all retained memory")
        require(isinstance(pattern.get("windows"), int) and pattern["windows"] > 0, f"pattern {pattern.get('name', '<unknown>')} has no completed batch")

    telemetry = report.get("telemetry", {})
    provider = telemetry.get("provider", "")
    expected_nvidia = f"nvidia-smi selected adapter {adapter.get('index')}"
    provider_matches = provider == expected_nvidia or (
        platform == "linux" and re.fullmatch(r"Linux DRM card\d+ hwmon", provider) is not None
    )
    require(provider_matches, "selected-adapter thermal telemetry is missing or ambiguous")
    require(telemetry.get("unavailable_reason") is None, "thermal telemetry reports an unavailable reason")
    samples = telemetry.get("samples")
    require(isinstance(samples, list) and len(samples) >= 2, "thermal telemetry samples are missing")
    for sample in samples:
        temperature = sample.get("temperature_c") if isinstance(sample, dict) else None
        require(isinstance(temperature, (int, float)) and not isinstance(temperature, bool), "a thermal sample has no temperature")
        require(math.isfinite(temperature) and temperature < 85, "a thermal sample reached the stop threshold")

    verdict = report.get("verdict", {})
    require(verdict.get("status") == "pass", "host run verdict is not pass")


def validate_result(result: Any, report: dict[str, Any]) -> None:
    require(isinstance(result, dict), "run result must be a JSON object")
    require(result.get("status") == "pass", "run command did not return pass")
    require(result.get("mismatches") == 0, "run command returned mismatches")
    require(result.get("tested_mib") == report["limits"]["tested_mib"], "run result tested VRAM differs from the report")
    require(result.get("resident_mib") == report["limits"]["resident_mib"], "run result resident VRAM differs from the report")
    require(result.get("resident_allocations") == report["limits"]["resident_allocations"], "run result allocation count differs from the report")
    result_coverage = result.get("coverage_percent")
    require(isinstance(result_coverage, (int, float)) and not isinstance(result_coverage, bool), "run result coverage is missing")
    require(abs(result_coverage - report["limits"]["coverage_percent"]) <= 0.001, "run result coverage differs from the report")


def validate_html(html: str, report: dict[str, Any]) -> None:
    limits = report["limits"]
    require("<title>VRAM Field Test report</title>" in html, "print report has the wrong title")
    require(f"Tested {limits['tested_mib']} MiB." in html, "print report omits tested VRAM")
    require(f"Detected VRAM on this host: {limits['detected_vram_mib']} MiB." in html, "print report omits detected VRAM")
    require(f"Coverage from this run: {limits['coverage_percent']:.1f}%." in html, "print report omits completed coverage")
    for pattern in PATTERNS:
        require(pattern in html, f"print report omits {pattern}")


def validate_evidence(
    evidence: Any,
    base: Path,
    expected_platform: str | None = None,
    expected_commit: str | None = None,
    expected_version: str | None = None,
    binary_path: Path | None = None,
) -> None:
    require(isinstance(evidence, dict), "evidence must be a JSON object")
    require(evidence.get("schema") == SCHEMA, "unexpected evidence schema")
    require(evidence.get("evidence_kind") == "user-host-completed-run", "evidence is not a completed user-host run")
    platform = evidence.get("platform")
    require(platform in {"linux", "windows"}, "evidence platform must be linux or windows")
    if expected_platform:
        require(platform == expected_platform, "evidence is for the wrong platform")
    commit = evidence.get("source_commit", "")
    require(re.fullmatch(r"[0-9a-f]{40}", commit) is not None, "source commit must be a full lowercase Git commit")
    if expected_commit:
        require(commit == expected_commit, "evidence source commit does not match the release")
    version = evidence.get("release_version", "")
    require(re.fullmatch(r"\d+\.\d+\.\d+", version) is not None, "release version is invalid")
    if expected_version:
        require(version == expected_version, "evidence version does not match the release")
    host_description = evidence.get("runner_environment")
    require(isinstance(host_description, str) and 1 <= len(host_description.strip()) <= 128, "host description is missing")

    command = evidence.get("command", "")
    inventory_command = evidence.get("inventory_command", "")
    require(" inspect --json" in inventory_command, "reproducible inventory command is missing")
    require(" run " in command and "--yes" in command, "reproducible run command is missing")
    require(re.search(r"--coverage(?:=|\s+)90(?:\s|$)", command) is not None, "run command does not request 90% coverage")
    for forbidden in ("--mib", "--allow-software", "--allow-no-thermal-stop"):
        require(forbidden not in command, f"host evidence command contains {forbidden}")

    files = evidence.get("files", {})
    report_name = files.get("report", {}).get("name", "")
    html_name = files.get("html", {}).get("name", "")
    require(Path(report_name).name == report_name and report_name, "JSON report filename is invalid")
    require(Path(html_name).name == html_name and html_name, "HTML report filename is invalid")
    report_path = base / report_name
    html_path = base / html_name
    require(report_path.is_file(), "external JSON report is missing")
    require(html_path.is_file(), "external HTML report is missing")
    require(sha256(report_path) == files.get("report", {}).get("sha256"), "JSON report checksum differs")
    require(sha256(html_path) == files.get("html", {}).get("sha256"), "HTML report checksum differs")
    external_report = load_json(report_path)
    require(external_report == evidence.get("report"), "embedded and external JSON reports differ")

    report = evidence["report"]
    inventory = evidence.get("inventory")
    validate_report(report, inventory, platform, version)
    validate_result(evidence.get("result"), report)
    try:
        html = html_path.read_text(encoding="utf-8")
    except OSError as error:
        raise EvidenceError(f"Could not read {html_path}: {error}") from error
    validate_html(html, report)

    binary = evidence.get("binary", {})
    expected_asset = "vram-fieldtest-linux-x86_64.tar.gz" if platform == "linux" else "vram-fieldtest-windows-x86_64.zip"
    require(binary.get("asset") == expected_asset, "binary asset does not match the evidence platform")
    require(re.fullmatch(r"[0-9a-f]{64}", binary.get("sha256", "")) is not None, "binary checksum is invalid")
    if binary_path:
        require(sha256(binary_path) == binary["sha256"], "tested binary checksum differs")


def select_adapter(args: argparse.Namespace) -> None:
    inventory = load_json(args.inventory)
    adapters = host_adapters(inventory, args.platform)
    require(len(adapters) > 0, f"no supported {args.platform} GPU with detected VRAM is available on this host")
    print(adapters[0]["index"])


def bundle(args: argparse.Namespace) -> None:
    inventory = load_json(args.inventory)
    report = load_json(args.report)
    result = load_json(args.result)
    try:
        html = args.html.read_text(encoding="utf-8")
    except OSError as error:
        raise EvidenceError(f"Could not read {args.html}: {error}") from error
    validate_report(report, inventory, args.platform, args.release_version)
    validate_result(result, report)
    validate_html(html, report)
    evidence = {
        "schema": SCHEMA,
        "evidence_kind": "user-host-completed-run",
        "platform": args.platform,
        "source_commit": args.source_commit,
        "release_version": args.release_version,
        "runner_environment": args.runner_environment,
        "inventory_command": args.inventory_command,
        "command": args.command,
        "binary": {"asset": args.binary_asset, "sha256": sha256(args.binary)},
        "files": {
            "report": {"name": args.report.name, "sha256": sha256(args.report)},
            "html": {"name": args.html.name, "sha256": sha256(args.html)},
        },
        "inventory": inventory,
        "result": result,
        "report": report,
    }
    validate_evidence(evidence, args.output.parent, binary_path=args.binary)
    args.output.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Validated user-host {args.platform} evidence: {args.output}")


def validate(args: argparse.Namespace) -> None:
    evidence = load_json(args.evidence)
    validate_evidence(
        evidence,
        args.evidence.parent,
        expected_platform=args.platform,
        expected_commit=args.source_commit,
        expected_version=args.release_version,
        binary_path=args.binary,
    )
    print(f"Validated user-host {evidence['platform']} evidence: {args.evidence}")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    commands = root.add_subparsers(dest="operation", required=True)
    select = commands.add_parser("select-adapter", help="print the first eligible adapter index on this host")
    select.add_argument("--platform", choices=("linux", "windows"), required=True)
    select.add_argument("--inventory", type=Path, required=True)
    select.set_defaults(handler=select_adapter)

    create = commands.add_parser("bundle", help="create a validated user-host evidence manifest")
    create.add_argument("--platform", choices=("linux", "windows"), required=True)
    create.add_argument("--source-commit", required=True)
    create.add_argument("--release-version", required=True)
    create.add_argument("--runner-environment", required=True)
    create.add_argument("--inventory-command", required=True)
    create.add_argument("--command", required=True)
    create.add_argument("--binary", type=Path, required=True)
    create.add_argument("--binary-asset", required=True)
    create.add_argument("--inventory", type=Path, required=True)
    create.add_argument("--result", type=Path, required=True)
    create.add_argument("--report", type=Path, required=True)
    create.add_argument("--html", type=Path, required=True)
    create.add_argument("--output", type=Path, required=True)
    create.set_defaults(handler=bundle)

    check = commands.add_parser("validate", help="validate an evidence manifest and its report files")
    check.add_argument("--evidence", type=Path, required=True)
    check.add_argument("--platform", choices=("linux", "windows"))
    check.add_argument("--source-commit")
    check.add_argument("--release-version")
    check.add_argument("--binary", type=Path)
    check.set_defaults(handler=validate)
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        args.handler(args)
    except EvidenceError as error:
        print(f"hardware evidence rejected: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
