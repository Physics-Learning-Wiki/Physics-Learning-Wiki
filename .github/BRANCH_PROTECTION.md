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

> `Physics-Learning-Wiki Page Build` 是 Build 工作流的汇总 Job，每个 PR 都会执行．源码检查与生产构建分别在 `tests`、`site` 中并行运行，汇总 Job 通过 `always()` 检查两者，只有全部成功才通过；失败、取消或跳过均不能满足门禁．原 `Check Question Bank` 的草稿校验与 quiz 格式检查已合并到 Build，不再保留重复工作流．必需检查名称及分支保护配置保持不变．

---

## 3. 自动化机器人 PR 审阅与闭环策略

仓库运行以下两类自动化 PR 任务：
- `bot/community-submissions-<run-id>`：由 `.github/workflows/generate-community.yml` 生成的社区投稿同步 PR；已有开放 PR 时继续使用其分支，关闭或合并后创建后继分支并保留旧分支．
- `codex/question-submission/issue-<number>-r<revision>-<run-id>`：由题库导入工作流生成的题目入库草稿 PR．

### 审阅与 CI 触发流程：
1. **CI 触发与批准**：使用默认 `GITHUB_TOKEN` 创建或更新 PR 后，检查可能需要维护者批准；按照该 PR 的 Actions 提示操作，并核实两个必需检查均对应最新提交．若检查未生成或无法批准，停止合并并检查工作流权限与触发记录，继续使用已约定的 `GITHUB_TOKEN` 策略．其他提交上的手动 Build 不能代替本 PR 的必需检查．参见 [GitHub 官方触发规则](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow#triggering-a-workflow-from-a-workflow)．
2. **内容对抗核验**：维护者核实 `docs/community/` 下生成的 Markdown 不含可疑外部引用或未授权内容．
3. **合并前确认**：确认两项必需状态检查（Required Status Checks）全部通过后，维护者方可执行 Squash & Merge．

---

## 4. 管理员配置与应用指南

### 方法一：使用自动化脚本一键配置（推荐）

具备仓库管理员权限的维护者运行：

```bash
# 确保已安装并登录 gh CLI
gh auth login

# 运行配置脚本
bash scripts/admin/configure-branch-protection.sh

# 只读核验；配置缺失或任何必需字段不符均返回非零，不执行 PUT
bash scripts/admin/configure-branch-protection.sh --check

# Windows 等没有 Bash 的环境使用同一实现
uv run python scripts/admin/branch_protection.py --check
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
     - `Physics-Learning-Wiki Page Build`
4. 勾选 **Do not allow bypassing the above settings** (Enforce admins)
5. 确认未勾选 **Allow force pushes** 与 **Allow deletions**
6. 勾选 **Require conversation resolution before merging**
7. 点击 **Save changes** 完成．

配置脚本在应用后回读服务端配置，并逐项核对必需检查、严格更新要求、审批数、最新推送审批、过期审批失效、管理员约束、会话解决和禁止强推/删除．仓库内配置文件不代表服务端规则已启用；实际应用与线上核验见 [安全运维待办](SECURITY_FOLLOW_UP.md)．
