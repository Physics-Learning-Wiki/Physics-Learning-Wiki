#!/usr/bin/env python3
"""Notify Baidu of published URLs, independently of the Pages deployment."""
from __future__ import annotations

import argparse
from http.client import HTTPException
import json
import os
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener
import xml.etree.ElementTree as ET

from sitemap_urls import read_urls

# Keep the existing Baidu submission endpoint; do not log its token-bearing URL.
ENDPOINT = "http://data.zz.baidu.com/urls"
TIMEOUT_SECONDS = 30
MAX_RESPONSE_BYTES = 1024 * 1024


class NotificationError(RuntimeError):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # The query contains a credential; redirects must not forward it.
        return None


def push_urls(urls: list[str], site: str, token: str) -> tuple[int, int]:
    request = Request(
        ENDPOINT + "?" + urlencode({"site": site, "token": token}),
        data="".join(url + "\n" for url in urls).encode("utf-8"),
        headers={"Content-Type": "text/plain; charset=utf-8"},
        method="POST",
    )
    try:
        with build_opener(NoRedirect()).open(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as error:
        error.close()
        raise NotificationError(f"Baidu HTTP request failed (status {error.code})") from None
    except (URLError, OSError, HTTPException):
        raise NotificationError("Baidu request failed or timed out; inspect connectivity and retry") from None
    if len(body) > MAX_RESPONSE_BYTES:
        raise NotificationError("Baidu returned an oversized response")
    try:
        result = json.loads(body)
    except (ValueError, UnicodeError):
        raise NotificationError("Baidu returned invalid JSON") from None
    if not isinstance(result, dict):
        raise NotificationError("Baidu returned an invalid response object")
    if "error" in result:
        # Do not echo upstream messages or rejected URLs: they may contain secrets.
        code = result["error"]
        suffix = f" (code {code})" if type(code) is int else ""
        raise NotificationError("Baidu rejected the submission" + suffix)
    success, remain = result.get("success"), result.get("remain")
    if (type(success) is not int or not 0 <= success <= len(urls)
            or type(remain) is not int or remain < 0):
        raise NotificationError("Baidu response is missing valid success/remaining counts")
    if result.get("not_same_site") or result.get("not_valid"):
        raise NotificationError("Baidu reported rejected URLs; verify the site property and URL list")
    if success != len(urls):
        raise NotificationError(f"Baidu accepted only {success}/{len(urls)} URLs; verify the site property and URL list")
    return success, remain


def report(status: str, message: str) -> None:
    level = {"skipped": "warning", "failed": "error"}.get(status)
    if level and os.environ.get("GITHUB_ACTIONS") == "true":
        print(f"::{level}::{message}")
    else:
        print(f"Baidu notification {status}: {message}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as stream:
            stream.write(f"\n### Baidu search notification\n\nStatus: **{status}**. {message}\n")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sitemap", type=Path, nargs="?", default=Path("site/sitemap.xml"))
    args = parser.parse_args(argv)
    token = os.environ.get("BAIDU_TOKEN", "").strip()
    if not token:
        report("skipped", "BaiduToken is not configured; no search notification was sent. Configure the repository Actions secret and dispatch seo-notify.yml to retry.")
        return 0
    site = os.environ.get("SITE", "").strip()
    if not site:
        report("failed", "SITE is not configured; use the property registered in Baidu Search Resource Platform")
        return 1
    try:
        urls = read_urls(args.sitemap)
    except (OSError, ValueError, ET.ParseError):
        report("failed", "Could not read a valid published sitemap; inspect gh-pages/sitemap.xml")
        return 1
    if not urls:
        report("skipped", "The published sitemap contains no URLs; no search notification was sent")
        return 0
    try:
        success, remain = push_urls(urls, site, token)
    except NotificationError as error:
        report("failed", str(error))
        return 1
    report("success", f"Baidu accepted {success} URLs; remaining daily quota: {remain}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
