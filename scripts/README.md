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

- `test.py`：检查文档中的实例代码。
- `check-characters.py`：扫描修改的 Markdown 与 TeX 文件中的不可见字符和易混淆字符。
- `check-nav-coverage.py`：检查 `docs/` 中的 Markdown 页面是否进入 `mkdocs.yml` 导航，并通过 `nav-coverage-ignore.txt` 维护例外页面。
- `celebration.py`：根据 star 数量创建项目庆祝 issue。
- `utils/`：通用辅助脚本，例如 `find_jk.py`。
