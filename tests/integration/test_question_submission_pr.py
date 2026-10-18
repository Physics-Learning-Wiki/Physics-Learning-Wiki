"""Exercise import recovery against a real local Git remote without GitHub writes."""
import json
from pathlib import Path
import subprocess
from types import SimpleNamespace

import pytest
import yaml

from scripts.submissions import questions
from scripts.submissions.records import REPO, block
from scripts.submissions.amendments import check_amendments


def git(root, *args):
    return subprocess.run(["git", *args], cwd=root, check=True, capture_output=True,
                          text=True, encoding="utf-8").stdout.strip()


class API:
    def __init__(self, remote):
        self.repo, self.remote, self.prs, self.stages = REPO, remote, [], []
        self.revisions = {number: {"schemaVersion": 1, "submissionId": str(number), "type": "question", "revision": 1,
            "payload": {"question": {"type": "true_false", "stem": "Original", "answer": {"value": True}, "solution": "Original solution"}}}
            for number in (11, 12, 13)}
        self.fail_create = False
    def issue(self, number):
        initial = {**self.revisions[number], "revision": 1}
        return {"number": number, "labels": [{"name": "投稿-题目"}], "user": {"id": 8},
                "body": block("plw-submission-v1", initial)}
    def pages(self, path):
        if path.startswith("pulls?"):
            for pr in self.prs:
                if pr["state"] == "open":
                    head = git(self.remote, "rev-parse", pr["head"]["ref"])
                    pr["head"]["sha"] = head
            return self.prs
        if "/comments" in path:
            number = int(path.split("/")[1])
            record = self.revisions[number]
            return [] if record["revision"] == 1 else [{"id": 1, "user": {"id": 8}, "body": block("plw-submission-v1", record)}]
        if "/files" in path:
            pr = self.prs[int(path.split("/")[1]) - 1]
            return [{"filename": name} for name in git(self.remote, "diff", "--name-only", "main", pr["head"]["ref"]).splitlines()]
        raise AssertionError(path)
    def api(self, path, method="GET", body=None):
        if method == "GET":
            return self.issue(int(path.split("/")[1]))
        if path == "pulls":
            if self.fail_create:
                raise RuntimeError("GitHub unavailable")
            pr = {**body, "number": len(self.prs) + 1, "state": "open", "html_url": "https://example.com/pr/" + str(len(self.prs) + 1),
                  "head": {"ref": body["head"], "sha": git(self.remote, "rev-parse", body["head"]), "repo": {"full_name": REPO}}}
            self.prs.append(pr)
            return pr
        if path.startswith("pulls/"):
            self.prs[int(path.split("/")[1]) - 1].update(body)
            return
        raise AssertionError(path)
    def stage(self, *args, **kwargs):
        self.stages.append((args, kwargs))


@pytest.fixture
def repository(tmp_path, monkeypatch):
    remote, checkout = tmp_path / "remote.git", tmp_path / "checkout"
    git(tmp_path, "init", "--bare", "--initial-branch=main", str(remote))
    git(tmp_path, "clone", str(remote), str(checkout))
    git(checkout, "config", "user.name", "Tester")
    git(checkout, "config", "user.email", "test@example.com")
    (checkout / "README.md").write_text("Base")
    git(checkout, "add", ".")
    git(checkout, "commit", "-m", "Base")
    git(checkout, "push", "origin", "main")
    monkeypatch.chdir(checkout)
    monkeypatch.setattr(questions, "validate_repository", lambda *a, **kw: SimpleNamespace(errors=[]))
    def document(root, payload):
        number = int(payload["issueUrl"].split("/")[-1])
        return root / f"question-bank/questions/inbox/q-issue-{number}.yml", {
            **payload["question"], "id": f"q-issue-{number}", "version": 1, "status": "draft",
            "submission": {"issue_url": payload["issueUrl"], "revision": payload["revision"]}}
    monkeypatch.setattr(questions, "submission_document", document)
    original = subprocess.run
    def run(args, **kwargs):
        if args[:3] == ["gh", "pr", "ready"]:
            return subprocess.CompletedProcess(args, 0, "")
        return original(args, **kwargs)
    monkeypatch.setattr(questions.subprocess, "run", run)
    return checkout, API(remote)


def test_three_parallel_prs_and_five_event_retries_do_not_conflict(repository):
    root, api = repository
    for number in (11, 12, 13):
        questions.import_pr(api, number, run_key="test")
    heads = [pr["head"]["sha"] for pr in api.prs]
    for _ in range(5):
        questions.import_pr(api, 11, run_key="test")
    assert len(api.prs) == 3
    assert [git(api.remote, "rev-parse", pr["head"]["ref"]) for pr in api.prs] == heads
    for number, pr in zip((11, 12, 13), api.prs):
        assert f"q-issue-{number}.yml" in git(api.remote, "ls-tree", "-r", "--name-only", pr["head"]["ref"])


def test_closed_pr_gets_successor_and_pr_creation_failure_recovers(repository):
    root, api = repository
    api.fail_create = True
    with pytest.raises(RuntimeError, match="unavailable"):
        questions.import_pr(api, 11, run_key="one")
    before = git(api.remote, "rev-parse", "codex/question-submission/issue-11-r1-one")
    api.fail_create = False
    questions.import_pr(api, 11, run_key="one")
    assert git(api.remote, "rev-parse", api.prs[0]["head"]["ref"]) == before
    api.prs[0]["state"] = "closed"
    questions.import_pr(api, 11, run_key="two")
    assert len(api.prs) == 2 and api.prs[0]["head"]["ref"] != api.prs[1]["head"]["ref"]


def test_author_revision_preserves_disjoint_maintainer_edits_and_blocks_conflicts(repository):
    root, api = repository
    questions.import_pr(api, 11, run_key="one")
    path = root / "question-bank/questions/inbox/q-issue-11.yml"
    current = yaml.safe_load(path.read_text(encoding="utf-8"))
    current["stem"] = "Maintainer stem"
    current["review"] = {"old": True}
    path.write_text(yaml.safe_dump(current), encoding="utf-8")
    git(root, "add", ".")
    git(root, "commit", "-m", "Maintainer edit")
    git(root, "push", "origin", "HEAD:" + api.prs[0]["head"]["ref"])
    # Preserve the immutable initial version in the fake Issue.
    initial = api.issue(11)
    original_issue = api.issue
    api.issue = lambda number: initial if number == 11 else original_issue(number)
    api.revisions[11] = {**api.revisions[11], "revision": 2,
                         "payload": {"question": {**api.revisions[11]["payload"]["question"], "solution": "Author solution"}}}
    questions.import_pr(api, 11, revision_event=True, run_key="two")
    merged = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert merged["stem"] == "Maintainer stem" and merged["solution"] == "Author solution"
    assert "review" not in merged
    before = git(api.remote, "rev-parse", api.prs[0]["head"]["ref"])
    # A changed initial record is never used to simulate a third version; overlapping edits conflict.
    api.revisions[11]["payload"]["question"]["stem"] = "Author conflicting stem"
    api.prs[0]["body"] = api.prs[0]["body"].replace('"revision":2', '"revision":1')
    with pytest.raises(ValueError):
        questions.import_pr(api, 11, revision_event=True, run_key="three")
    assert git(api.remote, "rev-parse", api.prs[0]["head"]["ref"]) == before


def test_merged_publication_requires_a_new_review_pr_and_cannot_merge_as_a_draft(repository):
    root, api = repository
    questions.import_pr(api, 11, run_key="one")
    path = root / "question-bank/questions/inbox/q-issue-11.yml"
    current = yaml.safe_load(path.read_text(encoding="utf-8"))
    current["status"] = "published"
    current["review"] = {"signed": True}
    path.write_text(yaml.safe_dump(current), encoding="utf-8")
    git(root, "add", ".")
    git(root, "commit", "-m", "Publish reviewed content")
    git(root, "push", "origin", "HEAD:main")
    api.prs[0].update(state="closed", merged=True)
    initial = api.issue(11)
    api.issue = lambda number: initial
    api.revisions[11] = {**api.revisions[11], "revision": 2,
        "payload": {"question": {**api.revisions[11]["payload"]["question"], "solution": "Revised solution"}}}
    questions.import_pr(api, 11, run_key="two")
    assert len(api.prs) == 2
    revised = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert revised["id"] == "q-issue-11" and revised["version"] == 2
    assert revised["status"] == "draft" and "review" not in revised
    with pytest.raises(ValueError, match="existing live question"):
        check_amendments(root, "origin/main")
    revised["status"] = "published"
    path.write_text(yaml.safe_dump(revised), encoding="utf-8")
    check_amendments(root, "origin/main")
    assert "Original solution" in git(api.remote, "show", "main:question-bank/questions/inbox/q-issue-11.yml")
