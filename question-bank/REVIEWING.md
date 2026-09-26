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

---

## 内容指纹（Fingerprint）与安全守则

题库使用基于内容归一化哈希的 SHA-256 内容指纹（`content_fingerprint`）对已发布题目的不可篡改性进行防线保障：

> [!IMPORTANT]
> **内容指纹约束与严禁行为**：
> 1. **修改源内容自动失效签署**：任何对已发布题目（published）的题干（stem）、选项（choices）、答案（answer）、解析（solution）、提示（hints）、反馈（feedback）或受管资源的修改，都会导致其内容指纹改变，旧签署立即失效，题目阻断 CI 发布。
> 2. **严禁自动化代签**：严禁任何自动化脚本、CI Pipeline 或 AI Agent 自行生成签署或自动调用 `attest` 命令。所有签署必须由具有物理专业背景的人类维护者独立核实后手动执行。
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
