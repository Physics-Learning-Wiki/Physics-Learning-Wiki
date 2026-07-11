# Physics Learning Wiki 题库

题库源文件使用 UTF-8 YAML；一道题一个文件，文件名必须与题目 `id` 一致。生产构建只会编译 `status: published` 的题，`draft` 只能通过显式预览模式加载，`retired` 永不进入新测验。

## 数据关系

- `scope.pages` 在阶段一必须且只能包含一个稳定页面 ID。
- `primary_objective` 是蓝图选题和结果汇总依据。
- `secondary_objectives` 只用于展示和检索。
- `concepts` 描述题目涉及的知识概念。
- AI 生成内容必须以 `authors[].kind: ai` 标识，且只能保持 draft，直到人工审核。

## 目录

- `schemas/`：题目与蓝图 JSON Schema。
- `questions/`：生产题库源文件。
- `blueprints/`：各页面测验蓝图。
- `fixtures/`：自动测试数据，不参与生产编译。

## 状态与审核

`published` 题必须同时记录物理审核和教学审核。两项审核可以由同一位维护者完成，但必须分别记录 GitHub 身份和审核日期。改编题还必须提供可核查来源与许可证说明。

## 常用命令

```powershell
uv run python -m scripts.question_bank validate --include-drafts
uv run python -m scripts.question_bank coverage
uv run python -m scripts.question_bank build
uv run pytest tests/question_bank tests/integration
corepack yarn quiz:typecheck
corepack yarn quiz:test
corepack yarn quiz:build
corepack yarn quiz:build:check
```

草稿浏览器预览：

```powershell
$env:PLW_QUIZ_PREVIEW = "1"
uv run mkdocs serve
Remove-Item Env:PLW_QUIZ_PREVIEW
```

预览页面和 bundle 会持续显示草稿警告。不要在 CI、Pages 构建或正式发布环境中设置 `PLW_QUIZ_PREVIEW`。

## 新增或修改内容

1. 从同页相近题目复制结构，分配永不复用的题目 ID。
2. 保持文件名与题目 ID 相同，并以 `status: draft` 开始。
3. 为题目指定唯一主目标；跨目标信息放入次目标或 concepts。
4. 执行普通校验、coverage、Python 测试和草稿预览。
5. 修改页面目标时，同时修改页面 Front Matter、显式锚点、相关题目和 blueprint。
6. 修改 TypeScript 后执行 `corepack yarn quiz:build`，并提交更新后的 bundle。

## 正式发布门槛

每个页面至少需要 24 道 published 题，每个主目标至少 4 道，并同时具备概念题和应用或建模题。每道 published 题必须有完整解析、明确来源、CC BY-SA 4.0 许可，以及物理审核和教学审核记录。两项审核可以由同一人完成，但不得省略任一维度。

发布前运行：

```powershell
uv run python -m scripts.question_bank validate --release
uv run python -m scripts.question_bank build
uv run mkdocs build --clean
```

AI 可以协助生成原创草稿，但不得代替物理正确性、教学适切性和版权审核，也不得自行将题目标记为 published。
