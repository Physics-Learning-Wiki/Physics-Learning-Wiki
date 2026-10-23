"""Protect workflow trust, installation, and release contracts across upgrades."""

import hashlib
import os
from pathlib import Path
import re
import shutil
import subprocess
import tomllib

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[2]
LEGACY = {
    "build-pdf.yml",
    "build-pdf-typst.yml",
    "incrementally-build-pdf.yml",
    "test.yml",
}


def load_yaml(path):
    # GitHub uses YAML 1.2: do not interpret its `on` key as a YAML 1.1 boolean.
    return yaml.load(path.read_text(encoding="utf-8"), Loader=yaml.BaseLoader)


def core_workflows():
    return [
        path
        for path in sorted((ROOT / ".github/workflows").glob("*.yml"))
        if path.name not in LEGACY
    ]


def test_external_actions_are_pinned_to_commits():
    paths = core_workflows() + list((ROOT / ".github/actions").glob("*/action.yml"))
    for path in paths:
        for line in path.read_text(encoding="utf-8").splitlines():
            match = re.search(r"\buses:\s*(\S+)", line)
            if match and not match[1].startswith("./"):
                assert re.fullmatch(r"[\w.-]+/[\w./-]+@[0-9a-f]{40}", match[1]), (
                    path,
                    line,
                )
                assert re.search(r"# v\d", line), (path, "missing version annotation")


def test_writing_jobs_disable_dependency_caches():
    for path in core_workflows():
        workflow = load_yaml(path)
        for name, job in workflow["jobs"].items():
            permissions = job.get("permissions", workflow.get("permissions", {}))
            writing = permissions == "write-all" or (
                isinstance(permissions, dict) and "write" in permissions.values()
            )
            if writing:
                for step in job.get("steps", []):
                    if step.get("uses", "").startswith("./.github/actions/setup-"):
                        assert step.get("with", {}).get("cache") == "false", (
                            path,
                            name,
                        )


def test_metadata_only_target_events_never_checkout_pr_code():
    for path in core_workflows():
        workflow = load_yaml(path)
        if "pull_request_target" in workflow["on"]:
            for job in workflow["jobs"].values():
                assert not any(
                    step.get("uses", "").startswith("actions/checkout@")
                    for step in job["steps"]
                ), path


def test_build_and_release_workflow_contracts():
    workflows = ROOT / ".github/workflows"
    build = load_yaml(workflows / "build.yml")
    assert build["name"] == "Build"
    jobs = build["jobs"]
    assert set(jobs) == {"tests", "site", "build", "deploy"}
    assert "needs" not in jobs["tests"]
    assert "needs" not in jobs["site"]
    assert build["jobs"]["build"]["name"] == "Physics-Learning-Wiki Page Build"
    assert jobs["build"]["needs"] == ["tests", "site"]
    assert jobs["build"]["if"] == "${{ always() }}"
    gate = jobs["build"]["steps"][0]
    assert gate["env"] == {
        "TEST_RESULT": "${{ needs.tests.result }}",
        "SITE_RESULT": "${{ needs.site.result }}",
    }
    assert 'test "$TEST_RESULT" = success' in gate["run"]
    assert 'test "$SITE_RESULT" = success' in gate["run"]
    assert build["jobs"]["deploy"]["needs"] == "build"
    for guard in (
        "github.event_name != 'pull_request'",
        "github.ref == 'refs/heads/main'",
        "github.repository_owner == 'Physics-Learning-Wiki'",
    ):
        assert guard in jobs["deploy"]["if"]
    assert all(jobs[name]["permissions"] == {"contents": "read"}
               for name in ("tests", "site", "build"))
    assert jobs["deploy"]["permissions"] == {"contents": "write"}
    assert build["concurrency"]["cancel-in-progress"] == "true"
    assert "github.event.pull_request.number || github.ref" in build["concurrency"]["group"]
    source_commands = "\n".join(step.get("run", "") for step in jobs["tests"]["steps"])
    assert "validate --include-drafts" in source_commands
    assert "corepack yarn quiz:format:check" in source_commands
    assert "playwright install" not in source_commands
    assert not (workflows / "check-question-bank.yml").exists()
    site_commands = "\n".join(step.get("run", "") for step in jobs["site"]["steps"])
    assert site_commands.count("./scripts/build/build-site.sh") == 1
    assert "uv run pytest tests/site --built-site-dir=site" in site_commands
    assert "corepack yarn e2e" in site_commands
    assert "perf:audit" not in site_commands
    uploaded = {
        step["with"]["name"]
        for step in jobs["site"]["steps"]
        if step.get("uses", "").startswith("actions/upload-artifact@")
    }
    downloaded = {
        step["with"]["name"]
        for step in build["jobs"]["deploy"]["steps"]
        if step.get("uses", "").startswith("actions/download-artifact@")
    }
    assert "site-artifact" in uploaded
    assert downloaded == {"site-artifact"}
    for filename in ("submission-release.yml", "seo-notify.yml"):
        followup = load_yaml(workflows / filename)
        assert followup["on"]["workflow_run"]["workflows"] == ["Build"]
        for job in followup["jobs"].values():
            assert "head_repository.full_name == github.repository" in job["if"]


@pytest.mark.parametrize(
    "command", [["sync"], ["run", "python", "-c", "raise SystemExit(0)"]]
)
def test_project_commands_reject_lock_drift_without_rewriting(tmp_path, command):
    for filename in ("pyproject.toml", "uv.lock", ".python-version", "README.md"):
        shutil.copyfile(ROOT / filename, tmp_path / filename)
    manifest = tmp_path / "pyproject.toml"
    source = manifest.read_text(encoding="utf-8")
    version = tomllib.loads(source)["project"]["version"]
    replacement = "0.0.0+drift" if version != "0.0.0+drift" else "0.0.1+drift"
    manifest.write_text(
        source.replace(f'version = "{version}"', f'version = "{replacement}"', 1),
        encoding="utf-8",
    )
    lock = tmp_path / "uv.lock"
    before = hashlib.sha256(lock.read_bytes()).digest()
    env = {
        **os.environ,
        "UV_LOCKED": "true",
        "UV_OFFLINE": "true",
        "UV_PROJECT_ENVIRONMENT": str(tmp_path / ".venv"),
    }
    uv = shutil.which("uv")
    assert uv is not None
    result = subprocess.run(
        [uv, *command],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        timeout=90,
    )
    assert result.returncode != 0
    assert "lockfile" in result.stderr.lower(), result.stderr
    assert hashlib.sha256(lock.read_bytes()).digest() == before
