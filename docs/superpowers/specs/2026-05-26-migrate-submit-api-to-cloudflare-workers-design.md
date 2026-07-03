## 投稿 API 迁移至 Cloudflare Workers 设计文档

## 背景

投稿页面（`/submit/`）的提交功能完全无法使用．根本原因是 Vercel 的 `*.vercel.app` 域名在中国大陆被 GFW 封锁，导致前端 `fetch()` 请求到 `physics-learning-wiki-a4c895roj-leafukes-projects.vercel.app/api/submit` 时连接超时（`ERR_CONNECTION_TIMED_OUT`）．

DNS 可解析该域名（→ 108.160.169.37），但 ICMP 和 TCP 均不通，确认为网络层封锁．

## 目标

将投稿 API 从 Vercel Serverless Function 迁移到 Cloudflare Workers，使中国大陆用户可以正常提交投稿．

## 架构变更

**迁移前：**
```
浏览器 → POST → *.vercel.app/api/submit (被墙，不可用)
           → Vercel Serverless Function → Turnstile 验证 → GitHub Issues API
```

**迁移后：**
```
浏览器 → POST → *.workers.dev/api/submit (Cloudflare 在中国有节点)
           → Cloudflare Worker → Turnstile 验证 → GitHub Issues API
```

## 文件变更清单

### 新建文件

#### 1. `workers/submit.js` — Cloudflare Worker 主逻辑

功能与现有 `api/submit.js` 完全等价，但使用 Cloudflare Workers 格式：

- 使用 `export default { async fetch(request, env, ctx) { ... } }` 模块格式
- 环境变量通过 `env.TURNSTILE_SECRET_KEY` 和 `env.GITHUB_TOKEN` 访问
- 使用原生 `fetch` API 调用 GitHub REST API（不依赖 Octokit npm 包，Workers 环境下更轻量）
- 保留 CORS 头设置（`Access-Control-Allow-Origin: *`）
- 保留 Turnstile 服务端验证逻辑
- 保留 Issue 创建逻辑和标签映射

请求处理流程：
1. OPTIONS → 返回 204 CORS 预检
2. 非 POST → 返回 405
3. 解析 JSON body，校验必填字段（title, content, type）
4. 校验 type 枚举值
5. POST 到 `https://challenges.cloudflare.com/turnstile/v0/siteverify` 验证 Turnstile token
6. POST 到 `https://api.github.com/repos/Physics-Learning-Wiki/Physics-Learning-Wiki/issues` 创建 Issue
7. 返回 `{ success, issueUrl, issueNumber }`

#### 2. `wrangler.toml` — Cloudflare Workers 配置

```toml
name = "physics-learning-wiki-submit"
main = "workers/submit.js"
compatibility_date = "2024-01-01"

[vars]
# TURNSTILE_SECRET_KEY 和 GITHUB_TOKEN 通过 `wrangler secret put` 设置，不写入配置文件
```

### 修改文件

#### 3. `docs/_static/js/submit-form.js`

- **更新 API 端点 URL**：将 `SUBMIT_ENDPOINT` 从 Vercel URL 改为 Cloudflare Workers URL（部署后获得）
- **修复 `typeLabel` 传递**：前端已发送 `typeLabel`，但需确认 API 端正确读取（见下方 Bug 修复）

#### 4. `api/submit.js`（保留但弃用）

保留文件作为备份/参考，不删除．在文件顶部添加注释标记为已弃用．

## 同时修复的 Bug

### Bug 1：API handler 缺少 `typeLabel` 字段

**现状**：前端发送 `{ type: "suggestion", typeLabel: "建议/想法", ... }`，但 `api/submit.js:48` 的解构中没有 `typeLabel`，导致 `buildIssueBody()` 中 `data.typeLabel || data.type` 始终回退到原始英文值．

**修复**：在 Worker 的请求体解构中加入 `typeLabel`，传递给 `buildIssueBody()`．

### Bug 2：表单可能以 GET 方式提交

**现状**：用户控制台中看到 URL 参数形式的请求（`submit/?type=suggestion&chapter=&title=1...`），说明在某些情况下表单以 GET 方式提交而非通过 JS 的 `fetch POST`．

**修复**：在 `<form>` 标签上添加 `method="post"` 和 `onsubmit="return false"` 作为防御性措施，确保即使 JS 未加载也不会以 GET 方式提交表单数据到 URL．

## 环境变量

需要在 Cloudflare Dashboard 或通过 `wrangler secret put` 设置：

| 变量名 | 说明 | 来源 |
|--------|------|------|
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile 秘钥 | 已有，从 Vercel 迁移 |
| `GITHUB_TOKEN` | GitHub PAT，需 `issues:write` 权限 | 已有，从 Vercel 迁移 |

## 部署步骤

1. 安装 Wrangler CLI：`npm install -g wrangler`
2. 登录 Cloudflare：`wrangler login`
3. 在 `wrangler.toml` 所在目录执行 `wrangler deploy`
4. 设置环境变量：`wrangler secret put TURNSTILE_SECRET_KEY` 和 `wrangler secret put GITHUB_TOKEN`
5. 记录部署后的 Workers URL
6. 更新 `submit-form.js` 中的 `SUBMIT_ENDPOINT`
7. 提交代码，触发 GitHub Pages 重新构建

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| `workers.dev` 域名未来也可能被墙 | 后续可绑定自定义域名到 Worker |
| Workers 免费版 10ms CPU 限制 | 投稿请求仅做验证+转发，CPU 时间远低于 10ms |
| GitHub API 速率限制 | 投稿量极低，不会触发限制 |
| Turnstile secret key 需要重新配置 | 从 Vercel Dashboard 复制到 Cloudflare Dashboard |

## 不在范围内

- 保留 Vercel 项目作为备份（不删除）
- 自定义域名绑定（后续优化）
- Giscus 评论系统超时问题（独立问题，不影响投稿功能）
- Service Worker 404 问题（PWA 配置问题，不影响投稿功能）
