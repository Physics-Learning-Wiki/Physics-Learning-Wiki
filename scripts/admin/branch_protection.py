"""Apply or read-only verify the repository's main branch protection policy."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

CONFIG = Path(__file__).with_name("branch-protection-config.json")


def protection_differences(expected: dict, actual: dict) -> list[str]:
    if not isinstance(actual, dict):
        raise ValueError("Invalid protection API response")
    for section in ["required_status_checks", "required_pull_request_reviews", "enforce_admins",
                    "allow_force_pushes", "allow_deletions", "required_conversation_resolution"]:
        if actual.get(section) is not None and not isinstance(actual[section], dict):
            raise ValueError(f"Invalid protection section: {section}")
    paths = [
        ("required_status_checks", "strict"),
        ("required_pull_request_reviews", "required_approving_review_count"),
        ("required_pull_request_reviews", "require_last_push_approval"),
        ("required_pull_request_reviews", "dismiss_stale_reviews"),
        ("required_pull_request_reviews", "require_code_owner_reviews"),
    ]
    differences = []
    for section, key in paths:
        target = expected[section][key]
        current = (actual.get(section) or {}).get(key)
        if type(current) is not type(target) or current != target:
            differences.append(f"{section}.{key}: expected {target!r}, got {current!r}")
    for key in ["enforce_admins", "allow_force_pushes", "allow_deletions", "required_conversation_resolution"]:
        current = (actual.get(key) or {}).get("enabled")
        if current is not expected[key]:
            differences.append(f"{key}: expected {expected[key]!r}, got {current!r}")
    contexts = (actual.get("required_status_checks") or {}).get("contexts")
    target_contexts = expected["required_status_checks"]["contexts"]
    if not isinstance(contexts, list) or sorted(contexts) != sorted(target_contexts):
        differences.append(f"required_status_checks.contexts: expected {target_contexts!r}, got {contexts!r}")
    return differences


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="GET and compare only; never apply protection")
    parser.add_argument("repo", nargs="?", default="Physics-Learning-Wiki/Physics-Learning-Wiki")
    args = parser.parse_args(argv)
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", args.repo):
        parser.error("Expected owner/repository")
    expected = json.loads(CONFIG.read_text(encoding="utf-8"))
    endpoint = f"repos/{args.repo}/branches/main/protection"
    try:
        if not args.check:
            subprocess.run([
                "gh", "api", "--method", "PUT", "-H", "Accept: application/vnd.github+json",
                endpoint, "--input", str(CONFIG),
            ], check=True, capture_output=True, text=True, encoding="utf-8")
        response = subprocess.run([
            "gh", "api", "--method", "GET", "-H", "Accept: application/vnd.github+json", endpoint,
        ], check=True, capture_output=True, text=True, encoding="utf-8")
        differences = protection_differences(expected, json.loads(response.stdout))
    except (OSError, subprocess.CalledProcessError, ValueError, TypeError) as error:
        print(f"Could not verify main branch protection ({type(error).__name__})", file=sys.stderr)
        return 1
    if differences:
        print("Branch protection differs from the checked-in policy:\n" + "\n".join(differences), file=sys.stderr)
        return 1
    print("Main branch protection matches all required checks, review and bypass settings")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
