"""Exercise dependency-free CLIs and the notification's HTTP failure boundary."""
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
from threading import Thread
from urllib.parse import parse_qs, urlsplit

import pytest


ROOT = Path(__file__).parents[2]
SCRIPTS = ROOT / "scripts/post-deploy"
URL = "https://example.test/physics/?a=1&b=2"
TOKEN = "secret-not-for-logs&suffix"


@pytest.fixture
def notifier(monkeypatch, tmp_path):
    monkeypatch.syspath_prepend(str(SCRIPTS))
    spec = importlib.util.spec_from_file_location("baidu_push", SCRIPTS / "baidu_push.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setenv("BAIDU_TOKEN", TOKEN)
    monkeypatch.setenv("SITE", "example.test/physics/")
    monkeypatch.setenv("NO_PROXY", "127.0.0.1,localhost")
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(tmp_path / "summary.md"))
    return module


def sitemap(tmp_path, body=None):
    path = tmp_path / "sitemap.xml"
    path.write_text(body if body is not None else (
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        '<url><loc>https://example.test/physics/?a=1&amp;b=2</loc></url></urlset>'
    ), encoding="utf-8")
    return path


def read_summary(tmp_path):
    return (tmp_path / "summary.md").read_text(encoding="utf-8")


@contextmanager
def baidu_server(body, status=200, headers=None):
    requests = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            requests.append({"path": self.path, "headers": self.headers,
                             "body": self.rfile.read(int(self.headers["Content-Length"]))})
            self.send_response(status)
            for key, value in (headers or {}).items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, kwargs={"poll_interval": 0.02}, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/urls", requests
    finally:
        server.shutdown()
        thread.join(timeout=2)
        server.server_close()


@pytest.mark.parametrize("namespace", ["", ' xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'])
def test_converter_cli_uses_only_standard_library(tmp_path, namespace):
    source = sitemap(tmp_path, f'<urlset{namespace} xmlns:image="urn:image">'
                     '<url><loc> https://example.test/物理/?a=1&amp;b=2 </loc>'
                     '<image:loc>https://other.test/image.png</image:loc></url>'
                     '<url><loc>https://example.test/物理/?a=1&amp;b=2</loc></url>'
                     '<url><loc/></url><url><loc>  </loc></url></urlset>')
    target = tmp_path / "urls.txt"
    result = subprocess.run([sys.executable, "-S", str(SCRIPTS / "convert-sitemap.py"), str(source), str(target)],
                            capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    assert target.read_bytes() == "https://example.test/物理/?a=1&b=2\n".encode("utf-8")


def test_converter_parse_failure_keeps_existing_output(tmp_path):
    source = sitemap(tmp_path, "<urlset>")
    target = tmp_path / "urls.txt"
    target.write_text("previous output", encoding="utf-8")
    result = subprocess.run([sys.executable, "-S", str(SCRIPTS / "convert-sitemap.py"), str(source), str(target)],
                            capture_output=True, text=True)
    assert result.returncode != 0
    assert target.read_text(encoding="utf-8") == "previous output"


def test_missing_token_cli_skips_before_reading_sitemap(tmp_path):
    environment = {**os.environ, "BAIDU_TOKEN": "  ", "GITHUB_ACTIONS": "true",
                   "GITHUB_STEP_SUMMARY": str(tmp_path / "summary.md")}
    result = subprocess.run([sys.executable, "-S", str(SCRIPTS / "baidu_push.py"), "nonexistent.xml"],
                            env=environment, capture_output=True, text=True)
    assert result.returncode == 0
    assert "::warning::BaiduToken is not configured" in result.stdout
    assert "**skipped**" in read_summary(tmp_path)


def test_missing_site_fails(notifier, monkeypatch, tmp_path):
    monkeypatch.delenv("SITE")
    assert notifier.main([]) == 1
    assert "**failed**" in read_summary(tmp_path)


@pytest.mark.parametrize("body", ["<urlset>", "<html/>", "<urlset><url><loc>/relative</loc></url></urlset>"])
def test_invalid_sitemap_fails_before_network(notifier, tmp_path, body):
    assert notifier.main([str(sitemap(tmp_path, body))]) == 1
    assert "valid published sitemap" in read_summary(tmp_path)


def test_empty_sitemap_is_explicit_skip(notifier, tmp_path):
    assert notifier.main([str(sitemap(tmp_path, "<urlset/>"))]) == 0
    assert "**skipped**" in read_summary(tmp_path)
    assert "contains no URLs" in read_summary(tmp_path)


def test_success_posts_urls_and_reports_quota(notifier, monkeypatch, tmp_path):
    with baidu_server(b'{"success":1,"remain":499}') as (endpoint, requests):
        monkeypatch.setattr(notifier, "ENDPOINT", endpoint)
        assert notifier.main([str(sitemap(tmp_path))]) == 0
    assert len(requests) == 1
    request = requests[0]
    assert parse_qs(urlsplit(request["path"]).query) == {"site": ["example.test/physics/"], "token": [TOKEN]}
    assert request["body"] == (URL + "\n").encode("utf-8")
    assert request["headers"]["Content-Type"] == "text/plain; charset=utf-8"
    assert "**success**" in read_summary(tmp_path)
    assert "remaining daily quota: 499" in read_summary(tmp_path)
    assert TOKEN not in read_summary(tmp_path)


@pytest.mark.parametrize("status,body,expected", [
    (403, TOKEN.encode(), "status 403"),
    (503, TOKEN.encode(), "status 503"),
    (200, json.dumps({"error": 401, "message": TOKEN}).encode(), "code 401"),
    (200, TOKEN.encode(), "invalid JSON"),
    (200, b'[]', "invalid response object"),
    (200, b'{"success":true,"remain":499}', "valid success/remaining counts"),
    (200, b'{"success":1}', "valid success/remaining counts"),
    (200, b'{"success":0,"remain":499}', "only 0/1 URLs"),
    (200, json.dumps({"success": 1, "remain": 499, "not_same_site": [TOKEN]}).encode(), "reported rejected URLs"),
])
def test_http_and_api_failures_are_visible_without_secret_leaks(notifier, monkeypatch, tmp_path, capsys,
                                                              status, body, expected):
    with baidu_server(body, status) as (endpoint, requests):
        monkeypatch.setattr(notifier, "ENDPOINT", endpoint)
        assert notifier.main([str(sitemap(tmp_path))]) == 1
    assert len(requests) == 1
    output = capsys.readouterr()
    assert "::error::" in output.out
    assert expected in read_summary(tmp_path)
    assert "**failed**" in read_summary(tmp_path)
    assert TOKEN not in output.out + output.err + read_summary(tmp_path)


def test_credential_bearing_redirect_is_not_followed(notifier, monkeypatch, tmp_path):
    with baidu_server(b"", 307, {"Location": "http://127.0.0.1:1/redirect"}) as (endpoint, requests):
        monkeypatch.setattr(notifier, "ENDPOINT", endpoint)
        assert notifier.main([str(sitemap(tmp_path))]) == 1
    assert len(requests) == 1
    assert "status 307" in read_summary(tmp_path)


def test_timeout_is_bounded_and_does_not_echo_request(notifier, monkeypatch, tmp_path, capsys):
    class TimedOut:
        def open(self, request, timeout):
            assert timeout == 30
            raise TimeoutError(request.full_url)

    monkeypatch.setattr(notifier, "build_opener", lambda *args: TimedOut())
    assert notifier.main([str(sitemap(tmp_path))]) == 1
    output = capsys.readouterr()
    assert "timed out" in read_summary(tmp_path)
    assert TOKEN not in output.out + output.err + read_summary(tmp_path)
