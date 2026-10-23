# 静态性能审计

生产构建末尾运行 blocking 审计；也可以在已有 `site/` 产物上单独执行：

```bash
corepack yarn perf:audit --mode blocking
```

需要只观察并输出报告时运行 `corepack yarn perf:audit --mode report`。默认报告写入仓库根目录 `site-performance-report.json`；可用 `--output` 指定其他路径。审计只读取 `site/`，不会修改构建产物。

## Blocking 检查

- 大小写不敏感的生成路径冲突、代表页面缺失和 allowlist 路径格式/存在性。
- 普通代表页不得静态引用数学、Quiz、Mermaid、投稿表单、EasyMDE 或 Pagefind 资源。
- Pagefind bundle 存在，旧 `search/search_index.json` 不存在；Pagefind 不得静态 preload；Material 搜索根节点不得保留旧组件标记；404 必须被排除在索引之外。
- 生产数学页必须有一份共享 Math CSS，构建期 link 和文章属性使用同一带 `hash` 的 URL；不超过 768 KiB。不得留下 `data-latex*` 或旧 1×1 GIF fallback。
- runtime loader 不超过 25 KiB。
- 大于 500 KiB 的源 raster 必须在 `scripts/perf/large-image-allowlist.json` 中显式登记；被优化器标记的 WebP 变体不算作者源图。每个被页面引用的大图都必须有可用的响应式 WebP source。
- `data-plw-features` 声明必须与数学、Mermaid、Quiz 和表单实际 DOM 根节点一致。

## 仅报告的 HTML 体积

代表 HTML 的未压缩体积超过以下参考值时，在控制台和 JSON 报告的 `representativeHtmlWarnings` 中告警，不阻断发布：广义相对论 450 KiB，理想气体热力学 450 KiB，简谐波 375 KiB，物理符号表 1024 KiB。页面缺失仍然阻断。

这些参考值无法区分正文增长、MathJax SSR 与无障碍标记、完整导航的体积，也不能直接反映实际压缩传输或渲染体验，因此不再作为发布硬门槛。保留原数值和压缩估算，供审查异常增长；不为通过体积检查裁剪导航或数学内容。

预算定义在 [`scripts/perf/budgets.json`](../../scripts/perf/budgets.json)，其中 `blocking` 控制硬门禁，`reportOnly` 控制观察项。调整阈值或将硬门禁改为观察项必须直接修改此文件并在 PR diff 中解释原因；审计脚本不会自动提高上限或扩展图片 allowlist。

Playwright 的冷加载和 instant navigation 行为门禁运行 `corepack yarn e2e`．浏览器请求/传输、字体、LCP 和 CLS 作为本地固定 Chromium 条件下的报告，不是 blocking 预算．报告中的 gzip/Brotli 字节使用 Node.js zlib 固定参数计算，不能代表托管平台的实际压缩传输．

浏览器检查直接复用已构建的 `site/`，覆盖普通页按需加载、MathJax 样式就绪与切页、小测保存恢复、投稿与草稿、搜索以及导航可访问性。主题和视口使用代表组合，核心存储流程不重复执行所有组合；抽屉边界宽度、移动端公式布局和实际颜色对比度仍保留专门检查。

成功用例不再生成审阅截图；失败时由 Playwright 自动保存截图并保留 trace，CI 继续上传 `test-results/`。界面检查以可见性、可读性和操作结果为准，不固定 RGB、边框样式、HTML 容器标签或生产题库某个 seed 的完整题号序列。
