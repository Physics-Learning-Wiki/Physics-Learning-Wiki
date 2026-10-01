# scripts

本目录存放项目的构建、后处理、校验与维护脚本。运行时 feature、性能门禁、生产构建与资源规则见仓库根目录 [`CONTRIBUTING.md`](../CONTRIBUTING.md)。

## 生产构建

`build/build-site.sh` 是 GitHub Pages 与 Netlify 共用的完整生产构建入口，通过 `corepack yarn site:build` 调用。它运行前置脚本、构建前端 feature、构建 MkDocs、生成 Pagefind、运行 MathJax SSR、优化响应式图片、压缩 HTML、生成 SEO 文件并执行 blocking 性能审计。

## 构建阶段脚本

- `pre-build/`：安装或准备 MkDocs 主题、同步构建配置并生成导航资源。
- `build/`：统一生产构建编排。
- `post-build/`：页面贡献者/提交信息、MathJax SSR、外链与重定向等后处理。
- `post-build/media/`：只对生成的 `site/` HTML 与资源生成响应式 WebP 图片，不覆盖 `docs/` 作者原图。
- `perf/`：检查生成站点的资源引用、功能标记、图片来源、HTML 大小和预算；详见 [`tests/perf/README.md`](../tests/perf/README.md)。
- `post-deploy/`：生产部署后的 sitemap 转换和搜索推送脚本。

## 其他维护脚本

### 手动术语检查

`check-terminology.py` 是只读 Python 检查器，规则集中在脚本的 `RULES` 中，不接入 CI，不提供自动替换．使用项目 Python 环境运行：

```bash
uv run python scripts/check-terminology.py
uv run python scripts/check-terminology.py docs/thermodynamics docs/modern/general-relativity.md
uv run python scripts/check-terminology.py --format json
uv run python scripts/check-terminology.py --inventory
uv run pytest tests/test_check_terminology.py
```

默认扫描公开 Markdown，并读取 `mkdocs.yml` 的 `exclude_docs`；显式指定目录或文件也遵循该排除范围．输出文件、行号、列号、规则编号、等级和建议．`--inventory` 输出词形计数和位置，供复核使用；计数不代表错误数量．

确认错词和有明确上下文的错误组合为 `error`；别名、语境混用为 `warning`，需要人工判读．数学、物理与量子语境允许合法并存．跳过代码、公式、链接目标、HTML 语法和署名；链接文字及 title、description 仍检查．Mermaid 标签需要人工复核．

引述旧词或首次解释别名时，可在上一行注明规则编号与理由；豁免只作用于下一行，多个编号用逗号连接：

```markdown
<!-- terminology-ignore: T103 -- 首次解释旧称 -->
状态方程是物态方程的别名．
```

退出码：无确认错误（可有提示）为 `0`，存在确认错误为 `1`，输入或配置失败为 `2`．术语检查不能证明物理推导、数值或渲染正确，仍须复核正文和生产页面．

- `test.py`：检查文档中的实例代码。
- `check-characters.py`：扫描修改的 Markdown 与 TeX 文件中的不可见字符和易混淆字符。
- `check-nav-coverage.py`：检查 `docs/` 中的 Markdown 页面是否进入 `mkdocs.yml` 导航，并通过 `nav-coverage-ignore.txt` 维护例外页面。
- `celebration.py`：根据 star 数量创建项目庆祝 issue。
- `utils/`：通用辅助脚本，例如 `find_jk.py`。
