#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# pre-build injects the current commit into mkdocs.yml. Restore the caller's
# exact config after the site is generated so repeated builds leave no diff.
MKDOCS_BACKUP="$(mktemp)"
cp mkdocs.yml "$MKDOCS_BACKUP"
restore_mkdocs() {
  cp "$MKDOCS_BACKUP" mkdocs.yml
  rm -f "$MKDOCS_BACKUP"
}
trap restore_mkdocs EXIT

echo "[build] Preparing source files"
bash scripts/pre-build/pre-build.sh

echo "[build] Generating frontend feature assets"
corepack yarn features:build

echo "[build] Building MkDocs site"
uv run mkdocs build --clean -v

echo "[build] Indexing Pagefind search"
corepack yarn search:index

echo "[build] Post-processing HTML"
export NODE_OPTIONS="${NODE_OPTIONS:---max_old_space_size=3072}"
node --loader ts-node/esm scripts/post-build/html-postprocess.ts commits-info math external-links

echo "[build] Optimizing responsive images"
corepack yarn media:optimize

echo "[build] Minifying HTML"
bash scripts/post-build/minify-html/minify-html.sh

echo "[build] Generating redirects and sitemap"
uv run python scripts/post-build/redirect/generate-redirects.py
uv run python scripts/post-build/seo/generate-sitemap.py --site-dir site --output site/sitemap.xml
uv run python scripts/check-seo.py --site-dir site --docs-dir docs

echo "[build] Running blocking performance audit"
corepack yarn perf:audit --mode blocking
