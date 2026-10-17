#!/usr/bin/env python3
"""Convert a sitemap to a UTF-8 URL list without project dependencies."""
import argparse
from pathlib import Path

from sitemap_urls import read_urls


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    args = parser.parse_args(argv)
    urls = read_urls(args.source)
    args.target.write_bytes("".join(url + "\n" for url in urls).encode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
