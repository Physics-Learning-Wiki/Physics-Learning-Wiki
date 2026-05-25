#!/usr/bin/env bash

set -eo pipefail

DIRNAME="$(dirname -- "${BASH_SOURCE[0]}")"

chmod +x "$DIRNAME"/install-theme.sh
"$DIRNAME"/install-theme.sh

git rev-parse --short HEAD | xargs -I % sed -i "s/githash: ''/githash: '%'/g" mkdocs.yml

echo "Generating nav tree..."
uv run python scripts/generate-nav.py

# 自动更新 author 字段（仅 CI 环境，本地跳过）
if [ -n "$CI" ]; then
  echo "Updating author fields from git history..."
  uv run python scripts/update-authors.py || echo "Author update skipped (non-critical)"
fi
