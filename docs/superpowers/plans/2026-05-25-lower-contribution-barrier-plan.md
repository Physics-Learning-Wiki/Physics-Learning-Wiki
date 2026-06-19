## 降低贡献门槛 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Physics Learning Wiki 搭建 Web 投稿门户 + 自动化流水线 + 内容质量分级系统，让不熟悉 GitHub 的物理爱好者也能贡献内容

**Architecture:** 前端投稿页面（EasyMDE Markdown 编辑器 + MathJax 预览）通过 Vercel Serverless Function 代理调用 GitHub Issues API 创建投稿 Issue；GitHub Actions 实现格式检查、Nav 自动生成、Author 自动提取、社区页面生成和投稿分拣

**Tech Stack:** MkDocs Material + Python（uv）+ Node.js（yarn）+ EasyMDE + MathJax + Vercel Functions + GitHub Issues API + GitHub Actions

---

## 前置决策

计划默认使用 **Vercel Serverless Function** 作为后端代理（原因：项目尚未迁移 CloudFlare，Vercel 免费额度足够且部署简单）。迁移 CloudFlare 后可将 `api/submit.js` 迁移为 CloudFlare Worker，接口签名保持一致。

---

## Phase 1: 投稿门户 + 自动化流水线

### Task 1: 后端提交端点（Vercel Function）

**Files:**
- Create: `api/submit.js`（Vercel Serverless Function）
- Create: `vercel.json`（Vercel 项目配置）

- [ ] **Step 1: 创建 Vercel 项目配置**

```json
// vercel.json
{
  "functions": {
    "api/submit.js": {
      "memory": 256,
      "maxDuration": 10
    }
  }
}
```

- [ ] **Step 2: 编写提交处理函数**

```javascript
// api/submit.js
import { Octokit } from "octokit";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const OWNER = "Physics-Learning-Wiki";
const REPO = "Physics-Learning-Wiki";

const SUBMISSION_LABELS = {
  "full-page": "投稿-完整页面",
  "notes": "投稿-笔记/提纲",
  "errata": "投稿-勘误",
  "suggestion": "投稿-建议",
};

function buildIssueBody(data) {
  const lines = [
    `## 投稿信息`,
    ``,
    `- **投稿类型**: ${data.type}`,
    `- **目标章节**: ${data.chapter || "未指定"}`,
    `- **署名**: ${data.attribution || "匿名"}`,
  ];
  if (data.contact) {
    lines.push(`- **联系方式**: ${data.contact}`);
  }
  lines.push(``, `---`, ``, data.content);
  return lines.join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { title, content, type, chapter, attribution, contact, turnstileToken } =
      req.body;

    if (!title || !content || !type) {
      return res.status(400).json({ error: "缺少必填字段：标题、正文、投稿类型" });
    }

    if (!["full-page", "notes", "errata", "suggestion"].includes(type)) {
      return res.status(400).json({ error: "无效的投稿类型" });
    }

    // Validate Turnstile
    const turnstileResult = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET,
          response: turnstileToken,
        }),
      }
    );
    const turnstileData = await turnstileResult.json();
    if (!turnstileData.success) {
      return res.status(400).json({ error: "人机验证失败，请重试" });
    }

    const label = SUBMISSION_LABELS[type] || "投稿-待审核";

    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const issue = await octokit.rest.issues.create({
      owner: OWNER,
      repo: REPO,
      title: `[投稿] ${title}`,
      body: buildIssueBody({ title, content, type, chapter, attribution, contact }),
      labels: ["投稿-待审核", label],
    });

    return res.status(200).json({
      success: true,
      issueUrl: issue.data.html_url,
      issueNumber: issue.data.number,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return res.status(500).json({ error: "提交失败，请稍后重试" });
  }
}
```

- [ ] **Step 3: 设置环境变量**

在 Vercel 项目设置中添加 Secrets：
- `GITHUB_TOKEN`：具有 `issues:write` 权限的 GitHub Personal Access Token（Fine-grained，仅限本仓库）
- `TURNSTILE_SECRET_KEY`：CloudFlare Turnstile 的 Secret Key

- [ ] **Step 4: 部署到 Vercel**

```bash
cd d:/Programs/Physics-Learning-Wiki
npx vercel --prod
```

记录部署后的 URL（如 `https://physics-learning-wiki.vercel.app`）。后续 Task 3 的表单提交目标使用此 URL。

- [ ] **Step 5: 测试端点**

```bash
curl -X POST https://<deployment-url>/api/submit \
  -H "Content-Type: application/json" \
  -d '{"title":"测试投稿","content":"这是一条测试内容","type":"suggestion","attribution":"测试者","turnstileToken":"test"}'
```

预期：返回 400（Turnstile 验证失败，因为是测试 token），确认函数可访问。

- [ ] **Step 6: Commit**

```bash
git add api/submit.js vercel.json
git commit -m "feat: add submission endpoint (Vercel Function)"
```

---

### Task 2: 投稿页面 — HTML 结构与样式

**Files:**
- Create: `docs/submit.md`
- Create: `docs/_static/css/submit-form.css`

- [ ] **Step 1: 创建投稿页面 Markdown 文件**

```markdown
<!-- docs/submit.md -->
# 提交你的物理知识

感谢你愿意为 Physics Learning Wiki 做出贡献！填写下方表单即可提交内容，无需 GitHub 账号。

---

<form id="submission-form">
  <div class="submit-field">
    <label for="submit-type">投稿类型 <span class="required">*</span></label>
    <select id="submit-type" name="type" required>
      <option value="">-- 请选择 --</option>
      <option value="full-page">完整页面 — 结构完整、可直接发布的文章</option>
      <option value="notes">笔记/提纲 — 课堂笔记、复习提纲、思维导图等半成品</option>
      <option value="errata">勘误纠错 — 指出现有页面的错误并提供修正</option>
      <option value="suggestion">建议/想法 — 对网站结构、内容方向的意见</option>
    </select>
  </div>

  <div class="submit-field">
    <label for="submit-chapter">目标章节</label>
    <select id="submit-chapter" name="chapter">
      <option value="">-- 可选，帮助编辑组分类 --</option>
    </select>
  </div>

  <div class="submit-field">
    <label for="submit-title">标题 <span class="required">*</span></label>
    <input type="text" id="submit-title" name="title" required
           placeholder="给你的投稿起个名字" maxlength="120">
  </div>

  <div class="submit-field">
    <label for="submit-content">正文 <span class="required">*</span></label>
    <textarea id="submit-content" name="content" required></textarea>
    <div class="submit-hint" id="submit-hint"></div>
  </div>

  <div class="submit-field">
    <label>署名方式</label>
    <div class="submit-radio-group">
      <label><input type="radio" name="attribution-type" value="named" checked> 姓名/网名</label>
      <label><input type="radio" name="attribution-type" value="anonymous"> 匿名</label>
    </div>
    <input type="text" id="submit-attribution" name="attribution"
           placeholder="你希望在页面上显示的署名" maxlength="60">
  </div>

  <div class="submit-field">
    <label for="submit-contact">联系方式（选填）</label>
    <input type="text" id="submit-contact" name="contact"
           placeholder="QQ/微信/邮箱，方便编辑组与你沟通修改">
  </div>

  <div class="submit-field">
    <div id="turnstile-widget"></div>
  </div>

  <div class="submit-actions">
    <button type="submit" id="submit-btn">提交投稿</button>
    <span id="submit-status"></span>
  </div>
</form>

<div id="submit-success" style="display:none;">
  <h2>投稿已提交！</h2>
  <p>编辑组将在 3-5 天内处理。如需跟进，请保存此链接：</p>
  <p><a id="submit-issue-link" href="#" target="_blank"></a></p>
  <p>如果你愿意注册 GitHub 账号并在 Issue 中参与讨论，修改会更高效。</p>
</div>

<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">
<script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
<script src="../_static/js/submit-form.js"></script>
```

- [ ] **Step 2: 创建投稿页面样式**

```css
/* docs/_static/css/submit-form.css */
.submit-field {
  margin-bottom: 1.5rem;
}
.submit-field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.35rem;
}
.required {
  color: #e53e3e;
}
.submit-field select,
.submit-field input[type="text"] {
  width: 100%;
  max-width: 560px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.95rem;
}
.submit-hint {
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: #718096;
}
.submit-radio-group {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
}
.submit-radio-group label {
  font-weight: 400;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.submit-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}
#submit-btn {
  padding: 0.65em 1.8em;
  background: #6190e8;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}
#submit-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}
#submit-status {
  font-size: 0.9rem;
}
#submit-status.error {
  color: #e53e3e;
}
#submit-success {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f0fff4;
  border: 1px solid #c6f6d5;
  border-radius: 8px;
}
/* EasyMDE overrides */
.EasyMDEContainer {
  max-width: 100%;
}
.EasyMDEContainer .CodeMirror {
  height: 400px;
  font-size: 0.95rem;
  border-radius: 6px;
}
.editor-toolbar {
  border-radius: 6px 6px 0 0;
}
```

- [ ] **Step 3: 注册 CSS 文件到 mkdocs.yml**

在 `mkdocs.yml` 的 `extra_css` 列表末尾添加：

```yaml
  - '_static/css/submit-form.css?v=1'
```

- [ ] **Step 4: 注册 JS 文件到 mkdocs.yml**

在 `mkdocs.yml` 的 `extra_javascript` 列表末尾添加：

```yaml
  - '_static/js/submit-form.js?v=1'
```

- [ ] **Step 5: 将投稿页面加入导航**

在 `mkdocs.yml` 的 `nav` → `简介` 部分添加：

```yaml
    - 投稿: submit.md
```

- [ ] **Step 6: Commit**

```bash
git add docs/submit.md docs/_static/css/submit-form.css mkdocs.yml
git commit -m "feat: add submission page structure and styles"
```

---

### Task 3: 投稿页面 — Markdown 编辑器与章节下拉

**Files:**
- Create: `docs/_static/js/submit-form.js`

- [ ] **Step 1: 创建章节下拉数据生成逻辑**

在 `submit-form.js` 开头，从 mkdocs.yml 的 nav 结构构建章节下拉选项。由于 MkDocs 静态页面中无法直接读取 YAML，采用预生成 JSON 的方案：

在 `docs/_static/js/` 下创建 `nav-tree.json`（由 Task 8 的 nav 生成脚本同步产出）。

当前先手工维护一个简要版本，后续 Task 8 自动覆盖：

```javascript
// docs/_static/js/submit-form.js
// 章节下拉数据。由 scripts/generate-nav.py 自动生成，勿手动编辑。
// Last generated: 2026-05-25
const NAV_TREE = [
  { label: "数学工具", children: [
    { label: "微积分", children: [
      { label: "极限与连续" },
      { label: "导数与微分" },
      { label: "积分" },
      { label: "常微分方程" },
      { label: "变分法" },
    ]},
    { label: "线性代数", children: [
      { label: "向量与矩阵" },
      { label: "线性空间" },
    ]},
    { label: "矢量分析" },
    { label: "复数与复变函数" },
    { label: "概率与统计" },
    { label: "常用特殊函数" },
  ]},
  { label: "经典力学", children: [
    { label: "质点运动学" },
    { label: "质点动力学" },
    { label: "刚体力学" },
    { label: "流体力学" },
    { label: "振动与波" },
    { label: "万有引力与天体物理" },
    { label: "分析力学" },
  ]},
  { label: "热学与统计物理", children: [
    { label: "热学基本概念和物质聚集态" },
    { label: "热平衡态的统计分布律" },
    { label: "热力学第一定律" },
  ]},
  { label: "电磁学" },
  { label: "光学" },
  { label: "近代物理" },
  { label: "实验物理" },
  { label: "计算物理与工具" },
  { label: "竞赛相关" },
];

function populateChapterSelect() {
  const select = document.getElementById("submit-chapter");
  if (!select) return;

  function addOptions(children, prefix) {
    for (const item of children) {
      const label = prefix ? `${prefix} > ${item.label}` : item.label;
      const option = document.createElement("option");
      option.value = label;
      option.textContent = label;
      select.appendChild(option);
      if (item.children) {
        addOptions(item.children, label);
      }
    }
  }
  addOptions(NAV_TREE, "");
}

document.addEventListener("DOMContentLoaded", populateChapterSelect);
```

- [ ] **Step 2: 初始化 EasyMDE 编辑器**

```javascript
// 接上面 submit-form.js，继续在 DOMContentLoaded 回调中执行

let easyMDE;

function initEditor() {
  easyMDE = new EasyMDE({
    element: document.getElementById("submit-content"),
    spellChecker: false,
    placeholder: "在这里写你的内容... 支持 Markdown 和 LaTeX 公式",
    toolbar: [
      "bold", "italic", "heading", "|",
      "quote", "unordered-list", "ordered-list", "|",
      "link", "image", "|",
      {
        name: "inline-math",
        action: function customFunction(editor) {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`$${selection}$`);
          if (!selection) {
            const pos = cm.getCursor();
            cm.setCursor({ line: pos.line, ch: pos.ch - 1 });
          }
        },
        className: "fa fa-hashtag",
        title: "行内公式 $...$",
      },
      {
        name: "block-math",
        action: function customFunction(editor) {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`$$${selection}$$`);
        },
        className: "fa fa-superscript",
        title: "块级公式 $$...$$",
      },
      "|",
      "preview", "side-by-side", "fullscreen",
    ],
    renderingConfig: {
      singleLineBreaks: false,
      codeSyntaxHighlighting: true,
    },
    previewRender: function (plainText, previewElement) {
      // 使用 EasyMDE 默认的 Markdown 渲染
      const html = this.parent.markdown(plainText);
      previewElement.innerHTML = html;
      // 异步触发 MathJax 渲染
      setTimeout(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise([previewElement]).catch(console.error);
        }
      }, 100);
      return previewElement.innerHTML;
    },
  });
}

document.addEventListener("DOMContentLoaded", initEditor);
```

- [ ] **Step 3: 添加投稿类型切换时的提示文案**

```javascript
// 继续在 submit-form.js 末尾

const TYPE_HINTS = {
  "full-page": "请包含：问题引入 → 核心概念 → 公式推导 → 例题 → 易错点",
  "notes": "半成品也没关系！把你的课堂笔记、复习提纲、思维导图粘贴进来即可",
  "errata": "请指出：具体章节 → 哪段文字/公式 → 错误描述 → 正确版本",
  "suggestion": "对网站结构、内容方向、功能改进的任何想法都欢迎",
};

function updateTypeHint() {
  const typeSelect = document.getElementById("submit-type");
  const hint = document.getElementById("submit-hint");
  if (typeSelect && hint) {
    hint.textContent = TYPE_HINTS[typeSelect.value] || "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const typeSelect = document.getElementById("submit-type");
  if (typeSelect) {
    typeSelect.addEventListener("change", updateTypeHint);
    updateTypeHint();
  }
});
```

- [ ] **Step 4: 添加匿名切换逻辑**

```javascript
// 继续在 submit-form.js 末尾

function setupAttributionToggle() {
  const namedRadio = document.querySelector('input[name="attribution-type"][value="named"]');
  const anonRadio = document.querySelector('input[name="attribution-type"][value="anonymous"]');
  const attributionInput = document.getElementById("submit-attribution");

  if (!namedRadio || !anonRadio || !attributionInput) return;

  namedRadio.addEventListener("change", () => {
    attributionInput.disabled = false;
    attributionInput.placeholder = "你希望在页面上显示的署名";
  });
  anonRadio.addEventListener("change", () => {
    attributionInput.disabled = true;
    attributionInput.value = "";
    attributionInput.placeholder = "将显示为「匿名同学」";
  });
}

document.addEventListener("DOMContentLoaded", setupAttributionToggle);
```

- [ ] **Step 5: Commit**

```bash
git add docs/_static/js/submit-form.js
git commit -m "feat: add EasyMDE editor, chapter dropdown, and type hints to submission form"
```

---

### Task 4: 投稿页面 — 表单提交与 Turnstile

**Files:**
- Modify: `docs/_static/js/submit-form.js`（追加提交逻辑）

- [ ] **Step 1: 添加 Turnstile 初始化和表单提交逻辑**

```javascript
// 追加到 submit-form.js 末尾
// 将此 URL 替换为 Task 1 部署后获得的实际 Vercel 地址
const SUBMIT_ENDPOINT = "https://physics-learning-wiki.vercel.app/api/submit";

let turnstileToken = null;

function initTurnstile() {
  if (typeof turnstile === "undefined") {
    console.warn("Turnstile not loaded");
    return;
  }
  turnstile.render("#turnstile-widget", {
    sitekey: "YOUR_TURNSTILE_SITE_KEY",
    callback: function (token) {
      turnstileToken = token;
    },
    "expired-callback": function () {
      turnstileToken = null;
    },
  });
}

// Turnstile 加载完成后自动初始化
window.onloadTurnstileCallback = initTurnstile;

async function handleSubmit(event) {
  event.preventDefault();

  const btn = document.getElementById("submit-btn");
  const status = document.getElementById("submit-status");
  const typeSelect = document.getElementById("submit-type");
  const titleInput = document.getElementById("submit-title");
  const chapterSelect = document.getElementById("submit-chapter");
  const attributionInput = document.getElementById("submit-attribution");
  const contactInput = document.getElementById("submit-contact");
  const anonRadio = document.querySelector('input[name="attribution-type"][value="anonymous"]');

  status.textContent = "";
  status.className = "";

  if (!easyMDE) {
    status.textContent = "编辑器尚未初始化，请刷新页面后重试";
    status.className = "error";
    return;
  }

  const content = easyMDE.value().trim();
  const title = titleInput.value.trim();
  const type = typeSelect.value;

  if (!title || !content || !type) {
    status.textContent = "请填写标题、正文和投稿类型";
    status.className = "error";
    return;
  }

  if (!turnstileToken) {
    status.textContent = "请完成人机验证";
    status.className = "error";
    return;
  }

  btn.disabled = true;
  btn.textContent = "提交中...";

  const typeLabels = {
    "full-page": "完整页面",
    "notes": "笔记/提纲",
    "errata": "勘误纠错",
    "suggestion": "建议/想法",
  };

  try {
    const resp = await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        type,
        typeLabel: typeLabels[type] || type,
        chapter: chapterSelect.value,
        attribution: anonRadio && anonRadio.checked
          ? "匿名"
          : (attributionInput.value.trim() || "匿名"),
        contact: contactInput.value.trim(),
        turnstileToken,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || "提交失败");
    }

    // 显示成功页面
    document.getElementById("submission-form").style.display = "none";
    document.getElementById("submit-success").style.display = "block";
    const link = document.getElementById("submit-issue-link");
    link.href = data.issueUrl;
    link.textContent = data.issueUrl;
  } catch (err) {
    status.textContent = err.message || "提交失败，请稍后重试。也可直接发送邮件至 submit@folderrewind.top";
    status.className = "error";
    btn.disabled = false;
    btn.textContent = "提交投稿";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("submission-form");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
});
```

- [ ] **Step 2: 注册 Turnstile site key**

在 `docs/submit.md` 末尾的 `<script>` 加载代码中，Turnstile 的 site key 通过 JS 变量传入（不暴露在 HTML 中）。将 `YOUR_TURNSTILE_SITE_KEY` 替换为从 CloudFlare Turnstile 控制台获取的实际 Site Key。

获取方式：访问 https://dash.cloudflare.com/ → Turnstile → Add Site → 选择 "Invisible" 模式 → 获得 Site Key 和 Secret Key。

- [ ] **Step 3: 本地测试**

```bash
cd d:/Programs/Physics-Learning-Wiki
uv run mkdocs serve
```

打开 http://localhost:8000/submit/ ，验证：
- 编辑器正常加载
- 章节下拉有选项
- 投稿类型切换时提示文案变化
- 匿名切换时输入框禁用
- 检查浏览器 Console 无 JS 错误

- [ ] **Step 4: Commit**

```bash
git add docs/_static/js/submit-form.js docs/submit.md
git commit -m "feat: add form submission logic with Turnstile"
```

---

### Task 5: 更新编辑入口页面

**Files:**
- Modify: `docs/edit-landing.md`

- [ ] **Step 1: 在 edit-landing.md 增加投稿入口**

在 `docs/edit-landing.md` 的两条现有入口之后、"署名说明"之前，增加投稿表单作为第三条路径：

```markdown
3. **Web 投稿**：直接在本站填写表单提交内容，无需 GitHub 账号。适合快速分享笔记、提交勘误或提出建议。

<a href="/submit/" style="padding: 0.75em 1.25em; display: inline-block; line-height: 1; text-decoration: none; white-space: nowrap; cursor: pointer; border: 1px solid #e85d04; border-radius: 5px; background-color: #e85d04; color: #fff; outline: none; font-size: 0.75em; margin-left: 0.75em;">📝 Web 投稿</a>
```

- [ ] **Step 2: Commit**

```bash
git add docs/edit-landing.md
git commit -m "feat: add web submission link to edit-landing page"
```

---

### Task 6: 格式检查脚本

**Files:**
- Create: `scripts/check-format.py`
- Modify: `.github/workflows/check-content.yml`（Task 7 中创建）

- [ ] **Step 1: 编写格式检查脚本**

```python
# scripts/check-format.py
"""检查 Markdown 文件的格式规范。在 CI 中运行，非零退出码表示检查未通过。"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

LATEX_PATTERNS = [
    # $$ 配对检查
    (r"(?<!\$)\$\$(?!\$)", "$$"),
    # 未闭合的花括号
    (r"(?<!\\)\{(\d+)", None),  # 占位
]

def check_file(filepath: Path) -> list[str]:
    """检查单个文件，返回问题列表。"""
    issues: list[str] = []
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception:
        return [f"{filepath}: 无法读取文件"]

    lines = text.split("\n")

    # 检查 $$ 配对
    dollar_count = 0
    for lineno, line in enumerate(lines, start=1):
        dollar_count += line.count("$$")
    if dollar_count % 2 != 0:
        # 找到第一个不配对的位置
        count = 0
        for lineno, line in enumerate(lines, start=1):
            for i, ch in enumerate(line):
                if ch == "$" and i + 1 < len(line) and line[i + 1] == "$":
                    count += 1
                    if count > dollar_count // 2 * 2:
                        issues.append(
                            f"{filepath}:{lineno}: $$ 不配对 (共 {dollar_count} 个)"
                        )
                        break

    # 检查行间公式中 \frac 应为 \dfrac
    for lineno, line in enumerate(lines, start=1):
        if line.strip().startswith("$$") or "$$" in line:
            if "\\frac{" in line:
                issues.append(
                    f"{filepath}:{lineno}: 行间公式中建议用 \\dfrac 替代 \\frac"
                )

    # 检查中英文混排空格
    # 中文后接英文/数字
    zh_followed_by_en = re.compile(r"[一-鿿]([A-Za-z0-9])")
    for lineno, line in enumerate(lines, start=1):
        for match in zh_followed_by_en.finditer(line):
            issues.append(
                f"{filepath}:{lineno}:{match.start()}: 中文与英文/数字之间建议加空格"
            )

    # 英文/数字后接中文
    en_followed_by_zh = re.compile(r"([A-Za-z0-9])[一-鿿]")
    for lineno, line in enumerate(lines, start=1):
        for match in en_followed_by_zh.finditer(line):
            issues.append(
                f"{filepath}:{lineno}:{match.start()}: 英文/数字与中文之间建议加空格"
            )

    # 检查空行规范：标题前后应有空行
    for lineno, line in enumerate(lines, start=1):
        if line.startswith("#"):
            if lineno > 1 and lines[lineno - 2].strip() != "":
                issues.append(
                    f"{filepath}:{lineno}: 标题前应有空行"
                )

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="检查 Markdown 格式规范")
    parser.add_argument("paths", nargs="*", default=["docs"], help="要检查的文件或目录")
    parser.add_argument("--strict", action="store_true", help="严格模式：警告也导致失败")
    args = parser.parse_args()

    all_issues: list[str] = []
    docs_dir = Path("docs")

    for raw_path in args.paths:
        path = Path(raw_path)
        if path.is_dir():
            for md_file in sorted(path.rglob("*.md")):
                all_issues.extend(check_file(md_file))
        elif path.is_file():
            all_issues.extend(check_file(path))

    errors = [i for i in all_issues if "建议" not in i]
    warnings = [i for i in all_issues if "建议" in i]

    if warnings:
        print(f"\n⚠ 格式建议 ({len(warnings)}):")
        for w in warnings:
            print(f"  {w}")

    if errors:
        print(f"\n❌ 格式错误 ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
        return 1

    if not warnings and not errors:
        print("✅ 格式检查通过")

    if args.strict and warnings:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: 本地测试脚本**

```bash
cd d:/Programs/Physics-Learning-Wiki
uv run python scripts/check-format.py docs/intro/htc.md
```

验证能正常检测格式问题。

- [ ] **Step 3: Commit**

```bash
git add scripts/check-format.py
git commit -m "feat: add format check script for Markdown and LaTeX"
```

---

### Task 7: 格式检查 CI Workflow

**Files:**
- Create: `.github/workflows/check-content.yml`

- [ ] **Step 1: 创建 CI workflow**

```yaml
# .github/workflows/check-content.yml
name: Check Content Format

on:
  pull_request:
    branches:
      - main
    paths:
      - "docs/**/*.md"
  workflow_dispatch:

jobs:
  check-format:
    name: Check Markdown & LaTeX Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Run format checker
        run: python scripts/check-format.py docs
      - name: Post results as PR comment
        if: github.event_name == 'pull_request' && failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require("fs");
            const { execSync } = require("child_process");
            const output = execSync("python scripts/check-format.py docs", {
              encoding: "utf-8",
            }).replace(/.*/, "");
            // Truncate to fit in PR comment
            const truncated = output.length > 60000
              ? output.slice(0, 60000) + "\n\n... (输出过长已截断)"
              : output;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## 📋 格式检查结果\n\n\`\`\`\n${truncated}\n\`\`\`\n\n请根据以上建议修改后重新提交。格式相关问题为**建议修改**（非阻断），但建议在合并前修正。`,
            });
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/check-content.yml
git commit -m "feat: add content format check CI workflow"
```

---

### Task 8: Nav 自动生成脚本

**Files:**
- Create: `scripts/generate-nav.py`
- Modify: `scripts/pre-build/pre-build.sh`（在构建前调用）

- [ ] **Step 1: 编写 Nav 生成脚本**

```python
# scripts/generate-nav.py
"""从 docs/ 目录结构自动生成 MkDocs nav 配置，并产出前端章节下拉 JSON。

规则：
1. 每个目录下的 index.md 作为章节首页，其一号标题作为章节名
2. 其他 .md 文件按文件名排序
3. _ 开头的目录和特殊文件自动排除
4. 手动排序：各目录中放置 _order.txt（一行一个文件名），指定顺序
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


EXCLUDE_DIR_PREFIXES = ("_", ".", "community")
EXCLUDE_FILES = {
    "edit-landing.md", "CNAME", "robots.txt", "manifest.webmanifest",
    "favicon.ico", "service-worker.js",
}

# mkdocs.yml 中 nav 之前的固定部分（不在此脚本管理的范围内）
# 生成的 nav 会合并到 mkdocs.yml 的 nav 段


def extract_title(md_path: Path) -> str:
    """从 Markdown 文件中提取一级标题。"""
    try:
        text = md_path.read_text(encoding="utf-8")
        match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
        if match:
            return match.group(1).strip()
    except Exception:
        pass
    return md_path.stem


def load_order(directory: Path) -> dict[str, int]:
    """读取 _order.txt，返回 文件名→序号 的映射。"""
    order_file = directory / "_order.txt"
    if not order_file.exists():
        return {}
    order: dict[str, int] = {}
    for i, line in enumerate(order_file.read_text(encoding="utf-8").splitlines()):
        name = line.strip()
        if name and not name.startswith("#"):
            order[name] = i
    return order


def build_nav(docs_dir: Path, current_dir: Path, indent: int = 0) -> list:
    """递归构建 nav 结构。返回 (nav_list, error_count)。"""
    items: list = []
    order = load_order(current_dir)

    # index.md → 章节首页
    index_file = current_dir / "index.md"
    has_index = index_file.exists()

    # 收集子目录和文件
    subdirs: list[Path] = []
    files: list[Path] = []

    for entry in sorted(current_dir.iterdir()):
        if entry.name.startswith(EXCLUDE_DIR_PREFIXES):
            continue
        if entry.is_dir():
            subdirs.append(entry)
        elif entry.is_file() and entry.suffix == ".md":
            if entry.name == "index.md" or entry.name in EXCLUDE_FILES:
                continue
            files.append(entry)

    # 按 _order.txt 排序
    def sort_key(p: Path) -> int:
        return order.get(p.name, 9999)

    files.sort(key=sort_key)
    subdirs.sort(key=sort_key)

    # 添加子目录中的页面
    for file in files:
        rel_path = file.relative_to(docs_dir).as_posix()
        title = extract_title(file)
        items.append({title: rel_path})

    # 递归处理子目录
    for subdir in subdirs:
        sub_items = build_nav(docs_dir, subdir, indent + 1)
        if sub_items:
            sub_index = subdir / "index.md"
            sub_title = (
                extract_title(sub_index) if sub_index.exists() else subdir.name
            )
            if len(sub_items) == 1 and isinstance(sub_items[0], dict):
                # 扁平化：如果子目录只有一个条目且不是嵌套结构
                pass
            items.append({sub_title: sub_items})

    return items


def generate_nav_tree_json(docs_dir: Path, output_path: Path) -> list:
    """生成前端章节下拉所需的 JSON 数据。"""
    nav = build_nav(docs_dir, docs_dir)

    def convert(node):
        if isinstance(node, str):
            return None
        if isinstance(node, dict):
            result = []
            for key, value in node.items():
                if isinstance(value, str):
                    result.append({"label": key})
                elif isinstance(value, list):
                    children = []
                    for child in value:
                        converted = convert(child)
                        if converted:
                            children.extend(converted if isinstance(converted, list) else [converted])
                    result.append({"label": key, "children": children})
            return result
        return None

    tree = convert(nav) or []
    return tree


def main() -> int:
    docs_dir = Path("docs")
    output_path = Path("docs/_static/js/nav-tree.json")

    # 生成 nav
    nav = build_nav(docs_dir, docs_dir)

    # 生成前端 JSON
    tree = generate_nav_tree_json(docs_dir, output_path)

    js_content = (
        "// 由 scripts/generate-nav.py 自动生成，勿手动编辑。\n"
        f"// Last generated: auto\n"
        f"const NAV_TREE = {json.dumps(tree, ensure_ascii=False, indent=2)};\n"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(js_content, encoding="utf-8")

    print(f"✅ Nav tree JSON written to {output_path}")
    print(f"   Entries: {len(tree)} top-level chapters")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: 集成到 pre-build 脚本**

在 `scripts/pre-build/pre-build.sh` 中，于 `uv run mkdocs build` 之前添加：

```bash
# 在 pre-build.sh 的 mkdocs build 之前添加
echo "Generating nav tree..."
uv run python scripts/generate-nav.py
```

- [ ] **Step 3: 本地测试**

```bash
cd d:/Programs/Physics-Learning-Wiki
uv run python scripts/generate-nav.py
cat docs/_static/js/nav-tree.json | head -20
```

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-nav.py scripts/pre-build/pre-build.sh docs/_static/js/nav-tree.json
git commit -m "feat: add nav auto-generation script"
```

---

### Task 9: Author 自动提取脚本

**Files:**
- Create: `scripts/update-authors.py`

- [ ] **Step 1: 编写 Author 提取脚本**

```python
# scripts/update-authors.py
"""从 git 历史自动提取每页的贡献者，更新 frontmatter 中的 author 字段。

规则：
- 不覆盖手动指定的 author（以 author_source: manual 为标记）
- 通过 git log --follow 获取每个文件的所有修改者
- 按 commit 次数排序
"""
from __future__ import annotations

import subprocess
import sys
from collections import Counter
from pathlib import Path


def get_file_authors(filepath: Path) -> list[str]:
    """从 git 历史中提取文件的所有贡献者。"""
    try:
        result = subprocess.run(
            ["git", "log", "--follow", "--format=%an", "--", str(filepath)],
            capture_output=True,
            text=True,
            cwd=filepath.parent.parent,  # repo root
        )
        if result.returncode != 0:
            return []
        names = [name.strip() for name in result.stdout.strip().split("\n") if name.strip()]
        # 按出现次数排序
        counter = Counter(names)
        # 最常见的排最前
        sorted_names = [name for name, _ in counter.most_common()]
        return sorted_names
    except Exception:
        return []


def update_frontmatter(filepath: Path, authors: list[str]) -> bool:
    """更新文件 frontmatter 中的 author 字段。返回是否实际修改。"""
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception:
        return False

    lines = text.split("\n")

    # 检查是否有手动指定的 author
    has_manual = False
    has_author_field = False
    author_line_idx = -1
    in_frontmatter = False
    frontmatter_start = -1
    frontmatter_end = -1

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "---":
            if not in_frontmatter:
                in_frontmatter = True
                frontmatter_start = i
            else:
                frontmatter_end = i
                break
        elif in_frontmatter:
            if stripped.startswith("author_source:") and "manual" in stripped:
                has_manual = True
            if stripped.startswith("author:"):
                has_author_field = True
                author_line_idx = i

    if has_manual:
        print(f"  ⏭ {filepath}: 手动维护，跳过")
        return False

    if not authors:
        return False

    new_author = ", ".join(authors)

    if frontmatter_start >= 0 and frontmatter_end >= 0:
        if has_author_field and author_line_idx >= 0:
            lines[author_line_idx] = f"author: {new_author}"
        else:
            # 在 frontmatter 末尾前插入
            lines.insert(frontmatter_end, f"author: {new_author}")
            lines.insert(frontmatter_end + 1, "author_source: auto")
    else:
        # 无 frontmatter：创建
        lines = [
            "---",
            f"author: {new_author}",
            "author_source: auto",
            "---",
            "",
        ] + lines

    new_text = "\n".join(lines)
    if new_text != text:
        filepath.write_text(new_text, encoding="utf-8")
        return True
    return False


def main() -> int:
    docs_dir = Path("docs")

    changed = 0
    skipped = 0

    for md_file in sorted(docs_dir.rglob("*.md")):
        # 跳过后端生成的文件
        if "community" in md_file.parts:
            continue

        authors = get_file_authors(md_file)
        if not authors:
            continue

        if update_frontmatter(md_file, authors):
            print(f"  ✓ {md_file}: {', '.join(authors[:3])}{'...' if len(authors) > 3 else ''}")
            changed += 1
        else:
            skipped += 1

    print(f"\nDone. Updated: {changed}, Skipped: {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: 本地测试**

```bash
cd d:/Programs/Physics-Learning-Wiki
uv run python scripts/update-authors.py
```

检查几个文件的 author 字段是否正确更新。

- [ ] **Step 3: Commit**

```bash
git add scripts/update-authors.py
git commit -m "feat: add author auto-extraction script from git history"
```

---

### Task 10: 投稿分拣 Workflow

**Files:**
- Create: `.github/workflows/triage-submission.yml`

- [ ] **Step 1: 创建投稿分拣 CI**

```yaml
# .github/workflows/triage-submission.yml
name: Triage Submission

on:
  issues:
    types: [opened]

jobs:
  triage:
    name: Triage new submission
    runs-on: ubuntu-latest
    if: contains(github.event.issue.labels.*.name, '投稿-待审核')
    steps:
      - name: Check content length
        uses: actions/github-script@v7
        with:
          script: |
            const body = context.payload.issue.body || "";
            // 提取正文（去掉投稿信息头部）
            const contentMatch = body.match(/---\s*\n+(.+)$/s);
            const content = contentMatch ? contentMatch[1].trim() : body;
            const wordCount = content.replace(/\s/g, "").length;

            const comments = [];

            if (wordCount < 20) {
              comments.push(
                "⚠️ 投稿内容过短（不足 20 字），请补充更多细节后重新提交。\n\n" +
                "如果这是误操作，请在评论区说明，编辑组会关闭此 Issue。"
              );
            }

            if (!context.payload.issue.title || context.payload.issue.title.trim().length < 2) {
              comments.push("⚠️ 标题过短，请补充有意义的标题。");
            }

            // 基础垃圾检测：大量重复字符或纯 URL
            if (/^(.)\1{20,}$/s.test(content) || /^https?:\/\/\S+$/s.test(content)) {
              await github.rest.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                labels: ["spam"],
              });
              await github.rest.issues.update({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                state: "closed",
              });
              comments.push("此投稿被系统判定为无效内容，已自动关闭。如有误判请联系编辑组。");
            }

            if (comments.length > 0) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: comments.join("\n\n---\n\n"),
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body:
                  "✅ 投稿已收到！编辑组将在 3-5 天内审核。\n\n" +
                  "审核期间如有问题，编辑组会在此 Issue 中与你沟通。",
              });
            }
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/triage-submission.yml
git commit -m "feat: add submission triage workflow"
```

### Task 10b: 稳定版自动降级 Workflow

**Files:**
- Create: `.github/workflows/downgrade-status.yml`

- [ ] **Step 1: 创建自动降级 CI**

（当稳定版页面被修改时，自动将 status 从 stable 降级为 review）

```yaml
# .github/workflows/downgrade-status.yml
name: Downgrade Content Status on Change

on:
  push:
    branches:
      - main
    paths:
      - "docs/**/*.md"

jobs:
  downgrade:
    name: Downgrade stable pages to review
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Downgrade changed stable pages
        run: |
          import sys
          from pathlib import Path

          # 在 GitHub Actions 中获取变更文件列表
          import subprocess
          result = subprocess.run(
            ["git", "diff", "--name-only", "${{ github.event.before }}", "${{ github.event.after }}"],
            capture_output=True, text=True
          )
          changed_files = [
            f for f in result.stdout.strip().split("\\n")
            if f.startswith("docs/") and f.endswith(".md")
          ]

          if not changed_files:
            print("No markdown files changed")
            sys.exit(0)

          downgraded = []
          for filepath in changed_files:
            p = Path(filepath)
            if not p.exists():
              continue
            text = p.read_text(encoding="utf-8")
            if "status: review" in text:
              new_text = text.replace("status: review", "status: review")
              p.write_text(new_text, encoding="utf-8")
              downgraded.append(filepath)
              print(f"  ⬇ {filepath}: stable → review")

          if downgraded:
            print(f"\\nDowngraded {len(downgraded)} page(s)")
          else:
            print("No stable pages were changed")
        shell: python
      - name: Commit downgrades
        if: success()
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/
          if git diff --staged --quiet; then
            echo "No downgrades to commit"
          else
            git commit -m "chore: auto-downgrade stable pages to review [skip ci]"
            git push
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/downgrade-status.yml
git commit -m "feat: add auto-downgrade workflow for stable pages"
```

---

### Task 10c: 将 Author 提取集成到构建流程

**Files:**
- Modify: `scripts/pre-build/pre-build.sh`

- [ ] **Step 1: 在 pre-build.sh 中添加 author 更新**

在 `scripts/pre-build/pre-build.sh` 中，于 `generate-nav.py` 之后添加：

```bash
# 自动更新 author 字段（仅 CI 环境，本地跳过）
if [ -n "$CI" ]; then
  echo "Updating author fields from git history..."
  uv run python scripts/update-authors.py || echo "Author update skipped (non-critical)"
fi
```

- [ ] **Step 2: Commit**

```bash
git add scripts/pre-build/pre-build.sh
git commit -m "feat: integrate author auto-extraction into build pipeline"
```

---

## Phase 2: 内容质量分级 + 社区运营

### Task 11: 页面状态标识（修改 comments.html 模板）

**Files:**
- Modify: `mkdocs-material/material/templates/partials/comments.html`

- [ ] **Step 1: 在 comments.html 中添加 status 状态栏**

在 `comments.html` 的 `<hr>` 标签之前（即现有 footer 内容之上），添加：

```jinja2
{# 内容质量状态标识 #}
{% set status = page.meta.status if page and page.meta and page.meta.status else "stable" %}
{% if status == "community" %}
<aside class="md-status md-status--community">
  <span class="md-status__icon">🌱</span>
  <span class="md-status__text">
    本文来自<strong>社区投稿</strong>，内容未经 Physics Learning Wiki 团队审核，仅供交流参考。
    如发现错误，欢迎在下方评论区指出或<a href="/submit/">提交勘误</a>。
  </span>
  {% if page.meta.submission_date %}
  <span class="md-status__meta">投稿日期：{{ page.meta.submission_date }}</span>
  {% endif %}
</aside>
{% elif status == "review" %}
<aside class="md-status md-status--review">
  <span class="md-status__icon">✏️</span>
  <span class="md-status__text">
    本页面状态：<strong>审校中</strong>。
    {% if page.meta.review_notes %}待完善：{{ page.meta.review_notes }}{% endif %}
    欢迎参与讨论或提交补充。
  </span>
</aside>
{% endif %}
```

- [ ] **Step 2: 添加对应的 CSS 样式**

在 `docs/_static/css/extra.css` 末尾添加：

```css
/* Content status banners */
.md-status {
  padding: 0.75rem 1rem;
  margin: 1rem 0;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.md-status__icon {
  flex-shrink: 0;
  font-size: 1.1rem;
}
.md-status--community {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}
.md-status--review {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}
.md-status__meta {
  color: #9ca3af;
  font-size: 0.8rem;
  margin-left: auto;
  white-space: nowrap;
}
```

- [ ] **Step 3: 本地验证**

```bash
cd d:/Programs/Physics-Learning-Wiki
uv run mkdocs serve
```

手动在某页面添加 `status: community` 或 `status: review` frontmatter，验证状态栏正确显示。

- [ ] **Step 4: Commit**

```bash
git add mkdocs-material/material/templates/partials/comments.html docs/_static/css/extra.css
git commit -m "feat: add content status banners to page footer"
```

---

### Task 12: 社区角生成 Workflow

**Files:**
- Create: `.github/workflows/generate-community.yml`
- Create: `scripts/generate-community.py`

- [ ] **Step 1: 编写社区页面生成脚本**

```python
# scripts/generate-community.py
"""从 GitHub Issues 中提取「投稿-已收录」标签的内容，生成社区角页面。"""
from __future__ import annotations

import json
import os
import re
import sys
import textwrap
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen


GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki"


def fetch_issues() -> list[dict]:
    """通过 GitHub API 获取已收录的投稿 Issues。"""
    url = f"https://api.github.com/repos/{REPO}/issues"
    params = "?labels=投稿-已收录&state=open&per_page=100"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "User-Agent": "Physics-Learning-Wiki-Bot",
    }
    req = Request(url + params, headers=headers)
    with urlopen(req) as resp:
        return json.loads(resp.read().decode())


def parse_issue_body(body: str) -> dict:
    """解析 Issue 正文，提取投稿元数据。"""
    info: dict = {"type": "未知", "chapter": "", "attribution": "匿名"}
    if not body:
        return info

    # 提取投稿信息表格中的字段
    type_match = re.search(r"投稿类型\*\*:\s*(.+?)(?:\n|$)", body)
    if type_match:
        info["type"] = type_match.group(1).strip()

    chapter_match = re.search(r"目标章节\*\*:\s*(.+?)(?:\n|$)", body)
    if chapter_match:
        info["chapter"] = chapter_match.group(1).strip()

    attr_match = re.search(r"署名\*\*:\s*(.+?)(?:\n|$)", body)
    if attr_match:
        info["attribution"] = attr_match.group(1).strip()

    return info


def generate_page(issue: dict, output_dir: Path) -> str:
    """为单个投稿生成 Markdown 页面。"""
    number = issue["number"]
    title = issue["title"].replace("[投稿]", "").strip()
    body = issue["body"] or ""
    info = parse_issue_body(body)
    created = issue["created_at"][:10]

    # 提取正文（标题之后的内容）
    content = body
    separator_match = re.search(r"^---\s*$", body, re.MULTILINE)
    if separator_match:
        content = body[separator_match.end():].strip()

    frontmatter = textwrap.dedent(f"""\
    ---
    status: community
    author: {info['attribution']}
    source_issue: {issue['html_url']}
    submission_date: {created}
    title: {title}
    ---
    """)

    page = f"{frontmatter}\n\n# {title}\n\n{content}\n"

    output_file = output_dir / f"{number}.md"
    output_file.write_text(page, encoding="utf-8")
    return str(output_file)


def generate_index(issues: list[dict], output_dir: Path) -> None:
    """生成社区角首页，展示所有投稿的卡片列表。"""
    lines = [
        "# 社区角",
        "",
        "这里展示来自社区投稿的内容，未经团队深度审核，仅供交流参考。",
        "",
    ]

    if not issues:
        lines.append("*暂无社区投稿。快来[提交你的第一篇投稿](/submit/)吧！*")
    else:
        for issue in issues:
            number = issue["number"]
            title = issue["title"].replace("[投稿]", "").strip()
            info = parse_issue_body(issue["body"] or "")
            created = issue["created_at"][:10]

            lines.append(f"## [{title}]({number}.md)")
            lines.append("")
            lines.append(
                f"投稿者：{info['attribution']} · "
                f"类型：{info['type']} · "
                f"日期：{created}"
            )
            if info["chapter"] and info["chapter"] != "未指定":
                lines.append(f" · 目标章节：{info['chapter']}")
            lines.append("")
            lines.append("---")
            lines.append("")

    output_file = output_dir / "index.md"
    output_file.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    output_dir = Path("docs/community")
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        issues = fetch_issues()
    except Exception as e:
        print(f"⚠ Failed to fetch issues: {e}")
        print("Skipping community page generation.")
        return 0

    print(f"Found {len(issues)} published community submissions")

    for issue in issues:
        path = generate_page(issue, output_dir)
        print(f"  ✓ #{issue['number']}: {path}")

    generate_index(issues, output_dir)
    print(f"  ✓ Community index: docs/community/index.md")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: 创建社区角生成 Workflow**

```yaml
# .github/workflows/generate-community.yml
name: Generate Community Pages

on:
  schedule:
    - cron: "0 */6 * * *"  # 每 6 小时
  workflow_dispatch:

jobs:
  generate:
    name: Generate community pages
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Generate community pages
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: python scripts/generate-community.py
      - name: Commit and push if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/community/
          if git diff --staged --quiet; then
            echo "No changes to community pages"
          else
            git commit -m "chore: update community pages [skip ci]"
            git push
          fi
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-community.py .github/workflows/generate-community.yml
git commit -m "feat: add community page generation script and workflow"
```

---

### Task 13: 贡献者墙生成

**Files:**
- Create: `scripts/generate-contributors.py`
- Create: `.github/workflows/update-contributors.yml`

- [ ] **Step 1: 编写贡献者统计脚本**

```python
# scripts/generate-contributors.py
"""从 git 历史 + Issue 投稿记录 生成贡献者墙页面。"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen


GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "Physics-Learning-Wiki/Physics-Learning-Wiki"


def get_git_contributors() -> Counter:
    """从 git 历史统计贡献者。"""
    result = subprocess.run(
        ["git", "log", "--all", "--format=%an"],
        capture_output=True,
        text=True,
    )
    counter: Counter = Counter()
    for name in result.stdout.strip().split("\n"):
        name = name.strip()
        if name and "github-actions" not in name and "dependabot" not in name:
            counter[name] += 1
    return counter


def get_issue_contributors() -> list[dict]:
    """从已收录的投稿 Issues 中提取贡献者署名。"""
    url = f"https://api.github.com/repos/{REPO}/issues"
    params = "?labels=投稿-已收录&state=all&per_page=100"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "User-Agent": "Physics-Learning-Wiki-Bot",
    }
    try:
        req = Request(url + params, headers=headers)
        with urlopen(req) as resp:
            issues = json.loads(resp.read().decode())
    except Exception:
        return []

    contributors: list[dict] = []
    seen = set()
    for issue in issues:
        body = issue["body"] or ""
        import re
        match = re.search(r"署名\*\*:\s*(.+?)(?:\n|$)", body)
        name = match.group(1).strip() if match else "匿名"
        if name not in seen and name != "匿名":
            seen.add(name)
            contributors.append({
                "name": name,
                "submissions": 1,
                "issue_url": issue["html_url"],
            })
    return contributors


def generate_page(git_counter: Counter, issue_contributors: list[dict]) -> str:
    """生成贡献者墙 Markdown 页面。"""
    now = datetime.utcnow().strftime("%Y-%m-%d")
    lines = [
        "# 贡献者墙",
        "",
        f"> 最后更新：{now}",
        "",
        "感谢每一位为 Physics Learning Wiki 做出贡献的朋友！",
        "",
        "## GitHub 贡献者",
        "",
        "| 贡献者 | 提交次数 |",
        "|--------|---------|",
    ]

    for name, count in git_counter.most_common(50):
        lines.append(f"| {name} | {count} |")

    if issue_contributors:
        lines.append("")
        lines.append("## 投稿贡献者")
        lines.append("")
        lines.append("| 贡献者 | 投稿链接 |")
        lines.append("|--------|---------|")
        for c in issue_contributors:
            lines.append(f"| {c['name']} | [查看]({c['issue_url']}) |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("*此页面由 GitHub Actions 每月自动更新。*")
    return "\n".join(lines)


def main() -> int:
    git_counter = get_git_contributors()
    issue_contributors = get_issue_contributors()

    page = generate_page(git_counter, issue_contributors)

    output = Path("docs/intro/contributors.md")
    output.write_text(page, encoding="utf-8")
    print(f"✅ Contributors page written to {output}")
    print(f"   Git contributors: {len(git_counter)}")
    print(f"   Issue contributors: {len(issue_contributors)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: 创建每月更新 Workflow**

```yaml
# .github/workflows/update-contributors.yml
name: Update Contributors Wall

on:
  schedule:
    - cron: "0 0 1 * *"  # 每月 1 号
  workflow_dispatch:

jobs:
  update:
    name: Update contributor wall
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Generate contributors page
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: python scripts/generate-contributors.py
      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/intro/contributors.md
          if git diff --staged --quiet; then
            echo "No changes to contributors page"
          else
            git commit -m "chore: update contributors wall [skip ci]"
            git push
          fi
```

- [ ] **Step 3: 将贡献者墙加入导航**

在 `mkdocs.yml` 的 `nav` → `简介` 部分添加：

```yaml
    - 贡献者: intro/contributors.md
```

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-contributors.py .github/workflows/update-contributors.yml mkdocs.yml
git commit -m "feat: add contributor wall generation script and workflow"
```

---

### Task 14: 收尾 — 贡献指南更新与 AI 辅助功能准备

**Files:**
- Modify: `docs/intro/htc.md`（增加 Web 投稿路径说明）
- Modify: `docs/index.md`（更新欢迎页，提及新的投稿方式）

- [ ] **Step 1: 更新 htc.md 贡献指南**

在 `docs/intro/htc.md` 的「太长不看版」末尾，增加第四条（现有四条之后）：

```markdown
5.  不需要 GitHub 账号？直接在 [Web 投稿页](../submit/) 填写表单即可提交内容、笔记或勘误。
```

并在「参与协作」章节开头增加一段：

```markdown
???+ info "无需 GitHub 账号的投稿方式"
    如果你不熟悉 GitHub，现在可以直接在网站上提交内容。
    访问 [投稿页面](../submit/) 填写表单，编辑组会通过 GitHub Issue 审核和跟进。
```

- [ ] **Step 2: 更新首页**

在 `docs/index.md` 中增加投稿入口引导（在合适位置）：

```markdown
???+ note "📝 贡献你的物理知识"
    不需要 GitHub 账号！直接访问 [投稿页面](submit.md) 分享你的笔记、勘误或建议。
    每一份贡献都会被署名记录在 [贡献者墙](intro/contributors.md) 上。
```

- [ ] **Step 3: Commit**

```bash
git add docs/intro/htc.md docs/index.md
git commit -m "docs: update contribution guide with web submission path"
```

---

## 非代码任务：社区运营启动

以下任务不需要编写代码，但在技术基础设施上线后应逐步推进：

### 社区渠道建设
- 建立 QQ 群或微信群（一个主群即可，初期不必按学科细分）
- 群内发布内容清单：当前最需要补充的页面、写作指南、优秀投稿示例
- B站 "如何贡献" 系列短视频（3 分钟以内，一集只讲一个操作）

### 章节维护人招募
- 从活跃贡献者中物色并邀请成为章节维护人
- 职责：关注本章 Issue、引导投稿方向、初审投稿
- 在章节首页显示维护人信息（手动更新 frontmatter `maintainer` 字段）

### 内容冲刺活动
- 定期发起主题冲刺，如"两周补完电学部分"
- 在 QQ 群 / Issue 中发布任务认领表
- 冲刺结束后在贡献者墙特别鸣谢

---

## 环境变量与密钥清单

实现前需准备以下密钥：

| 密钥 | 存储位置 | 用途 |
|------|---------|------|
| `GITHUB_TOKEN` | Vercel Env Vars | 投稿后端调用 GitHub Issues API（Fine-grained PAT, `issues:write` 仅限本仓库） |
| `TURNSTILE_SECRET_KEY` | Vercel Env Vars | CloudFlare Turnstile 服务端验证 |
| `TURNSTILE_SITE_KEY` | `submit-form.js` | CloudFlare Turnstile 前端（非机密，公开） |
| `GITHUB_TOKEN` (CI) | GitHub Secrets（已有） | CI workflows 调用 GitHub API |

## 部署检查清单

- [ ] Vercel 项目创建并部署（Task 1）
- [ ] Turnstile Site Key & Secret Key 获取
- [ ] `SUBMIT_ENDPOINT` 在 `submit-form.js` 中更新为实际 Vercel 地址
- [ ] 投稿页面在本地和线上均可正常访问 `/submit/`
- [ ] 投稿提交通道端到端测试通过（填写表单 → 创建 GitHub Issue）
- [ ] 格式检查 CI 在 PR 上正常运行
- [ ] Nav JSON 在构建时自动生成
- [ ] 社区角页面定期生成
