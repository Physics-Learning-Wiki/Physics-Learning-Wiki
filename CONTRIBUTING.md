# 工程贡献指南

本文面向修改站点运行时、构建流程和性能架构的贡献者。物理内容的写作规范见 [`docs/intro/writing.md`](docs/intro/writing.md)；架构决策记录见 [`docs/adr/ADR-2026-09-performance-architecture.md`](docs/adr/ADR-2026-09-performance-architecture.md)。

## 新增页面功能

页面级行为应作为独立 feature 实现，避免将 Quiz、Mermaid、投稿编辑器等代码放进全站脚本。

1. 在相应的 `scripts/` 源码目录实现功能模块，并让其 `mount(root, { signal })` 接收 `AbortSignal`。由 `mount` 返回 disposer，清理事件监听、计时器、observer、订阅和其他页面资源；异步操作尽可能把 `signal` 传给 `fetch`。
2. 在 `scripts/runtime/src/loader.ts` 的 feature registry 注册模块 URL 和可选样式表。运行时会按 URL 复用已加载模块和样式表。
3. 在 `hooks/runtime_features.py` 的 `FEATURE_SELECTORS` 注册能准确代表此功能的文章内 DOM selector。构建 hook 会将匹配到的能力写入 `article[data-plw-features]`。selector 必须与功能实际使用的根节点同步维护。
4. 通过对应的 feature build/check 命令生成并核对 `docs/_static/` 产物。不要直接编辑 minified bundle。
5. 为无 DOM 逻辑添加单元测试，为请求与导航生命周期添加 Playwright 覆盖。

### 生命周期约定

Material instant navigation 会在同一个文档中替换文章内容。离开页面时，运行时先 abort 该页的 `AbortController`，再按逆序调用 disposer。feature 必须在收到 abort 后停止后续副作用；不能只依赖整页 reload 清理状态。

挂载本身可以异步。如果挂载期间发生导航，而旧页面稍后才返回 disposer，运行时会立即调用这个迟到的 disposer。新增 feature 时要确保这条路径也能关闭已经创建的资源。

### CSS、JavaScript 与依赖

- `extra_css` 仅放确实适用于全站的公共样式。页面功能 CSS 在 feature registry 中声明，并随 feature 按需加载。
- `extra_javascript` 仅放最小的全站 runtime。不要把页面级 JS、Quiz、Mermaid、表单、Pagefind 或编辑器依赖放回其中。
- MathJax 的页面 CSS 由生产后处理生成并通过 `data-plw-math-css` 交给 runtime；不要把它加入全站 `extra_css`。
- 新增第三方浏览器依赖时固定精确版本，优先本地 bundle；如果必须使用 CDN，由对应功能在使用时加载。
- 不为了 instant navigation 将页面级 feature 升格成全站资源。

## 搜索与 404

- Pagefind 在生产构建后生成，使用 Pagefind 分块索引；不要恢复 `search/search_index.json` 或静态引用 Pagefind bundle。
- 搜索模块动态加载 Pagefind。修改搜索入口时，保证普通页首次加载不请求 Pagefind JS 或索引分块。
- `hooks/runtime_features.py` 会把 Material 搜索节点的 `data-md-component="search"` 替换为 `data-plw-component="search"`，由 PLW 搜索运行时接管。
- 404 搜索栏应保持可见，但 404 页面必须从 Pagefind 索引排除：不得添加 `data-pagefind-body`，并保留 `body[data-pagefind-ignore="all"]`。post-build hook 负责处理没有常规文章 `post_page` 事件的 404 模板；不要绕过这一步。

## MathJax SSR

- 生产站点使用 MathJax 4 CHTML SSR，并保留 Assistive MathML。
- 公式预扫描与 `adaptiveCSS: true` 共同产生单份公共 `mathjax.css`。构建期 stylesheet link 与文章 `data-plw-math-css` 必须指向同一带 `hash` 的 URL。
- Runtime 在需要数学的文章上复用此版本 URL；instant navigation 后不能新增第二个 Math CSS link。
- 不恢复 `data-latex`、`data-latex-item` 或 1×1 GIF fallback。
- 开发预览可通过客户端 MathJax 渲染；生产构建会移除仅用于该预览的 CSR 脚本。

## 图片与性能预算

- 将作者原图保存在 `docs/`；响应式 WebP 只由 `scripts/post-build/media/optimize-images.mjs` 写入生成的 `site/`。
- 优化器处理符合条件的本地 PNG/JPEG，在 HTML 中生成 WebP `srcset`、原图 fallback、尺寸与延迟解码标记。若内容必须保留原样，可显式使用 `data-plw-no-optimize`。
- 超过 500 KiB 的作者源 raster 必须在 `scripts/perf/large-image-allowlist.json` 中有精确路径。不要用通配符，也不要由脚本自动新增 allowlist 项；需要新增时在变更中说明源图和原因。
- `scripts/perf/budgets.json` 是 HTML、Math CSS、runtime loader 和源图片阈值的唯一预算配置。扩大任意上限都必须在 diff 中明确修改，并经代码评审说明原因。
- gzip/Brotli 值是本机固定参数压缩估算，不代表 GitHub Pages 或 Netlify 实际传输字节。

## 构建与验证

GitHub Pages 与 Netlify 共用生产编排。安装依赖后，在 Bash 环境运行：

```bash
corepack yarn site:build
```

等价入口是 `./scripts/build/build-site.sh`。它构建 feature 资源、MkDocs、Pagefind、MathJax SSR、响应式图片、压缩 HTML、SEO 文件，并以 blocking 模式运行静态性能审计。提交前运行：

```bash
corepack yarn perf:audit --mode blocking
corepack yarn e2e:smoke
corepack yarn e2e
```

完整 CI 前端与内容检查命令列在 [`.github/workflows/build.yml`](.github/workflows/build.yml)，其中包括 `uv run pytest tests/question_bank tests/integration tests/seo`、quiz/runtime/forms 类型检查与单测、生成产物检查以及 `corepack yarn media:test`。

生产后处理会为页面贡献者信息读取 GitHub API。若本机未认证请求碰到 API 限额，可通过 GitHub CLI 登录后将 token 仅注入本次构建进程：

```bash
GITHUB_TOKEN="$(gh auth token)" corepack yarn site:build
```

不要把 token 写入仓库文件或提交到版本控制。
