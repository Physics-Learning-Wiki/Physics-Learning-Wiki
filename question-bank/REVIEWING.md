# 题库同行审阅与审核签署规范

在 Physics Learning Wiki 题库中，一道题目从 `draft`（草稿）晋级为 `published`（已发布），必须在仓库元数据中记录与其当前版本及内容指纹完全一致的**物理正确性**、**教学适切性**与**版权合规**三维审核签署。

Issue 讨论、PR 审批与自动化测试均不能代替人工审核签署。

---

## 审核维度与标准 (Rubric)

审核者在审阅题目时须逐项确认以下标准：

### 1. 物理正确性 (Physics)
- 物理概念界定严谨，公式推导与数值计算无误，单位与有效数字规范。
- 题意清晰唯一，不存在未说明的前提假设或多义性解读。
- 适用条件（如参考系、理想化模型假设、守恒条件）表述明确。

### 2. 教学适切性 (Pedagogy)
- 难度与认知层级符合大学基础物理或普通物理教学要求。
- 选择题干扰项设计对应典型概念误解或认知盲区，而非单纯文字文字游戏。
- 题干表述流畅，选项逐项反馈与深度解析能够有效引导学习者建立正确物理图景。
- 若包含图表，图表具有清晰可访问的替代文本（alt text）。

### 3. 数学排版与渲染合规性 (Math & Formatting)
- 公式书写规范，行间公式统一使用各自独占一行的标准 `$$` 块，公式块前后留空行。
- 严禁出现正文文本与 `$$` 混排或跨行未闭合的歧义语法。
- 题目在运行 `uv run python -m scripts.question_bank math-audit` 时应为 0 违规警告。

### 4. 版权与合规 (Copyright)
- 题目为原创内容或改编自公共领域、CC-BY-SA 等相容开源授权资料。
- 署名信息完整；若在编写过程中使用了 AI 辅助工具，须如实披露。
- 涉及插图必须存放在 `question-bank/assets/` 且版权合法，严禁直接引用未经授权的外部图床链接。

---

## 签署与发布流程

审核人员确认题目符合上述标准后，使用维护 CLI 记录签署：

```powershell
# 记录三维签署（支持同日由同一人签署或多位审阅者分维度签署）
uv run python -m scripts.question_bank attest --id <QUESTION_ID> --dimension physics --dimension pedagogy --dimension copyright --reviewer <GitHub_Username>

# 签署完成后正式发布题目
uv run python -m scripts.question_bank publish --id <QUESTION_ID>
```

### 批量记录已完成的人工审核

可以使用专门的 [Python 批量工具](../scripts/question_bank/batch_review.py)，把审核者已经完成的审核统一写入题库。工具分为生成清单和执行签署两步；`plan` 不修改题目，`apply` 必须由实际审核者在核对清单后亲自执行。请在仓库根目录运行，并将 `YOUR-GITHUB-NAME` 替换为你的 GitHub 用户名。

本次留数题目（`q-000050`–`q-000089`）的操作示例：

```powershell
# 1. 冻结本次 40 道题的版本、内容指纹及 7 个关联题集
uv run python -m scripts.question_bank.batch_review plan --id-range q-000050:q-000089 --reviewer YOUR-GITHUB-NAME --output reports/residue-review-plan.json

# 2. 核对清单，完成所列三个维度的人工审核后，亲自执行签署
uv run python -m scripts.question_bank.batch_review apply --plan reports/residue-review-plan.json --confirm-human-review
```

第二步默认只写审核标记，题目仍为草稿。若还要将题目和清单中的关联题集一并正式发布，在第二步添加 `--publish --publish-sets`：

```powershell
uv run python -m scripts.question_bank.batch_review apply --plan reports/tmp-review-plan.json --confirm-human-review --publish --publish-sets

# 发布后检查并重建站点
uv run python -m scripts.question_bank validate
uv run mkdocs build --clean
```

先只写标记、后再发布时，也可对同一清单再运行带发布参数的命令；题目仍是草稿且内容未变时不会重复追加同一审核者的签署。题目已发布后，该清单不可再次用于签署。

按不同范围生成清单时，将示例中的 `--id-range` 及范围替换成以下一种选择方式：

| 选择方式 | 参数 | 范围 |
| --- | --- | --- |
| 全部待审核草稿 | `--all-drafts` | 包括其他主题中的全部草稿 |
| 指定题目目录 | `--directory question-bank/questions/math/complex-analysis/residue-methods` | 该目录及子目录中的草稿 |
| 指定固定题集 | `--set math.complex-analysis.residue-comprehensive` | 该集合引用的草稿；已发布题目不重复签署 |
| 若干题号 | `--ids q-000050 q-000051` | 指定题号中的草稿 |

`--set` 可重复指定，题目会去重；查询式题集需使用目录或明确题号选取。工具始终跳过已发布和已退役题目，所以旧错误题 `q-000045` 不会被重新启用。关联题集只列出本次题目发布后可由所选题目与现有已发布题目组成的草稿固定题集，不会顺带发布其他题集。

默认签署维度为 `physics`、`pedagogy`、`copyright`；若只完成了某一维度，生成清单时使用例如 `--dimension physics`，多个维度可重复指定。默认审核日期取北京时间当天，也可以用 `--reviewed-on 2026-10-12` 明确填写实际审核日期。不同审核者可各自生成清单、记录自己完成的维度；正式发布仍要求当前版本具备完整三维签署。

清单输出必须是题库目录外的新文件。题面、解析、反馈、元数据、版本或受管图片变化会使清单失效，工具会在写入前停止；需要重新生成清单并核对变更。使用 `--publish` 时，脚本先按已发布题目的要求检查内容字段和分类引用，缺少 `feedback` 等字段会在写审核标记之前报错；三维审核签署仍由签署后的完整校验确认。若后续发布校验失败或操作过程中出现可捕获异常，整批选中资源会恢复到运行前的原始文件内容。审核标记不等于部署，网站更新仍需执行现有构建或部署流程。

---

## 内容指纹（Fingerprint）与安全守则

题库使用基于内容归一化哈希的 SHA-256 内容指纹（`content_fingerprint`）对已发布题目的不可篡改性进行防线保障：

> [!IMPORTANT]
> **内容指纹约束与严禁行为**：
> 1. **修改源内容自动失效签署**：任何对已发布题目（published）的题干（stem）、选项（choices）、答案（answer）、解析（solution）、提示（hints）、反馈（feedback）或受管资源的修改，都会导致其内容指纹改变，旧签署立即失效，题目阻断 CI 发布。
> 2. **严禁自动化代审、代签**：CI Pipeline 或 AI Agent 不得自行判断审核通过、生成真实审核签署或调用 `attest` / 批量工具的 `apply`。所有审核决定必须由具有物理专业背景的人类维护者独立核实；维护者亲自执行 CLI 或批量工具时，可以机械地记录其已经完成的审核。批量工具的 `--confirm-human-review` 是审核者的声明，不是程序对内容正确性的判断，也不得被用来设置无人值守审批流程。
> 3. **严禁直接修改指纹**：严禁在 YAML 中手动伪造或修改 `review.content_fingerprint` 字段。
> 4. **严禁恶意降级逃避门禁**：严禁为规避 CI 校验错误而将正式发布的题目降级为 `draft`。

---

## 本地验收与防回归验证

在提交包含新发布题目或测试集合的 PR 前，请确保完成全套自动化验证：

```powershell
# 运行 Markdown 数学语法静态审计
uv run python -m scripts.question_bank math-audit

# 严格门禁校验（校验题库合法性、分类法与指纹有效性）
uv run python -m scripts.question_bank validate
uv run python -m scripts.question_bank coverage

# Python 题库单元与集成测试
uv run pytest tests/question_bank tests/integration

# 前端应用类型检查与单测
corepack yarn quiz:typecheck
corepack yarn quiz:test
corepack yarn forms:typecheck
corepack yarn forms:test

# 前端资源构建同步性验证
corepack yarn features:build:check

# 跨端 Playwright 真实渲染回归
corepack yarn e2e:quiz
corepack yarn e2e:forms
```
