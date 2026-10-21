"""Set imports use a real Git remote and preserve independent resource identities."""
import copy
import io
import json
from types import SimpleNamespace

import pytest
import yaml

from scripts.submissions import sets
from scripts.submissions.contract import validate_quiz_set
from scripts.submissions.release import build_release, verify_release, verify_removed, RELEASE_PATH
from scripts.question_bank.media import question_content_fingerprint
from scripts.submissions.records import block
from scripts.submissions.amendments import check_amendments
from scripts.submissions.github import GitHub
from scripts.submissions.records import blocks
from test_question_submission_pr import API, git, repository

KEY1 = "11111111-1111-4111-8111-111111111111"
KEY2 = "22222222-2222-4222-8222-222222222222"


def record():
    return {"schemaVersion": 1, "submissionId": KEY1, "revision": 1, "type": "quiz-set",
            "licenseConsent": True, "licenseVersion": "CC-BY-SA-4.0", "sourceDeclaration": {"kind": "original", "note": "编排"},
            "payload": {"title": "训练", "content": "基础训练．", "attribution": "编排者", "quizSet": {
                "tags": ["基础"], "feedbackMode": "deferred", "selection": {"type": "fixed", "order": "fixed", "items": [
                    {"kind": "new", "clientId": KEY1}, {"kind": "new", "clientId": KEY2}]},
                "newQuestions": [{"clientId": key, "question": {"type": "true_false", "stem": "题目 " + key,
                    "solution": "解析．", "answer": {"value": False}, "attribution": "题目作者"},
                    "sourceDeclaration": {"kind": "original", "note": "独立原创"}} for key in (KEY1, KEY2)]}}}


@pytest.fixture
def set_repository(repository, monkeypatch):
    root, api = repository
    api.revisions[11] = record()
    initial = copy.deepcopy(api.revisions[11])
    history = {}
    original = api.issue
    def issue(number):
        result = original(number)
        result["labels"] = [{"name": "投稿-题集"}]
        result["body"] = block("plw-submission-v1", initial)
        return result
    api.issue = issue
    original_pages = api.pages
    def pages(path):
        if "/comments" in path:
            current = api.revisions[11]
            if current["revision"] > 1:
                history[current["revision"]] = copy.deepcopy(current)
            return [{"id": revision, "user": {"id": 8}, "body": block("plw-submission-v1", value)} for revision, value in sorted(history.items())]
        return original_pages(path)
    api.pages = pages
    monkeypatch.setattr(sets, "validate_repository", lambda *a, **k: SimpleNamespace(errors=[], data=SimpleNamespace(questions=[])))
    return root, api


def test_reorder_removal_retries_and_maintainer_edits(set_repository):
    root, api = set_repository
    sets.import_pr(api, 11, run_key="one")
    head = git(api.remote, "rev-parse", api.prs[0]["head"]["ref"])
    sets.import_pr(api, 11, run_key="one")
    assert git(api.remote, "rev-parse", api.prs[0]["head"]["ref"]) == head
    paths = sorted((root / "question-bank/questions/inbox").glob("*.yml"))
    assert len(paths) == 2
    first = yaml.safe_load(paths[0].read_text(encoding="utf-8"))
    first["hints"] = ["维护者补充"]
    paths[0].write_text(yaml.safe_dump(first, allow_unicode=True), encoding="utf-8")
    git(root, "add", "."); git(root, "commit", "-m", "Human edit"); git(root, "push", "origin", "HEAD:" + api.prs[0]["head"]["ref"])
    api.revisions[11]["revision"] = 2
    source = api.revisions[11]["payload"]["quizSet"]
    source["selection"]["items"].reverse()
    source["newQuestions"][0]["question"]["solution"] = "新版解析．"
    sets.import_pr(api, 11, revision_event=True)
    assert yaml.safe_load(paths[0].read_text(encoding="utf-8"))["hints"] == ["维护者补充"]
    document = yaml.safe_load((root / "question-bank/sets/inbox/issue-11.yml").read_text(encoding="utf-8"))
    assert document["selection"]["questions"] == [f"q-issue-11-{KEY2}", f"q-issue-11-{KEY1}"]
    source["selection"]["items"].pop(); source["newQuestions"].pop(0); api.revisions[11]["revision"] = 3
    sets.import_pr(api, 11, revision_event=True)
    assert len(list((root / "question-bank/questions/inbox").glob("*.yml"))) == 2


def test_failed_pr_creation_resumes_and_conflicts_do_not_push(set_repository):
    root, api = set_repository
    api.fail_create = True
    with pytest.raises(RuntimeError): sets.import_pr(api, 11, run_key="retry")
    api.fail_create = False
    sets.import_pr(api, 11, run_key="retry")
    path = root / "question-bank/questions/inbox" / f"q-issue-11-{KEY1}.yml"
    data = yaml.safe_load(path.read_text(encoding="utf-8")); data["solution"] = "人工修改．"
    path.write_text(yaml.safe_dump(data, allow_unicode=True), encoding="utf-8")
    git(root, "add", "."); git(root, "commit", "-m", "Human"); git(root, "push", "origin", "HEAD:" + api.prs[0]["head"]["ref"])
    before = git(api.remote, "rev-parse", api.prs[0]["head"]["ref"])
    api.revisions[11]["revision"] = 2
    api.revisions[11]["payload"]["quizSet"]["newQuestions"][0]["question"]["solution"] = "作者修改．"
    with pytest.raises(ValueError, match="conflict"): sets.import_pr(api, 11, revision_event=True)
    assert git(api.remote, "rev-parse", api.prs[0]["head"]["ref"]) == before


def test_published_set_amendment_keeps_unchanged_question_reviews(set_repository):
    root, api = set_repository
    sets.import_pr(api, 11, run_key="one")
    for path in list((root / "question-bank/questions/inbox").glob("*.yml")) + list((root / "question-bank/sets/inbox").glob("*.yml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")); data["status"] = "published"
        if "questions" in path.parts: data["review"] = {"physics": ["preserve"]}
        path.write_text(yaml.safe_dump(data, allow_unicode=True), encoding="utf-8")
    git(root, "add", "."); git(root, "commit", "-m", "Publish reviewed resources"); git(root, "push", "origin", "HEAD:main")
    api.prs[0]["state"] = "closed"
    api.revisions[11]["revision"] = 2; api.revisions[11]["payload"]["title"] = "新版题集"
    sets.import_pr(api, 11, run_key="two")
    document = yaml.safe_load((root / "question-bank/sets/inbox/issue-11.yml").read_text(encoding="utf-8"))
    assert document["version"] == 2 and document["status"] == "draft"
    for path in (root / "question-bank/questions/inbox").glob("*.yml"):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert data["version"] == 1 and data["status"] == "published" and data["review"] == {"physics": ["preserve"]}
    with pytest.raises(ValueError, match="cannot be replaced by a draft"):
        check_amendments(root, "origin/main")


@pytest.mark.parametrize("bad", ["duplicate", "missing", "source", "unsafe"])
def test_set_contract_rejects_invalid_references_and_sources(bad):
    source = record()["payload"]["quizSet"]
    if bad == "duplicate": source["selection"]["items"].append(source["selection"]["items"][0])
    if bad == "missing": source["newQuestions"].pop()
    if bad == "source": source["newQuestions"][0]["sourceDeclaration"] = {"kind": "adapted", "note": "改编"}
    if bad == "unsafe": source["newQuestions"][0]["question"]["stem"] = '<script>alert(1)</script>'
    with pytest.raises(ValueError): validate_quiz_set(source)


def test_partial_publication_and_set_bundle_verification(tmp_path, monkeypatch):
    monkeypatch.setattr(sets, "validate_repository", lambda *a, **k: SimpleNamespace(errors=[], data=SimpleNamespace(questions=[])))
    resources = sets.documents(tmp_path, 11, record())
    for resource in resources.values():
        path = tmp_path / resource["path"]; path.parent.mkdir(parents=True, exist_ok=True)
        resource["generated"]["status"] = "published" if resource is not resources["set"] else "draft"
        path.write_text(yaml.safe_dump(resource["generated"], allow_unicode=True), encoding="utf-8")
    release = build_release(tmp_path, tmp_path / "site", sha="a" * 40)
    assert release["entries"]["11"]["stage"] == "draft_ready"
    assert all(q["stage"] == "published" for q in release["entries"]["11"]["resources"])
    document = resources["set"]["generated"]; document["status"] = "published"
    (tmp_path / resources["set"]["path"]).write_text(yaml.safe_dump(document, allow_unicode=True), encoding="utf-8")
    release = build_release(tmp_path, tmp_path / "site", sha="a" * 40)
    questions = [{"id": r["generated"]["id"], "contentFingerprint": question_content_fingerprint(r["generated"], tmp_path)}
                 for key, r in resources.items() if key != "set"]
    manifest = {"preview": False, "catalogs": {"sets": "sets.json", "questions": "questions.json"},
                "sets": {document["id"]: {"status": "published", "bundle": "bundle.json"}}}
    catalogs = [{"id": document["id"], "status": "published", "runnable": True}]
    bundle = {"preview": False, "runnable": True, "set": document, "questions": questions}
    def opener(request, **kwargs):
        url = request.full_url
        value = release if RELEASE_PATH in url else manifest if "manifest.json" in url else catalogs if url.endswith("sets.json") else questions if url.endswith("questions.json") else bundle if url.endswith("bundle.json") else None
        return io.BytesIO(json.dumps(value).encode() if value is not None else b"<html></html>")
    assert verify_release("a" * 40, opener=opener) == release
    with pytest.raises(ValueError, match="still"): verify_removed(release["entries"]["11"], opener=opener)
    bundle["set"] = {**document, "title": "陈旧缓存"}
    with pytest.raises(ValueError, match="differs"): verify_release("a" * 40, opener=opener)


def test_question_progress_cannot_reactivate_a_withdrawn_primary_set():
    comments = [{"id": 1, "performed_via_github_app": {"slug": "github-actions"}, "body": block("plw-submission-status-v1", {
        "revision": 1, "stage": "withdrawn", "sourceSha": "a" * 40})}]
    posts = []
    class StatusAPI(GitHub):
        def api(self, path, method="GET", body=None):
            if path == "issues/11":
                return {"labels": [{"name": "投稿状态:withdrawn"}], "body": block("plw-submission-v1", record())}
            if method == "POST" and path.endswith("/comments"):
                posts.append(body)
            return {}
        def pages(self, path): return comments
    StatusAPI().stage(11, "importing", 1, resources=[{"type": "question", "stage": "draft_ready", "version": 2}])
    observation = blocks(posts[-1]["body"], "plw-submission-status-v1")[-1]
    assert observation["stage"] == "withdrawn" and observation["resources"][0]["version"] == 2
    assert "sourceSha" not in observation


def test_managed_set_path_cannot_escape_into_other_repository_directories(tmp_path):
    resource = {"path": "question-bank/sets/../../escape.yml", "generated": {
        "id": "community.submission.issue-11", "submission": {"issue_url": "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/11"}}}
    with pytest.raises(ValueError, match="allowed resource directory"):
        sets.checked_resource(tmp_path, 11, "set", resource)


@pytest.mark.parametrize("mixed", [False, True])
def test_existing_question_selection_is_read_only_and_can_mix_with_new_questions(tmp_path, monkeypatch, mixed):
    known = SimpleNamespace(data={"id": "q-000001", "status": "published"})
    monkeypatch.setattr(sets, "validate_repository", lambda *a, **k: SimpleNamespace(data=SimpleNamespace(questions=[known])))
    revision = record(); source = revision["payload"]["quizSet"]
    source["newQuestions"] = source["newQuestions"][:1] if mixed else []
    source["selection"]["items"] = [{"kind": "existing", "questionId": "q-000001"}] + ([{"kind": "new", "clientId": KEY1}] if mixed else [])
    original = copy.deepcopy(known.data)
    resources = sets.documents(tmp_path, 11, revision)
    expected = ["q-000001"] + ([f"q-issue-11-{KEY1}"] if mixed else [])
    assert resources["set"]["generated"]["selection"]["questions"] == expected
    assert len(resources) == (2 if mixed else 1) and known.data == original


@pytest.mark.parametrize("status", ["draft", "retired", None])
def test_import_refuses_unavailable_existing_questions(tmp_path, monkeypatch, status):
    known = [SimpleNamespace(data={"id": "q-000001", "status": status})] if status else []
    monkeypatch.setattr(sets, "validate_repository", lambda *a, **k: SimpleNamespace(data=SimpleNamespace(questions=known)))
    revision = record(); revision["payload"]["quizSet"]["selection"]["items"] = [{"kind": "existing", "questionId": "q-000001"}]
    with pytest.raises(ValueError, match="not published"):
        sets.documents(tmp_path, 11, revision)
