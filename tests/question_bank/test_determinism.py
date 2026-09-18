from pathlib import Path

import pytest

from scripts.question_bank.compiler import compile_repository
from scripts.question_bank.utils import tree_bytes


ROOT = Path(__file__).parents[2]


@pytest.mark.skip(reason="Pending Commit 5 Manifest v3 compiler cutover")
def test_compile_is_byte_deterministic(tmp_path: Path) -> None:
    first = tmp_path / "first"
    second = tmp_path / "second"
    compile_repository(ROOT, first)
    compile_repository(ROOT, second)
    assert tree_bytes(first) == tree_bytes(second)
