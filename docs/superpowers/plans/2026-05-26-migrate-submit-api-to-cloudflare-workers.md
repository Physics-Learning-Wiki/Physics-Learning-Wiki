## 投稿 API 迁移至 Cloudflare Workers 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将投稿 API 从被 GFW 封锁的 Vercel 迁移到 Cloudflare Workers，同时修复 typeLabel 缺失和表单 GET 回退两个 Bug。

**Architecture:** 前端 `submit-form.js` POST JSON 到 Cloudflare Worker，Worker 验证 Turnstile token 后通过 GitHub REST API 创建 Issue。使用原生 `fetch` 替代 Octokit，减少依赖。

**Tech Stack:** Cloudflare Workers (ES module format), Wrangler CLI, GitHub REST API v3, Cloudflare Turnstile

---

### Task 1: 创建 Cloudflare Worker (`workers/submit.js`)

**Files:**
- Create: `workers/submit.js`

- [ ] **Step 1: 创建 workers 目录并编写 Worker 代码**

```bash
mkdir -p workers
```

创建 `workers/submit.js`，内容如下。这是从 `api/submit.js` 迁移而来的 Cloudflare Workers 版本，使用原生 fetch 替代 Octokit，并修复了 typeLabel 缺失的 Bug：

```javascript
// workers/submit.js
// Cloudflare Worker: 投稿 API
// 从 Vercel Serverless Function (api/submit.js) 迁移而来

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
    `- **投稿类型**: ${data.typeLabel || data.type}`,
    `- **目标章节**: ${data.chapter || "未指定"}`,
    `- **署名**: ${data.attribution || "匿名"}`,
  ];
  if (data.contact) {
    lines.push(`- **联系方式**: ${data.contact}`);
  }
  lines.push(``, `---`, ``, data.content);
  return lines.join("\n");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    try {
      const {
        title,
        content,
        type,
        typeLabel,
        chapter,
        attribution,
        contact,
        turnstileToken,
      } = await request.json();

      if (!title || !content || !type) {
        return jsonResponse(
          { error: "缺少必填字段：标题、正文、投稿类型" },
          400
        );
      }

      if (!["full-page", "notes", "errata", "suggestion"].includes(type)) {
        return jsonResponse({ error: "无效的投稿类型" }, 400);
      }

      // Validate Turnstile
      const turnstileResult = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: env.TURNSTILE_SECRET_KEY,
            response: turnstileToken,
          }),
        }
      );
      const turnstileData = await turnstileResult.json();
      if (!turnstileData.success) {
        return jsonResponse({ error: "人机验证失败，请重试" }, 400);
      }

      const label = SUBMISSION_LABELS[type] || "投稿-待审核";

      // Create GitHub Issue via REST API
      const issueResult = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `token ${env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Physics-Learning-Wiki-Submit-Worker",
          },
          body: JSON.stringify({
            title: `[投稿] ${title}`,
            body: buildIssueBody({
              title,
              content,
              type,
              typeLabel,
              chapter,
              attribution,
              contact,
            }),
            labels: ["投稿-待审核", label],
          }),
        }
      );

      if (!issueResult.ok) {
        const errorText = await issueResult.text();
        console.error("GitHub API error:", issueResult.status, errorText);
        return jsonResponse({ error: "创建 Issue 失败，请稍后重试" }, 502);
      }

      const issue = await issueResult.json();

      return jsonResponse({
        success: true,
        issueUrl: issue.html_url,
        issueNumber: issue.number,
      });
    } catch (error) {
      console.error("Submission error:", error);
      return jsonResponse({ error: "提交失败，请稍后重试" }, 500);
    }
  },
};
```

- [ ] **Step 2: 验证文件已创建**

```bash
cat workers/submit.js | head -5
```

Expected output:
```
// workers/submit.js
// Cloudflare Worker: 投稿 API
// 从 Vercel Serverless Function (api/submit.js) 迁移而来
```

- [ ] **Step 3: Commit**

```bash
git add workers/submit.js
git commit -m "feat: add Cloudflare Worker for submission API"
```

---

### Task 2: 创建 Wrangler 配置文件

**Files:**
- Create: `wrangler.toml`

- [ ] **Step 1: 创建 `wrangler.toml`**

```toml
name = "physics-learning-wiki-submit"
main = "workers/submit.js"
compatibility_date = "2024-01-01"

# TURNSTILE_SECRET_KEY 和 GITHUB_TOKEN 通过 `wrangler secret put` 设置
# 不要将密钥写入此文件
```

- [ ] **Step 2: 验证文件已创建**

```bash
cat wrangler.toml
```

Expected output should show the 4-line config.

- [ ] **Step 3: Commit**

```bash
git add wrangler.toml
git commit -m "chore: add wrangler.toml for Cloudflare Workers config"
```

---

### Task 3: 部署 Worker 并设置环境变量

**Files:** 无文件变更（操作 Cloudflare 平台）

- [ ] **Step 1: 安装 Wrangler CLI**

```bash
npm install -g wrangler
```

- [ ] **Step 2: 登录 Cloudflare**

```bash
wrangler login
```

浏览器会打开 Cloudflare 授权页面，点击授权。

- [ ] **Step 3: 部署 Worker**

```bash
cd d:\Programs\Physics-Learning-Wiki
wrangler deploy
```

Expected output 包含类似：
```
Published physics-learning-wiki-submit (X.XX sec)
  https://physics-learning-wiki-submit.<your-subdomain>.workers.dev
```

**记录输出的 Workers URL**，下一步需要。

- [ ] **Step 4: 设置 Turnstile 秘钥**

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

提示输入值时，粘贴你的 Cloudflare Turnstile secret key（从 Vercel Dashboard 或 Cloudflare Dashboard 获取）。

- [ ] **Step 5: 设置 GitHub Token**

```bash
wrangler secret put GITHUB_TOKEN
```

提示输入值时，粘贴你的 GitHub Personal Access Token（需 `issues:write` 权限）。

- [ ] **Step 6: 验证 Worker 可访问**

```bash
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" --max-time 10 https://physics-learning-wiki-submit.<your-subdomain>.workers.dev/
```

Expected: HTTP 405（Method not allowed，因为 GET 不被接受，说明 Worker 在运行）

- [ ] **Step 7: 发送测试 POST 请求**

```bash
curl -s --max-time 15 -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"test","content":"test content","type":"suggestion","turnstileToken":"invalid"}' \
  https://physics-learning-wiki-submit.<your-subdomain>.workers.dev/
```

Expected: HTTP 400 with `{"error":"人机验证失败，请重试"}`（说明 Worker 正常运行，Turnstile 验证逻辑工作正常）

---

### Task 4: 更新前端代码

**Files:**
- Modify: `docs/_static/js/submit-form.js:174-175`
- Modify: `docs/submit.md:8`

- [ ] **Step 1: 更新 `SUBMIT_ENDPOINT` URL**

在 `docs/_static/js/submit-form.js` 中，将第 175 行的 Vercel URL 替换为 Task 3 Step 3 中获得的 Workers URL：

```javascript
// Before (line 175):
const SUBMIT_ENDPOINT = "https://physics-learning-wiki-a4c895roj-leafukes-projects.vercel.app/api/submit";

// After:
const SUBMIT_ENDPOINT = "https://physics-learning-wiki-submit.<your-subdomain>.workers.dev";
```

注意：Workers URL 不需要 `/api/submit` 路径后缀，因为 Worker 处理的是根路径。如果你在 wrangler.toml 中配置了路由，路径可能不同。

- [ ] **Step 2: 修复表单 GET 回退问题**

在 `docs/submit.md` 中，将第 8 行的 `<form>` 标签添加 `method="post"` 属性：

```html
<!-- Before (line 8): -->
<form id="submission-form">

<!-- After: -->
<form id="submission-form" method="post" onsubmit="return false">
```

`method="post"` 确保原生表单提交使用 POST 而非 GET。`onsubmit="return false"` 防止 JS 未加载时表单以原生方式提交（会丢失页面状态）。JS 加载后 `handleSubmit` 中的 `event.preventDefault()` 会接管。

- [ ] **Step 3: 验证修改**

确认 `submit-form.js` 中 `SUBMIT_ENDPOINT` 指向正确的 Workers URL。
确认 `submit.md` 中 `<form>` 标签包含 `method="post"` 和 `onsubmit="return false"`。

- [ ] **Step 4: Commit**

```bash
git add docs/_static/js/submit-form.js docs/submit.md
git commit -m "fix: point submit API to Cloudflare Workers and prevent GET fallback"
```

---

### Task 5: 标记旧 Vercel 函数为已弃用

**Files:**
- Modify: `api/submit.js:1`

- [ ] **Step 1: 添加弃用注释**

在 `api/submit.js` 文件顶部添加弃用说明：

```javascript
// api/submit.js
// ⚠️ DEPRECATED: 此文件已被 Cloudflare Worker (workers/submit.js) 替代。
// *.vercel.app 域名在中国大陆被 GFW 封锁，此函数不可用。
// 保留作为备份参考，不删除。
```

- [ ] **Step 2: Commit**

```bash
git add api/submit.js
git commit -m "chore: mark Vercel submit function as deprecated"
```

---

### Task 6: 端到端验证

**Files:** 无文件变更

- [ ] **Step 1: 本地构建 MkDocs 站点**

```bash
cd d:\Programs\Physics-Learning-Wiki
mkdocs build
```

Expected: 构建成功，无错误。

- [ ] **Step 2: 本地预览投稿页面**

```bash
mkdocs serve
```

在浏览器中打开 `http://127.0.0.1:8000/submit/`，检查：
- 页面正常加载
- Turnstile 人机验证 widget 出现
- 表单字段可正常填写
- 打开 F12 控制台，确认没有 `ERR_CONNECTION_TIMED_OUT` 错误

- [ ] **Step 3: 提交测试投稿**

在本地预览页面中填写并提交一个测试投稿：
- 类型：建议/想法
- 标题：测试投稿
- 正文：这是一条测试投稿
- 完成 Turnstile 验证
- 点击提交

Expected:
- 按钮变为"提交中..."
- 提交成功后显示 Issue 链接
- 在 GitHub 仓库的 Issues 页面能看到新创建的 Issue

- [ ] **Step 4: 验证 Issue 内容**

打开创建的 Issue，检查：
- 标题格式：`[投稿] 测试投稿`
- 标签：`投稿-待审核` + `投稿-建议`
- 正文中投稿类型显示为"建议/想法"（中文标签，而非 "suggestion"）
- 署名和联系方式正确显示

- [ ] **Step 5: 验证线上站点**

代码推送并 GitHub Pages 重新构建后，访问 `https://physics-learning-wiki.github.io/Physics-Learning-Wiki/submit/`，重复 Step 3-4 的验证。

- [ ] **Step 6: 最终 Commit（如有修改）**

如果验证过程中发现并修复了问题，提交修复：

```bash
git add -A
git commit -m "fix: address issues found during end-to-end testing"
```
