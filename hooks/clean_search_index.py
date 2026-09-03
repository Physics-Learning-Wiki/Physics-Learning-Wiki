from __future__ import annotations

import json
import re
from pathlib import Path

MATH_INLINE = re.compile(r"\\\((.+?)\\\)", re.DOTALL)
MATH_BLOCK = re.compile(r"\\\[(.+?)\\\]", re.DOTALL)
MATH_DOLLAR_BLOCK = re.compile(r"\$\$(.+?)\$\$", re.DOTALL)
MATH_DOLLAR_INLINE = re.compile(r"(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)", re.DOTALL)

FRAC_MACRO = re.compile(r"\\frac\{([^}]+)\}\{([^}]+)\}")
LATEX_MACROS = re.compile(r"\\[a-zA-Z]+\{([^}]+)\}")
LATEX_CMDS = re.compile(r"\\[a-zA-Z]+")

REPLACEMENTS = {
    "\\to": "->",
    "\\rightarrow": "->",
    "\\times": "*",
    "\\cdot": "*",
    "\\pm": "+/-",
    "\\le": "<=",
    "\\leq": "<=",
    "\\ge": ">=",
    "\\geq": ">=",
    "\\neq": "!=",
    "\\approx": "~",
    "\\sim": "~",
    "\\infty": "inf",
    "\\partial": "d",
}


def clean_math_content(inner: str) -> str:
    for k, v in REPLACEMENTS.items():
        inner = re.sub(re.escape(k) + r"(?![a-zA-Z])", v, inner)
    for _ in range(3):
        prev = inner
        inner = FRAC_MACRO.sub(r"\1/\2", inner)
        if inner == prev:
            break
    for _ in range(5):
        prev = inner
        inner = LATEX_MACROS.sub(r"\1", inner)
        if inner == prev:
            break
    inner = LATEX_CMDS.sub(lambda m: m.group(0)[1:], inner)
    inner = inner.replace("{", "").replace("}", "").replace("\\", " ")
    return inner.strip()


def clean_latex(text: str) -> str:
    if not text:
        return ""

    def repl(m: re.Match) -> str:
        cleaned = clean_math_content(m.group(1))
        return f" {cleaned} " if cleaned else " "

    text = MATH_BLOCK.sub(repl, text)
    text = MATH_INLINE.sub(repl, text)
    text = MATH_DOLLAR_BLOCK.sub(repl, text)
    text = MATH_DOLLAR_INLINE.sub(repl, text)
    return re.sub(r"\s+", " ", text).strip()


def process_search_index(index_path: Path) -> int:
    if not index_path.exists():
        return 0

    with open(index_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    docs = data.get("docs", [])
    modified_count = 0
    for doc in docs:
        changed = False
        if "title" in doc and doc["title"]:
            cleaned_title = clean_latex(doc["title"])
            if cleaned_title != doc["title"]:
                doc["title"] = cleaned_title
                changed = True
        if "text" in doc and doc["text"]:
            cleaned_text = clean_latex(doc["text"])
            if cleaned_text != doc["text"]:
                doc["text"] = cleaned_text
                changed = True
        if changed:
            modified_count += 1

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    return modified_count


def on_post_build(config, **kwargs):
    site_dir = Path(config.get("site_dir", "site"))
    index_path = site_dir / "search" / "search_index.json"
    cleaned = process_search_index(index_path)
    print(f"[clean_search_index] Cleaned LaTeX from {cleaned} docs in {index_path}")
