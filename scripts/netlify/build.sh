#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

if ! command -v uv >/dev/null 2>&1; then
  pip install uv
fi

uv sync --index-url "${PYPI_MIRROR:-https://pypi.org/simple/}"

# Netlify may export NODE_ENV=production, which makes Yarn Classic omit the
# devDependencies required by Pagefind, Sharp, esbuild, and Playwright tooling.
unset NODE_ENV
corepack yarn install --frozen-lockfile

PREBUILD_NETLIFY=1 bash scripts/build/build-site.sh
