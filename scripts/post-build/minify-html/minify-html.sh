#!/usr/bin/env bash

set -eo pipefail

shopt -s globstar

VERSION="0.16.4"
OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS/$ARCH" in
  Linux/x86_64)
    ASSET="minhtml-$VERSION-x86_64-unknown-linux-gnu"
    BINARY="${TMPDIR:-/tmp}/minify-html-$VERSION"
    ;;
  MINGW*/x86_64|MSYS*/x86_64|CYGWIN*/x86_64)
    ASSET="minhtml-$VERSION-x86_64-pc-windows-msvc.exe"
    BINARY="${TMPDIR:-/tmp}/minify-html-$VERSION.exe"
    ;;
  Darwin/x86_64)
    ASSET="minhtml-$VERSION-x86_64-apple-darwin"
    BINARY="${TMPDIR:-/tmp}/minify-html-$VERSION"
    ;;
  Darwin/arm64|Darwin/aarch64)
    ASSET="minhtml-$VERSION-aarch64-apple-darwin"
    BINARY="${TMPDIR:-/tmp}/minify-html-$VERSION"
    ;;
  *)
    echo "Unsupported minify-html platform: $OS/$ARCH" >&2
    exit 1
    ;;
esac

URL="https://github.com/wilsonzlin/minify-html/releases/download/v$VERSION/$ASSET"
curl --fail --location --silent --show-error "$URL" --output "$BINARY"
if [[ "$BINARY" != *.exe ]]; then
  chmod +x "$BINARY"
fi
"$BINARY" --keep-closing-tags --minify-css ./site/**/*.html
