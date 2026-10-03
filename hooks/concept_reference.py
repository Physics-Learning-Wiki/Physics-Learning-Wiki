"""Connect concept compilation to MkDocs; the compiler owns content semantics."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.concepts.compiler import ConceptCompiler, ConceptExtension

_compiler: ConceptCompiler | None = None


def on_config(config, **kwargs):
    global _compiler
    root = Path(config.config_file_path).resolve().parent
    _compiler = ConceptCompiler(root / "data" / "concepts.yml")
    config.markdown_extensions[:] = [ext for ext in config.markdown_extensions if not isinstance(ext, ConceptExtension)]
    config.markdown_extensions.append(ConceptExtension(_compiler))


def on_pre_build(config, **kwargs):
    _compiler.reset()


def on_files(files, config, **kwargs):
    _compiler.set_files(files)


def on_page_markdown(markdown, page, **kwargs):
    _compiler.begin_page(page)
    return markdown


def on_page_content(html, **kwargs):
    return _compiler.finish_content(html)


def on_post_page(output, page, **kwargs):
    _compiler.collect_anchors(output, page)


def on_post_build(config, **kwargs):
    _compiler.validate_anchors()
