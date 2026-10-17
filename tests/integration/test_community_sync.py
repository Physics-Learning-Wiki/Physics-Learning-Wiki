"""Exercise sync against real local remotes; no GitHub writes are made."""
from __future__ import annotations

import json
from pathlib import Path
import subprocess

import pytest

from scripts.community.generator import LABEL, MANIFEST_PATH, REPO, SnapshotConflict, generate_snapshot
from scripts.community.sync import BRANCH_PREFIX, CommunitySync, GitHub, SyncError


def submission(body="Initial"):
    return {"number": 1, "title": "[投稿] Physics", "body": body,
            "created_at": "2026-10-17T12:00:00Z", "state": "open", "labels": [{"name": LABEL}]}


def generate(root, body="Changed"):
    return generate_snapshot(root / "docs/community", root / MANIFEST_PATH, issues=[submission(body)])


def git(root, *args):
    return subprocess.run(["git", *args], cwd=root, check=True, capture_output=True,
                          text=True, encoding="utf-8").stdout.strip()


def commit(root, message):
    git(root, "add", "--all")
    git(root, "commit", "-m", message)
    return git(root, "rev-parse", "HEAD")


class FakeGitHub:
    def __init__(self):
        self.prs = []
        self.created = []
        self.fail_create = False
        self.fail_query = False

    def open_prs(self):
        if self.fail_query:
            raise SyncError("GitHub unavailable")
        return [pr for pr in self.prs if pr["state"] == "open"]

    def branch_prs(self, branch):
        return [pr for pr in self.prs if pr["head"]["ref"] == branch]

    def create_pr(self, branch):
        if self.fail_create:
            raise RuntimeError("PR API unavailable")
        number = len(self.prs) + 1
        self.prs.append({"number": number, "state": "open", "head": {
            "ref": branch, "repo": {"full_name": REPO}}, "base": {"ref": "main"}})
        self.created.append(branch)
        return f"https://github.com/{REPO}/pull/{number}"


class LocalRepository:
    def __init__(self, root):
        self.root = root
        self.remote = root / "remote.git"
        self.count = 0
        git(root, "init", "--bare", "--initial-branch=main", str(self.remote))
        self.maintainer = self.clone()
        (self.maintainer / "policy.txt").write_text("Base\n", encoding="utf-8")
        (self.maintainer / ".gitattributes").write_text("* text eol=lf\n", encoding="utf-8")
        generate(self.maintainer, "Initial")
        commit(self.maintainer, "Initial main")
        git(self.maintainer, "push", "origin", "main")

    def clone(self):
        self.count += 1
        checkout = self.root / f"checkout-{self.count}"
        git(self.root, "clone", str(self.remote), str(checkout))
        git(checkout, "config", "user.name", "Test Maintainer")
        git(checkout, "config", "user.email", "test@example.com")
        git(checkout, "config", "core.autocrlf", "false")
        return checkout

    def sha(self, branch):
        return git(self.remote, "rev-parse", f"refs/heads/{branch}")

    def read(self, branch, path):
        return git(self.remote, "show", f"refs/heads/{branch}:{path}")


@pytest.fixture
def local_repo(tmp_path):
    return LocalRepository(tmp_path)


def sync(repo, api, *, key="run-1", body="Changed", validate=lambda root: None):
    return CommunitySync(repo.clone(), github=api, run_key=key,
                         generate=lambda root: generate(root, body), validate=validate)


def create_pr(repo, api):
    assert "created" in sync(repo, api).run()
    return api.created[-1]


def test_no_change_creates_neither_branch_nor_pr(local_repo):
    api = FakeGitHub()
    assert "unchanged" in sync(local_repo, api, body="Initial").run()
    assert not api.created
    assert git(local_repo.remote, "for-each-ref", "--format=%(refname)") == "refs/heads/main"


def test_existing_pr_preserves_maintainer_commits_and_merges_main(local_repo):
    api = FakeGitHub()
    branch = create_pr(local_repo, api)
    maintainer = local_repo.maintainer
    git(maintainer, "fetch", "origin", branch)
    git(maintainer, "switch", "--create", branch, f"origin/{branch}")
    (maintainer / "review.txt").write_text("Keep my review\n", encoding="utf-8")
    review_sha = commit(maintainer, "Maintainer review")
    git(maintainer, "push", "origin", branch)
    git(maintainer, "switch", "main")
    (maintainer / "policy.txt").write_text("Latest main\n", encoding="utf-8")
    main_sha = commit(maintainer, "Main policy update")
    git(maintainer, "push", "origin", "main")
    validated = []

    def validate(root):
        assert (root / "review.txt").read_text().strip() == "Keep my review"
        assert (root / "policy.txt").read_text().strip() == "Latest main"
        assert "Second snapshot" in (root / "docs/community/1.md").read_text(encoding="utf-8")
        validated.append(True)

    assert "up to date" in sync(local_repo, api, body="Second snapshot", validate=validate).run()
    assert validated and len(api.created) == 1
    git(local_repo.remote, "merge-base", "--is-ancestor", review_sha, branch)
    git(local_repo.remote, "merge-base", "--is-ancestor", main_sha, branch)
    assert local_repo.read(branch, "review.txt") == "Keep my review"
    sha = local_repo.sha(branch)
    sync(local_repo, api, body="Second snapshot").run()
    assert local_repo.sha(branch) == sha


@pytest.mark.parametrize("merged", [False, True])
def test_closed_or_merged_pr_gets_successor_even_when_reusing_run_key(local_repo, merged):
    api = FakeGitHub()
    predecessor = create_pr(local_repo, api)
    old_sha = local_repo.sha(predecessor)
    if merged:
        maintainer = local_repo.maintainer
        git(maintainer, "fetch", "origin", predecessor)
        git(maintainer, "merge", "--ff-only", f"origin/{predecessor}")
        git(maintainer, "push", "origin", "main")
    api.prs[0].update(state="closed", merged=merged)
    assert "created" in sync(local_repo, api, body="Next snapshot").run()
    successor = api.created[-1]
    assert successor == f"{BRANCH_PREFIX}-run-1-successor-2"
    assert local_repo.sha(predecessor) == old_sha
    assert "Next snapshot" in local_repo.read(successor, "docs/community/1.md")


def test_pr_creation_failure_can_retry_without_rewriting_pushed_branch(local_repo):
    api = FakeGitHub()
    api.fail_create = True
    with pytest.raises(SyncError, match="PR creation failed"):
        sync(local_repo, api).run()
    branch = f"{BRANCH_PREFIX}-run-1"
    old_sha = local_repo.sha(branch)
    api.fail_create = False
    assert "created" in sync(local_repo, api).run()
    assert api.created == [branch]
    assert local_repo.sha(branch) == old_sha


@pytest.mark.parametrize("conflict", ["merge", "managed-update", "managed-withdraw"])
def test_conflicts_leave_remote_head_and_manual_content_untouched(local_repo, conflict):
    api = FakeGitHub()
    branch = create_pr(local_repo, api)
    maintainer = local_repo.maintainer
    git(maintainer, "fetch", "origin", branch)
    git(maintainer, "switch", "--create", branch, f"origin/{branch}")
    path = "policy.txt" if conflict == "merge" else "docs/community/1.md"
    (maintainer / path).write_text("Maintainer content\n", encoding="utf-8")
    manual_sha = commit(maintainer, "Manual changes")
    git(maintainer, "push", "origin", branch)
    if conflict == "merge":
        git(maintainer, "switch", "main")
        (maintainer / path).write_text("Conflicting main content\n", encoding="utf-8")
        commit(maintainer, "Conflicting main")
        git(maintainer, "push", "origin", "main")
    runner = sync(local_repo, api, body="Updated")
    if conflict == "managed-withdraw":
        runner.generate = lambda root: generate_snapshot(root / "docs/community", root / MANIFEST_PATH, issues=[])
    with pytest.raises((SyncError, SnapshotConflict)):
        runner.run()
    assert local_repo.sha(branch) == manual_sha
    assert local_repo.read(branch, path) == "Maintainer content"
    assert not (runner.root / ".git/MERGE_HEAD").exists()


@pytest.mark.parametrize("timing", ["generation", "push"])
def test_concurrent_remote_push_is_never_overwritten(local_repo, timing):
    api = FakeGitHub()
    branch = create_pr(local_repo, api)
    maintainer = local_repo.maintainer
    git(maintainer, "fetch", "origin", branch)
    git(maintainer, "switch", "--create", branch, f"origin/{branch}")
    concurrent_sha = []

    def concurrent_update():
        (maintainer / "concurrent.txt").write_text("Concurrent review", encoding="utf-8")
        concurrent_sha.append(commit(maintainer, "Concurrent review"))
        git(maintainer, "push", "origin", branch)

    runner = sync(local_repo, api, body="Later snapshot")
    if timing == "generation":
        runner.validate = lambda root: concurrent_update()
    else:
        original = runner.git

        def race(*args, **kwargs):
            if args[0] == "push":
                concurrent_update()
            return original(*args, **kwargs)

        runner.git = race
    with pytest.raises(SyncError, match="Remote branch changed|git push failed"):
        runner.run()
    assert local_repo.sha(branch) == concurrent_sha[0]
    assert local_repo.read(branch, "concurrent.txt") == "Concurrent review"


@pytest.mark.parametrize("failure", ["query", "multiple", "validation", "outside-snapshot", "closed-during-run"])
def test_ambiguous_or_failed_validation_never_pushes(local_repo, failure):
    api = FakeGitHub()
    branch = create_pr(local_repo, api)
    before = git(local_repo.remote, "show-ref")
    runner = sync(local_repo, api, body="Later snapshot")
    if failure == "query":
        api.fail_query = True
    elif failure == "multiple":
        api.prs.append({**api.prs[0], "number": 2})
    elif failure == "validation":
        def validate(root):
            raise RuntimeError("Build failed")
        runner.validate = validate
    elif failure == "outside-snapshot":
        runner.validate = lambda root: (root / "policy.txt").write_text("Unexpected mutation")
    else:
        runner.validate = lambda root: api.prs[0].update(state="closed")
    with pytest.raises((SyncError, RuntimeError)):
        runner.run()
    assert git(local_repo.remote, "show-ref") == before
    assert local_repo.read(branch, "docs/community/1.md").endswith("Changed")


def test_github_queries_are_paginated_and_pr_body_preserves_newlines(monkeypatch):
    calls = []

    def run(args, **kwargs):
        calls.append(args)
        if args[1:3] == ["pr", "create"]:
            body = Path(args[args.index("--body-file") + 1]).read_text(encoding="utf-8")
            assert "\n\n" in body and "Check Characters" in body
            return subprocess.CompletedProcess(args, 0, "https://example.com/pr/1\n")
        return subprocess.CompletedProcess(args, 0, json.dumps([[{"number": 1}], [{"number": 2}]]))

    monkeypatch.setattr("scripts.community.sync.subprocess.run", run)
    api = GitHub(REPO)
    assert len(api.open_prs()) == 2
    assert len(api.branch_prs(f"{BRANCH_PREFIX}-123")) == 2
    assert api.create_pr("branch") == "https://example.com/pr/1"
    for call in calls[:2]:
        assert "--paginate" in call and "--slurp" in call
