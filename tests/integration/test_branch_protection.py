"""Policy verification is tested with fake API responses, without GitHub writes."""
from copy import deepcopy
import json
import subprocess

import pytest

from scripts.admin import branch_protection as protection


def policy_response():
    expected = json.loads(protection.CONFIG.read_text(encoding="utf-8"))
    actual = deepcopy(expected)
    for key in ("enforce_admins", "allow_force_pushes", "allow_deletions", "required_conversation_resolution"):
        actual[key] = {"enabled": expected[key]}
    return expected, actual


@pytest.mark.parametrize("path", [
    ("required_status_checks", "contexts"),
    ("required_status_checks", "strict"),
    ("required_pull_request_reviews", "required_approving_review_count"),
    ("required_pull_request_reviews", "require_last_push_approval"),
    ("required_pull_request_reviews", "dismiss_stale_reviews"),
    ("required_pull_request_reviews", "require_code_owner_reviews"),
    ("enforce_admins", "enabled"), ("allow_force_pushes", "enabled"),
    ("allow_deletions", "enabled"), ("required_conversation_resolution", "enabled"),
])
def test_each_required_setting_must_match(path):
    expected, actual = policy_response()
    assert protection.protection_differences(expected, actual) == []
    section, key = path
    value = actual[section][key]
    actual[section][key] = [] if isinstance(value, list) else (not value if isinstance(value, bool) else value + 1)
    assert any(section in difference for difference in protection.protection_differences(expected, actual))


@pytest.mark.parametrize("check_only", [True, False])
def test_check_mode_is_get_only_and_apply_mode_always_reads_back(monkeypatch, check_only):
    _, actual = policy_response()
    calls = []

    def run(args, **kwargs):
        calls.append(args)
        return subprocess.CompletedProcess(args, 0, json.dumps(actual))

    monkeypatch.setattr(protection.subprocess, "run", run)
    assert protection.main(["--check"] if check_only else []) == 0
    assert [call[call.index("--method") + 1] for call in calls] == (["GET"] if check_only else ["PUT", "GET"])


@pytest.mark.parametrize("failure", ["unprotected", "mismatch", "invalid-json", "invalid-object", "invalid-section"])
def test_unverified_protection_is_a_failure(monkeypatch, failure):
    _, actual = policy_response()
    actual["allow_force_pushes"]["enabled"] = True

    def run(args, **kwargs):
        assert "PUT" not in args
        if failure == "unprotected":
            raise subprocess.CalledProcessError(1, args, stderr="HTTP 404")
        output = {"mismatch": json.dumps(actual), "invalid-json": "error",
                  "invalid-object": "[]", "invalid-section": '{"enforce_admins": true}'}[failure]
        return subprocess.CompletedProcess(args, 0, output)

    monkeypatch.setattr(protection.subprocess, "run", run)
    assert protection.main(["--check"]) == 1
