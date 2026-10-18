import io
import json
from pathlib import Path
from urllib.parse import urlsplit
import pytest
import yaml

from scripts.submissions.release import RELEASE_PATH, SITE_URL, build_release, verify_release

SHA = "a" * 40


def question(root, status):
    path = root / "question-bank/questions/inbox/q-issue-1.yml"
    path.parent.mkdir(parents=True)
    path.write_text(yaml.safe_dump({"id": "q-issue-1", "status": status, "stem": "Question", "solution": "Solution",
        "submission": {"issue_url": "https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/1", "revision": 2}}))


@pytest.mark.parametrize("status, stage", [("draft", "draft_ready"), ("published", "published"), ("retired", "withdrawn")])
def test_release_distinguishes_drafts_publications_and_withdrawal(tmp_path, status, stage):
    question(tmp_path, status)
    release = build_release(tmp_path, tmp_path / "site", sha=SHA)
    entry = release["entries"]["1"]
    assert entry["stage"] == stage
    assert ("url" in entry) == (stage == "published")
    assert entry["revision"] == 2
    assert json.loads((tmp_path / "site" / RELEASE_PATH).read_text(encoding="utf-8")) == release


def test_verification_requires_the_served_sha_and_matching_question_catalog(tmp_path):
    question(tmp_path, "published")
    release = build_release(tmp_path, tmp_path / "site", sha=SHA)
    calls = []
    catalog = [{"id": "q-issue-1", "contentFingerprint": release["entries"]["1"]["fingerprint"]}]
    def opener(request, **kwargs):
        calls.append(request.full_url)
        if RELEASE_PATH in request.full_url:
            return io.BytesIO(json.dumps(release).encode())
        if request.full_url.endswith("manifest.json"):
            return io.BytesIO(json.dumps({"catalogs": {"questions": "catalog/questions.json"}, "preview": False}).encode())
        if request.full_url.endswith("questions.json"):
            return io.BytesIO(json.dumps(catalog).encode())
        return io.BytesIO(b"<html>Question browser</html>")
    assert verify_release(SHA, opener=opener) == release
    with pytest.raises(ValueError, match="does not match"):
        verify_release("b" * 40, opener=opener)
    catalog.clear()
    with pytest.raises(ValueError, match="absent or differs"):
        verify_release(SHA, opener=opener)
    assert any("?q=q-issue-1" in call for call in calls)


def test_article_confirmation_requires_the_actual_page_version(tmp_path):
    page = tmp_path / "docs/notes/article.md"
    page.parent.mkdir(parents=True)
    page.write_text("---\nsource_issue: https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues/2\nsubmission_reviewed: true\nsubmission_revision: 3\n---\nBody\n", encoding="utf-8")
    resource = tmp_path / "site/notes/article/index.html"
    resource.parent.mkdir(parents=True)
    resource.write_text("<html><head></head><body>Body</body></html>", encoding="utf-8")
    release = build_release(tmp_path, tmp_path / "site", sha=SHA)
    rendered = resource.read_bytes()
    def opener(request, **kwargs):
        return io.BytesIO(json.dumps(release).encode() if RELEASE_PATH in request.full_url else rendered)
    assert verify_release(SHA, opener=opener) == release
    rendered = b"<html>Stale page</html>"
    with pytest.raises(ValueError, match="expected submission revision"):
        verify_release(SHA, opener=opener)
