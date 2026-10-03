from types import SimpleNamespace

from bs4 import BeautifulSoup

from hooks.on_env import on_page_content


def test_repeated_opening_title_preserves_anchor_and_quiz_placement():
    page = SimpleNamespace(title="参考系与坐标系", meta={})
    html = '<h2 id="old-title">参考系与坐标系（Reference Frames）</h2><div class="plw-quiz-inline-root"></div><h3>参考系</h3>'
    soup = BeautifulSoup(on_page_content(html, page), "html.parser")
    assert soup.select_one("span#old-title") is not None
    assert soup.select_one(".plw-quiz-inline-root") is not None
    assert soup.h3.get_text() == "参考系"


def test_distinct_opening_section_and_explicit_h1_are_preserved():
    page = SimpleNamespace(title="课程路线", meta={})
    for html in ('<h2 id="first">先修知识</h2>', '<h1>课程路线</h1><h2>课程路线</h2>'):
        assert on_page_content(html, page) == html
