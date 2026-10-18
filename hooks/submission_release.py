"""Write release evidence into the site artifact, with no GitHub network dependency."""
from pathlib import Path
from scripts.submissions.release import build_release


def on_post_build(config):
    build_release(Path(config["docs_dir"]).resolve().parent, Path(config["site_dir"]),
                  config.get("site_url") or "/")
