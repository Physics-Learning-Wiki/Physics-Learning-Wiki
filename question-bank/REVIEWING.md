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

### 3. 版权与合规 (Copyright)
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

> [!NOTE]
> 任何对题干、选项、答案、解析或受管资源的修改都会导致内容指纹（Content Fingerprint）发生改变。一旦内容发生变更，旧签署将自动失效，必须重新完成审阅签署方可重新发布。

---

## 本地验收与防回归验证

在提交包含新发布题目或测试集合的 PR 前，请确保完成全套自动化验证：

```powershell
uv run python -m scripts.question_bank validate
uv run python -m scripts.question_bank coverage
uv run pytest tests/question_bank tests/integration
corepack yarn quiz:typecheck
corepack yarn quiz:build:check
uv run mkdocs build --clean
```
