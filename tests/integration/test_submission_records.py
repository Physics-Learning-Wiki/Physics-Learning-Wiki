from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace
import json

import pytest

from scripts.submissions.records import REPO, block, latest_revision, select_pr, three_way
from scripts.question_bank.maintenance import import_issue


def test_three_pending_issues_are_stable_and_retries_do_not_replace_content(tmp_path, monkeypatch):
    monkeypatch.setattr("scripts.question_bank.maintenance.validate_repository", lambda *a, **k: SimpleNamespace(errors=[]))
    paths = []
    for number in [103, 101, 102]:
        payload = {"schemaVersion": 2, "issueUrl": f"https://github.com/{REPO}/issues/{number}",
                   "licenseConsent": True, "licenseVersion": "CC-BY-SA-4.0",
                   "question": {"type": "true_false", "stem": "题干", "solution": "解析", "answer": {"value": True}}}
        source = tmp_path / "source.json"
        source.write_text(json.dumps(payload), encoding="utf-8")
        path = import_issue(tmp_path, source)
        paths.append(path)
        original = path.read_bytes()
        for _ in range(5):
            assert import_issue(tmp_path, source) == path
            assert path.read_bytes() == original
        payload["question"]["stem"] = "修订后内容"
        source.write_text(json.dumps(payload), encoding="utf-8")
        with pytest.raises(ValueError, match="reviewed revision"):
            import_issue(tmp_path, source)
        assert path.read_bytes() == original
    assert len(set(paths)) == 3
    assert {p.stem for p in paths} == {"q-issue-101", "q-issue-102", "q-issue-103"}


def test_closed_merged_and_foreign_prs_are_not_active_tasks():
    base = {"body": '<!-- plw-question-pr:{"repo":"' + REPO + '","issue":1} -->',
            "state": "closed", "head": {"ref": "codex/question-submission/issue-1-r1-a", "repo": {"full_name": REPO}}}
    assert select_pr([base, {**base, "merged_at": "2026-10-18"}], 1) is None
    foreign = deepcopy(base)
    foreign["state"] = "open"
    foreign["head"]["repo"]["full_name"] = "other/repository"
    assert select_pr([foreign], 1) is None
    opened = {**base, "state": "open"}
    assert select_pr([base, opened], 1) == opened
    with pytest.raises(ValueError, match="Multiple open"):
        select_pr([opened, opened], 1)


def test_three_way_preserves_maintainer_changes_and_rejects_overlap():
    base = {"stem": "old", "difficulty": 1, "choices": ["a", "b"]}
    current = {**base, "difficulty": 2, "editor_note": "keep"}
    incoming = {**base, "stem": "new"}
    assert three_way(base, current, incoming) == {**current, "stem": "new"}
    with pytest.raises(ValueError, match="/stem"):
        three_way(base, {**base, "stem": "editor"}, incoming)
    with pytest.raises(ValueError, match="/choices"):
        three_way(base, {**base, "choices": ["x", "b"]}, {**base, "choices": ["a", "y"]})


def test_only_original_bot_can_supply_contiguous_revisions():
    initial = {"schemaVersion": 1, "submissionId": "receipt", "revision": 1, "type": "question", "payload": {}}
    issue = {"number": 1, "user": {"id": 8}, "body": block("plw-submission-v1", initial)}
    revision = {**initial, "revision": 2}
    comment = {"id": 1, "user": {"id": 9}, "body": block("plw-submission-v1", revision)}
    assert latest_revision(issue, [comment]) == initial
    comment["user"]["id"] = 8
    assert latest_revision(issue, [comment]) == revision
    comment["body"] = block("plw-submission-v1", {**revision, "revision": 4})
    with pytest.raises(ValueError, match="Non-contiguous"):
        latest_revision(issue, [comment])
