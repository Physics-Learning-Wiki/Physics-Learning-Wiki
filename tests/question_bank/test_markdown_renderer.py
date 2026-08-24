from scripts.question_bank.markdown_renderer import render_markdown


def test_math_markup_survives_sanitizing() -> None:
    rendered = render_markdown(r"速度为 \(v\)")
    assert "arithmatex" in rendered


def test_script_markup_is_removed() -> None:
    rendered = render_markdown("<script>alert(1)</script>安全")
    assert "<script" not in rendered


def test_managed_asset_reference_becomes_inert_placeholder() -> None:
    rendered = render_markdown("![斜面上的方块](asset:block)")
    assert 'data-plw-asset="block"' in rendered
    assert 'alt="斜面上的方块"' in rendered
