"""Fetch complete Issue snapshots and update only unchanged, owned files."""
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
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

import yaml

from .render import normalize_markdown, render_community_markdown

REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki"
LABEL = "投稿-已收录"
API_URL = f"https://api.github.com/repos/{REPO}/issues"
MANIFEST_PATH = Path("data/community-generated.json")
OWNED_NAME = re.compile(r"(?:index|[1-9]\d*)\.md\Z")


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
        if issue["state"] != "open" or LABEL not in {label["name"] for label in labels}:
            continue
        result.append(issue)
    return sorted(result, key=lambda item: item["number"], reverse=True)


def fetch_issues(*, token: str | None = None, opener=None) -> list[dict]:
    opener = opener or urlopen
    token = os.environ.get("GITHUB_TOKEN", "") if token is None else token
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "Physics-Learning-Wiki-Bot"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    url = API_URL + "?" + urlencode({
        "labels": LABEL, "state": "open", "per_page": 100,
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
    return validate_issues(issues)


def parse_issue_body(body: str) -> dict[str, str]:
    info = {"type": "未知", "chapter": "", "attribution": "匿名"}
    for name, key, limit in [("投稿类型", "type", 60), ("目标章节", "chapter", 120), ("署名", "attribution", 60)]:
        match = re.search(rf"{name}\*\*:\s*(.+?)(?:\n|$)", body)
        if match:
            info[key] = sanitize_plain_metadata(match.group(1), limit) or info[key]
    return info


def page_source(issue: dict) -> str:
    number = issue["number"]
    title = sanitize_plain_metadata(issue["title"].replace("[投稿]", "")) or f"社区稿件 #{number}"
    body = issue.get("body") or ""
    info = parse_issue_body(body)
    separator = re.search(r"^---\s*$", body, re.MULTILINE)
    content = body[separator.end():] if separator else body
    metadata = {
        "status": "community", "author": info["attribution"],
        "source_issue": f"https://github.com/{REPO}/issues/{number}",
        "submission_date": re.sub(r"[^\d-]", "", issue["created_at"][:10]),
        "title": title,
    }
    return "---\n" + yaml.safe_dump(metadata, allow_unicode=True, sort_keys=False) + "---\n\n" + normalize_markdown(content) + "\n"


def index_source(issues: list[dict]) -> str:
    lines = [
        "---", "title: 社区角", "status: community", "---", "",
        "这里展示来自社区投稿的内容，未经团队深度审核，仅供交流参考．", "",
    ]
    if not issues:
        lines.append('<p>暂无社区投稿．快来<a href="../submit.md">提交你的第一篇投稿</a>吧！</p>')
    for issue in issues:
        title = sanitize_plain_metadata(issue["title"].replace("[投稿]", "")) or f"社区稿件 #{issue['number']}"
        info = parse_issue_body(issue.get("body") or "")
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
    pages["index.md"] = index_source(issues)
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
        expected_issue = None if name == "index.md" else int(name[:-3])
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


def apply_snapshot(pages: dict[str, str], output_dir: Path, manifest_path: Path) -> bool:
    previous = read_manifest(manifest_path)
    if output_dir.is_symlink():
        raise SnapshotConflict("Community directory must not be a symlink")
    desired = {name: source.encode("utf-8") for name, source in pages.items()}
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
            raise SnapshotConflict(f"Maintainer changes conflict with generated content: {name}")
        if next_content is None:
            removals.append(path)
        else:
            updates[name] = next_content
    manifest = {"version": 1, "files": {
        name: {"issue": None if name == "index.md" else int(name[:-3]), "sha256": _digest(data)}
        for name, data in sorted(desired.items())
    }}
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
    pages = build_snapshot(fetch_issues() if issues is None else issues)
    return apply_snapshot(pages, output_dir, manifest_path)


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
