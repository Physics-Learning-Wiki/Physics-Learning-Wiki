import json
import runpy
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
GENERATE_NAV = runpy.run_path(REPOSITORY_ROOT / "scripts" / "generate-nav.py")


def test_generated_navigation_omits_mkdocs_excluded_internal_directories(tmp_path: Path) -> None:
    docs = tmp_path / "docs"
    (docs / "public").mkdir(parents=True)
    (docs / "adr").mkdir()
    (docs / "superpowers" / "plans").mkdir(parents=True)
    (docs / "public" / "index.md").write_text("# Public topic\n", encoding="utf-8")
    (docs / "public" / "lesson.md").write_text("# Public lesson\n", encoding="utf-8")
    (docs / "adr" / "ADR-internal.md").write_text("# Internal decision\n", encoding="utf-8")
    (docs / "superpowers" / "plans" / "internal-plan.md").write_text("# Internal plan\n", encoding="utf-8")

    tree = GENERATE_NAV["generate_nav_tree_json"](docs)
    serialized = json.dumps(tree, ensure_ascii=False)

    assert "Public topic" in serialized
    assert "Public lesson" in serialized
    assert "adr" not in serialized
    assert "ADR-internal" not in serialized
    assert "superpowers" not in serialized
    assert "Internal plan" not in serialized
