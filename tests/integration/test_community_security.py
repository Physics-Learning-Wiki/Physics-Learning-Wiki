from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.parse import parse_qs, urlsplit

from bs4 import BeautifulSoup
import pytest
import yaml

from scripts.community import generator
from scripts.community.generator import (
    API_URL, LABEL, SnapshotConflict, build_snapshot, fetch_issues,
    generate_snapshot, index_source, page_source,
)
from scripts.community.render import normalize_markdown, render_community_markdown

ROOT = Path(__file__).resolve().parents[2]


def issue(number=42, body='Community text', **values):
    return {
        'number': number, 'title': '[投稿] Physics',
        'created_at': '2026-10-17T12:00:00Z',
        'state': 'open', 'labels': [{'name': LABEL}],
        'html_url': f'https://github.com/{generator.REPO}/issues/{number}',
        'body': body, **values,
    }


def assert_safe(root):
    assert not root.select('script, iframe, object, embed, svg, form, input, button, style, link')
    for element in root.find_all(True):
        assert not any(name.lower().startswith('on') for name in element.attrs)
        for name in ('href', 'src'):
            if element.has_attr(name):
                value = ''.join(element[name].split()).lower()
                assert not value.startswith(('javascript:', 'data:', 'vbscript:', 'file:'))


def test_complete_fragment_preserves_native_html_and_markdown_features():
    source = '''## Nested content

<a href="https://example.com">read <strong><em>reference</em></strong></a>

<details open><summary>Expand <strong>proof</strong></summary><div><p>Nested <em>body</em></p></div></details>

| A | B |
| --- | --- |
| 1 | 2 |

!!! note "Note"
    Formula $E = mc^2$．
\x20\x20\x20\x20
??? warning "Details"
    Body
\x20\x20\x20\x20
```python
# keep this heading
print("<script>example</script>")
```

$$
\\frac{1}{2}mv^2
$$
'''
    rendered = render_community_markdown(source)
    soup = BeautifulSoup(rendered.html, 'html.parser')
    assert soup.select_one('a[href="https://example.com"] strong em').text == 'reference'
    assert soup.select_one('details[open] summary strong').text == 'proof'
    assert soup.select_one('details div p em').text == 'body'
    assert soup.select_one('table td').text == '1'
    assert soup.select_one('.admonition.note .arithmatex')
    assert soup.select_one('details.warning summary').text == 'Details'
    assert '# keep this heading' in soup.select_one('code').text
    assert len(soup.select('.arithmatex')) == 2
    assert rendered.toc[0]['id'] == 'community-nested-content'
    assert_safe(soup)


def test_only_prose_headings_are_normalized():
    source = '# Prose\n\n```text\n# literal\n```\n\n`# inline`\n\n$$\nx < y\n$$'
    normalized = normalize_markdown(source)
    assert normalized.startswith('## Prose')
    assert '```text\n# literal\n```' in normalized
    assert '`# inline`' in normalized
    assert '$$\nx < y\n$$' in normalized
    literal = '    # indented code\n\n$$\n# TeX parameter\n$$\n'
    assert normalize_markdown(literal) == literal.rstrip('\n')


def test_metadata_is_yaml_data_and_index_text():
    submission = issue(
        body='## 投稿信息\n- **署名**: [author](https://evil.test) *name*\n---\n# Body\n\n$x < y$',
        title='[投稿] <img src=x onerror=alert(1)> [title](https://evil.test)\nstatus: published',
        html_url='javascript:alert(1)',
    )
    source = page_source(submission)
    metadata = yaml.safe_load(source.split('---\n', 2)[1])
    assert set(metadata) == {'status', 'author', 'source_issue', 'submission_date', 'title'}
    assert metadata['status'] == 'community'
    assert metadata['source_issue'].endswith('/issues/42')
    assert '<img' not in metadata['title']
    assert '## Body' in source and '$x < y$' in source
    rendered = render_community_markdown(index_source([submission]).split('---\n', 2)[2])
    soup = BeautifulSoup(rendered.html, 'html.parser')
    assert len(soup.select('a')) == 1
    assert soup.a['href'] == '42.md'
    assert '[title](https://evil.test)' in soup.a.text
    assert '[author](https://evil.test) *name*' in soup.get_text()
    assert_safe(soup)


class Response:
    def __init__(self, data, link=''):
        self.data = data
        self.headers = {'Link': link}

    def read(self):
        return json.dumps(self.data).encode()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


def test_pagination_reads_every_page_and_excludes_prs():
    requests = []

    def opener(request, **kwargs):
        requests.append(request.full_url)
        page = int(parse_qs(urlsplit(request.full_url).query)['page'][0])
        if page == 1:
            return Response([issue(i) for i in range(1, 101)], f'<{API_URL}?page=2>; rel="next"')
        return Response([issue(101), {**issue(102), 'pull_request': {}}])

    snapshot = fetch_issues(token='', opener=opener)
    assert len(requests) == 2
    assert [entry['number'] for entry in snapshot] == list(range(101, 0, -1))


@pytest.mark.parametrize('failure', ['network', 'invalid-response', 'duplicate', 'foreign-next', 'malformed-next', 'missing-state', 'missing-labels'])
def test_incomplete_fetch_does_not_change_existing_files(tmp_path, monkeypatch, failure):
    output, manifest = tmp_path / 'docs/community', tmp_path / 'data/community-generated.json'
    generate_snapshot(output, manifest, issues=[issue(1)])
    before = {path: path.read_bytes() for path in [*output.iterdir(), manifest]}
    calls = 0

    def opener(request, **kwargs):
        nonlocal calls
        calls += 1
        if failure == 'foreign-next':
            return Response([issue(1)], '<https://evil.test/steal>; rel="next"')
        if failure == 'malformed-next':
            return Response([issue(1)], f'<{API_URL}?page=2>; broken-next')
        if calls == 1:
            return Response([issue(1)], f'<{API_URL}?page=2>; rel="next"')
        if failure == 'network':
            raise OSError('network failure')
        if failure.startswith('missing-'):
            malformed = issue(2)
            del malformed[failure.removeprefix('missing-')]
            return Response([malformed])
        return Response({'message': 'API error'} if failure == 'invalid-response' else [issue(1)])

    monkeypatch.setattr(generator, 'urlopen', opener)
    assert generator.main(['--output-dir', str(output), '--manifest', str(manifest)]) == 1
    assert all(path.read_bytes() == content for path, content in before.items())


def test_withdrawal_empty_snapshot_and_idempotency_preserve_handwritten_files(tmp_path):
    output, manifest = tmp_path / 'docs/community', tmp_path / 'data/community-generated.json'
    assert generate_snapshot(output, manifest, issues=[issue(1), issue(2), issue(3)])
    manual = output / 'guide.md'
    manual.write_text('Handwritten guide', encoding='utf-8')
    before = manifest.read_bytes()
    assert not generate_snapshot(output, manifest, issues=[issue(1), issue(2), issue(3)])
    assert manifest.read_bytes() == before
    assert generate_snapshot(output, manifest, issues=[issue(1), issue(2, labels=[]), issue(3, state='closed')])
    assert (output / '1.md').exists()
    assert not (output / '2.md').exists() and not (output / '3.md').exists()
    assert generate_snapshot(output, manifest, issues=[])
    assert sorted(path.name for path in output.iterdir()) == ['guide.md', 'index.md']
    assert manual.read_text(encoding='utf-8') == 'Handwritten guide'
    assert '暂无社区投稿' in (output / 'index.md').read_text(encoding='utf-8')


@pytest.mark.parametrize('withdraw', [False, True])
def test_manual_edits_abort_the_whole_snapshot_before_any_write(tmp_path, withdraw):
    output, manifest = tmp_path / 'docs/community', tmp_path / 'data/community-generated.json'
    generate_snapshot(output, manifest, issues=[issue(1)])
    (output / '1.md').write_text('Maintainer text', encoding='utf-8')
    before = {path: path.read_bytes() for path in [*output.iterdir(), manifest]}
    with pytest.raises(SnapshotConflict, match='Maintainer changes'):
        generate_snapshot(output, manifest, issues=[] if withdraw else [issue(1, body='New text'), issue(2)])
    assert not (output / '2.md').exists()
    assert all(path.read_bytes() == content for path, content in before.items())


def test_unmanaged_collision_and_manifest_traversal_are_rejected(tmp_path):
    output, manifest = tmp_path / 'docs/community', tmp_path / 'manifest.json'
    output.mkdir(parents=True)
    (output / '42.md').write_text('Manual file', encoding='utf-8')
    with pytest.raises(SnapshotConflict, match='Unmanaged'):
        generate_snapshot(output, manifest, issues=[issue()])
    manifest.write_text(json.dumps({'version': 1, 'files': {'../42.md': {'issue': 42, 'sha256': '0' * 64}}}))
    with pytest.raises(ValueError, match='Invalid managed'):
        generate_snapshot(output, manifest, issues=[])
    assert (output / '42.md').read_text(encoding='utf-8') == 'Manual file'


def test_rendering_failure_does_not_publish_partial_snapshot(tmp_path, monkeypatch):
    output, manifest = tmp_path / 'docs/community', tmp_path / 'manifest.json'
    generate_snapshot(output, manifest, issues=[issue(1)])
    before = manifest.read_bytes()
    monkeypatch.setattr(generator, 'render_community_markdown', lambda *a, **k: (_ for _ in ()).throw(RuntimeError('sanitizer failed')))
    with pytest.raises(RuntimeError, match='sanitizer failed'):
        generate_snapshot(output, manifest, issues=[issue(2)])
    assert manifest.read_bytes() == before
    assert (output / '1.md').exists() and not (output / '2.md').exists()


@pytest.fixture(scope='module')
def built_community(tmp_path_factory):
    root = tmp_path_factory.mktemp('community-build')
    docs, site = root / 'docs', root / 'site'
    docs.mkdir()
    secret = root / 'secret.md'
    secret.write_text('PRIVATE_INCLUDE_SENTINEL', encoding='utf-8')
    source = f'''## Safe heading

[Section](#safe-heading)

<a href="../reference.md">Read <strong><em>reference</em></strong></a>

<details open><summary>Proof</summary><div><p>Nested body</p></div></details>

| A | B |
| --- | --- |
| 1 | 2 |

!!! note "Formula"
    $E = mc^2$．
\x20\x20\x20\x20
??? warning "Details"
    Safe body
\x20\x20\x20\x20
```python
# code heading
print("<script>example</script>")
```

--8<-- "{secret.as_posix()}"

[attribute](https://example.com){{onclick="alert(1)" style="position:fixed"}}

<div markdown="1" class="mermaid" id="plw-quiz-root" data-manifest-url="https://evil.test">
[inner](javascript:alert(1)){{onmouseover="alert(1)"}}
</div>

<script>window.__community_attack = true</script>
<img src="javascript:alert(1)" onerror="alert(1)">
<svg onload="alert(1)"></svg>
<a href="jav&#x61;script:alert(1)">bad</a>

$\\href{{javascript:alert(1)}}{{x}}$

$\\style{{position:fixed;inset:0}}{{y}}$

$\\class{{mermaid}}{{z}} + \\cssId{{plw-quiz-root}}{{w}}$

$\\data{{plw-feature=quiz}}{{v}}$
'''
    submission = issue(body='## 投稿信息\n- **署名**: [author](https://evil.test) " onmouseover="alert(1)\n---\n' + source,
                       title='[投稿] <script>title-attack</script> [plain](https://evil.test)')
    generate_snapshot(docs / 'community', root / 'data/community-generated.json', issues=[submission])
    (docs / 'reference.md').write_text('---\ntitle: Reference\n---\n\n## Reference\n', encoding='utf-8')
    (docs / 'index.md').write_text(f'## Trusted\n\n--8<-- "{secret.as_posix()}"\n\n[trusted](https://example.com){{style="color:red"}}', encoding='utf-8')
    shutil.copytree(ROOT / 'overrides', root / 'overrides')
    config = {
        'site_name': 'Community security fixture', 'site_url': 'https://example.com/',
        'theme': {'name': None, 'custom_dir': (ROOT / 'mkdocs-material/material/templates').as_posix(), 'language': 'zh', 'icon': {'logo': 'material/school'}, 'font': False, 'features': []},
        'hooks': [(ROOT / path).as_posix() for path in ['hooks/community_content.py', 'hooks/on_env.py', 'hooks/runtime_features.py']],
        'markdown_extensions': ['attr_list', 'md_in_html', {'pymdownx.snippets': {'check_paths': True}}, {'pymdownx.arithmatex': {'generic': True}}],
    }
    (root / 'mkdocs.yml').write_text(yaml.safe_dump(config, allow_unicode=True), encoding='utf-8')
    result = subprocess.run([sys.executable, '-m', 'mkdocs', 'build', '--clean'], cwd=root, capture_output=True, text=True, encoding='utf-8')
    assert result.returncode == 0, result.stdout + result.stderr
    yield root, site


def test_real_mkdocs_output_is_isolated_and_preserves_legitimate_structure(built_community):
    root, site = built_community
    page = BeautifulSoup((site / 'community/42/index.html').read_text(encoding='utf-8'), 'html.parser')
    content = page.select_one('.plw-community-content')
    assert content is not None
    assert not page.select('[onmouseover]')
    assert '" onmouseover="alert(1)' in page.select_one('meta[name="author"]')['content']
    assert_safe(content)
    assert content.select_one('a[href="../../reference/"] strong em').text == 'reference'
    assert content.select_one('details[open] div p').text == 'Nested body'
    assert content.select_one('table td').text == '1'
    assert content.select_one('details.warning summary').text == 'Details'
    assert content.select_one('.admonition.note .arithmatex')
    assert not content.select('.mermaid, #plw-quiz-root, [data-manifest-url], [style], [markdown]')
    assert 'PRIVATE_INCLUDE_SENTINEL' not in page.text
    assert 'PRIVATE_INCLUDE_SENTINEL' in (site / 'index.html').read_text(encoding='utf-8')
    assert page.select_one('h2#community-safe-heading')
    assert page.select_one('nav a[href="#community-safe-heading"]')
    assert content.select_one('a[href="#community-safe-heading"]').text == 'Section'
    index = BeautifulSoup((site / 'community/index.html').read_text(encoding='utf-8'), 'html.parser')
    index_content = index.select_one('.plw-community-content')
    assert index_content.select_one('h2 a')['href'] == '42/'
    assert '[plain](https://evil.test)' in index_content.select_one('h2 a').text
    assert '[author](https://evil.test)' in index_content.text
    assert len(index_content.select('a')) == 1
    assert_safe(index_content)


def test_real_formula_postprocessing_cannot_reintroduce_unsafe_html(built_community):
    root, site = built_community
    environment = {**os.environ, 'SITE_DIR': str(site)}
    corepack = shutil.which('corepack.cmd') or shutil.which('corepack')
    result = subprocess.run([
        corepack, 'yarn', 'node', '--loader', 'ts-node/esm',
        'scripts/post-build/html-postprocess.ts', 'math', 'external-links',
    ], cwd=ROOT, env=environment, capture_output=True, text=True, encoding='utf-8')
    assert result.returncode == 0, result.stdout + result.stderr
    page = BeautifulSoup((site / 'community/42/index.html').read_text(encoding='utf-8'), 'html.parser')
    content = page.select_one('.plw-community-content')
    assert_safe(content)
    assert len(content.select('mjx-container')) >= 5
    assert len(content.select('mjx-assistive-mml')) == len(content.select('mjx-container'))
    assert not content.select('.arithmatex, .mermaid, #plw-quiz-root, [data-plw-feature]')
    for node in content.select('[style]'):
        assert 'position:fixed' not in node['style'].replace(' ', '')
        assert 'inset:' not in node['style']
    assert len(page.select('head link[href*="mathjax.css"]')) == 1
    assert page.select_one('article')['data-plw-math-css'].startswith('assets/stylesheets/mathjax.css?hash=')
    css = (site / 'assets/stylesheets/mathjax.css').read_text(encoding='utf-8')
    assert '.mjx-c1D438' in css  # E is used only by the community formula fixture.
