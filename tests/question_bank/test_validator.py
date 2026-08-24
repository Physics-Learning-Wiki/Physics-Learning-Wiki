from pathlib import Path

import pytest

from scripts.question_bank.loader import load_json, load_yaml
from scripts.question_bank.media import question_content_fingerprint, validate_assets
from scripts.question_bank.page_contracts import discover_page_contracts
from scripts.question_bank.validator import validate_question, validate_repository

ROOT = Path(__file__).parents[2]


@pytest.mark.parametrize(
    "name",
    ["single-choice.yml", "multiple-choice.yml", "true-false.yml", "numeric.yml"],
)
def test_valid_question_fixtures(name: str) -> None:
    document, load_issues = load_yaml(
        ROOT / "question-bank" / "fixtures" / "valid" / name
    )
    pages, page_issues = discover_page_contracts(ROOT)
    schema = load_json(ROOT / "question-bank" / "schemas" / "question.schema.json")
    assert document is not None
    assert not load_issues
    assert not page_issues
    assert not validate_question(document, schema, pages)


def test_dangerous_html_is_rejected() -> None:
    path = ROOT / "question-bank" / "fixtures" / "valid" / "single-choice.yml"
    document, _ = load_yaml(path)
    assert document is not None
    document.data["stem"] = "<script>alert(1)</script>"
    pages, _ = discover_page_contracts(ROOT)
    schema = load_json(ROOT / "question-bank" / "schemas" / "question.schema.json")
    assert any(
        "dangerous" in issue.message
        for issue in validate_question(document, schema, pages)
    )


def test_zero_relative_tolerance_is_rejected() -> None:
    path = ROOT / "question-bank" / "fixtures" / "valid" / "numeric.yml"
    document, _ = load_yaml(path)
    assert document is not None
    document.data["answer"]["value"] = 0
    document.data["answer"]["tolerance"]["type"] = "relative"
    pages, _ = discover_page_contracts(ROOT)
    schema = load_json(ROOT / "question-bank" / "schemas" / "question.schema.json")
    assert any(
        "absolute" in issue.message
        for issue in validate_question(document, schema, pages)
    )


def test_release_allows_explicit_construction_pages() -> None:
    normal = validate_repository(ROOT)
    release = validate_repository(ROOT, release=True)
    assert normal.ok
    assert normal.warnings
    assert release.ok
    assert release.warnings


def test_published_question_requires_current_three_dimensional_review() -> None:
    path = ROOT / "question-bank" / "fixtures" / "valid" / "single-choice.yml"
    document, _ = load_yaml(path)
    assert document is not None
    document.data["status"] = "published"
    stale = {
        "github": "Leafuke",
        "reviewed_on": "2026-07-29",
        "question_version": 1,
        "content_fingerprint": "sha256:" + "0" * 64,
    }
    document.data["review"] = {
        "physics": [stale],
        "pedagogy": [stale],
        "copyright": [stale],
    }
    pages, _ = discover_page_contracts(ROOT)
    schema = load_json(ROOT / "question-bank" / "schemas" / "question.schema.json")
    issues = validate_question(document, schema, pages, ROOT)
    assert (
        sum(
            "current version and content fingerprint" in issue.message
            for issue in issues
        )
        == 3
    )


def test_one_human_may_sign_all_three_review_dimensions() -> None:
    document, _ = load_yaml(
        ROOT / "question-bank" / "fixtures" / "valid" / "single-choice.yml"
    )
    assert document is not None
    document.data["status"] = "published"
    attestation = {
        "github": "Leafuke",
        "reviewed_on": "2026-07-29",
        "question_version": document.data["version"],
        "content_fingerprint": question_content_fingerprint(document.data, ROOT),
    }
    document.data["review"] = {
        "physics": [attestation],
        "pedagogy": [attestation],
        "copyright": [attestation],
    }
    pages, _ = discover_page_contracts(ROOT)
    schema = load_json(ROOT / "question-bank" / "schemas" / "question.schema.json")
    issues = validate_question(document, schema, pages, ROOT)
    assert not [issue for issue in issues if issue.severity == "error"]


def test_published_question_cannot_keep_external_media_reference() -> None:
    document, _ = load_yaml(
        ROOT / "question-bank" / "fixtures" / "valid" / "single-choice.yml"
    )
    assert document is not None
    document.data["status"] = "published"
    document.data["submission"] = {
        "external_media": [
            {
                "url": "https://example.com/reference.png",
                "alt": "参考图",
                "rights_note": "仅供维护者本地化",
            }
        ]
    }
    pages, _ = discover_page_contracts(ROOT)
    schema = load_json(ROOT / "question-bank" / "schemas" / "question.schema.json")
    issues = validate_question(document, schema, pages, ROOT)
    assert any(
        issue.field == "submission" and "should not be valid" in issue.message
        for issue in issues
    )


def test_svg_fingerprint_is_line_ending_independent(tmp_path: Path) -> None:
    assets = tmp_path / "question-bank" / "assets"
    assets.mkdir(parents=True)

    svg = assets / "diagram.svg"
    question = {
        "id": "test-svg",
        "version": 1,
        "assets": [{"id": "diagram", "path": "diagram.svg"}],
    }

    svg.write_bytes(b'<svg xmlns="http://www.w3.org/2000/svg">\n</svg>\n')
    lf_fingerprint = question_content_fingerprint(question, tmp_path)

    svg.write_bytes(b'<svg xmlns="http://www.w3.org/2000/svg">\r\n</svg>\r\n')
    crlf_fingerprint = question_content_fingerprint(question, tmp_path)

    assert crlf_fingerprint == lf_fingerprint


def test_managed_media_rejects_unsafe_files_and_missing_alt(tmp_path: Path) -> None:
    assets = tmp_path / "question-bank" / "assets"
    assets.mkdir(parents=True)
    (assets / "danger.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        encoding="utf-8",
    )
    (assets / "fake.png").write_bytes(b"not a png")
    question = {
        "assets": [
            {"id": "danger", "path": "danger.svg"},
            {"id": "fake", "path": "fake.png"},
            {"id": "escape", "path": "../secret.svg"},
        ],
        "stem": "![](asset:danger) ![伪造图片](asset:fake) ![越界](asset:escape)",
    }
    messages = [
        issue.message
        for issue in validate_assets(question, tmp_path / "question.yml", tmp_path)
    ]
    assert any("active or external" in message for message in messages)
    assert any("PNG signature" in message for message in messages)
    assert any("escapes" in message for message in messages)
    assert any("alternative text" in message for message in messages)
