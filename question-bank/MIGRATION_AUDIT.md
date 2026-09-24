# 题库 v3 迁移与审计记录

本文记录 Question Bank v3 的迁移范围、题目签署审计和最近一次验证快照。提交明细以 Git 历史为准；最新 CI 状态以 PR #30 当前提交的 GitHub Actions 为准。

## 1. PR 范围与基线

- 评审分支：`feature/question-bank-v3`。
- 目标分支：`main`。
- 本次记录的 PR 基线：`9dd151b308e758c46ec5fb702e718364964bc080`。
- 上一轮完成代码验证的提交：`75909ec1811df0fa8ba7712356752bc4587fdea7`。该提交后的最终收口修改集中在维护文档和投稿契约示例。

PR #30 的当前提交和检查结果请查看 [Pull Request #30](https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/pull/30)。本报告不再维护提交总数或逐条复制提交历史，避免分支继续演进后报告立即过期。

## 2. 迁移交付范围

题库从页面绑定的旧模型迁移到由 Question、Quiz Set、Taxonomy 和 Placement 组成的资源模型，主要交付包括：

- 使用 Question Schema v3 和 Quiz Set Schema v1 管理题目与集合；发布状态、审核签署和版权来源由 schema 与验证器共同约束。
- 编译器生成 Manifest、题目与集合 Catalog、Set Bundle；浏览器按统一资源契约加载题库。
- Python 与 TypeScript 共享确定性选题协议和测试向量；Quiz Runner、题目浏览、页面内测及 footer 卡片复用同一套运行时。
- Submission v2 Worker 输出由 Python 导入器接收，并转换为 Question v3 草稿；人工签署和发布由维护 CLI 管理。
- CI 覆盖题库验证、跨语言选题、前端、投稿、文档构建、导航和格式检查。

## 3. 已发布题目签署与指纹审计

- [`review-migration-audit.json`](./review-migration-audit.json) 保存 30 条已发布题目在迁移前后的内容指纹记录。
- 当前题库包含 30 道已发布题目；每道题目均具有 physics、pedagogy 和 copyright 三个审核维度的签署。
- 当前题目 YAML 中的签署日期为 `2026-09-19`，签署人的 GitHub 用户名及与当前内容对应的 SHA-256 指纹保存在各题目的 `review` 字段。
- 迁移审计 JSON 用于追踪旧、新指纹；当前有效签署以题目 YAML 中的 `review` 数据和题库验证结果为准。

## 4. 验证记录

代码快照 `75909ec1811df0fa8ba7712356752bc4587fdea7` 的 PR 所需 Actions 检查均通过，涵盖 Quiz 类型检查与测试、bundle 检查、投稿检查、题库校验和生产构建。

本轮文档与 Concept ID 示例收口后的本地验证结果：

```powershell
uv run pytest tests/question_bank tests/integration tests/seo tests/test_check_format.py
corepack yarn submit:test
corepack yarn docs:format:check -a
uv run python scripts/check-format.py docs
uv run python -m scripts.question_bank validate
uv run mkdocs build --clean
```

Python 合并测试 88 项通过，投稿测试 14 项通过，文档格式检查通过。题库验证无错误，并报告两个预期提示：运动学页面引用的 quick/full Set 暂时保持 `draft`。格式建议检查成功退出，输出的文案建议为非阻断项。PR #30 本次文档收口后的 CI 结果以当前 head 的 Actions 为准。

## 5. 已知提示

- `docs/mechanics/kinematics/linear-motion.md` 引用的两个运动学 Set 暂时为 `draft`，因此题库验证会给出预期提示。
- Markdown/LaTeX 格式检查会给出非阻断的文案建议；每次运行的数量和内容以最新 CI 日志为准。
- MkDocs 构建中仍可见部分既有页面的相对链接提示，例如 `docs/intro/format.md` 与热力学章节。这些提示未阻止生产构建；具体状态以最新构建日志为准。
