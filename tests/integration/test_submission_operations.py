from copy import deepcopy
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path

import pytest

from scripts.community.contributors import issue_contributors, page_source
from scripts.community.generator import LABEL, WITHDRAWN, apply_snapshot, build_snapshot, generate_snapshot
from scripts.submissions.operations import QUEUE_MARKER, attention_entry, classify, editorial_event, triage, update_attention
from scripts.submissions.records import block

NOW = datetime(2026, 10, 18, tzinfo=timezone.utc)


def record(kind="notes", content="完整的学习笔记，包含推导背景、知识联系和具体学习建议．", revision=1):
    return {"schemaVersion": 1, "submissionId": "id", "type": kind, "revision": revision,
            "payload": {"title": "稿件", "content": content, "attribution": "作者"}}


def issue(number=1, value=None, **extra):
    return {"number": number, "title": "[投稿] 稿件", "body": block("plw-submission-v1", value or record()),
            "labels": [{"name": LABEL}, {"name": "投稿-待审核"}], "state": "open",
            "created_at": "2026-10-01T00:00:00Z", "user": {"id": 8}, **extra}


def status(stage, revision=1, **fields):
    return {"id": 10, "user": {"id": 99}, "performed_via_github_app": {"slug": "github-actions"},
            "created_at": "2026-10-17T00:00:00Z", "body": block("plw-submission-status-v1", {"stage": stage, "revision": revision, **fields})}


@pytest.mark.parametrize("kind, content, hints", [
    ("notes", "简短", True), ("full-page", "简短", True),
    ("notes", "完整的学习笔记，包含推导背景、知识联系和具体学习建议．", False),
    ("errata", "第 3 页：应为正号．", False),
    ("errata", "请改正符号．", True),
    ("suggestion", "希望为自学者补充先修知识导航．", False), ("suggestion", "改进", True),
    ("notes", "https://example.com/long-reference-only", True),
])
def test_classification_uses_the_authored_content_and_submission_kind(kind, content, hints):
    revision, messages = classify(issue(value=record(kind, content)), [])
    assert revision == 1 and bool(messages) is hints


@pytest.mark.parametrize("stage, waiting, expected", [
    ("received", "maintainer", True), ("accepted", "maintainer", True),
    ("importing", "maintainer", True), ("draft_ready", "maintainer", True),
    ("reviewing", "maintainer", True), ("needs_info", "author", False),
    ("needs_info", "maintainer", True), ("published", "maintainer", False),
    ("rejected", "maintainer", False), ("withdrawn", "maintainer", False), ("resolved", "maintainer", False),
])
def test_attention_only_counts_work_waiting_for_a_maintainer(stage, waiting, expected):
    assert bool(attention_entry(issue(), [status(stage, waitingFor=waiting)], [], NOW)) is expected


def test_attention_ignores_bots_but_recognizes_editor_actions_revisions_and_withdrawal():
    item = issue()
    bot = {"id": 1, "created_at": "2026-10-17T00:00:00Z", "user": {"id": 99, "type": "Bot"}, "body": "ping"}
    assert attention_entry(item, [bot], [], NOW)
    editor = {**bot, "user": {"id": 22, "type": "User"}, "author_association": "COLLABORATOR"}
    assert attention_entry(item, [editor], [], NOW) is None
    revision = {**bot, "id": 1, "user": {"id": 8}, "body": block("plw-submission-v1", record(revision=2))}
    assert attention_entry(item, [revision], [], NOW) is None
    withdrawal = {**revision, "created_at": "2026-10-02T00:00:00Z", "body": block("plw-withdrawal-request-v1", {"reason": "申请撤稿"})}
    assert attention_entry(item, [status("published"), withdrawal], [], NOW)["withdrawalRequested"]
    assert attention_entry({**item, "pull_request": {}}, [], [], NOW) is None


class FakeAPI:
    def __init__(self):
        self.issues = [issue()]
        self.comments = []
        self.writes = []
        self.stages = []
    def pages(self, path):
        return deepcopy(self.issues if path.startswith("issues?") else self.comments if "/comments" in path else [])
    def api(self, path, method="GET", body=None):
        if method == "GET":
            return {"permission": "write"} if path.startswith("collaborators/") else self.issues[0]
        self.writes.append((path, method, body))
        if path == "issues":
            self.issues.append(issue(2, body=body["body"], user={"login": "github-actions[bot]"}))
        elif path == "issues/2":
            self.issues[1]["body"] = body["body"]
    def stage(self, *args, **kwargs):
        self.stages.append((args, kwargs))


def test_daily_attention_updates_one_queue_only_when_work_changes():
    api = FakeAPI()
    assert update_attention(api, NOW)
    assert QUEUE_MARKER in api.issues[1]["body"]
    assert not update_attention(api, NOW)
    assert len(api.writes) == 1
    api.comments = [status("resolved")]
    assert update_attention(api, NOW)
    assert len(api.writes) == 2  # Removal updates the queue, without a notification comment.


def test_triage_does_not_undo_an_existing_acceptance():
    api = FakeAPI()
    api.comments = [status("accepted")]
    triage(api, 1)
    assert not api.stages
    api.comments = []
    triage(api, 1)
    assert api.stages[0][0][1] == "received"


def test_community_editorial_decision_checks_authority_and_does_not_publish():
    api = FakeAPI()
    event = {"issue": issue(), "label": {"name": LABEL}, "sender": {"login": "editor"}}
    assert editorial_event(api, event)
    assert api.stages[0][0][1] == "accepted"
    event["label"]["name"] = WITHDRAWN
    assert editorial_event(api, event)
    assert len(api.stages) == 1
    event.pop("label")
    event["comment"] = {"user": {"id": 123}, "body": block("plw-submission-v1", record(revision=2))}
    assert not editorial_event(api, event)


def test_community_paginates_over_101_entries_and_preserves_published_closed_issues(tmp_path):
    items = [issue(number) for number in range(1, 104)]
    items[0].update(state="closed", labels=[{"name": "投稿状态:published"}])
    pages = build_snapshot(items)
    assert "1.md" in pages and "page-6.md" in pages
    assert pages["index.md"].count("<h2>") == 20
    assert pages["page-6.md"].count("<h2>") == 3
    assert 'page-2.md' in pages["index.md"]
    items[0]["labels"].append({"name": WITHDRAWN})
    assert "1.md" not in build_snapshot(items)
    handwritten = tmp_path / "pages/manual.md"
    handwritten.parent.mkdir()
    handwritten.write_text("Keep me")
    apply_snapshot(pages, handwritten.parent, tmp_path / "manifest.json")
    apply_snapshot(build_snapshot([]), handwritten.parent, tmp_path / "manifest.json")
    assert handwritten.read_text() == "Keep me"
    assert not (handwritten.parent / "page-6.md").exists()


def test_community_disjoint_author_and_editor_changes_survive_repeated_generation(tmp_path):
    output = tmp_path / "docs/community"
    manifest = tmp_path / "data/community.json"
    item = issue(body="First paragraph\n\nSecond paragraph\n\nThird paragraph")
    generate_snapshot(output, manifest, issues=[item])
    path = output / "1.md"
    path.write_text(path.read_text(encoding="utf-8").replace("First paragraph", "Maintainer introduction"), encoding="utf-8")
    item["body"] = item["body"].replace("Third paragraph", "Author update")
    generate_snapshot(output, manifest, issues=[item])
    generate_snapshot(output, manifest, issues=[item])
    assert "Maintainer introduction" in path.read_text(encoding="utf-8")
    assert "Author update" in path.read_text(encoding="utf-8")


def test_contributors_count_only_served_publications_exclude_prs_and_escape_names():
    issues = [issue(i) for i in range(1, 103)] + [{"number": 103, "pull_request": {}}]
    release = {"entries": {str(i): {"stage": "published", "author": "[A]* | <b>name</b>"} for i in range(1, 104)}}
    release["entries"]["102"]["stage"] = "draft_ready"
    counts = issue_contributors(issues, release)
    assert sum(counts.values()) == 101
    text = page_source(Counter(), counts)
    assert "<b>name</b>" not in text and "[A]* | name" in text
