#!/usr/bin/env bash

set -eo pipefail

DIRNAME="$(dirname -- "${BASH_SOURCE[0]}")"

THEME_NAME="mkdocs-material"

git submodule update --init --recursive
git -C "$THEME_NAME" log -1

chmod +x "$DIRNAME"/install-theme-vendor.sh

"$DIRNAME"/install-theme-vendor.sh
