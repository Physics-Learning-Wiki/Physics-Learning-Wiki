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

## 4. 本地测试

```bash
# 运行 Worker 单元与安全对抗测试集
corepack yarn submit:test

# 语法与编译检查
corepack yarn submit:check
```
