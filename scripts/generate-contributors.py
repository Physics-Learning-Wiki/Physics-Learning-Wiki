"""Generate contributor changes through the shared review PR workflow."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.community.sync import main
if __name__ == "__main__":
    raise SystemExit(main(["--contributors", *sys.argv[1:]]))
