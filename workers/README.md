# Cloudflare Worker 投稿接口（Submit Worker）

本项目 Cloudflare Worker（`workers/submit.js`）用于接收来自前端表单的匿名投稿与题目提交，执行安全校验、Turnstile 人机验证，并通过 GitHub REST API 在仓库中创建带标签的 Issue．

---

## 1. 架构与安全模型

```text
浏览器（不可信） ──POST JSON──> Cloudflare Worker ──Bearer Token──> GitHub REST API (Issue)
```

Worker 处于公共不可信输入与仓库自动化之间的第一道防线：
1. **严格类型防线（S-01）**：顶层字段白名单、强制严格字符串/布尔值类型检查、长度与字符集校验，阻断数组/对象类型混淆攻击．
2. **体积与资源预算（S-08）**：请求体限制最大 128 KiB，单次投稿正文限制 50,000 字符，生成 Issue 限制 60,000 字节，防止内存与 GitHub API 配额耗尽．
3. **Turnstile 上下文与超时防御（S-07）**：强制 5000ms 请求超时、校验 `success`、主机名白名单（`ALLOWED_HOSTNAMES`）及业务行为 `action`（`submit-general` / `submit-question`）．
4. **著作权确认前置（S-09）**：题目投稿强制要求 `licenseConsent: true`，并在机读载荷中写入许可版本与确认时间戳．
5. **凭证脱敏与错误隔离（S-06）**：上游错误脱敏，严禁在日志或响应体中回显 GitHub Token 或内部堆栈．

---

## 2. 凭证最小权限配置规范（S-06）

Worker 通过环境变量 `GITHUB_TOKEN` 操作 GitHub Issue．为遵循最小权限原则：

### 推荐配置：Fine-grained Personal Access Token (PAT) 或 GitHub App
- **资源范围（Repository access）**：`Only select repositories` -> 仅勾选 `Physics-Learning-Wiki/Physics-Learning-Wiki`．
- **权限范围（Permissions）**：
  - `Issues`: **Read and Write**（必需，仅用于创建与标注投稿 Issue）．
  - `Metadata`: **Read-only**（GitHub 自动关联）．
  - **严禁授予**：
    - `Contents`: ❌ No access（严禁代码读写权限）
    - `Actions` / `Workflows`: ❌ No access
    - `Pull requests`: ❌ No access
    - `Administration`: ❌ No access
- **轮换策略**：建议最长有效期设为 90 天，到期前通过 `wrangler secret put GITHUB_TOKEN` 轮换．

---

## 3. 环境变量与密钥管理

密钥通过 Wrangler Secret 注入，**严禁将明文密钥提交到代码仓库**：

```bash
# 设置 Cloudflare Turnstile 密钥
npx wrangler secret put TURNSTILE_SECRET_KEY

# 设置最小权限 GitHub Token
npx wrangler secret put GITHUB_TOKEN

# （可选）配置生产自定义主机名白名单（逗号分隔）
npx wrangler secret put ALLOWED_HOSTNAMES
```

---

## 4. Cloudflare WAF 与速率限制（Rate Limiting）生产建议

在 Cloudflare Dashboard 中为该 Worker 路由配置以下防护：
1. **WAF 速率限制（Rate Limiting Rule）**：
   - 规则：针对路径 `/submit`（或自定义域名），单 IP 在 60 秒内请求超过 15 次触发 Block（封禁 1 小时）或 Managed Challenge．
2. **Bot Fight Mode / Turnstile 联动**：
   - 在生产环境开启 Cloudflare 托管人机质询，过滤已知爬虫与恶意扫描器．
3. **环境隔离**：
   - 生产环境中 `ENVIRONMENT` 设为 `production`，此时 Worker 默认仅允许 `physics-learning-wiki.github.io` 主机名，彻底拒绝 `localhost` / `127.0.0.1` 来源．
4. **分支保护与发布门禁**：
   - 自动生成的 Issue PR 必须在通过主分支保护检查后方可合并，详见 [`.github/BRANCH_PROTECTION.md`](../.github/BRANCH_PROTECTION.md)．

---

## 5. 本地测试

```bash
# 运行 Worker 单元与安全对抗测试集
corepack yarn submit:test

# 语法与编译检查
corepack yarn submit:check
```
