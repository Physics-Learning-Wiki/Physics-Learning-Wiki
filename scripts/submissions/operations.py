"""Classification, explicit editorial decisions, and a quiet seven-day attention queue."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re

from .contract import validate_question
from .github import GitHub
from .records import PREFIX, block, blocks, digest, latest_revision

QUEUE_MARKER = "<!-- plw-submission-attention-v1 -->"
DECISIONS = {"投稿-已收录", "投稿-接受修订", "投稿-撤稿批准"}
EDITOR_ROLES = {"OWNER", "MEMBER", "COLLABORATOR"}
TERMINAL = {"published", "rejected", "withdrawn", "resolved"}


def classify(issue, comments):
    """Return actionable, type-specific hints without counting machine payloads as prose."""
    try:
        record = latest_revision(issue, comments)
    except ValueError:
        if blocks(issue.get("body") or "", "plw-submission-v1"):
            return 1, ["稿件版本记录无效，请维护者核对后协助恢复．"]
        body = re.sub(r"```json plw-[\s\S]*?```", "", issue.get("body") or "").strip()
        kind = next((kind for kind, label in (("errata", "投稿-勘误"), ("suggestion", "投稿-建议"),
                    ("question", "投稿-题目")) if label in {x["name"] for x in issue["labels"]}), "notes")
        record = {"type": kind, "revision": 1, "payload": {"content": body, "title": issue["title"]}}
    payload, kind = record["payload"], record["type"]
    content = payload.get("content", "").strip()
    hints = []
    if kind == "question":
        try:
            validate_question(payload.get("question", {}))
        except ValueError:
            hints.append("题目字段未通过共享契约，请补齐题干、答案、解析及对应题型配置．")
    elif kind == "errata":
        if not payload.get("chapter") and not re.search(r"https?://\S+|[\w/-]+\.md|第\s*\d+\s*[页节题]", content):
            hints.append("请提供出错页面链接或章节位置，注明原文和建议修改．")
        elif not content:
            hints.append("请说明原文错误与建议修改．")
    elif kind == "suggestion":
        if len(re.sub(r"\s", "", content)) < 8:
            hints.append("请描述希望改进的具体问题和使用场景．")
    elif len(re.sub(r"\s", "", content)) < 20:
        hints.append("请补充学习内容、适用读者和必要推导；提纲可说明后续写作范围．")
    if not payload.get("title", "").strip():
        hints.append("请补充便于辨识的标题．")
    if re.fullmatch(r"(.)\1{20,}|https?://\S+", content, re.S):
        hints.append("请补充正文说明，维护者会人工判断内容是否适合收录．")
    return record["revision"], hints


def triage(api, number):
    issue = api.api(f"issues/{number}")
    if "pull_request" in issue or "投稿-待审核" not in {x["name"] for x in issue["labels"]}:
        return
    comments = api.pages(f"issues/{number}/comments?per_page=100")
    revision, hints = classify(issue, comments)
    states = [record for comment in comments
              if (comment.get("performed_via_github_app") or {}).get("slug") == "github-actions"
              for record in blocks(comment.get("body") or "", "plw-submission-status-v1")
              if record.get("revision") == revision]
    if states:
        return
    api.stage(number, "needs_info" if hints else "received", revision,
              waitingFor="author" if hints else "maintainer",
              note="\n".join(hints) if hints else "投稿已收到，将由编辑组尽力处理．可通过管理回执查询进度、修订或申请撤稿．")


def editorial_event(api, event):
    """Return whether this event may synchronize a community review PR."""
    issue = event.get("issue", {})
    if not issue or "pull_request" in issue or "投稿-题目" in {x["name"] for x in issue.get("labels", [])}:
        return False
    comments = api.pages(f"issues/{issue['number']}/comments?per_page=100")
    if event.get("comment"):
        return (event["comment"].get("user", {}).get("id") == issue.get("user", {}).get("id")
                and bool(blocks(event["comment"].get("body") or "", "plw-submission-v1")))
    label = event.get("label", {}).get("name")
    if label not in DECISIONS:
        return False
    permission = api.api("collaborators/" + event["sender"]["login"] + "/permission")
    if permission.get("permission") not in {"admin", "maintain", "write"}:
        raise ValueError("Only repository editors may accept or withdraw a submission")
    try:
        revision = latest_revision(issue, comments)["revision"]
    except ValueError:
        revision = 1  # Explicit legacy editorial acceptance; no anonymous ownership claim.
    if label != "投稿-撤稿批准":
        api.stage(issue["number"], "accepted", revision, waitingFor="maintainer",
                  note="维护者已接受本版本，待整理审核 PR 和实际部署确认．")
    # Withdrawal remains pending until the removal is deployed. Keep its approval marker.
    return True


def status_event(api, event):
    label = event.get("label", {}).get("name", "")
    if not label.startswith(PREFIX) or label[len(PREFIX):] not in {"needs_info", "accepted", "reviewing", "rejected", "resolved"}:
        return
    issue = event["issue"]
    if "pull_request" in issue:
        return
    permission = api.api("collaborators/" + event["sender"]["login"] + "/permission")
    if permission.get("permission") not in {"write", "maintain", "admin"}:
        raise ValueError("Only repository editors may decide a submission status")
    latest = api.api(f"issues/{issue['number']}")
    comments = api.pages(f"issues/{issue['number']}/comments?per_page=100")
    revision = latest_revision(latest, comments)["revision"]
    stage = label[len(PREFIX):]
    api.stage(issue["number"], stage, revision, waitingFor="author" if stage == "needs_info" else "maintainer",
              note="维护者已对本版本记录处理决定：" + stage + "．")


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def is_editor(item):
    actor = item.get("actor") or item.get("user") or {}
    return (actor.get("type") != "Bot" and not actor.get("login", "").endswith("[bot]")
            and not item.get("performed_via_github_app")
            and item.get("author_association") in EDITOR_ROLES)


def attention_entry(issue, comments, timeline, now):
    if "pull_request" in issue:
        return None
    labels = {x["name"] for x in issue.get("labels", [])}
    if not any(name.startswith("投稿-") or name.startswith(PREFIX) for name in labels):
        return None
    try:
        revision = latest_revision(issue, comments)["revision"]
    except ValueError:
        revision = 1
    states = [record for comment in comments
              if (comment.get("performed_via_github_app") or {}).get("slug") == "github-actions"
              for record in blocks(comment.get("body") or "", "plw-submission-status-v1")
              if record.get("revision") == revision]
    status = states[-1] if states else {"stage": "received"}
    canonical = [name[len(PREFIX):] for name in labels if name.startswith(PREFIX)]
    if not blocks(issue.get("body") or "", "plw-submission-v1") and len(canonical) == 1 and canonical[0] in {"needs_info", "accepted", "reviewing", "rejected", "resolved"}:
        status = {**status, "stage": canonical[0]}
    requests = [comment for comment in comments
                if comment.get("user", {}).get("id") == issue.get("user", {}).get("id")
                and blocks(comment.get("body") or "", "plw-withdrawal-request-v1")]
    withdrawal = bool(requests) and status["stage"] != "withdrawn"
    if not withdrawal and (status["stage"] in TERMINAL or
                           status["stage"] == "needs_info" and status.get("waitingFor", "author") == "author"):
        return None
    if issue.get("state") == "closed" and not withdrawal and status["stage"] not in {"accepted", "importing", "draft_ready", "reviewing"}:
        return None
    last = parse_time(issue["created_at"])
    for item in [*comments, *timeline]:
        authored = item.get("user", {}).get("id") == issue.get("user", {}).get("id")
        source = authored and (blocks(item.get("body") or "", "plw-submission-v1") or
                               blocks(item.get("body") or "", "plw-withdrawal-request-v1"))
        if source or is_editor(item):
            date = item.get("created_at") or item.get("submitted_at")
            if date:
                last = max(last, parse_time(date))
    if now - last < timedelta(days=7):
        return None
    return {"issue": issue["number"], "revision": revision, "stage": status["stage"],
            "lastMaintainerActionOrNewWork": last.isoformat(), "withdrawalRequested": withdrawal}


def update_attention(api, now=None):
    now = now or datetime.now(timezone.utc)
    issues = api.pages("issues?state=all&per_page=100")
    queues = [issue for issue in issues if QUEUE_MARKER in (issue.get("body") or "") and
              issue.get("user", {}).get("login") == "github-actions[bot]"]
    if len(queues) > 1:
        raise ValueError("Multiple managed attention queues need consolidation")
    entries = []
    editor_cache = {}
    for issue in issues:
        if "pull_request" in issue or QUEUE_MARKER in (issue.get("body") or ""):
            continue
        if not any(x["name"].startswith(("投稿-", PREFIX)) for x in issue.get("labels", [])):
            continue
        comments = api.pages(f"issues/{issue['number']}/comments?per_page=100")
        timeline = api.pages(f"issues/{issue['number']}/timeline?per_page=100")
        for item in timeline:
            actor = item.get("actor") or {}
            login = actor.get("login", "")
            if (not item.get("author_association") and login and actor.get("type") != "Bot"
                    and not login.endswith("[bot]") and not item.get("performed_via_github_app")
                    and item.get("event") in {"labeled", "unlabeled", "assigned", "unassigned", "closed", "reopened", "renamed"}):
                if login not in editor_cache:
                    editor_cache[login] = api.api("collaborators/" + login + "/permission").get("permission") in {"admin", "maintain", "write"}
                if editor_cache[login]:
                    item["author_association"] = "COLLABORATOR"
        entry = attention_entry(issue, comments, timeline, now)
        if entry:
            entries.append(entry)
    entries.sort(key=lambda entry: entry["issue"])
    fingerprint = digest(entries)
    previous = blocks(queues[0].get("body") or "", "plw-attention-v1") if queues else []
    if previous and previous[-1].get("fingerprint") == fingerprint:
        return False
    if not queues and not entries:
        return False
    lines = [QUEUE_MARKER, "等待维护者处理且超过 7 个自然日的稿件．机器人活动不重置计时；等待作者补充的稿件不计入．", ""]
    lines += [f"- #{entry['issue']} · 第 {entry['revision']} 版 · {entry['stage']}" + (" · 撤稿待处理" if entry["withdrawalRequested"] else "") for entry in entries]
    if not entries:
        lines.append("当前没有超期事项．")
    lines += ["", block("plw-attention-v1", {"fingerprint": fingerprint, "entries": entries})]
    body = "\n".join(lines)
    if queues:
        api.api(f"issues/{queues[0]['number']}", method="PATCH", body={"body": body, "state": "open"})
        old = {entry["issue"]: entry for entry in previous[-1].get("entries", [])} if previous else {}
        changed = [entry for entry in entries if old.get(entry["issue"]) != entry]
        if changed:
            api.api(f"issues/{queues[0]['number']}/comments", method="POST",
                    body={"body": "关注队列有新增或实质变化：" + "、".join(f"#{entry['issue']}" for entry in changed) + "．"})
    else:
        api.api("issues", method="POST", body={"title": "投稿维护关注队列", "body": body})
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["triage", "status-event", "community-event", "community-failure", "attention"])
    args = parser.parse_args()
    api = GitHub()
    if args.command == "attention":
        update_attention(api)
        return
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    if args.command == "triage":
        triage(api, event["issue"]["number"])
    elif args.command == "status-event":
        status_event(api, event)
    elif args.command == "community-failure":
        if event.get("issue"):
            issue = api.api(f"issues/{event['issue']['number']}")
            try:
                revision = latest_revision(issue, api.pages(f"issues/{issue['number']}/comments?per_page=100"))["revision"]
            except ValueError:
                revision = 1
            api.stage(issue["number"], "needs_info", revision, waitingFor="maintainer",
                      note="自动同步暂停，请维护者检查 Actions 中的合并冲突、校验失败或远端变化．原稿与分支继续保留．")
    else:
        allowed = editorial_event(api, event)
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as stream:
            stream.write("sync=" + str(allowed).lower() + "\n")


if __name__ == "__main__":
    main()
