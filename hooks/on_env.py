import re
from pathlib import Path

from bs4 import BeautifulSoup


def on_config(config, **kwargs):
    overrides = str(Path(config.config_file_path).resolve().parent / "overrides")
    if overrides not in config.theme.dirs:
        config.theme.dirs.insert(0, overrides)
    return config


def on_page_content(html, page, **kwargs):
    """Keep legacy anchors when the opening section repeats the page title."""
    soup = BeautifulSoup(html, "html.parser")
    if soup.find("h1"):
        return html
    heading = soup.find("h2")
    if heading is None:
        return html
    text = heading.get_text(" ", strip=True).rstrip(" ¶")
    title = page.meta.get("title") or page.title
    short_text = re.split(r"[（(]", text, maxsplit=1)[0].strip()
    if text != title and short_text != title:
        return html
    anchor = soup.new_tag("span", attrs={"class": "plw-title-anchor"})
    if heading.get("id"):
        anchor["id"] = heading["id"]
    heading.replace_with(anchor)
    return str(soup)

def _nav_math():
    raw_re = r"\\\((.+?)\\\)"
    target = r'<span class="arithmatex">\(\1\)</span>'
    r = re.compile(raw_re)
    def nav_math(s):
        return r.sub(target, s).replace(" <span", "&nbsp;<span").replace("</span> ", "</span>&nbsp;")
    return nav_math

def on_env(env, config, files, **kwargs):
    env.filters["nav_math"] = _nav_math()
    return env
