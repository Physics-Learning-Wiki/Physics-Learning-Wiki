from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from .compiler import compile_repository
from .coverage import coverage_data, render_coverage
from .validator import validate_repository


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m scripts.question_bank")
    subcommands = parser.add_subparsers(dest="command", required=True)
    validate = subcommands.add_parser("validate", help="validate question sources")
    validate.add_argument("--include-drafts", action="store_true", help="retained for an explicit authoring workflow; drafts are always structurally checked")
    validate.add_argument("--release", action="store_true", help="enforce publication readiness")
    validate.add_argument("--json-output", type=Path)
    build = subcommands.add_parser("build", help="compile browser bundles")
    build.add_argument("--output", type=Path)
    build.add_argument("--preview", action="store_true")
    build.add_argument("--include-drafts", action="store_true")
    coverage = subcommands.add_parser("coverage", help="report content coverage")
    coverage.add_argument("--preview", action="store_true")
    coverage.add_argument("--format", choices=["text", "json"], default="text")
    coverage.add_argument("--output", type=Path)
    benchmark = subcommands.add_parser("benchmark", help="benchmark compilation")
    benchmark.add_argument("--repeat", type=int, default=3)
    benchmark.add_argument("--json-output", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "validate":
        report = validate_repository(release=args.release)
        for issue in report.issues:
            print(issue.render())
        summary = {"errors": len(report.errors), "warnings": len(report.warnings), "ok": report.ok}
        if args.json_output:
            args.json_output.parent.mkdir(parents=True, exist_ok=True)
            args.json_output.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"question-bank: {len(report.errors)} error(s), {len(report.warnings)} warning(s)")
        return 0 if report.ok else 1
    if args.command == "build":
        if args.include_drafts and not args.preview:
            print("ERROR: --include-drafts requires --preview")
            return 2
        report, metrics = compile_repository(output=args.output, preview=args.preview)
        for issue in report.issues:
            print(issue.render())
        print(f"question-bank: {metrics['files']} file(s), {metrics['bytes']} bytes, {metrics['seconds']:.3f}s, written={metrics['written']}")
        return 0 if report.ok else 1
    if args.command == "coverage":
        report = validate_repository()
        content = json.dumps(coverage_data(report, preview=args.preview), ensure_ascii=False, indent=2) + "\n" if args.format == "json" else render_coverage(report, preview=args.preview)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(content, encoding="utf-8")
        else:
            print(content, end="")
        return 0 if report.ok else 1
    if args.command == "benchmark":
        samples = []
        report = None
        for _ in range(max(args.repeat, 1)):
            started = time.perf_counter()
            report = validate_repository()
            samples.append(time.perf_counter() - started)
        result = {"repeat": len(samples), "minSeconds": min(samples), "meanSeconds": sum(samples) / len(samples), "maxSeconds": max(samples)}
        content = json.dumps(result, indent=2) + "\n"
        if args.json_output:
            args.json_output.write_text(content, encoding="utf-8")
        print(content, end="")
        return 0 if report and report.ok else 1
    return 2
