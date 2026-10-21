"""Validate public question inputs against the browser/Worker JSON Schema."""
from __future__ import annotations
import json
import math
import re
from urllib.parse import urlsplit
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


def validate_quiz_set(source):
    schema = contract()
    errors = list(Draft202012Validator({"$ref": "#/$defs/quizSetSource", "$defs": schema["$defs"]}).iter_errors(source))
    if errors:
        error = errors[0]
        raise ValueError("submission quiz set " + "/".join(str(p) for p in error.absolute_path) + ": " + error.message)
    keys = set()
    for entry in source["newQuestions"]:
        if entry["clientId"] in keys:
            raise ValueError("Duplicate new question item key")
        keys.add(entry["clientId"])
        validate_question(entry["question"])
        if re.search(r'<(?:script|iframe|object|embed|form|input|button|link|style|svg|details)\b|\bon[a-z]+\s*=|(?:\bjavascript|\bdata|\bvbscript)\s*:|--8<--', json.dumps(entry["question"]), re.I):
            raise ValueError("Unsafe question content")
        declaration = entry["sourceDeclaration"]
        if any(re.search(r"[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", value) for value in declaration.values()):
            raise ValueError("Unsafe source declaration")
        if declaration["kind"] == "adapted":
            url = urlsplit(declaration["source"])
            if url.scheme not in {"http", "https"} or not url.netloc:
                raise ValueError("Invalid source URL")
    selected = set()
    for item in source["selection"]["items"]:
        key = item.get("questionId") if item["kind"] == "existing" else item["clientId"]
        if key in selected or (item["kind"] == "new" and key not in keys):
            raise ValueError("Duplicate or missing question reference")
        selected.add(key)


def validate_set_record(record):
    envelope = {key: record[key] for key in contract()["properties"] if key in record}
    envelope["turnstileToken"] = "validated-by-worker"
    errors = list(Draft202012Validator(contract()).iter_errors(envelope))
    if errors:
        raise ValueError("Invalid set envelope: " + errors[0].message)
    for key in ("title", "attribution", "chapter"):
        value = record["payload"].get(key, "")
        if re.search(r"[<>\r\n\x00-\x1f\x7f]", value):
            raise ValueError("Unsafe set metadata")
    declaration = record["sourceDeclaration"]
    if any(re.search(r"[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", value) for value in declaration.values()):
        raise ValueError("Unsafe source declaration")
    if declaration["kind"] == "adapted":
        url = urlsplit(declaration["source"])
        if url.scheme not in {"http", "https"} or not url.netloc:
            raise ValueError("Invalid source URL")
    validate_quiz_set(record["payload"]["quizSet"])
