"""Import an ordered set and independent new questions as one managed change."""
from __future__ import annotations

import base64
import copy
import json
from pathlib import Path
import re
import subprocess

import yaml

from scripts.question_bank.maintenance import submission_document
from scripts.question_bank.validator import validate_repository
from .contract import validate_set_record
from .questions import git, managed_path
from .records import REPO, digest, latest_revision, metadata, select_pr, three_way


def content_fingerprint(document):
    return "sha256:" + digest({key: value for key, value in document.items()
                              if key not in {"status", "submission", "review"}})


def documents(root, issue, revision, saved=None):
    if revision["type"] != "quiz-set" or revision.get("licenseConsent") is not True or revision.get("licenseVersion") != "CC-BY-SA-4.0":
        raise ValueError("Invalid set submission or license consent")
    source = revision["payload"]["quizSet"]
    validate_set_record(revision)
    issue_url = f"https://github.com/{REPO}/issues/{issue}"
    resources = {}
    for entry in source["newQuestions"]:
        path, question = submission_document(root, {
            "schemaVersion": 2, "issueUrl": issue_url, "itemKey": entry["clientId"],
            "question": entry["question"], "sourceDeclaration": entry["sourceDeclaration"],
            **{key: revision[key] for key in ("submissionId", "revision", "licenseConsent", "licenseVersion")}})
        resources[entry["clientId"]] = {"path": path.relative_to(root).as_posix(), "generated": question}
    known = {document.data["id"]: document.data for document in validate_repository(root, include_drafts=True).data.questions}
    ids = []
    for item in source["selection"]["items"]:
        if item["kind"] == "existing":
            qid = item["questionId"]
            if qid not in known or known[qid]["status"] != "published":
                raise ValueError(f"Existing question {qid} is not published")
        else:
            qid = resources[item["clientId"]]["generated"]["id"]
        ids.append(qid)
    if len(ids) != len(set(ids)):
        raise ValueError("Set contains duplicate question IDs")
    payload = revision["payload"]
    declaration = revision["sourceDeclaration"]
    document = {
        "schema_version": 1, "id": f"community.submission.issue-{issue}", "version": 1,
        "title": payload["title"], "description": payload["content"], "status": "draft",
        "tags": source["tags"], "feedback_mode": source["feedbackMode"],
        "selection": {"type": "fixed", "order": source["selection"]["order"], "questions": ids},
        "authors": [{"name": payload.get("attribution") or "匿名", "kind": "human"}],
        "provenance": {"type": declaration["kind"], **{k: v for k, v in declaration.items() if k != "kind"}},
        "license": "CC-BY-SA-4.0",
        "submission": {"issue_url": issue_url, "submission_id": revision["submissionId"], "revision": revision["revision"]}}
    resources["set"] = {"path": f"question-bank/sets/inbox/issue-{issue}.yml", "generated": document}
    # Retained resources are never deleted by removing an item from the set.
    for key, resource in (saved or {}).get("resources", {}).items():
        if key not in resources:
            resources[key] = copy.deepcopy(resource)
    return resources


def checked_resource(root, number, key, resource):
    path = resource["path"]
    pattern = r"question-bank/sets/[a-z0-9/_.-]+\.yml" if key == "set" else r"question-bank/questions/[a-z0-9/_-]+\.yml"
    if not re.fullmatch(pattern, path):
        raise ValueError("Invalid managed resource path")
    output = managed_path(root, path)
    base = root / "question-bank" / ("sets" if key == "set" else "questions")
    if any(part in {".", ".."} for part in path.split("/")) or not output.resolve().is_relative_to(base.resolve()):
        raise ValueError("Managed resource escapes its allowed resource directory")
    expected = f"community.submission.issue-{number}" if key == "set" else f"q-issue-{number}-{key}"
    generated = resource["generated"]
    if (generated["id"] != expected or generated.get("submission", {}).get("issue_url") != f"https://github.com/{REPO}/issues/{number}"
            or (key != "set" and generated["submission"].get("item_key") != key)):
        raise ValueError("Managed resource identity mismatch")
    return output


def import_pr(api, number, *, revision_event=False, run_key="local"):
    root = Path.cwd()
    issue = api.api(f"issues/{number}")
    if "pull_request" in issue or "投稿-题集" not in {x["name"] for x in issue["labels"]}:
        raise ValueError("Not a set submission")
    revision = latest_revision(issue, api.pages(f"issues/{number}/comments?per_page=100"))
    # Load and validate the shared contract while still on the trusted checkout.
    validate_set_record(revision)
    pr = select_pr(api.pages("pulls?state=all&base=main&per_page=100"), number)
    if pr:
        for item in api.pages(f"pulls/{pr['number']}/files?per_page=100"):
            filename = item["filename"]
            if filename != f"question-bank/submissions/issue-{number}.json" and not re.fullmatch(
                    r"question-bank/(?:questions/[a-z0-9/_-]+\.yml|sets/[a-z0-9/_.-]+\.yml|assets/[a-zA-Z0-9/_.-]+)", filename):
                raise ValueError("PR contains unmanaged changes")
    if revision_event and pr is None:
        api.stage(number, "needs_info", revision["revision"], waitingFor="maintainer", note="已记录题集修订，等待维护者安排审核 PR．")
        return "Revision recorded"
    git("fetch", "--no-tags", "origin", "+refs/heads/main:refs/remotes/origin/main")
    git("config", "user.name", "github-actions[bot]")
    git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    state_path = f"question-bank/submissions/issue-{number}.json"
    previous_head = None
    if pr:
        branch, previous_head = pr["head"]["ref"], pr["head"]["sha"]
        git("check-ref-format", "--branch", branch)
        remote = git("ls-remote", "--heads", "origin", "refs/heads/" + branch)
        if not remote or remote.split()[0] != previous_head:
            raise ValueError("Open PR branch changed")
        git("fetch", "--no-tags", "origin", "refs/heads/" + branch)
        git("switch", "--detach", previous_head)
        record = metadata(pr.get("body", ""))
        if not record or record.get("type") != "quiz-set" or record["revision"] > revision["revision"]:
            raise ValueError("Invalid or stale set PR")
    else:
        git("switch", "--detach", "origin/main")
        if not re.fullmatch(r"[A-Za-z0-9-]{1,80}", run_key):
            raise ValueError("Invalid run key")
        branch = f"codex/quiz-set-submission/issue-{number}-r{revision['revision']}-{run_key}"
        remote = git("ls-remote", "--heads", "origin", "refs/heads/" + branch)
        if remote:
            git("fetch", "--no-tags", "origin", "refs/heads/" + branch)
            git("switch", "--detach", "FETCH_HEAD")
            previous_head = git("rev-parse", "HEAD")
    state_file = managed_path(root, state_path)
    saved = json.loads(state_file.read_text(encoding="utf-8")) if state_file.exists() else None
    if saved and saved.get("schemaVersion") != 2:
        raise ValueError("Unsupported managed set base")
    if pr and (not saved or digest(saved["payload"]) != record["fingerprint"]):
        raise ValueError("PR base fingerprint mismatch")
    if saved and saved["payload"]["revision"] > revision["revision"]:
        raise ValueError("Stale set revision")
    resources = documents(root, number, revision, saved)
    allowed = {state_path} | {r["path"] for r in resources.values()}
    if pr and any(item["filename"] not in allowed and not item["filename"].startswith("question-bank/assets/")
                  for item in api.pages(f"pulls/{pr['number']}/files?per_page=100")):
        raise ValueError("PR contains unmanaged changes")
    if pr and saved["payload"] == revision:
        api.stage(number, "importing", revision["revision"], pr=pr["html_url"], note="题集草稿 PR 正在审核．")
        return pr["html_url"]
    outputs = {}
    for key, resource in resources.items():
        output = checked_resource(root, number, key, resource)
        incoming = copy.deepcopy(resource["generated"])
        if output.exists():
            current = yaml.safe_load(output.read_text(encoding="utf-8"))
            if not saved or key not in saved["resources"]:
                raise ValueError("Existing resource has no reviewed import base")
            base = saved["resources"][key]["generated"]
            if current["id"] != incoming["id"] or current.get("submission", {}).get("issue_url") != incoming["submission"]["issue_url"]:
                raise ValueError("Current resource ownership differs")
            incoming["version"] = base["version"]
            merged = three_way(base, current, incoming)
            if content_fingerprint(merged) != content_fingerprint(current):
                merged.pop("review", None)
                merged["status"] = "retired" if current["status"] == "retired" else "draft"
                merged["version"] = current.get("version", 1) + (current["status"] in {"published", "retired"})
            incoming["version"] = merged.get("version", 1)
        else:
            merged = incoming
        resource["generated"] = incoming
        resource["id"] = incoming["id"]
        resource["fingerprint"] = content_fingerprint(incoming)
        outputs[output] = merged
    for output, document in outputs.items():
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(yaml.safe_dump(document, allow_unicode=True, sort_keys=False, width=120), encoding="utf-8")
    errors = validate_repository(root, include_drafts=True).errors
    if errors:
        raise ValueError("Set import failed validation:\n" + "\n".join(e.render() for e in errors[:10]))
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(json.dumps({"schemaVersion": 2, "payload": revision, "resources": resources}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    git("add", "--", *sorted(allowed))
    if git("diff", "--cached", "--name-only"):
        git("commit", "-m", f"content(question-bank): 同步题集投稿 #{number} 第 {revision['revision']} 版")
    latest = latest_revision(api.api(f"issues/{number}"), api.pages(f"issues/{number}/comments?per_page=100"))
    remote = git("ls-remote", "--heads", "origin", "refs/heads/" + branch)
    if latest != revision or (remote.split()[0] if remote else None) != previous_head:
        raise ValueError("Submission or remote branch changed before push")
    if not pr and previous_head is None and saved and saved["payload"] == revision and git("diff", "origin/main", "--name-only") == "":
        api.stage(number, "draft_ready", revision["revision"], note="本版题集及新题已入库，保留现有审核成果．")
        return "Already imported"
    git("push", "origin", "HEAD:refs/heads/" + branch)
    record = {"repo": REPO, "issue": number, "type": "quiz-set", "revision": revision["revision"], "fingerprint": digest(revision), "path": resources["set"]["path"]}
    body = f"Refs #{number}\n\n题集与新题独立审核；已发布资源的修订须审核后保持正式状态再合并．\n\n<!-- plw-quiz-set-pr:" + json.dumps(record, separators=(",", ":")) + " -->"
    if pr:
        api.api(f"pulls/{pr['number']}", method="PATCH", body={"body": body})
        subprocess.run(["gh", "pr", "ready", str(pr["number"]), "--undo"], check=True, capture_output=True)
        url = pr["html_url"]
    else:
        url = api.api("pulls", method="POST", body={"head": branch, "base": "main", "draft": True, "title": f"content(question-bank): 整理题集投稿 #{number}", "body": body})["html_url"]
    details = [{"type": "question", "question": doc["id"], "version": doc["version"], "stage": "reviewing" if doc["status"] == "published" else "draft_ready"}
               for path, doc in outputs.items() if "questions" in path.parts]
    api.stage(number, "importing", revision["revision"], pr=url, resources=details, note="题集与新题已整理为草稿 PR，等待人工审核．")
    return url


def complete(api, pr, record):
    if record.get("repo") != REPO or pr["head"]["repo"]["full_name"] != REPO or not pr.get("merged") or pr["base"]["ref"] != "main":
        return
    content = api.api("contents/" + record["path"] + "?ref=" + pr["merge_commit_sha"])
    document = yaml.safe_load(base64.b64decode(content["content"]))
    if document.get("id") != f"community.submission.issue-{record['issue']}" or document.get("submission", {}).get("issue_url") != f"https://github.com/{REPO}/issues/{record['issue']}":
        raise ValueError("Merged set differs from submission")
    api.stage(record["issue"], "draft_ready", record["revision"], pr=pr["html_url"], note="题集及新题已入库，正式发布以各资源审核和实际部署为准．")
