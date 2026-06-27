#!/usr/bin/env python3
"""Fix missing trailing newlines in all Markdown files under docs/.

Usage:
    python fix-trailing-newlines.py          # fix all .md files under docs/
    python fix-trailing-newlines.py --check  # dry-run: only list files needing fix
"""

import argparse
import os
import sys
from pathlib import Path


def missing_trailing_newline(filepath: Path) -> bool:
    """Return True if the file does NOT end with a newline character."""
    try:
        with open(filepath, "rb") as f:
            # Seek to the last byte; empty files are considered OK
            f.seek(0, os.SEEK_END)
            size = f.tell()
            if size == 0:
                return False
            f.seek(max(size - 1, 0))
            last_byte = f.read(1)
            return last_byte != b"\n"
    except OSError as e:
        print(f"[ERROR] Cannot read {filepath}: {e}", file=sys.stderr)
        return False


def fix_file(filepath: Path) -> bool:
    """Append a newline to filepath. Returns True if changed."""
    try:
        with open(filepath, "ab") as f:
            f.write(b"\n")
        return True
    except OSError as e:
        print(f"[ERROR] Cannot write {filepath}: {e}", file=sys.stderr)
        return False


def collect_md_files(root: Path) -> list[Path]:
    """Recursively collect all .md files under root."""
    return sorted(root.rglob("*.md"))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fix missing trailing newlines in docs/ Markdown files."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Dry-run: only list files that need fixing, do not modify.",
    )
    args = parser.parse_args()

    docs_dir = Path(__file__).resolve().parent / "docs"
    if not docs_dir.is_dir():
        print(f"[ERROR] docs/ directory not found at {docs_dir}", file=sys.stderr)
        sys.exit(1)

    md_files = collect_md_files(docs_dir)
    needs_fix = [f for f in md_files if missing_trailing_newline(f)]

    if not needs_fix:
        print("All Markdown files already end with a newline. Nothing to do.")
        return

    if args.check:
        print(f"{len(needs_fix)} file(s) missing trailing newline:")
        for f in needs_fix:
            print(f"  {f.relative_to(docs_dir.parent)}")
        return

    fixed = 0
    for f in needs_fix:
        if fix_file(f):
            fixed += 1
            print(f"Fixed: {f.relative_to(docs_dir.parent)}")

    print(f"\nDone. Fixed {fixed}/{len(needs_fix)} file(s).")


if __name__ == "__main__":
    main()
