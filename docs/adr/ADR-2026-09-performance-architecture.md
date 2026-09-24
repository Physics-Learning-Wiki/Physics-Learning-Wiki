## ADR-2026-09：按需加载与站点性能架构

- 状态：已采纳
- 日期：2026-09-24

## 背景

站点的公式、搜索、测验、Mermaid 图和投稿编辑器只在部分页面或用户交互后需要。把这些依赖和样式放进全站资源，会让普通页面承担不必要的请求与解析成本。单体搜索索引、页面内重复的 MathJax 数据以及过大的作者源图也会放大页面和首屏资源。

站点同时使用 Material instant navigation。页面切换会替换内容而不重载整个文档，因此按页面启动的功能必须能在导航时取消、卸载，并处理迟到的异步结果。

## 决策

### 页面能力与运行时

- `hooks/runtime_features.py` 根据文章 DOM 中的稳定选择器生成 `data-plw-features`；选择器必须与功能真正使用的根节点一致。
- `docs/_static/js/runtime-loader.js` 是全站唯一的 PLW 功能入口。它保持精简，按文章能力加载本地 ESM 模块和功能样式。
- 新功能在 `scripts/runtime/src/loader.ts` 注册，在对应 `scripts/*/src/` 目录维护源代码；通过构建脚本生成 `docs/_static/` 下的浏览器产物，不手改生成 bundle。
- 功能挂载接收 `AbortSignal` 并返回 disposer。导航时先 abort，再逆序运行 disposers；若异步挂载在该页面失效后才返回 disposer，运行时立即调用它。
- 页面功能 CSS 在对应功能首次使用时加载。`extra_css` 只保留真正全站通用的样式；`extra_javascript` 不接收页面级功能。

### 数学排版

- 生产构建继续使用 MathJax 4 CHTML 服务端渲染，并保留 Assistive MathML。
- 公式字符通过全站预扫描收集，MathJax 使用 `adaptiveCSS: true`，生成一份共享且带 `hash` 版本参数的 `mathjax.css`。
- 数学文章保留构建期 CSS link 与 `data-plw-math-css` 版本 URL；运行时仅在数学页面需要时确保该 URL 的样式表存在，并跨 instant navigation 复用。
- 输出删除 MathJax 内部 `data-latex*` 和 1×1 GIF fallback。开发预览可使用客户端渲染；生产后处理移除客户端渲染脚本。

### 搜索

- 搜索使用 Pagefind 的分块索引，替代 `search/search_index.json` 单体索引。
- Pagefind 在生产构建中生成；用户聚焦或提交搜索时才动态加载 Pagefind JS 与索引分块，禁止把它静态加入页面脚本或 preload。
- 搜索外观继续复用 Material 搜索界面。`hooks/runtime_features.py` 将搜索根节点的 `data-md-component="search"` 改为 PLW 标记，避免 Material 内置搜索 worker 同时启动。
- `404.html` 和没有文章内容的辅助页面从 Pagefind 排除；404 模板保留可见搜索 UI，但不带 Material 搜索组件标记，也不带 `data-pagefind-body`。

### 页面功能和媒体

- Quiz、Mermaid、投稿表单和题目贡献表单分别构建为本地功能模块。Quiz 题库数据按 manifest、catalog 与题目/试卷 bundle 分块加载；EasyMDE 仅在投稿编辑器需要时加载。
- 第三方浏览器依赖固定精确版本并优先本地 bundle。确需 CDN 时，只能由相应功能在使用时加载。
- 图片流水线只修改 `site/` 构建结果，不覆盖 `docs/` 作者原图。符合条件的本地 PNG/JPEG 获得响应式 WebP `srcset` 和原图 fallback；`data-plw-no-optimize` 可为特殊内容显式跳过。
- 大于 500 KiB 的作者源 raster 必须进入显式维护的 `scripts/perf/large-image-allowlist.json`。流水线不会自动扩大 allowlist；生成的 WebP 变体由生成标记识别，不作为新增作者源图处理。

### 构建与性能门禁

- GitHub Pages 和 Netlify 调用 `scripts/build/build-site.sh`，以相同顺序完成前端构建、MkDocs、Pagefind、Math SSR、响应式图片、HTML 压缩、SEO 输出和静态性能审计。
- 确定性的资源、HTML、功能标记、搜索和图片预算由 `scripts/perf/audit-site.mjs --mode blocking` 阻断。
- Playwright 验证冷加载与 instant navigation 下的懒加载行为并阻断回归。请求量、实际传输字节、字体、LCP 与 CLS 在固定本地 Chromium 条件下报告；这些指标不代替线上 CDN 压缩与缓存测量，也不设为不稳定的 CI 硬门槛。

## 后果

- 普通页保留一个小型全站运行时，页面级 JS、CSS、数学字体和 Pagefind 分块在需要时才加载。
- 每种新功能需要同步维护 DOM 选择器、运行时注册、生命周期清理和测试。
- 静态预算的任何放宽必须直接修改 `scripts/perf/budgets.json`，并在代码评审中说明原因；审计器不得自动学习更高上限。
- 修改依赖或构建步骤后，必须重新生成并检查浏览器产物，避免源代码与提交的 bundle 不一致。

## 关键约束

- 不把页面级功能升级为全站资源来规避 instant navigation 生命周期问题。
- 不移除 Assistive MathML，也不关闭 MathJax 自适应 CSS。
- 不恢复单体 `search_index.json`。
- 不在图片构建中覆盖作者源图。
- 不直接编辑 minified/generated bundle。
