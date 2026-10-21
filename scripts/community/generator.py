"""Fetch complete Issue snapshots and merge revisions into explicitly owned files."""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import subprocess
import frontmatter
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

import yaml

from .render import normalize_markdown, render_community_markdown

REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki"
LABEL = "投稿-已收录"
API_URL = f"https://api.github.com/repos/{REPO}/issues"
MANIFEST_PATH = Path("data/community-generated.json")
OWNED_NAME = re.compile(r"(?:index|page-[1-9]\d*|[1-9]\d*)\.md\Z")
WITHDRAWN = "投稿-撤稿批准"


class SnapshotConflict(RuntimeError):
    pass


def sanitize_plain_metadata(value: str, max_len: int = 120) -> str:
    cleaned = re.sub(r"[\r\n\x00-\x1f\x7f]+", " ", value).strip()
    cleaned = re.sub(r"<[^>]*>", "", cleaned)
    cleaned = re.sub(r"(?i)(?:javascript|data|vbscript)\s*:", "#blocked:", cleaned)
    return cleaned[:max_len].strip()


def validate_issues(issues: object) -> list[dict]:
    if not isinstance(issues, list):
        raise ValueError("GitHub Issues response must be an array")
    result = []
    seen = set()
    for issue in issues:
        if not isinstance(issue, dict):
            raise ValueError("Invalid Issue object")
        if "pull_request" in issue:
            continue
        number = issue.get("number")
        if type(number) is not int or number < 1 or number in seen:
            raise ValueError("Invalid or duplicate Issue number")
        seen.add(number)
        for field in ("title", "created_at"):
            if not isinstance(issue.get(field), str):
                raise ValueError(f"Invalid Issue {number}: {field}")
        if "body" not in issue or (issue["body"] is not None and not isinstance(issue["body"], str)):
            raise ValueError(f"Invalid Issue {number}: body")
        if not isinstance(issue.get("html_url", ""), str):
            raise ValueError(f"Invalid Issue {number}: html_url")
        if issue.get("state") not in {"open", "closed"}:
            raise ValueError(f"Invalid Issue {number}: state")
        labels = issue.get("labels")
        if not isinstance(labels, list) or any(not isinstance(label, dict) or not isinstance(label.get("name"), str) for label in labels):
            raise ValueError(f"Invalid Issue {number}: labels")
        names = {label["name"] for label in labels}
        if ("投稿-题目" in names or "投稿-题集" in names or WITHDRAWN in names or "投稿状态:withdrawn" in names
                or not ({LABEL, "投稿状态:published"} & names)):
            continue
        if issue["state"] == "closed" and "投稿状态:published" not in names and "plw-submission-v1" not in (issue["body"] or ""):
            continue  # Historical closed content requires explicit migration review.
        result.append(issue)
    return sorted(result, key=lambda item: item["number"], reverse=True)


def fetch_issues(*, token: str | None = None, opener=None, include_withdrawn=False) -> list[dict]:
    opener = opener or urlopen
    token = os.environ.get("GITHUB_TOKEN", "") if token is None else token
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "Physics-Learning-Wiki-Bot"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    url = API_URL + "?" + urlencode({
        "state": "all", "per_page": 100,
        "sort": "created", "direction": "asc", "page": 1,
    })
    issues: list[dict] = []
    visited = set()
    while url:
        parsed = urlsplit(url)
        if parsed.scheme != "https" or parsed.netloc != "api.github.com" or parsed.path != urlsplit(API_URL).path or url in visited:
            raise ValueError("Invalid GitHub pagination URL")
        visited.add(url)
        with opener(Request(url, headers=headers), timeout=30) as response:
            batch = json.loads(response.read().decode("utf-8"))
            if not isinstance(batch, list) or len(batch) > 100:
                raise ValueError("Invalid GitHub Issues page")
            issues.extend(batch)
            links = response.headers.get("Link", "")
        relations = {}
        for link in links.split(",") if links else []:
            match = re.fullmatch(r'\s*<([^<>]+)>;\s*rel="(next|prev|first|last)"\s*', link)
            if not match or match[2] in relations:
                raise ValueError("Invalid or ambiguous GitHub pagination header")
            relations[match[2]] = match[1]
        url = relations.get("next", "")
    active = validate_issues(issues)
    if include_withdrawn:
        active += [issue for issue in issues if "pull_request" not in issue
                   and WITHDRAWN in {label["name"] for label in issue["labels"]}
                   and not {"投稿-题目", "投稿-题集"} & {label["name"] for label in issue["labels"]}]
    from scripts.submissions.records import blocks, revision_history
    for issue in active:
        if not blocks(issue.get("body") or "", "plw-submission-v1"):
            continue
        comments = []
        for page in range(1, 101):
            endpoint = API_URL + f"/{issue['number']}/comments?per_page=100&page={page}"
            with opener(Request(endpoint, headers=headers), timeout=30) as response:
                batch = json.loads(response.read().decode("utf-8"))
            if not isinstance(batch, list):
                raise ValueError("Invalid submission comment response")
            comments.extend(batch)
            if len(batch) < 100:
                break
        else:
            raise ValueError("Submission comment pagination exceeded the safe limit")
        history = revision_history(issue, comments)
        issue["_history"] = history
        issue["_submission"] = history[-1]
        states = [record for comment in comments
                  if (comment.get("performed_via_github_app") or {}).get("slug") == "github-actions"
                  for record in blocks(comment.get("body") or "", "plw-submission-status-v1")]
        issue["_approved_revision"] = max([record["revision"] for record in states
                                            if record.get("stage") in {"accepted", "published"}] or [1])
        issue["_published_revision"] = max([record["revision"] for record in states
                                             if record.get("stage") == "published"] or [0])
    return active


def parse_issue_body(body: str) -> dict[str, str]:
    info = {"type": "未知", "chapter": "", "attribution": "匿名"}
    for name, key, limit in [("投稿类型", "type", 60), ("目标章节", "chapter", 120), ("署名", "attribution", 60)]:
        match = re.search(rf"{name}\*\*:\s*(.+?)(?:\n|$)", body)
        if match:
            info[key] = sanitize_plain_metadata(match.group(1), limit) or info[key]
    return info


def page_source(issue: dict) -> str:
    number = issue["number"]
    title = sanitize_plain_metadata((issue.get("_submission", {}).get("payload", {}).get("title") or issue["title"]).replace("[投稿]", "")) or f"社区稿件 #{number}"
    body = issue.get("body") or ""
    info = parse_issue_body(body)
    separator = re.search(r"^---\s*$", body, re.MULTILINE)
    content = body[separator.end():] if separator else body
    record = issue.get("_submission")
    if record:
        content = record["payload"]["content"]
        info = {"attribution": record["payload"].get("attribution", "匿名"),
                "type": record["type"], "chapter": record["payload"].get("chapter", "")}
    metadata = {
        "status": "community", "author": info["attribution"],
        "source_issue": f"https://github.com/{REPO}/issues/{number}",
        "submission_date": re.sub(r"[^\d-]", "", issue["created_at"][:10]),
        "title": title,
    }
    if record:
        metadata.update(submission_id=record["submissionId"], submission_revision=record["revision"],
                        submission_type=record["type"])
    return "---\n" + yaml.safe_dump(metadata, allow_unicode=True, sort_keys=False) + "---\n\n" + normalize_markdown(content) + "\n"


def index_source(issues: list[dict], page=1, total_pages=1) -> str:
    lines = [
        "---", "title: 社区角", "status: community", "---", "",
        "这里展示经人工审核收录的社区稿件，供学习与交流参考．", "",
    ]
    if not issues:
        lines.append('<p>暂无社区投稿．快来<a href="../submit.md">提交你的第一篇投稿</a>吧！</p>')
    if total_pages > 1:
        links = []
        if page > 1:
            links.append(f'<a href="{"index" if page == 2 else "page-" + str(page - 1)}.md">上一页</a>')
        if page < total_pages:
            links.append(f'<a href="page-{page + 1}.md">下一页</a>')
        lines += [f'<p>第 {page} / {total_pages} 页 · ' + " · ".join(links) + "</p>", ""]
    for issue in issues:
        record = issue.get("_submission", {})
        title = sanitize_plain_metadata((record.get("payload", {}).get("title") or issue["title"]).replace("[投稿]", "")) or f"社区稿件 #{issue['number']}"
        info = parse_issue_body(issue.get("body") or "")
        if record:
            info = {"attribution": record["payload"].get("attribution", "匿名"), "type": record["type"],
                    "chapter": record["payload"].get("chapter", "")}
        created = re.sub(r"[^\d-]", "", issue["created_at"][:10])
        # Raw HTML containers keep metadata as text, even if it contains Markdown.
        lines += [f'<h2><a href="{issue["number"]}.md">{html.escape(title)}</a></h2>', ""]
        text = f'投稿者：{info["attribution"]} | 类型：{info["type"]} | 日期：{created}'
        if info["chapter"] and info["chapter"] != "未指定":
            text += f' | 目标章节：{info["chapter"]}'
        lines += [f"<p>{html.escape(text)}</p>", "", "<hr>", ""]
    return "\n".join(lines) + "\n"


def build_snapshot(issues: list[dict]) -> dict[str, str]:
    issues = validate_issues(issues)
    pages = {f'{issue["number"]}.md': page_source(issue) for issue in issues}
    total = max(1, (len(issues) + 19) // 20)
    for index in range(total):
        pages["index.md" if index == 0 else f"page-{index + 1}.md"] = index_source(issues[index * 20:(index + 1) * 20], index + 1, total)
    for source in pages.values():
        render_community_markdown(source.split("---\n", 2)[2])
    return pages


def _digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_manifest(path: Path) -> dict[str, dict]:
    if path.is_symlink():
        raise SnapshotConflict("Managed manifest must not be a symlink")
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("version") != 1 or not isinstance(data.get("files"), dict):
        raise ValueError("Invalid community manifest")
    for name, entry in data["files"].items():
        if not OWNED_NAME.fullmatch(name) or not isinstance(entry, dict) or not re.fullmatch(r"[a-f0-9]{64}", str(entry.get("sha256", ""))):
            raise ValueError("Invalid managed community file")
        expected_issue = None if name == "index.md" or name.startswith("page-") else int(name[:-3])
        if entry.get("issue") != expected_issue:
            raise ValueError("Community manifest Issue/path mismatch")
    return data["files"]


def _atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(data)
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def merge_markdown(base, current, incoming):
    base, current, incoming = (value.replace("\r\n", "\n").replace("\r", "\n") for value in (base, current, incoming))
    if current == base or current == incoming:
        return incoming
    if incoming == base:
        return current
    with tempfile.TemporaryDirectory(prefix="plw-community-merge-") as directory:
        paths = [Path(directory) / name for name in ("current.md", "base.md", "incoming.md")]
        for path, text in zip(paths, (current, base, incoming)):
            path.write_text(text, encoding="utf-8", newline="\n")
        result = subprocess.run(["git", "merge-file", "-p", *(str(path) for path in paths)],
                                capture_output=True, text=True, encoding="utf-8")
        if result.returncode:
            raise SnapshotConflict("Maintainer changes conflict with the author revision")
        return result.stdout


def apply_snapshot(pages: dict[str, str], output_dir: Path, manifest_path: Path, *, withdrawn=None) -> bool:
    previous = read_manifest(manifest_path)
    if output_dir.is_symlink():
        raise SnapshotConflict("Community directory must not be a symlink")
    desired = {name: source.encode("utf-8") for name, source in pages.items()}
    generated = desired.copy()
    if any(not OWNED_NAME.fullmatch(name) for name in desired):
        raise ValueError("Invalid snapshot path")
    updates: dict[str, bytes] = {}
    removals = []
    for name in previous.keys() | desired.keys():
        path = output_dir / name
        if path.is_symlink() or (path.exists() and not path.is_file()):
            raise SnapshotConflict(f"Unsafe managed path: {name}")
        current = path.read_bytes() if path.exists() else None
        next_content = desired.get(name)
        if current == next_content:
            continue
        expected = previous.get(name)
        if current is not None and expected is None:
            raise SnapshotConflict(f"Unmanaged community file needs review: {name}")
        if expected is not None and (current is None or _digest(current) != expected["sha256"]):
            if current is None or next_content is None or not isinstance(expected.get("generated"), str):
                raise SnapshotConflict(f"Maintainer changes conflict with generated content: {name}")
        if expected is not None and current is not None and next_content is not None and isinstance(expected.get("generated"), str):
            next_content = merge_markdown(expected["generated"], current.decode("utf-8"), next_content.decode("utf-8")).encode("utf-8")
            desired[name] = next_content
            if next_content == current:
                continue
        if next_content is None:
            removals.append(path)
        else:
            updates[name] = next_content
    manifest = {"version": 1, "files": {
        name: {"issue": None if name == "index.md" or name.startswith("page-") else int(name[:-3]),
               "sha256": _digest(data), "generated": generated[name].decode("utf-8")}
        for name, data in sorted(desired.items())
    }, "withdrawn": withdrawn or {}}
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    manifest_changed = not manifest_path.exists() or manifest_path.read_bytes() != manifest_bytes
    # Preflight all conflicts above; stage the complete snapshot before applying it.
    with tempfile.TemporaryDirectory(prefix="plw-community-") as staging:
        for name, data in desired.items():
            (Path(staging) / name).write_bytes(data)
        for name in sorted(updates):
            _atomic_write(output_dir / name, (Path(staging) / name).read_bytes())
        for path in removals:
            if path.resolve().parent != output_dir.resolve():
                raise SnapshotConflict("Refusing removal outside the community directory")
            path.unlink()
        if manifest_changed:
            _atomic_write(manifest_path, manifest_bytes)
    return bool(updates or removals or manifest_changed)


def generate_snapshot(output_dir: Path, manifest_path: Path, *, issues=None) -> bool:
    issues = fetch_issues(include_withdrawn=True) if issues is None else issues
    for issue in issues:
        if not issue.get("_history"):
            continue
        # An in-flight draft may follow author revisions. Published content needs a new explicit acceptance.
        current = output_dir / f"{issue['number']}.md"
        current_revision = frontmatter.loads(current.read_text(encoding="utf-8")).get("submission_revision", 0) if current.exists() else 0
        root = output_dir.resolve().parents[1]
        main = subprocess.run(["git", "show", f"origin/main:docs/community/{issue['number']}.md"],
                              cwd=root, capture_output=True, text=True, encoding="utf-8")
        main_revision = frontmatter.loads(main.stdout).get("submission_revision", 0) if main.returncode == 0 else 0
        published = max(main_revision, issue.get("_published_revision", 0))
        allowed = issue["_submission"]["revision"] if current_revision > published or not published else issue["_approved_revision"]
        issue["_submission"] = next(record for record in reversed(issue["_history"]) if record["revision"] <= allowed)
    withdrawn = {}
    for issue in issues:
        if WITHDRAWN in {label["name"] for label in issue["labels"]}:
            record = issue.get("_submission", {})
            withdrawn[str(issue["number"])] = {"revision": record.get("revision", 1), "type": record.get("type", "notes"),
                                             **({"submissionId": record["submissionId"]} if record.get("submissionId") else {})}
    pages = build_snapshot(issues)
    return apply_snapshot(pages, output_dir, manifest_path, withdrawn=withdrawn)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path("docs/community"))
    parser.add_argument("--manifest", type=Path, default=MANIFEST_PATH)
    args = parser.parse_args(argv)
    try:
        changed = generate_snapshot(args.output_dir, args.manifest)
    except Exception as error:
        print(f"[ERROR] Community snapshot was not completed: {error}", file=sys.stderr)
        return 1
    print("Community snapshot updated" if changed else "Community snapshot unchanged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
