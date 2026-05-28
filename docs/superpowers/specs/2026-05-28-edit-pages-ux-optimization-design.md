---
title: Edit Pages UX Optimization Design
date: 2026-05-28
status: approved
---

# Edit Pages UX Optimization Design

优化 edit-landing 和 submit 两个页面的用户体验，包括 Bug 修复、UI 微调统一和 LaTeX 预览渲染保障。

## Background

Physics Learning Wiki 的编辑入口（edit-landing）和 Web 投稿（submit）页面存在以下问题：

1. **Markdown 编辑器首次加载失败**：从其他页面导航到 submit 时，EasyMDE 编辑器不初始化，显示为一个小小的纯 textarea。只有刷新页面后才能正常显示工具栏。
2. **"目标章节"下拉框首次加载失败**：同样由于初始化逻辑未执行，下拉框只有一个默认选项。
3. **控件样式不统一**：edit-landing 页面的三个按钮尺寸和字体大小不一致，submit 页面的表单控件样式需要统一。
4. **LaTeX 预览渲染**：需要确保修复后 LaTeX 在预览模式中正常工作。

## Root Cause Analysis

mkdocs-material 使用即时导航（`navigation.instant`），通过 AJAX 加载页面内容。当从其他页面导航到 submit 页面时，浏览器不会触发 `DOMContentLoaded` 事件，而 `submit-form.js` 中所有初始化逻辑都绑定在这个事件上。

对比：`math-csr.js` 正确使用了 `document$.subscribe()` 模式，所以在即时导航场景下 MathJax 能正常工作。

## Design

### Module 1: Bug Fix — EasyMDE + Dropdown Initialization

**改动文件：**
- `docs/_static/js/submit-form.js` — 重构初始化逻辑
- `docs/submit.md` — 移除 EasyMDE CDN 的 `<link>`/`<script>` 标签和 `submit-form.js` 的 `<script>` 标签
- `mkdocs.yml` — 将 EasyMDE CSS/JS 和 `submit-form.js` 加入 `extra_css`/`extra_javascript`

**方案：**

将 `submit-form.js` 的初始化从 `DOMContentLoaded` 改为 `document$.subscribe()` 模式，与 `math-csr.js` 保持一致。

```js
// 核心逻辑伪代码
document$.subscribe(function() {
  // 仅在 submit 页面执行
  if (!document.getElementById("submission-form")) return;

  // 清理旧的 EasyMDE 实例（防止重复初始化）
  if (easyMDE) {
    easyMDE.toTextArea();
    easyMDE = null;
  }

  // 重新初始化所有组件
  populateChapterSelect();
  initEditor();
  setupAttributionToggle();
  // Turnstile、表单提交等
});
```

**关键细节：**
- `document$` 在每次页面变化时都会触发（包括首次加载和即时导航）
- 通过检查 `#submission-form` 是否存在来判断当前是否是 submit 页面
- 在重新初始化前清理旧的 EasyMDE 实例，避免内存泄漏和重复实例
- `submit-form.js` 和 EasyMDE CDN 链接从 `submit.md` 移到 `mkdocs.yml` 的 `extra_javascript`/`extra_css`，确保在即时导航场景下可用

### Module 2: UI Style Unification

**改动文件：**
- `docs/_static/css/submit-form.css` — 表单控件样式调整
- `docs/edit-landing.md` — 按钮样式内联调整

#### edit-landing 页面按钮统一

三个按钮（Web 投稿、GitHub 编辑、邮箱投稿）统一规范：
- `font-size: 0.9em`（当前 0.75em 偏小）
- `padding: 0.6em 1.2em`
- `border-radius: 6px`
- `line-height: 1.4`

保留三种不同颜色以区分功能，但尺寸和间距保持一致。

"GitHub 编辑"和"邮箱投稿"按钮水平并排显示。

#### submit 页面表单控件统一

- 所有表单控件（select、input、textarea）统一 `font-size: 0.95rem`
- label 统一 `font-size: 0.95rem`，`font-weight: 600`
- textarea 添加 `min-height: 200px`，确保未加载 EasyMDE 时也有合理高度
- EasyMDE 编辑器区域 `font-size: 0.95rem`
- 深色模式下 EasyMDE 编辑器背景、文字颜色适配

### Module 3: LaTeX Preview Rendering

**改动文件：**
- `docs/_static/js/submit-form.js` — 优化 MathJax 调用逻辑

**当前状态：** `previewRender` 函数已实现 MathJax 调用，使用 `setTimeout(100ms)` 延迟。

**优化措施：**
- 使用防抖（debounce 300ms）替代固定 100ms 延迟，避免快速输入时频繁调用 MathJax
- 确认 MathJax 通过 `extra_javascript` 全局加载，submit 页面可正常访问
- 深色模式下通过 CSS 确保 MathJax 输出可读

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `docs/_static/js/submit-form.js` | Modify | 重构初始化逻辑为 `document$.subscribe()` 模式，优化 MathJax 调用 |
| `docs/submit.md` | Modify | 移除 EasyMDE CDN 的 `<link>`/`<script>` 和 `submit-form.js` 的 `<script>` 标签 |
| `mkdocs.yml` | Modify | 将 EasyMDE CSS/JS 和 `submit-form.js` 加入 `extra_css`/`extra_javascript` |
| `docs/_static/css/submit-form.css` | Modify | 统一控件样式，添加 textarea 最小高度，深色模式适配 |
| `docs/edit-landing.md` | Modify | 统一按钮样式 |

## Testing

1. **Bug 修复验证：**
   - 从首页通过即时导航到 submit 页面，确认编辑器工具栏和下拉框正常加载
   - 在 submit 页面编辑内容后导航到其他页面，再导航回来，确认编辑器重新初始化
   - 刷新页面确认功能正常

2. **UI 验证：**
   - 检查 edit-landing 页面三个按钮尺寸一致
   - 检查 submit 页面所有表单控件字体大小统一
   - 切换深色/浅色模式，确认样式正常

3. **LaTeX 验证：**
   - 在编辑器中输入 LaTeX 公式（如 `$E=mc^2$`），切换到预览模式确认渲染正常
   - 输入块级公式（如 `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`），确认渲染正常

## Out of Scope

- 编辑区域内的实时 LaTeX 渲染（仅预览模式）
- 页面标题 "Edit landing" 的中文化（属于 mkdocs 配置层面，不在本次范围内）
- 底部导航栏遮挡内容的问题（属于 mkdocs-material 主题层面）
