#!/usr/bin/env bash

set -euo pipefail

DIRNAME="$(dirname -- "${BASH_SOURCE[0]}")"

# CI provisions Python explicitly; this task uses only the standard library.
exec python3 "$DIRNAME/baidu_push.py" "$@"
