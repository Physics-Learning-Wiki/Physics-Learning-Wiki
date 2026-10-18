"""Build a network-free release manifest and verify the actually served resources."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import quote, urljoin, urlsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError

import frontmatter
import yaml

from scripts.question_bank.maintenance import ISSUE_URL_RE
from scripts.question_bank.media import question_content_fingerprint
from .github import GitHub
from .records import REPO, blocks, latest_revision

RELEASE_PATH = "_generated/submissions/release.json"
SITE_URL = "https://physics-learning-wiki.github.io/Physics-Learning-Wiki/"


def source_sha(root):
    value = os.environ.get("GITHUB_SHA") or subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=root, check=True, capture_output=True, text=True).stdout.strip()
    if not re.fullmatch(r"[a-f0-9]{40}", value):
        raise ValueError("Invalid release source SHA")
    return value


def build_release(root: Path, site: Path, site_url=SITE_URL, sha=None):
    entries = {}
    def add(issue, entry):
        if str(issue) in entries:
            raise ValueError(f"Submission #{issue} has multiple primary resources")
        entries[str(issue)] = {"issue": int(issue), **entry}
    for path in (root / "question-bank/questions").rglob("*.yml"):
        question = yaml.safe_load(path.read_text(encoding="utf-8"))
        submission = question.get("submission", {})
        match = ISSUE_URL_RE.fullmatch(submission.get("issue_url", ""))
        if not match:
            continue
        stage = {"published": "published", "draft": "draft_ready", "retired": "withdrawn"}[question["status"]]
        entry = {"type": "question", "question": question["id"], "revision": submission.get("revision", 1),
                 "author": "、".join(str(author["name"]) for author in question.get("authors", [])
                                      if author.get("kind") == "human") or "匿名",
                 "stage": stage, "fingerprint": question_content_fingerprint(question, root),
                 "mediaReview": submission.get("media_review", [])}
        if submission.get("submission_id"):
            entry["submissionId"] = submission["submission_id"]
        if stage == "published":
            entry["url"] = urljoin(site_url, "quiz/questions/") + "?q=" + quote(question["id"], safe="")
        add(match[1], entry)
    manifest_path = root / "data/community-generated.json"
    owned = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"files": {}}
    for path in (root / "docs").rglob("*.md"):
        text = path.read_text(encoding="utf-8")
        if "source_issue:" not in text[:6000]:
            continue
        page = frontmatter.loads(text)
        match = ISSUE_URL_RE.fullmatch(str(page.get("source_issue", "")))
        if not match:
            raise ValueError("Submission page requires a canonical repository source_issue")
        relative = path.relative_to(root / "docs")
        if relative.parts[0] == "community":
            managed = owned.get("files", {}).get(relative.name)
            if not managed or managed["sha256"] != hashlib.sha256(path.read_bytes()).hexdigest():
                raise ValueError("Community publication requires a matching owned snapshot")
        elif page.get("submission_reviewed") is not True:
            continue
        entry = {"type": page.get("submission_type", "notes"), "revision": page.get("submission_revision", 1),
                 "stage": "published", "author": str(page.get("author", "匿名")),
                 "fingerprint": "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest(),
                 "url": urljoin(site_url, relative.with_suffix("").as_posix().removesuffix("/index") + "/")}
        if page.get("submission_id"):
            entry["submissionId"] = page["submission_id"]
        entry["verification"] = f"plw-submission:{entry['fingerprint']}:r{entry['revision']}:i{match[1]}"
        resource = site / urlsplit(entry["url"]).path.removeprefix(urlsplit(site_url).path) / "index.html"
        if resource.exists():
            rendered = resource.read_text(encoding="utf-8")
            marker = '<meta name="plw-submission-version" content="' + entry["verification"] + '">'
            if "</head>" not in rendered:
                raise ValueError("Published resource has no document head")
            resource.write_text(rendered.replace("</head>", marker + "</head>", 1), encoding="utf-8", newline="\n")
        add(match[1], entry)
    for issue, decision in owned.get("withdrawn", {}).items():
        add(issue, {**decision, "stage": "withdrawn", "removedUrl": urljoin(site_url, f"community/{issue}/")})
    result = {"schemaVersion": 1, "sourceSha": sha or source_sha(root), "siteUrl": site_url, "entries": entries}
    destination = site / RELEASE_PATH
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result


def fetch_bytes(url, opener=urlopen):
    with opener(Request(url, headers={"User-Agent": "Physics-Learning-Wiki-Release-Check", "Cache-Control": "no-cache"}), timeout=20) as response:
        return response.read()


def checked_site_url(url, site_url):
    base, target = urlsplit(site_url), urlsplit(url)
    if target.scheme != base.scheme or target.netloc != base.netloc or not target.path.startswith(base.path):
        raise ValueError("Published resource escapes the configured site")
    return url


def served_questions(site_url, opener):
    manifest = json.loads(fetch_bytes(urljoin(site_url, "_generated/question-bank/manifest.json"), opener))
    if manifest.get("preview"):
        raise ValueError("Preview question banks cannot confirm publication")
    url = urljoin(site_url + "_generated/question-bank/", manifest["catalogs"]["questions"])
    return json.loads(fetch_bytes(checked_site_url(url, site_url), opener))


def verify_removed(entry, *, site_url=SITE_URL, opener=urlopen, catalog=None):
    if entry.get("type") == "question":
        catalog = served_questions(site_url, opener) if catalog is None else catalog
        if any(question["id"] == entry["question"] for question in catalog):
            raise ValueError("Withdrawn question is still in the actually served catalog")
        return
    url = entry.get("removedUrl") or entry.get("url")
    if not url:
        raise ValueError("Withdrawal requires the previous public resource URL")
    try:
        fetch_bytes(checked_site_url(url, site_url), opener)
    except HTTPError as error:
        if error.code in {404, 410}:
            return
        raise
    raise ValueError("Withdrawn page is still accessible; waiting for actual removal")


def verify_release(expected_sha, *, site_url=SITE_URL, opener=urlopen):
    release = json.loads(fetch_bytes(urljoin(site_url, RELEASE_PATH) + "?verify=" + expected_sha, opener))
    if release.get("schemaVersion") != 1 or release.get("sourceSha") != expected_sha or release.get("siteUrl") != site_url:
        raise ValueError("The publicly served release does not match this deployment")
    catalog = None
    for entry in release.get("entries", {}).values():
        if entry["type"] == "question" and entry["stage"] in {"published", "withdrawn"} and catalog is None:
            catalog = served_questions(site_url, opener)
        if entry["stage"] == "withdrawn":
            verify_removed(entry, site_url=site_url, opener=opener, catalog=catalog)
            continue
        if entry["stage"] != "published":
            continue
        url = checked_site_url(entry["url"], site_url)
        resource = fetch_bytes(url, opener)
        if entry["type"] != "question" and (not entry.get("verification") or entry["verification"].encode() not in resource):
            raise ValueError("Published page does not contain the expected submission revision")
        if entry["type"] == "question":
            if not any(q["id"] == entry["question"] and q.get("contentFingerprint") == entry["fingerprint"] for q in catalog):
                raise ValueError("Question is absent or differs from the actually served catalog")
    return release


def reconcile_release(api, release, *, opener=urlopen):
    entries = release["entries"]
    for entry in entries.values():
        issue = api.api(f"issues/{entry['issue']}")
        comments = api.pages(f"issues/{entry['issue']}/comments?per_page=100")
        try:
            current = latest_revision(issue, comments)["revision"]
        except ValueError:
            current = entry["revision"]  # Legacy community records remain public, never claimable.
        details = {key: value for key, value in entry.items() if key not in {"stage", "issue", "revision", "author"}}
        if entry["stage"] != "published":
            details["available"] = False
        revision = current if entry["stage"] == "withdrawn" else entry["revision"]
        api.stage(entry["issue"], entry["stage"], revision, sourceSha=release["sourceSha"],
                  update_labels=current == revision, **details,
                  note={"published": "已核对实际部署资源，本版本已正式发布．",
                        "withdrawn": "已核对实际部署清单，本稿件已下线．",
                        "draft_ready": "当前部署仅含仓库草稿，尚未正式发布．"}[entry["stage"]])
    # A rollback/deletion must also correct previously published submissions absent from this release.
    candidates = api.pages("issues?state=all&per_page=100")
    for issue in candidates:
        if "pull_request" in issue or str(issue["number"]) in entries:
            continue
        labels = {item["name"] for item in issue["labels"]}
        if not any(name.startswith("投稿") for name in labels):
            continue
        comments = api.pages(f"issues/{issue['number']}/comments?per_page=100")
        statuses = [record for comment in comments
                    if (comment.get("performed_via_github_app") or {}).get("slug") == "github-actions"
                    for record in blocks(comment.get("body") or "", "plw-submission-status-v1")]
        if not any(record.get("stage") == "published" for record in statuses) and "投稿状态:published" not in labels:
            continue
        previous = next((record for record in reversed(statuses) if record.get("stage") == "published" and record.get("url")), None)
        if previous is None:
            continue  # A historical label cannot prove a publication or identify a safe removal target.
        verify_removed(previous, site_url=release["siteUrl"], opener=opener)
        try:
            revision = latest_revision(issue, comments)["revision"]
        except ValueError:
            revision = 1
        withdrawn = "投稿-撤稿批准" in labels
        api.stage(issue["number"], "withdrawn" if withdrawn else "reviewing", revision,
                  sourceSha=release["sourceSha"], available=False,
                  note="已核对当前部署：稿件已下线．" if withdrawn else "当前部署暂未提供本稿件，请维护者核对回滚或资源变更．")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--sha")
    parser.add_argument("--site-dir", type=Path, default=Path("site"))
    parser.add_argument("--site-url", default=SITE_URL)
    args = parser.parse_args()
    if not args.verify:
        build_release(Path.cwd(), args.site_dir, args.site_url, args.sha)
        return
    sha = args.sha or GitHub().api("branches/main")["commit"]["sha"]
    for attempt in range(12):
        try:
            release = verify_release(sha, site_url=args.site_url)
            # Refuse to let an older run overwrite the state of a newer deployment.
            current = json.loads(fetch_bytes(urljoin(args.site_url, RELEASE_PATH) + "?latest=" + sha))
            if current["sourceSha"] != sha:
                raise ValueError("A newer deployment superseded this run")
            reconcile_release(GitHub(), release)
            print("Verified served release and reconciled submission states: " + sha)
            return
        except (OSError, ValueError):
            if attempt == 11:
                raise
            time.sleep(10)


if __name__ == "__main__":
    main()
