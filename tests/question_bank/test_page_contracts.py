from pathlib import Path

from scripts.question_bank.models import PageContract
from scripts.question_bank.page_contracts import (
    build_page_registry,
    discover_page_contracts,
    validate_page_contracts,
)

ROOT = Path(__file__).parents[2]


def test_pilot_page_contracts_have_six_anchored_objectives_each() -> None:
    pages, issues = discover_page_contracts(ROOT)
    assert not [issue for issue in issues if issue.severity == "error"]
    assert len(pages["mechanics.kinematics.linear-motion"].objectives) == 6
    assert len(pages["mechanics.dynamics.newton-laws"].objectives) == 6


def test_build_page_registry_detects_conflicting_global_objectives() -> None:
    p1 = PageContract(
        path=ROOT / "doc1.md",
        page_id="page.one",
        title="P1",
        url="p1/",
        objectives={"obj.shared": {"id": "obj.shared", "title": "Shared", "anchor": "a"}},
        assessments=[],
    )
    p2 = PageContract(
        path=ROOT / "doc2.md",
        page_id="page.two",
        title="P2",
        url="p2/",
        objectives={"obj.shared": {"id": "obj.shared", "title": "Shared", "anchor": "a"}},
        assessments=[],
    )
    issues = validate_page_contracts({"page.one": p1, "page.two": p2})
    assert any("conflicts" in issue.message for issue in issues)


def test_pilot_pages_have_assessments_configured() -> None:
    pages, issues = discover_page_contracts(ROOT)
    assert not [i for i in issues if i.severity == "error"]
    newton = pages["mechanics.dynamics.newton-laws"]
    assert len(newton.assessments) == 2
    assert all(a.placement == "footer" for a in newton.assessments)
    assert {a.set_id for a in newton.assessments} == {
        "mechanics.dynamics.newton-laws.quick",
        "mechanics.dynamics.newton-laws.full",
    }


def test_on_page_markdown_renders_inline_and_footer() -> None:
    from unittest.mock import MagicMock
    import hooks.question_bank as hqb

    hqb._context.clear()
    hqb._context.update({
        "preview": False,
        "manifest": {"sets": {}},
        "sets_catalog": {
            "set-published": {
                "id": "set-published",
                "title": "Published Set",
                "status": "published",
                "questionCount": 5,
                "feedbackMode": "immediate",
                "runnable": True,
            },
            "set-draft": {
                "id": "set-draft",
                "title": "Draft Set",
                "status": "draft",
                "questionCount": 3,
                "feedbackMode": "immediate",
                "runnable": True,
            }
        }
    })

    page = MagicMock()
    page.url = "mechanics/dynamics/test/"
    page.meta = {
        "page_id": "mechanics.dynamics.test",
        "assessments": [
            {"set": "set-published", "placement": "inline", "anchor": "concept-anchor", "title": "Inline Test"},
            {"set": "set-draft", "placement": "inline", "anchor": "concept-anchor", "title": "Draft Inline"},
            {"set": "set-published", "placement": "footer"},
        ]
    }

    markdown_input = "# Title\n\nIntro text\n\n<a id=\"concept-anchor\"></a>\n\n## Section 1\nContent"
    output = hqb.on_page_markdown(markdown_input, page, None, None)

    # 1. Inline root injected after anchor
    assert '<div class="plw-quiz-inline-root" data-set-id="set-published"' in output
    # 2. Draft set not leaked in production
    assert 'data-set-id="set-draft"' not in output
    # 3. Footer card rendered
    assert '<section class="plw-quiz-entry plw-quiz-footer-cards"' in output
    assert '<h3>Published Set</h3>' in output


