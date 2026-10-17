#!/usr/bin/env bash
# Apply the checked-in main policy, or use --check for a GET-only comparison.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
exec uv run --project "$REPO_ROOT" python "$SCRIPT_DIR/branch_protection.py" "$@"
