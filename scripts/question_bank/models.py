from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class SourceDocument:
    path: Path
    data: dict[str, Any]


@dataclass
class PageContract:
    path: Path
    page_id: str
    title: str
    url: str
    objectives: dict[str, dict[str, str]]
    quiz: dict[str, Any]


@dataclass
class RepositoryData:
    root: Path
    questions: list[SourceDocument] = field(default_factory=list)
    blueprints: list[SourceDocument] = field(default_factory=list)
    pages: dict[str, PageContract] = field(default_factory=dict)
