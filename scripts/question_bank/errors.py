from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, order=True)
class Issue:
    severity: str
    path: str
    field: str
    message: str

    @classmethod
    def error(cls, path: Path | str, field: str, message: str) -> "Issue":
        return cls("error", str(path).replace("\\", "/"), field, message)

    @classmethod
    def warning(cls, path: Path | str, field: str, message: str) -> "Issue":
        return cls("warning", str(path).replace("\\", "/"), field, message)

    def render(self) -> str:
        location = f"{self.path}: {self.field}" if self.field else self.path
        return f"{self.severity.upper()}: {location}: {self.message}"
