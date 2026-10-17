"""Read URL entries from a sitemap using only the Python standard library."""
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"


def read_urls(source: Path) -> list[str]:
    root = ET.parse(source).getroot()
    if root.tag not in {"urlset", f"{{{SITEMAP_NAMESPACE}}}urlset"}:
        raise ValueError("Expected a sitemap urlset")
    prefix = root.tag[:-len("urlset")]
    urls = []
    seen = set()
    for element in root.findall(f"{prefix}url/{prefix}loc"):
        url = (element.text or "").strip()
        if not url:
            continue
        parsed = urlsplit(url)
        if (parsed.scheme not in {"http", "https"} or not parsed.hostname
                or parsed.username is not None or parsed.password is not None
                or parsed.fragment or any(character.isspace() or ord(character) < 32 for character in url)):
            raise ValueError("Sitemap contains an invalid absolute HTTP(S) URL")
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls
