"""Validate public question inputs against the browser/Worker JSON Schema."""
from __future__ import annotations
import json
import math
from pathlib import Path
from functools import lru_cache
from jsonschema import Draft202012Validator


@lru_cache(maxsize=1)
def contract():
    return json.loads((Path(__file__).resolve().parents[2] / "contracts/submission.schema.json").read_text(encoding="utf-8"))


def validate_question(question):
    schema = contract()
    validator = Draft202012Validator({"$ref": "#/$defs/questionSource", "$defs": schema["$defs"]})
    errors = list(validator.iter_errors(question))
    if errors:
        error = errors[0]
        raise ValueError("submission question " + "/".join(str(p) for p in error.absolute_path) + ": " + error.message)
    def finite(value):
        if isinstance(value, float) and not math.isfinite(value):
            raise ValueError("submission numbers must be finite")
        if isinstance(value, dict):
            for child in value.values():
                finite(child)
        elif isinstance(value, list):
            for child in value:
                finite(child)
    finite(question)
