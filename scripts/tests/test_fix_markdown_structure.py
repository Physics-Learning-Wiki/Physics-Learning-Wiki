from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "fix-markdown-structure.py"
SPEC = importlib.util.spec_from_file_location("fix_markdown_structure", SCRIPT)
assert SPEC and SPEC.loader
mod = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = mod
SPEC.loader.exec_module(mod)


class FixMarkdownStructureTests(unittest.TestCase):
    def fix(self, text: str, soft: bool = False):
        return mod.process_text(text, report_soft_breaks=soft)

    def test_one_line_display_math(self):
        src = "前文\n$$ E = mc^2 $$\n后文\n"
        got = self.fix(src)
        self.assertEqual(got.text, "前文\n\n$$\nE = mc^2\n$$\n\n后文\n")
        self.assertTrue(got.changed)

    def test_multiline_math_gets_blank_boundaries(self):
        src = "前文\n$$\nx+y\n$$\n后文\n"
        got = self.fix(src)
        self.assertEqual(got.text, "前文\n\n$$\nx+y\n$$\n\n后文\n")

    def test_fenced_code_is_untouched(self):
        src = "```markdown\ntext\n$$ x $$\n- item\n```\n"
        got = self.fix(src)
        self.assertEqual(got.text, src)
        self.assertFalse(got.changed)

    def test_inline_code_is_untouched(self):
        src = "这里是 `$$ x $$` 示例。\n"
        got = self.fix(src)
        self.assertEqual(got.text, src)

    def test_embedded_math_is_report_only(self):
        src = "文本 $$ x+y $$ 仍在文本中\n"
        got = self.fix(src)
        self.assertEqual(got.text, src)
        self.assertIn("MATH_EMBEDDED", [f.code for f in got.findings])

    def test_unmatched_math_disables_math_rewrite(self):
        src = "前文\n$$ x+y\n后文\n"
        got = self.fix(src)
        self.assertEqual(got.text, src)
        self.assertIn("MATH_UNMATCHED", [f.code for f in got.findings])

    def test_missing_blank_before_unordered_list(self):
        src = "说明如下：\n- 第一项\n- 第二项\n"
        got = self.fix(src)
        self.assertEqual(got.text, "说明如下：\n\n- 第一项\n- 第二项\n")

    def test_missing_blank_before_ordered_list(self):
        src = "步骤如下：\n1. 第一项\n2. 第二项\n"
        got = self.fix(src)
        self.assertEqual(got.text, "步骤如下：\n\n1. 第一项\n2. 第二项\n")

    def test_admonition_list_keeps_indent(self):
        src = '???+ example "例题"\n    一段说明：\n    - **实部**：内容\n    - **虚部**：内容\n'
        got = self.fix(src)
        self.assertEqual(
            got.text,
            '???+ example "例题"\n    一段说明：\n    \n    - **实部**：内容\n    - **虚部**：内容\n',
        )

    def test_blockquote_blank_keeps_quote(self):
        src = "> 说明如下：\n> - 第一项\n> - 第二项\n"
        got = self.fix(src)
        self.assertEqual(got.text, "> 说明如下：\n>\n> - 第一项\n> - 第二项\n")

    def test_child_list_not_separated_from_parent(self):
        src = "- 父项\n  - 子项\n"
        got = self.fix(src)
        self.assertEqual(got.text, src)

    def test_thematic_break_not_treated_as_list(self):
        src = "前文\n---\n后文\n"
        got = self.fix(src)
        self.assertEqual(got.text, src)

    def test_crlf_is_preserved(self):
        src = "前文\r\n$$ x $$\r\n后文\r\n"
        got = self.fix(src)
        self.assertIn("\r\n", got.text)
        self.assertNotIn("\n", got.text.replace("\r\n", ""))

    def test_bom_is_preserved(self):
        src = "\ufeff前文\n- 项目\n"
        got = self.fix(src)
        self.assertTrue(got.text.startswith("\ufeff"))

    def test_soft_break_is_report_only(self):
        src = "第一行\n第二行\n"
        got = self.fix(src, soft=True)
        self.assertEqual(got.text, src)
        self.assertIn("SOFT_BREAK", [f.code for f in got.findings])

    def test_idempotent(self):
        src = "说明：\n- 项目\n\n$$ x+y $$\n"
        once = self.fix(src).text
        twice = self.fix(once).text
        self.assertEqual(once, twice)


if __name__ == "__main__":
    unittest.main()
