from __future__ import annotations

import argparse
import json
from pathlib import Path

from .validator import validate_repository


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m scripts.question_bank")
    subcommands = parser.add_subparsers(dest="command", required=True)
    validate = subcommands.add_parser("validate", help="validate question sources")
    validate.add_argument("--include-drafts", action="store_true", help="retained for an explicit authoring workflow; drafts are always structurally checked")
    validate.add_argument("--release", action="store_true", help="enforce publication readiness")
    validate.add_argument("--json-output", type=Path)
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
    return 2
