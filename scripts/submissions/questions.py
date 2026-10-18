"""Import and revise question PRs using trusted tools and compare-before-push."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import subprocess
import sys

import yaml

from scripts.question_bank.maintenance import submission_document
from scripts.question_bank.media import question_content_fingerprint
from scripts.question_bank.validator import validate_repository
from .github import GitHub
from .records import REPO, digest, latest_revision, metadata, question_payload, select_pr, three_way


def git(*args, check=True):
    result = subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8")
    if check and result.returncode:
        raise RuntimeError("Git operation failed: " + args[0])
    return result.stdout.strip()


def import_pr(api: GitHub, number: int, *, revision_event=False, run_key="local") -> str:
    root = Path.cwd()
    issue = api.api(f"issues/{number}")
    if "pull_request" in issue or "投稿-题目" not in {x["name"] for x in issue["labels"]}:
        raise ValueError("Issue is not a question submission")
    revision = latest_revision(issue, api.pages(f"issues/{number}/comments?per_page=100"))
    payload = question_payload(issue, revision)
    prs = api.pages("pulls?state=all&base=main&per_page=100")
    pr = select_pr(prs, number)
    if revision_event and pr is None:
        api.stage(number, "needs_info", revision["revision"],
                  note="已记录新修订；当前没有开放的投稿 PR，需维护者审核后安排修订 PR．")
        return "Revision recorded; maintainer action required"

    git("fetch", "--no-tags", "origin", "+refs/heads/main:refs/remotes/origin/main")
    git("config", "user.name", "github-actions[bot]")
    git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    previous_head = None
    if pr:
        branch = pr["head"]["ref"]
        git("check-ref-format", "--branch", branch)
        previous_head = pr["head"]["sha"]
        remote = git("ls-remote", "--heads", "origin", "refs/heads/" + branch)
        if not remote or remote.split()[0] != previous_head:
            raise ValueError("Open PR branch is missing or changed; remote left untouched")
        git("fetch", "--no-tags", "origin", "refs/heads/" + branch)
        git("switch", "--detach", previous_head)
        record = metadata(pr.get("body", ""))
        if not record:
            raise ValueError("Legacy open PR needs migration before automatic revision")
        if record["revision"] > revision["revision"]:
            raise ValueError("Refusing a stale revision")
        if record["fingerprint"] == digest(payload):
            api.stage(number, "importing", revision["revision"], pr=pr["html_url"],
                      note="题目草稿 PR 正在审核：" + pr["html_url"])
            return pr["html_url"]
        paths = api.pages(f"pulls/{pr['number']}/files?per_page=100")
        qpath = record["path"]
        state_path = f"question-bank/submissions/issue-{number}.json"
        if not re.fullmatch(r"question-bank/questions/[a-z0-9/_-]+\.yml", qpath):
            raise ValueError("Invalid managed question path")
        if any(item["filename"] not in {qpath, state_path}
               and not item["filename"].startswith("question-bank/assets/") for item in paths):
            raise ValueError("PR contains changes outside its managed question and assets")
        saved = json.loads((root / state_path).read_text(encoding="utf-8"))
        if digest(saved["payload"]) != record["fingerprint"]:
            raise ValueError("Imported base record does not match PR metadata")
        current = yaml.safe_load((root / qpath).read_text(encoding="utf-8"))
        _, incoming = submission_document(root, payload)
        incoming["id"] = current["id"]
        incoming["version"] = saved["generated"]["version"]
        generated = incoming
        merged = three_way(saved["generated"], current, incoming)
        if question_content_fingerprint(merged, root) != question_content_fingerprint(current, root):
            merged.pop("review", None)  # Old attestations remain in Git history.
        output = root / qpath
    else:
        git("switch", "--detach", "origin/main")
        output, generated = submission_document(root, payload)
        qpath = output.relative_to(root).as_posix()
        state_path = f"question-bank/submissions/issue-{number}.json"
        if output.exists():
            current = yaml.safe_load(output.read_text(encoding="utf-8"))
            if current.get("status") == "published":
                raise ValueError("Published content requires a maintainer amendment PR")
            if current == generated:
                api.stage(number, "draft_ready", revision["revision"],
                          note="题目草稿已入库，等待专业审核．", question=current["id"])
                return "Draft is already imported"
        merged = generated
        if not re.fullmatch(r"[A-Za-z0-9-]{1,80}", run_key):
            raise ValueError("Invalid run identifier")
        branch = f"codex/question-submission/issue-{number}-r{revision['revision']}-{run_key}"
        remote = git("ls-remote", "--heads", "origin", "refs/heads/" + branch)
        if remote:
            # Resume only this run's orphaned branch after PR creation failed.
            git("fetch", "--no-tags", "origin", "refs/heads/" + branch)
            git("switch", "--detach", "FETCH_HEAD")
            saved = json.loads((root / state_path).read_text(encoding="utf-8"))
            if saved.get("payload") != payload or yaml.safe_load((root / qpath).read_text(encoding="utf-8")) != saved["generated"]:
                raise ValueError("Orphaned branch differs from the current approved payload")
            previous_head = git("rev-parse", "HEAD")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(yaml.safe_dump(merged, allow_unicode=True, sort_keys=False, width=120), encoding="utf-8")
    record_path = root / state_path
    record_path.parent.mkdir(parents=True, exist_ok=True)
    record_path.write_text(json.dumps({"payload": payload, "generated": generated}, ensure_ascii=False, indent=2) + "\n",
                           encoding="utf-8")
    errors = validate_repository(root, include_drafts=True).errors
    if errors:
        raise ValueError("Question revision failed repository validation:\n" + "\n".join(e.render() for e in errors[:10]))
    git("add", "--", qpath, state_path)
    if git("diff", "--cached", "--name-only"):
        git("commit", "-m", f"content(question-bank): 同步投稿 #{number} 第 {revision['revision']} 版")
    latest = api.api(f"issues/{number}")
    current_revision = latest_revision(latest, api.pages(f"issues/{number}/comments?per_page=100"))
    if current_revision != revision:
        raise ValueError("A newer revision arrived; retry before pushing")
    remote = git("ls-remote", "--heads", "origin", "refs/heads/" + branch)
    if (remote.split()[0] if remote else None) != previous_head:
        raise ValueError("Remote changed while importing; remote left untouched")
    git("push", "origin", "HEAD:refs/heads/" + branch)
    record = {"repo": REPO, "issue": number, "question": merged["id"], "path": qpath,
              "revision": revision["revision"], "fingerprint": digest(payload)}
    body = f"Refs #{number}\n\n题目草稿：{merged['id']}，投稿修订：{revision['revision']}．\n\n"
    body += "<!-- plw-question-pr:" + json.dumps(record, separators=(",", ":")) + " -->"
    if pr:
        api.api(f"pulls/{pr['number']}", method="PATCH", body={"body": body})
        subprocess.run(["gh", "pr", "ready", str(pr["number"]), "--undo"], check=True, capture_output=True)
        url = pr["html_url"]
    else:
        created = api.api("pulls", method="POST",
                         body={"head": branch, "base": "main", "draft": True,
                               "title": f"content(question-bank): 整理题目投稿 #{number}", "body": body})
        url = created["html_url"]
    api.stage(number, "importing", revision["revision"], pr=url,
              note="已同步题目草稿 PR，等待人工审核：" + url)
    return url


def complete(api: GitHub, pr: dict):
    record = metadata(pr.get("body", ""))
    if not record or record.get("repo") != REPO or pr["head"]["repo"]["full_name"] != REPO:
        return
    if not pr.get("merged") or pr["base"]["ref"] != "main":
        return
    # Read the actual merged file, rather than infer success from a filename.
    import base64
    content = api.api("contents/" + record["path"] + "?ref=" + pr["merge_commit_sha"])
    data = yaml.safe_load(base64.b64decode(content["content"]))
    expected = f"https://github.com/{REPO}/issues/{record['issue']}"
    if data.get("id") != record["question"] or data.get("submission", {}).get("issue_url") != expected:
        raise ValueError("Merged question does not match the submission")
    api.stage(record["issue"], "draft_ready", record["revision"], question=data["id"],
              pr=pr["html_url"], note="题目草稿已入库；正式发布仍需专业审核和部署确认．")


def main():
    api = GitHub()
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    if os.environ["GITHUB_EVENT_NAME"] == "pull_request":
        complete(api, event["pull_request"])
        return
    revision_event = os.environ["GITHUB_EVENT_NAME"] == "issue_comment"
    number = int(event.get("issue", {}).get("number") or event.get("inputs", {}).get("issue"))
    if revision_event:
        if event["comment"]["user"]["id"] != event["issue"]["user"]["id"]:
            return
        if "plw-submission-v1" not in event["comment"].get("body", ""):
            return
    else:
        permission = api.api("collaborators/" + event["sender"]["login"] + "/permission")
        if permission.get("permission") not in {"admin", "maintain", "write"}:
            raise ValueError("Only repository maintainers may accept a submission")
    try:
        print(import_pr(api, number, revision_event=revision_event,
                        run_key=os.environ.get("GITHUB_RUN_ID", "local")))
    except Exception:
        # Detailed diagnostics stay in CI; public records never contain payloads or secrets.
        issue = api.api(f"issues/{number}")
        rev = latest_revision(issue, api.pages(f"issues/{number}/comments?per_page=100"))
        api.stage(number, "needs_info", rev["revision"],
                  note="自动整理暂停：存在内容冲突或校验问题，请维护者查看 Actions 运行并处理．")
        raise


if __name__ == "__main__":
    main()
