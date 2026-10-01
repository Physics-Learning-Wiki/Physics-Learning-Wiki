"""Read-only checks for editorial terminology; contextual alternatives are warnings."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Rule:
    id: str
    level: str
    pattern: str
    suggestion: str


RULES = (
    Rule("T001", "error", "坚直", "竖直"),
    Rule("T002", "error", "هر", "每一点；检查混入的字符"),
    Rule("T003", "error", r"绝热指数\s*(?:[（(]\s*泊松比\s*[）)]|(?:又称|也称|即|就是)\s*泊松比)", "绝热指数（比热容比）；泊松比属于弹性力学"),
    Rule("T004", "error", "冲量参数", "碰撞参数（瞄准参数）"),
    Rule("T005", "error", "波恩诠释", "玻恩诠释"),
    Rule("T006", "error", r"(?<!洛)施密特（Schmidt）的诘难", "洛施密特（Loschmidt）的可逆性诘难"),
    Rule("T007", "error", "则称其实调和函数", "则称其为实调和函数"),
    Rule("T008", "error", "热容比比热容", "比热容比"),
    Rule("T101", "warning", "几率", "正文主词为概率；别名解释可保留"),
    Rule("T102", "warning", "物理量.*常数|普朗克常数|玻尔兹曼常数|气体常数", "核对是否应称物理常量；数学常数及固定名称保留"),
    Rule("T103", "warning", "热容量|定体热容|状态方程|等容过程|摩尔数|粘滞", "核对热学主词：热容、定容热容、物态方程、等体过程、物质的量、黏滞"),
    Rule("T104", "warning", r"向量[^\n]*矢量|矢量[^\n]*向量", "核对是否同一概念无说明换词；跨语境与别名解释允许并存"),
    Rule("T105", "warning", r"(?<!运)算符[^\n]*算子|算子[^\n]*(?<!运)算符", "核对微分算子与量子算符的语境；不要机械替换运算符"),
)

INVENTORY_TERMS = (
    "向量", "矢量", "算符", "算子", "本征", "特征", "固有", "质点系", "质点组",
    "惯性系", "惯性参考系", "热容", "热容量", "物态方程", "状态方程", "蒸气", "蒸汽",
    "等体", "等容", "定容", "定体", "物质的量", "摩尔数", "黏滞", "粘滞",
    "概率", "几率", "常量", "常数", "范德瓦尔斯", "范德瓦耳斯", "菲涅尔", "菲涅耳",
    "海森堡", "海森伯", "费曼", "费恩曼", "史瓦西", "Schwarzschild", "约当", "若当", "若尔当",
)


@dataclass(frozen=True)
class Finding:
    file: str
    line: int
    column: int
    rule: str
    level: str
    match: str
    suggestion: str


class ConfigLoader(yaml.SafeLoader):
    pass


ConfigLoader.add_constructor(None, lambda loader, node: loader.construct_scalar(node))


def excluded_patterns(root: Path) -> list[str]:
    config = root / "mkdocs.yml"
    if not config.exists():
        raise ValueError(f"配置不存在：{config}")
    data = yaml.load(config.read_text(encoding="utf-8"), Loader=ConfigLoader)
    if not isinstance(data, dict) or not isinstance(data.get("exclude_docs", ""), str):
        raise ValueError("mkdocs.yml 的 exclude_docs 必须是文本")
    return [line.strip() for line in data.get("exclude_docs", "").splitlines() if line.strip() and not line.lstrip().startswith("#")]


def is_excluded(path: Path, root: Path, patterns: list[str]) -> bool:
    try:
        relative = path.relative_to(root / "docs").as_posix()
    except ValueError:
        return False
    return any(relative.startswith(p.rstrip("/") + "/") if p.endswith("/") else Path(relative).match(p) for p in patterns)


def masked_prose(text: str) -> str:
    """Keep offsets stable while hiding syntax and content that is not prose."""
    chars = list(text)

    def hide(start: int, end: int) -> None:
        for i in range(start, end):
            if chars[i] != "\n":
                chars[i] = " "

    fence = None
    offset = 0
    prose_owner_indent = None
    indented_code = False
    previous_blank = True
    frontmatter = text.startswith("---\n") or text.startswith("---\r\n")
    for index, line in enumerate(text.splitlines(keepends=True)):
        stripped = line.strip()
        indent = len(line) - len(line.lstrip(" "))
        if stripped and prose_owner_indent is not None and indent <= prose_owner_indent:
            prose_owner_indent = None
        if re.match(r"\s*(?:\?\?\?\+?|!!!)\s+\w+|\s*(?:[-*+] |\d+[.)] )", line):
            prose_owner_indent = indent
        if stripped and indent < 4:
            indented_code = False
        if indent >= 4 and stripped and prose_owner_indent is None and (previous_blank or indented_code):
            indented_code = True
            hide(offset, offset + len(line))
        if frontmatter:
            # Metadata is prose only in description/title, never author or keys.
            if index > 0 and stripped == "---":
                frontmatter = False
                hide(offset, offset + len(line))
            elif not re.match(r"\s*(description|title):", line):
                hide(offset, offset + len(line))
        match = re.match(r"\s*(`{3,}|~{3,})", line)
        if fence:
            hide(offset, offset + len(line))
            if match and match[1][0] == fence[0] and len(match[1]) >= len(fence) and stripped == match[1]:
                fence = None
        elif match:
            fence = match[1]
            hide(offset, offset + len(line))
        offset += len(line)
        previous_blank = not stripped
    prose = "".join(chars)
    patterns = (
        r"<!--.*?-->", r"\{#[^}\n]+\}", r"(`+)(?:(?!\1).)*?\1",
        r"(?<!\\)\$\$.*?(?<!\\)\$\$", r"(?<![\\$])\$(?!\$)(?:\\.|[^$])*?(?<!\\)\$",
        r"\\\(.*?\\\)", r"\\\[.*?\\\]",
        r"(?<=\]\()(?:(?:[^()\n]|\([^()\n]*\))*)(?=\))",
        r"(?m)^\s*\[[^\]]+\]:\s*\S+.*$", r"https?://[^\s<>]+", r"<[^>]+>",
    )
    for pattern in patterns:
        for match in re.finditer(pattern, prose, re.DOTALL):
            hide(match.start(), match.end())
        prose = "".join(chars)
    return prose


def exemptions(text: str) -> dict[int, set[str]]:
    """A justified comment exempts only the immediately following source line."""
    result = {}
    for number, line in enumerate(text.splitlines(), 1):
        match = re.fullmatch(r"\s*<!-- terminology-ignore: (T\d{3}(?:,T\d{3})*) -- (\S.*?) -->\s*", line)
        if match:
            ids = set(match[1].split(","))
            if not ids <= {rule.id for rule in RULES}:
                raise ValueError(f"第 {number} 行豁免包含未知规则")
            result[number + 1] = ids
        elif "terminology-ignore:" in line:
            raise ValueError(f"第 {number} 行豁免必须写规则编号及理由")
    return result


def check_file(path: Path) -> list[Finding]:
    text = path.read_text(encoding="utf-8-sig")
    prose = masked_prose(text)
    ignored = exemptions(text)
    result = []
    for rule in RULES:
        for match in re.finditer(rule.pattern, prose):
            line = prose.count("\n", 0, match.start()) + 1
            if rule.id in ignored.get(line, set()):
                continue
            column = match.start() - prose.rfind("\n", 0, match.start())
            result.append(Finding(str(path), line, column, rule.id, rule.level, match[0], rule.suggestion))
    return sorted(result, key=lambda item: (item.line, item.column, item.rule))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="Markdown 文件或目录；默认公开 docs")
    parser.add_argument("--root", type=Path, default=ROOT, help="包含 mkdocs.yml 的仓库根目录")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--inventory", action="store_true", help="输出可重复的词形计数与位置 JSON，不判断对错")
    args = parser.parse_args(argv)
    try:
        root = args.root.resolve()
        patterns = excluded_patterns(root)
        files: set[Path] = set()
        for raw in args.paths or [str(root / "docs")]:
            path = Path(raw).resolve()
            if not path.exists():
                raise ValueError(f"输入不存在：{path}")
            if path.is_dir():
                files.update(path.rglob("*.md"))
            elif path.suffix.lower() == ".md":
                files.add(path)
            else:
                raise ValueError(f"输入必须是 Markdown 文件或目录：{path}")
        files = {p for p in files if not is_excluded(p, root, patterns)}
        if args.inventory:
            inventory = {term: [] for term in INVENTORY_TERMS}
            for path in sorted(files):
                prose = masked_prose(path.read_text(encoding="utf-8-sig"))
                for term in inventory:
                    for match in re.finditer(re.escape(term), prose):
                        inventory[term].append({"file": str(path.relative_to(root)) if path.is_relative_to(root) else str(path), "line": prose.count("\n", 0, match.start()) + 1})
            print(json.dumps({"files": len(files), "terms": {term: {"count": len(items), "locations": items} for term, items in inventory.items()}}, ensure_ascii=False, indent=2))
            return 0
        findings = [f for p in sorted(files) for f in check_file(p)]
        if args.format == "json":
            print(json.dumps({"files": len(files), "findings": [asdict(f) for f in findings]}, ensure_ascii=False, indent=2))
        else:
            for f in findings:
                print(f"{f.file}:{f.line}:{f.column}: [{f.level}] {f.rule}: {f.match} → {f.suggestion}")
            print(f"Checked {len(files)} files; {sum(f.level == 'error' for f in findings)} errors, {sum(f.level == 'warning' for f in findings)} warnings.")
        return int(any(f.level == "error" for f in findings))
    except (OSError, UnicodeError, ValueError, yaml.YAMLError) as error:
        print(f"terminology: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
