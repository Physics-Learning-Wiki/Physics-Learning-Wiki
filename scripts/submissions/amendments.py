"""Prevent a merged draft amendment from silently unpublishing an existing question."""
import argparse
from pathlib import Path
import subprocess
import yaml


def check_amendments(root, base):
    files = subprocess.run(["git", "diff", "--name-only", base, "--", "question-bank/questions", "question-bank/sets"],
                           cwd=root, check=True, capture_output=True, text=True, encoding="utf-8").stdout.splitlines()
    for name in files:
        previous = subprocess.run(["git", "show", base + ":" + name], cwd=root,
                                  capture_output=True, text=True, encoding="utf-8")
        if previous.returncode:
            continue
        original = yaml.safe_load(previous.stdout) or {}
        if original.get("status") != "published" or not original.get("submission", {}).get("issue_url"):
            continue
        path = root / name
        if not path.exists():
            raise ValueError("Retire published submissions explicitly instead of deleting their provenance")
        current = yaml.safe_load(path.read_text(encoding="utf-8"))
        if current.get("id") != original.get("id") or current.get("submission", {}).get("issue_url") != original["submission"]["issue_url"]:
            raise ValueError("Published amendments must preserve the imported ID and Issue source")
        if current.get("status") not in {"published", "retired"}:
            raise ValueError("Published amendments require new signed reviews before merge; the existing live question cannot be replaced by a draft")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    args = parser.parse_args()
    check_amendments(Path.cwd(), args.base)


if __name__ == "__main__":
    main()
