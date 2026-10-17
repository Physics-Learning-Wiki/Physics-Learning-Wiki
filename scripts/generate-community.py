"""Compatibility entry point for community snapshot generation."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.community.generator import main

if __name__ == "__main__":
    raise SystemExit(main())
