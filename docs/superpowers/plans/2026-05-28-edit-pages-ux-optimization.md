# Edit Pages UX Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix EasyMDE editor and chapter dropdown not loading on instant navigation, unify UI styles across edit-landing and submit pages, and ensure LaTeX preview rendering works.

**Architecture:** Move script/CSS loading from inline `<script>` tags (which don't execute on mkdocs-material instant navigation) to global `extra_javascript`/`extra_css` in mkdocs.yml. Refactor initialization to use `document$.subscribe()` pattern. Unify CSS styles for form controls and buttons.

**Tech Stack:** mkdocs-material, EasyMDE (CDN), MathJax (CDN), vanilla JS, CSS

---

## File Map

| File | Responsibility |
|------|---------------|
| `mkdocs.yml` | Global script/CSS loading configuration |
| `docs/submit.md` | Submit page markdown — remove inline script/CSS tags |
| `docs/_static/js/submit-form.js` | Submit form logic — initialization, editor, dropdown, MathJax |
| `docs/_static/css/submit-form.css` | Submit form and EasyMDE styling |
| `docs/edit-landing.md` | Edit landing page — button styles |

---

### Task 1: Move EasyMDE and submit-form.js to Global Loading

**Files:**
- Modify: `mkdocs.yml:251-258`
- Modify: `docs/submit.md:72-75`

**Why:** Inline `<script>` and `<link>` tags in markdown content don't execute when mkdocs-material loads the page via AJAX instant navigation. Moving them to `extra_javascript`/`extra_css` ensures they load on every page and are available when needed.

- [ ] **Step 1: Add EasyMDE CSS to mkdocs.yml extra_css**

Current `mkdocs.yml` extra_css section (lines 255-258):
```yaml
extra_css:
  - '_static/css/extra.css?v=16'
  - '_static/css/submit-form.css?v=1'
  # - '_static/css/offset-inject-debug.css'
```

Add EasyMDE CSS:
```yaml
extra_css:
  - '_static/css/extra.css?v=16'
  - '_static/css/submit-form.css?v=1'
  - 'https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css'
  # - '_static/css/offset-inject-debug.css'
```

- [ ] **Step 2: Add EasyMDE JS and submit-form.js to mkdocs.yml extra_javascript**

Current `mkdocs.yml` extra_javascript section (lines 251-253):
```yaml
extra_javascript:
  - '_static/js/math-csr.js?math-csr'
  - 'assets/vendor/mathjax/tex-mml-chtml.js?math-csr'
```

Add EasyMDE JS and submit-form.js:
```yaml
extra_javascript:
  - '_static/js/math-csr.js?math-csr'
  - 'assets/vendor/mathjax/tex-mml-chtml.js?math-csr'
  - 'https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js'
  - '_static/js/submit-form.js'
```

- [ ] **Step 3: Remove inline script/CSS tags from submit.md**

Current `docs/submit.md` lines 72-75:
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback" defer></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">
<script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
<script src="../_static/js/submit-form.js"></script>
```

Replace with only the Turnstile script (it uses `defer` and `onload` callback, which works differently):
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback" defer></script>
```

- [ ] **Step 4: Commit**

```bash
cd D:/Programs/Physics-Learning-Wiki
git add mkdocs.yml docs/submit.md
git commit -m "fix: move EasyMDE and submit-form.js to global loading for instant navigation support"
```

---

### Task 2: Refactor submit-form.js Initialization

**Files:**
- Modify: `docs/_static/js/submit-form.js`

**Why:** All initialization is currently bound to `DOMContentLoaded`, which doesn't fire on mkdocs-material instant navigation. Using `document$.subscribe()` ensures initialization runs on every page navigation.

- [ ] **Step 1: Replace all DOMContentLoaded listeners with document$.subscribe()**

Current `docs/_static/js/submit-form.js` has these listeners at the end (lines 163-172, 300-306):
```js
document.addEventListener("DOMContentLoaded", populateChapterSelect);
document.addEventListener("DOMContentLoaded", initEditor);
document.addEventListener("DOMContentLoaded", () => {
  const typeSelect = document.getElementById("submit-type");
  if (typeSelect) {
    typeSelect.addEventListener("change", updateTypeHint);
    updateTypeHint();
  }
});
document.addEventListener("DOMContentLoaded", setupAttributionToggle);
```

And at the bottom:
```js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("submission-form");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
});
```

Replace all of these with a single `document$.subscribe()` block. The complete rewritten file should be:

```js
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

  select.innerHTML = "";
  addOptions(NAV_TREE, "");
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "-- 可选，帮助编辑组分类 --";
  select.insertBefore(defaultOpt, select.firstChild);
}

let easyMDE = null;

let _mathJaxTimer = null;

function debounce(fn, delay) {
  let timer = null;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

function initEditor() {
  const el = document.getElementById("submit-content");
  if (!el || typeof EasyMDE === "undefined") return;

  // Destroy previous instance if it exists
  if (easyMDE) {
    easyMDE.toTextArea();
    easyMDE = null;
  }

  easyMDE = new EasyMDE({
    element: el,
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
    previewRender: debounce(function (plainText, previewElement) {
      const html = this.parent.markdown(plainText);
      previewElement.innerHTML = html;
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([previewElement]).catch(console.error);
      }
      return previewElement.innerHTML;
    }, 300),
  });
}

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

const SUBMIT_ENDPOINT = "https://submit.folderrewind.top";

const TYPE_LABELS = {
  "full-page": "完整页面",
  "notes": "笔记/提纲",
  "errata": "勘误纠错",
  "suggestion": "建议/想法",
};

let turnstileToken = null;

function initTurnstile() {
  if (typeof turnstile === "undefined") {
    console.warn("Turnstile not loaded");
    return;
  }
  turnstile.render("#turnstile-widget", {
    sitekey: "0x4AAAAAADWCCejih_jntWim",
    callback: function (token) {
      turnstileToken = token;
    },
    "expired-callback": function () {
      turnstileToken = null;
    },
    "error-callback": function () {
      turnstileToken = null;
      const status = document.getElementById("submit-status");
      if (status) {
        status.textContent = "人机验证加载失败，请刷新页面重试";
        status.className = "error";
      }
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

  try {
    const resp = await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        type,
        typeLabel: TYPE_LABELS[type] || type,
        chapter: chapterSelect.value,
        attribution: anonRadio && anonRadio.checked
          ? "匿名"
          : (attributionInput.value.trim() || "匿名"),
        contact: contactInput.value.trim(),
        turnstileToken,
      }),
    });

    if (!resp.ok) {
      let errorMsg = "提交失败";
      try {
        const errorData = await resp.json();
        errorMsg = errorData.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await resp.json();

    // 显示成功页面
    document.getElementById("submission-form").style.display = "none";
    document.getElementById("submit-success").style.display = "block";
    const link = document.getElementById("submit-issue-link");
    if (link) {
      link.href = data.issueUrl;
      link.textContent = data.issueUrl;
    }
  } catch (err) {
    status.textContent = err.message || "提交失败，请稍后重试。也可直接发送邮件至 submit@folderrewind.top";
    status.className = "error";
    btn.disabled = false;
    btn.textContent = "提交投稿";
    if (typeof turnstile !== "undefined") {
      turnstile.reset();
    }
    turnstileToken = null;
  }
}

// Single initialization point using mkdocs-material's document$ observable.
// This fires on both initial page load and instant navigation.
document$.subscribe(function () {
  // Only run on the submit page
  if (!document.getElementById("submission-form")) return;

  populateChapterSelect();
  initEditor();
  setupAttributionToggle();
  updateTypeHint();

  const typeSelect = document.getElementById("submit-type");
  if (typeSelect) {
    typeSelect.removeEventListener("change", updateTypeHint);
    typeSelect.addEventListener("change", updateTypeHint);
  }

  const form = document.getElementById("submission-form");
  if (form) {
    form.removeEventListener("submit", handleSubmit);
    form.addEventListener("submit", handleSubmit);
  }
});
```

**Key changes from original:**
1. All `DOMContentLoaded` listeners replaced with single `document$.subscribe()` block
2. Guard clause `if (!document.getElementById("submission-form")) return;` prevents running on non-submit pages
3. `easyMDE` initialized to `null` explicitly
4. `initEditor()` destroys previous EasyMDE instance before creating new one
5. `previewRender` uses `debounce(300ms)` instead of `setTimeout(100ms)`
6. Event listeners use `removeEventListener` before `addEventListener` to prevent duplicates
7. `debounce()` helper function added

- [ ] **Step 2: Verify the file has no syntax errors**

Run: `node -c docs/_static/js/submit-form.js`
Expected: no output (syntax check passes)

- [ ] **Step 3: Commit**

```bash
cd D:/Programs/Physics-Learning-Wiki
git add docs/_static/js/submit-form.js
git commit -m "fix: refactor submit-form.js to use document$.subscribe() for instant navigation"
```

---

### Task 3: Update submit-form.css for Style Unification

**Files:**
- Modify: `docs/_static/css/submit-form.css`

**Why:** Unify form control font sizes, add textarea min-height for fallback state, and add dark mode support for EasyMDE editor.

- [ ] **Step 1: Rewrite submit-form.css with unified styles**

Replace the entire `docs/_static/css/submit-form.css` with:

```css
/* docs/_static/css/submit-form.css */

/* Form field layout */
.submit-field {
  margin-bottom: 1.5rem;
}
.submit-field label {
  display: block;
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.35rem;
}
.submit-required {
  color: #e53e3e;
}

/* Unified form controls */
.submit-field select,
.submit-field input[type="text"] {
  width: 100%;
  max-width: 560px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.95rem;
}

/* Textarea fallback (when EasyMDE fails to load) */
.submit-field textarea {
  width: 100%;
  max-width: 560px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.95rem;
  min-height: 200px;
  resize: vertical;
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
  font-size: 0.95rem;
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
  display: none;
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
  border-radius: 0 0 6px 6px;
}
.editor-toolbar {
  border-radius: 6px 6px 0 0;
  border: 1px solid #cbd5e0;
  border-bottom: none;
  background: #f7fafc;
}
.editor-toolbar button {
  color: #4a5568 !important;
}
.editor-toolbar button:hover,
.editor-toolbar button.active {
  background: #e2e8f0;
  border-color: #cbd5e0;
}

/* Dark mode overrides */
[data-md-color-scheme="slate"] .submit-field select,
[data-md-color-scheme="slate"] .submit-field input[type="text"],
[data-md-color-scheme="slate"] .submit-field textarea {
  background: var(--md-default-bg-color);
  color: var(--md-default-fg-color);
  border-color: #4a5568;
}
[data-md-color-scheme="slate"] .submit-hint {
  color: #a0aec0;
}
[data-md-color-scheme="slate"] #submit-success {
  background: #1a3a2a;
  border-color: #2f5e3f;
  color: #c6f6d5;
}

/* Dark mode EasyMDE overrides */
[data-md-color-scheme="slate"] .editor-toolbar {
  background: #2d3748;
  border-color: #4a5568;
}
[data-md-color-scheme="slate"] .editor-toolbar button {
  color: #e2e8f0 !important;
}
[data-md-color-scheme="slate"] .editor-toolbar button:hover,
[data-md-color-scheme="slate"] .editor-toolbar button.active {
  background: #4a5568;
}
[data-md-color-scheme="slate"] .EasyMDEContainer .CodeMirror {
  background: #1a202c;
  color: #e2e8f0;
  border-color: #4a5568;
}
[data-md-color-scheme="slate"] .EasyMDEContainer .CodeMirror-cursor {
  border-left-color: #e2e8f0;
}
[data-md-color-scheme="slate"] .editor-statusbar {
  color: #a0aec0;
}
[data-md-color-scheme="slate"] .editor-preview,
[data-md-color-scheme="slate"] .editor-preview-side {
  background: #1a202c;
  color: #e2e8f0;
}
```

**Key changes from original:**
1. Added `.submit-field textarea` rule with `min-height: 200px` and `font-size: 0.95rem`
2. Added `font-size: 0.95rem` to `.submit-field label` and `.submit-radio-group label`
3. Added EasyMDE toolbar styling (`.editor-toolbar` border-radius, background, button colors)
4. Added dark mode overrides for EasyMDE (toolbar, CodeMirror, preview, statusbar)
5. Added `.EasyMDEContainer .CodeMirror` border-radius fix (bottom corners)

- [ ] **Step 2: Commit**

```bash
cd D:/Programs/Physics-Learning-Wiki
git add docs/_static/css/submit-form.css
git commit -m "style: unify form control styles and add dark mode EasyMDE support"
```

---

### Task 4: Update edit-landing.md Button Styles

**Files:**
- Modify: `docs/edit-landing.md:12-30`

**Why:** The three action buttons have inconsistent font sizes (0.75em) and the GitHub/email buttons are stacked vertically. Unify sizing and layout.

- [ ] **Step 1: Update Web 投稿 button (line 12)**

Current:
```html
<a href="../submit/" style="padding: 0.75em 1.25em; display: inline-block; line-height: 1; text-decoration: none; white-space: nowrap; cursor: pointer; border: 1px solid #e85d04; border-radius: 5px; background-color: #e85d04; color: #fff; outline: none; font-size: 0.75em;">Web 投稿</a>
```

Replace with:
```html
<a href="../submit/" style="padding: 0.6em 1.2em; display: inline-block; line-height: 1.4; text-decoration: none; white-space: nowrap; cursor: pointer; border: 1px solid #e85d04; border-radius: 6px; background-color: #e85d04; color: #fff; outline: none; font-size: 0.9em;">Web 投稿</a>
```

- [ ] **Step 2: Update GitHub 编辑 and 邮箱投稿 buttons (lines 28-30)**

Current:
```html
<a id="btn-startedit" style="padding: 0.75em 1.25em; display: inline-block; line-height: 1; text-decoration: none; white-space: nowrap; cursor: pointer; border: 1px solid #6190e8; border-radius: 5px; background-color: #6190e8; color: #fff; outline: none; font-size: 0.75em;">在 GitHub 上编辑</a>

<a href="mailto:submit@folderrewind.top?subject=%5BPhysics%20Learning%20Wiki%20%E6%8A%95%E7%A8%BF%5D" style="padding: 0.75em 1.25em; display: inline-block; line-height: 1; text-decoration: none; white-space: nowrap; cursor: pointer; border: 1px solid #268c5a; border-radius: 5px; background-color: #268c5a; color: #fff; outline: none; font-size: 0.75em; margin-left: 0.75em;">通过邮箱投稿</a>
```

Replace with:
```html
<a id="btn-startedit" style="padding: 0.6em 1.2em; display: inline-block; line-height: 1.4; text-decoration: none; white-space: nowrap; cursor: pointer; border: 1px solid #6190e8; border-radius: 6px; background-color: #6190e8; color: #fff; outline: none; font-size: 0.9em;">在 GitHub 上编辑</a>

<a href="mailto:submit@folderrewind.top?subject=%5BPhysics%20Learning%20Wiki%20%E6%8A%95%E7%A8%BF%5D" style="padding: 0.6em 1.2em; display: inline-block; line-height: 1.4; text-decoration: none; white-space: nowrap; cursor: pointer; border: 1px solid #268c5a; border-radius: 6px; background-color: #268c5a; color: #fff; outline: none; font-size: 0.9em; margin-left: 0.75em;">通过邮箱投稿</a>
```

**Changes:** `font-size: 0.75em` → `0.9em`, `padding: 0.75em 1.25em` → `0.6em 1.2em`, `line-height: 1` → `1.4`, `border-radius: 5px` → `6px`

- [ ] **Step 3: Commit**

```bash
cd D:/Programs/Physics-Learning-Wiki
git add docs/edit-landing.md
git commit -m "style: unify button sizes on edit-landing page"
```

---

### Task 5: Manual Testing and Verification

**Files:** None (manual browser testing)

- [ ] **Step 1: Start local dev server**

```bash
cd D:/Programs/Physics-Learning-Wiki
mkdocs serve
```

Wait for "Serving on http://127.0.0.1:8000" message.

- [ ] **Step 2: Test Bug Fix — Instant Navigation**

1. Open http://127.0.0.1:8000/ in browser
2. Click "投稿" in the navigation to go to the submit page via instant navigation
3. Verify: EasyMDE editor toolbar is visible (bold, italic, heading buttons, etc.)
4. Verify: "目标章节" dropdown has all chapter options populated
5. Verify: "投稿类型" dropdown works normally

- [ ] **Step 3: Test Bug Fix — Navigation Round-Trip**

1. From the submit page, navigate to another page (e.g., "首页")
2. Navigate back to the submit page via instant navigation
3. Verify: Editor and dropdown still work correctly (re-initialized)

- [ ] **Step 4: Test Bug Fix — Page Refresh**

1. Refresh the submit page (F5)
2. Verify: Editor and dropdown work correctly

- [ ] **Step 5: Test UI — edit-landing buttons**

1. Navigate to http://127.0.0.1:8000/edit-landing/
2. Verify: Three buttons (Web 投稿, GitHub 编辑, 邮箱投稿) have consistent size
3. Verify: Font size is readable (0.9em, larger than before)
4. Verify: GitHub and email buttons are side by side

- [ ] **Step 6: Test UI — Submit page controls**

1. Navigate to the submit page
2. Verify: All labels (投稿类型, 目标章节, 标题, 正文, etc.) have consistent font size
3. Verify: All input/select controls have consistent font size
4. Verify: Textarea has reasonable height even before EasyMDE loads

- [ ] **Step 7: Test Dark Mode**

1. Toggle to dark mode
2. Verify: EasyMDE editor has dark background and light text
3. Verify: Toolbar buttons are visible
4. Verify: Form controls have dark background and light text
5. Verify: Submit page success message has dark mode styling

- [ ] **Step 8: Test LaTeX Preview**

1. In the editor, type: `$E = mc^2$`
2. Click the preview button (eye icon)
3. Verify: LaTeX formula renders correctly (not shown as raw `$E = mc^2$`)
4. Type a block formula: `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`
5. Verify: Block formula renders correctly in preview

- [ ] **Step 9: Final Commit (if any fixes needed)**

If any issues were found and fixed during testing:
```bash
cd D:/Programs/Physics-Learning-Wiki
git add -A
git commit -m "fix: address testing feedback for edit pages UX"
```
