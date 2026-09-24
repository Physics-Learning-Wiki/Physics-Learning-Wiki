import importlib.util
from pathlib import Path


CHECK_FORMAT_PATH = Path(__file__).parents[1] / "scripts" / "check-format.py"
CHECK_FORMAT_SPEC = importlib.util.spec_from_file_location(
    "check_format", CHECK_FORMAT_PATH
)
assert CHECK_FORMAT_SPEC is not None and CHECK_FORMAT_SPEC.loader is not None
CHECK_FORMAT_MODULE = importlib.util.module_from_spec(CHECK_FORMAT_SPEC)
CHECK_FORMAT_SPEC.loader.exec_module(CHECK_FORMAT_MODULE)
check_file = CHECK_FORMAT_MODULE.check_file


def _check_text(tmp_path: Path, text: str) -> list[str]:
    path = tmp_path / "sample.md"
    path.write_text(text, encoding="utf-8")
    return check_file(path)


def test_balanced_display_math_delimiters_are_accepted(tmp_path: Path) -> None:
    issues = _check_text(tmp_path, "$$\nx = 1\n$$\n")

    assert not any("$$ 不配对" in issue for issue in issues)


def test_unpaired_display_math_delimiter_is_reported(tmp_path: Path) -> None:
    issues = _check_text(tmp_path, "正文中出现未配对的 $$ 定界符。\n")

    assert any("$$ 不配对" in issue for issue in issues)


def test_inline_code_dollar_delimiters_are_ignored(tmp_path: Path) -> None:
    issues = _check_text(tmp_path, "代码示例 `$$` 不表示行间公式。\n")

    assert not any("$$ 不配对" in issue for issue in issues)


def test_escaped_dollar_delimiters_are_ignored(tmp_path: Path) -> None:
    issues = _check_text(
        tmp_path, r"字面美元符号 \$$ 不表示公式。以及单字符 \$。" + "\n"
    )

    assert not any("$$ 不配对" in issue for issue in issues)
