# GitHub 分支保护规则规范 (P0-2)

本文件规定了 Physics Learning Wiki 主仓库 `main` 分支的分支保护策略、必需检查项（Required Status Checks）、自动化机器人 PR 审阅规范与管理员配置 SOP．

---

## 1. 核心安全目标

根据安全审计整改要求，主分支必须建立强健的保护防线：
1. **禁止直接推送**：严禁任何成员向 `main` 分支执行直接 `git push` 或 `git push --force`．
2. **必需审查（Code Review）**：所有合并至 `main` 的 PR 必须经过至少 1 名具备写权限维护者的审批（Approval）．
3. **强制门禁检查（Required Status Checks）**：分支在合并前必须与 `main` 保持最新，且必需的 CI 工作流必须全部通过（Green）．
4. **管理账号同等受限（Enforce Admins）**：管理员亦需遵守上述保护规则，杜绝未经审查的任意绕过．

---

## 2. 必需状态检查项 (Required Status Checks)

合并至 `main` 的前置必需工作流：

| 检查项名称 (Context) | 来源工作流 | 职责与保护内容 |
| :--- | :--- | :--- |
| `Check Characters` | `.github/workflows/check-characters.yml` | 校验 Markdown 标点符号规范、全角句号、防止混排字符 |
| `Physics-Learning-Wiki Page Build` | `.github/workflows/build.yml` | 全量题库校验、全量测试矩阵（pytest、typecheck、Playwright）、MkDocs 全站构建与页面审计 |

> **注意：路径过滤工作流的排他性风险与防护设计**：
> `.github/workflows/check-question-bank.yml` 配置了路径过滤器（`paths: &quiz-paths`）．根据 GitHub Actions 规则，若将带有路径过滤的工作流设为必需检查项，仅修改非题库文档（如力学、数学）的 PR 将不会触发该检查，从而导致 PR 永久停滞在“等待状态上报”而无法合并．
> 由于 `Physics-Learning-Wiki Page Build` 在每个 PR 上都会无条件执行全量题库校验（`python -m scripts.question_bank validate` 及覆盖率测试）、单元测试与前端构建检查，因此将其作为必需检查即可实现全面的题库与构建安全防护，同时避免路径过滤带来的挂起死锁．若未来需要将 `Check Question Bank` 单独设为必需检查，必须先在对应工作流中添加路径未命中时的空通过兜底作业．

---

## 3. 自动化机器人 PR 审阅与闭环策略

仓库运行以下两类自动化 PR 任务：
- `bot/community-submissions`：由 `.github/workflows/generate-community.yml` 生成的社区投稿同步 PR．
- `bot/question-import`：由题库导入工作流生成的题目入库草稿 PR．

### 审阅与 CI 触发流程：
1. **CI 触发与批准**：由于 GitHub 安全机制，由默认 `GITHUB_TOKEN` 创建的 PR 不会自动触发 `pull_request` CI 工作流．维护者在收到通知后，应在 GitHub Actions 面板点击 **Approve and run workflows** 或执行手动派发．若仓库配置了独立 `COMMUNITY_BOT_TOKEN`（GitHub App Token），则 CI 将自动执行．
2. **内容对抗核验**：维护者核实 `docs/community/` 下生成的 Markdown 不含可疑外部引用或未授权内容．
3. **合并前确认**：确认三项必需状态检查（Required Status Checks）全部通过后，维护者方可执行 Squash & Merge．

---

## 4. 管理员配置与应用指南

### 方法一：使用自动化脚本一键配置（推荐）

具备仓库管理员权限的维护者运行：

```bash
# 确保已安装并登录 gh CLI
gh auth login

# 运行配置脚本
bash scripts/admin/configure-branch-protection.sh
```

### 方法二：使用 GitHub REST API 手动配置

```bash
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/Physics-Learning-Wiki/Physics-Learning-Wiki/branches/main/protection" \
  --input scripts/admin/branch-protection-config.json
```

### 方法三：GitHub Web 控制台手动勾选

进入 `Settings` -> `Branches` -> `Branch protection rules` -> `Add rule`:
1. **Branch name pattern**: `main`
2. 勾选 **Require a pull request before merging**:
   - 勾选 **Require approvals**: 设定为 `1`
   - 勾选 **Dismiss stale pull request approvals when new commits are pushed**
   - 勾选 **Require approval of the most recent reviewable push**
3. 勾选 **Require status checks to pass before merging**:
   - 勾选 **Require branches to be up to date before merging**
   - 在 Status checks 搜索并勾选：
     - `Check Characters`
     - `Check Question Bank`
     - `Physics-Learning-Wiki Page Build`
4. 勾选 **Do not allow bypassing the above settings** (Enforce admins)
5. 确认未勾选 **Allow force pushes** 与 **Allow deletions**
6. 点击 **Save changes** 完成．
