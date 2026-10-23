from pathlib import Path

from bs4 import BeautifulSoup
import pytest

from scripts.question_bank.loader import load_tree


ROOT = Path(__file__).parents[2]


@pytest.fixture(scope="session")
def built_site(pytestconfig: pytest.Config) -> Path:
    value = pytestconfig.getoption("--built-site-dir")
    if not value:
        raise pytest.UsageError(
            "Production artifact tests require --built-site-dir=site; "
            "run corepack yarn site:build first."
        )
    site = (pytestconfig.invocation_params.dir / value).resolve()
    required = (
        "index.html",
        "_generated/question-bank/manifest.json",
        "pagefind/pagefind.js",
        "assets/stylesheets/mathjax.css",
    )
    missing = [relative for relative in required if not (site / relative).is_file()]
    if missing:
        raise pytest.UsageError(f"Incomplete production site at {site}: missing {', '.join(missing)}")
    return site


@pytest.fixture(scope="session")
def site_html(built_site: Path) -> dict[Path, tuple[str, BeautifulSoup]]:
    pages = {}
    for path in sorted(built_site.rglob("*.html")):
        html = path.read_text(encoding="utf-8")
        pages[path] = html, BeautifulSoup(html, "html.parser")
    return pages


@pytest.fixture(scope="session")
def question_bank_source_ids() -> dict[tuple[str, str], set[str]]:
    ids: dict[tuple[str, str], set[str]] = {}
    for kind in ("questions", "sets"):
        documents, issues = load_tree(ROOT / "question-bank" / kind)
        assert not issues
        for document in documents:
            key = kind, document.data.get("status")
            ids.setdefault(key, set()).add(str(document.data["id"]))
    return ids
