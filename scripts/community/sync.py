"""Update a review PR without rewriting remote history or maintainer content."""
from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from urllib.parse import urlencode

from .generator import MANIFEST_PATH, REPO, generate_snapshot

BRANCH_PREFIX = "bot/community-submissions"


class SyncError(RuntimeError):
    pass


class GitHub:
    def __init__(self, repo: str):
        self.repo = repo

    def _pulls(self, **query) -> list[dict]:
        result = subprocess.run([
            "gh", "api", "--paginate", "--slurp",
            f"repos/{self.repo}/pulls?{urlencode({**query, 'base': 'main', 'per_page': 100})}",
        ], check=True, capture_output=True, text=True, encoding="utf-8")
        pages = json.loads(result.stdout)
        if not isinstance(pages, list) or any(not isinstance(page, list) for page in pages):
            raise SyncError("Invalid pull request API response")
        return [pr for page in pages for pr in page]

    def open_prs(self) -> list[dict]:
        return self._pulls(state="open")

    def branch_prs(self, branch: str) -> list[dict]:
        return self._pulls(state="all", head=f"{self.repo.split('/')[0]}:{branch}")

    def create_pr(self, branch: str) -> str:
        body = """### 社区稿件自动同步

同步开放且带有 `投稿-已收录` 标签的投稿；撤稿会移除受管页面．

- 请审阅正文、署名和撤稿差异．
- 确认 `Check Characters`、`Physics-Learning-Wiki Page Build` 两项必需检查均已运行并通过．
- 若默认 `GITHUB_TOKEN` 产生的检查等待审批，请按 Actions 提示批准，并核对检查对应本 PR 的最新提交．
- 若未生成检查运行，请使用独立 GitHub App Token 重新触发 PR 检查；不要以其他提交上的手动 Build 代替本 PR 检查．
"""
        with tempfile.TemporaryDirectory(prefix="plw-community-pr-") as directory:
            body_file = Path(directory) / "body.md"
            body_file.write_text(body, encoding="utf-8")
            result = subprocess.run([
                "gh", "pr", "create", "--repo", self.repo, "--base", "main",
                "--head", branch, "--title", "content(community): 同步最新已收录社区投稿",
                "--body-file", str(body_file),
            ], check=True, capture_output=True, text=True, encoding="utf-8")
        return result.stdout.strip()


def community_prs(items: list[dict], repo: str) -> list[dict]:
    if not isinstance(items, list):
        raise SyncError("Invalid pull request state")
    candidates = []
    for pr in items:
        if not isinstance(pr, dict) or not isinstance(pr.get("head"), dict):
            raise SyncError("Invalid pull request state")
        head = pr["head"]
        branch = head.get("ref")
        if not isinstance(branch, str):
            raise SyncError("Invalid pull request branch")
        if (branch == BRANCH_PREFIX or branch.startswith(BRANCH_PREFIX + "-")) and (head.get("repo") or {}).get("full_name") == repo:
            if type(pr.get("number")) is not int or pr.get("state") != "open":
                raise SyncError("Invalid community pull request")
            candidates.append(pr)
    if len(candidates) > 1:
        raise SyncError("Multiple open community PRs need maintainer review")
    return candidates


def validate_generated(root: Path) -> None:
    environment = {**os.environ, "SITE_DIR": str(root / "site")}
    for command in [
        ["uv", "run", "python", "scripts/check-terminology.py", "docs/community"],
        ["uv", "run", "mkdocs", "build", "--clean", "--site-dir", str(root / "site")],
        [shutil.which("corepack") or "corepack", "yarn", "node", "--loader", "ts-node/esm",
         "scripts/post-build/html-postprocess.ts", "math", "external-links"],
    ]:
        subprocess.run(command, cwd=root, env=environment, check=True)


class CommunitySync:
    def __init__(self, root: Path, *, repo: str = REPO, run_key: str | None = None,
                 github=None, generate=None, validate=None):
        self.root = root.resolve()
        self.repo = repo
        self.run_key = run_key or uuid.uuid4().hex
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]{0,100}", self.run_key):
            raise SyncError("Invalid run identifier")
        self.github = github or GitHub(repo)
        self.generate = generate or (lambda root: generate_snapshot(root / "docs/community", root / MANIFEST_PATH))
        self.validate = validate or validate_generated
        self.environment = os.environ.copy()
        for key, value in {
            "GIT_AUTHOR_NAME": "github-actions[bot]", "GIT_COMMITTER_NAME": "github-actions[bot]",
            "GIT_AUTHOR_EMAIL": "github-actions[bot]@users.noreply.github.com",
            "GIT_COMMITTER_EMAIL": "github-actions[bot]@users.noreply.github.com",
        }.items():
            self.environment.setdefault(key, value)
        token = self.environment.get("GH_TOKEN")
        if token:
            # Keep the token out of command arguments, persisted Git URLs and logs.
            index = int(self.environment.get("GIT_CONFIG_COUNT", "0"))
            self.environment["GIT_CONFIG_COUNT"] = str(index + 1)
            self.environment[f"GIT_CONFIG_KEY_{index}"] = "http.https://github.com/.extraheader"
            encoded = base64.b64encode(f"x-access-token:{token}".encode()).decode()
            self.environment[f"GIT_CONFIG_VALUE_{index}"] = "AUTHORIZATION: basic " + encoded

    def git(self, *args: str, check=True) -> subprocess.CompletedProcess:
        result = subprocess.run(["git", *args], cwd=self.root, env=self.environment,
                                capture_output=True, text=True, encoding="utf-8")
        if check and result.returncode:
            detail = result.stderr.strip() or result.stdout.strip()
            raise SyncError(f"git {args[0]} failed ({result.returncode}): {detail}")
        return result

    def remote_head(self, branch: str) -> str | None:
        result = self.git("ls-remote", "--exit-code", "--heads", "origin", f"refs/heads/{branch}", check=False)
        if result.returncode == 2:
            return None
        if result.returncode:
            raise SyncError("Cannot read the remote community branch")
        fields = result.stdout.strip().split()
        if len(fields) != 2 or not re.fullmatch(r"[a-f0-9]{40,64}", fields[0]) or fields[1] != f"refs/heads/{branch}":
            raise SyncError("Invalid remote branch response")
        return fields[0]

    def successor_branch(self) -> str:
        base = f"{BRANCH_PREFIX}-{self.run_key}"
        for attempt in range(1, 101):
            branch = base if attempt == 1 else f"{base}-successor-{attempt}"
            history = self.github.branch_prs(branch)
            if not isinstance(history, list) or any(
                not isinstance(pr, dict) or pr.get("state") not in {"open", "closed"}
                or (pr.get("head") or {}).get("ref") != branch
                or ((pr.get("head") or {}).get("repo") or {}).get("full_name") != self.repo
                for pr in history
            ):
                raise SyncError("Invalid community branch PR history")
            if any(pr["state"] == "open" for pr in history):
                raise SyncError("Community PR opened during branch selection; retry from fresh state")
            if not history:
                return branch  # A pushed branch without a PR can retry creation.
        raise SyncError("Too many predecessor branches for this run identifier")

    def check_generated_paths(self) -> None:
        paths = self.git("diff", "--name-only", "-z", "HEAD").stdout.split("\0")
        paths += self.git("ls-files", "--others", "--exclude-standard", "-z").stdout.split("\0")
        if any(path and path != MANIFEST_PATH.as_posix() and not path.startswith("docs/community/") for path in paths):
            raise SyncError("Generation or validation changed files outside the community snapshot")

    def run(self) -> str:
        if self.git("status", "--porcelain").stdout.strip():
            raise SyncError("Community sync requires a clean checkout")
        prs = community_prs(self.github.open_prs(), self.repo)
        pr = prs[0] if prs else None
        branch = pr["head"]["ref"] if pr else self.successor_branch()
        self.git("check-ref-format", "--branch", branch)
        self.git("fetch", "--no-tags", "origin", "+refs/heads/main:refs/remotes/origin/main")
        remote_head = self.remote_head(branch)
        if pr and remote_head is None:
            raise SyncError("Open community PR has no remote branch")
        if remote_head:
            self.git("fetch", "--no-tags", "origin", f"+refs/heads/{branch}:refs/remotes/origin/{branch}")
            fetched = self.git("rev-parse", f"origin/{branch}").stdout.strip()
            if fetched != remote_head:
                raise SyncError("Remote branch changed during fetch; retry from fresh state")
        start = remote_head or self.git("rev-parse", "origin/main").stdout.strip()
        local = self.git("show-ref", "--verify", "--quiet", f"refs/heads/{branch}", check=False)
        if local.returncode == 0:
            if self.git("rev-parse", branch).stdout.strip() != start:
                raise SyncError("Local branch contains unpublished changes")
            self.git("switch", branch)
        elif local.returncode == 1:
            self.git("switch", "--create", branch, start)
        else:
            raise SyncError("Cannot inspect the local branch")
        try:
            self.git("merge", "--no-edit", "origin/main")
        except SyncError:
            self.git("merge", "--abort", check=False)
            raise

        self.generate(self.root)
        self.validate(self.root)
        self.check_generated_paths()
        self.git("add", "--all", "--", "docs/community", MANIFEST_PATH.as_posix())
        staged = self.git("diff", "--cached", "--quiet", check=False)
        if staged.returncode == 1:
            self.git("commit", "-m", "content(community): 同步最新已收录社区投稿")
        elif staged.returncode != 0:
            raise SyncError("Cannot inspect generated changes")
        head = self.git("rev-parse", "HEAD").stdout.strip()
        differs_from_main = self.git("diff", "--quiet", "origin/main", "HEAD", check=False)
        if differs_from_main.returncode not in {0, 1}:
            raise SyncError("Cannot compare generated branch with main")
        if not pr and not differs_from_main.returncode:
            return "Community snapshot unchanged; no PR needed"

        # Do not update a branch whose PR was closed/replaced during generation.
        latest = community_prs(self.github.open_prs(), self.repo)
        if pr:
            if not latest or latest[0]["number"] != pr["number"] or latest[0]["head"]["ref"] != branch:
                raise SyncError("Community PR changed while generating; remote left untouched")
        elif latest:
            if latest[0]["head"]["ref"] != branch:
                raise SyncError("Another community PR opened while generating")
            pr = latest[0]
        if self.remote_head(branch) != remote_head:
            raise SyncError("Remote branch changed while generating; remote left untouched")
        if head != remote_head:
            self.git("push", "origin", f"HEAD:refs/heads/{branch}")
        if pr:
            return f"Community PR #{pr['number']} is up to date ({branch})"
        try:
            url = self.github.create_pr(branch)
        except Exception as error:
            raise SyncError(f"Branch {branch} was pushed but PR creation failed; retry with the same run identifier") from error
        return f"Community PR created: {url} ({branch})"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=REPO)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--run-key", default=os.environ.get("GITHUB_RUN_ID"))
    args = parser.parse_args(argv)
    try:
        message = CommunitySync(args.root, repo=args.repo, run_key=args.run_key).run()
    except Exception as error:
        message = f"Community sync failed: {error}"
        code = 1
    else:
        code = 0
    print(message, file=sys.stderr if code else sys.stdout)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as stream:
            stream.write("\n" + message + "\n")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
