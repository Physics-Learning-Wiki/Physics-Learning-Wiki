# Physics Learning Wiki 题库 (v3 资源中心架构)

Physics Learning Wiki 的自测题库基于**资源中心模型**构建，由 **Question（独立题目）**、**Quiz Set（测试集合）**、**Taxonomy（知识分类体系）** 与 **Placement（页面自测放置）** 四层架构组成。题目不再绑定于特定页面所有权，而是作为一等公民题库资源，支持跨模块组卷、按知识图谱抽取以及多场景灵活嵌入。

---

## 核心架构四层模型

### 1. Question（题目资源）
- 存储在 `question-bank/questions/` 目录中，每道题目一个独立 UTF-8 YAML 文件。
- 题目 ID 规范：
  - 迁移保留的历史 ID（如 `kin-vec-0001`、`mech-dyn-newton-0001` 等）。
  - 新导入或新增题目统一使用全局递增序列格式：`q-NNNNNN`（如 `q-000001`）。
- 状态机（`status`）：
  - `draft`：草稿状态。题干、答案、解析必须完整并符合安全与基础校验，分类法（topics/concepts/objectives 等）可留空供维护者后续整理。仅在显式启用预览时加载，不参与正式构建。
  - `published`：已发布状态。必须通过物理正确性、教学适切性与版权合规三维人工审核签署，并在生产构建时编译入库。
  - `retired`：归档退役状态。保留历史记录，但不再进入任何测试集合选题。

### 2. Quiz Set（测试集合）
- 存储在 `question-bank/sets/` 目录中，每套小测一个独立 YAML 文件。
- 组成模式（`selection.type`）：
  - `fixed`：固定题目列表（`questions: ["id1", "id2", ...]`, `order: "fixed" | "shuffle"`）。
  - `query`：基于分类法与题目属性的动态约束求解（通过 Mulberry32 确定性 PRNG，根据 `seed` 在浏览器端即时求解确定性题单）。
- 反馈模式（`feedback_mode`）：
  - `immediate`：即时自测模式，每答完一题即显示对错判断、单题选项反馈与完整考点解析。
  - `deferred`：整卷测验模式，完成全部题目并交卷后统一展示总评、各题回顾与深度解析。
- 统一答题运行器：`/quiz/play/?set=<set-id>&seed=<seed>`。

### 3. Taxonomy（知识体系与分类法）
- 存储在 `question-bank/taxonomy/`：
  - `topics.yml`：物理主题层级树（如 `mechanics` → `mechanics.dynamics`）。
  - `concepts/` 目录（如 `concepts/mechanics.yml`）：核心物理概念集合（如 `newton.inertia` 等），支持定义归属主题与同义词别名。

### 4. Placement（页面内容嵌入）
- 页面通过 Markdown Front Matter 中的 `assessments:` 字段声明引用，无需声明页面所有权或题目数量硬性门槛：
  - `placement: footer`：在教程文末呈现小测卡片集合。
  - `placement: inline`：在教程正文指定标题或锚点（`anchor: ...`）后直接注入即时交互自测组件。

---

## 目录结构

```text
question-bank/
├── assets/          # 题目插图资源 (通过 asset:<name> 引用)
├── questions/       # 题目资源 YAML (支持子目录或 inbox/)
├── sets/            # 测试集合 YAML
├── taxonomy/        # 物理分类法 (topics.yml, concepts/mechanics.yml 等)
├── schemas/         # JSON Schema 约束定义 (question, set)
├── README.md        # 架构与维护说明
└── REVIEWING.md     # 同行审阅与审核签署规范
```

---

## Markdown 数学公式规范

为了确保题目在不同端（桌面端、移动端）与不同渲染阶段（构建期 MathJax CHTML SSR、动态加载、投稿预览）的一致性与可维护性，题库对 Markdown 中的 LaTeX 公式制定了严格的书写规范与静态审计机制：

### 1. 规范行间公式（Canonical Display Math）—— 首选标准
公式定界符 `$$` 必须各自独占一行，公式块前后保留空行：

```markdown
根据牛顿第二定律：

$$
\mathbf{F} = \frac{\mathrm{d}\mathbf{p}}{\mathrm{d}t} = m\mathbf{a}
$$

式中加速度与合外力同向。
```

### 2. 受支持的紧凑兼容格式（Legacy Compact Compatibility Syntax）
```markdown
$$E = mc^2$$
```
- 仅当整条逻辑行**只包含这一个公式**时，题库构建器与运行器会确定性将其规范化为标准行间块进行渲染。
- 此兼容规则确保了历史存量题目无需修改源码即可获得正确的块级排版，**不会改变题目的内容指纹（Content Fingerprint）**。
- 新增或修改题目时不推荐继续使用紧凑格式，应统一采用规范行间格式。

### 3. 严格禁止并被校验器拒绝的非法公式（Rejected by Validator）
校验器（`uv run python -m scripts.question_bank validate`）与数学审计器（`uv run python -m scripts.question_bank math-audit`）会直接拒绝以下歧义语法：
- **行间定界符与正文文字混排在同一行**：
  ```markdown
  <!-- 错误示范：严禁在正文行中嵌入 $$ -->
  根据质能方程 $$E = mc^2$$，质量与能量等价。
  ```
  *修复方式*：行内公式必须使用单美元符号 `$E = mc^2$`，或将公式拆为独立块级行。
- **跨行公式定界符未独占边界行**：
  ```markdown
  <!-- 错误示范：$$ 后面直接接公式内容或未在独立行闭合 -->
  $$E =
  mc^2$$
  ```
- **未配对或空公式定界符**。

---

## 运行时与交互契约

### 1. MathJax CHTML SSR 与样式表前置依赖
- 生产站点通过构建后处理（Post-build）将题库资源中的 LaTeX 公式预渲染为 MathJax CHTML 静态结构，并移除了运行时的客户端 MathJax 库（`math-csr.js`）。
- 动态 Quiz 模块必须在共享 MathJax 样式表（`assets/stylesheets/mathjax.css?hash=...`）真正加载就绪（`link.sheet` 可用）后方可挂载渲染 DOM，防止 Assistive MathML 视觉暴露或公式闪烁错位。
- 样式表链接遵循幂等与去重策略，在 instant navigation 跨页面切换过程中不重复追加。

### 2. 键盘导航与可访问性契约 (A11y)
- **快捷键矩阵**：在小测答题界面中，数字键（`1`–`9`）与字母键（`A`–`Z`）用于快速切换/选中对应的单选或多选选项；回车键（`Enter`）用于确认作答或进入下一题。
- **输入框隔离保护**：当焦点处于单行文本框（`<input type="text">`）、数值输入框（`<input type="number">`）、多行文本域（`<textarea>`）或中文输入法合成阶段（`isComposing`）时，小测按键监听器严格静默，不得抢占用户的正常打字与编辑行为。
- **保护 `<summary>` 原生语义**：对于“提示”（Hints）与“查看参考答案与解析”等 `<details>` 折叠元素，纯键盘用户通过 `Tab` 键聚焦 `<summary>` 后，敲击 `Enter` 或 `Space` 必须严格保持原生折叠/展开行为，绝不触发提交或切题。
- **指针来源焦点恢复机制（Pointer-origin focus restoration）**：当用户使用鼠标点击展开 `<summary>` 后，系统在识别到指针来源后，会将逻辑焦点安全平滑地转移至当前已选项或小测主控区，使得随后的键盘 `Enter` 能顺畅执行小测提交，实现鼠标与键盘的自然协作。

---

## 常用维护与构建命令

```powershell
# 运行 Markdown 数学语法分类与合规性静态审计
uv run python -m scripts.question_bank math-audit
uv run python -m scripts.question_bank math-audit --format json

# 校验题库全部题目、测试集合与页面引用 (严格发布门禁)
uv run python -m scripts.question_bank validate
uv run python -m scripts.question_bank validate --include-drafts

# 运行题库多维度健康度与覆盖度诊断报告
uv run python -m scripts.question_bank coverage
uv run python -m scripts.question_bank coverage --format json

# 编译生成浏览器端 Manifest v3、Set Bundles 与 Catalogs
uv run python -m scripts.question_bank build

# 导入用户提交的结构化题目投稿 (自动分配 q-NNNNNN 编号至 inbox/)
uv run python -m scripts.question_bank import-issue --input submission.json

# 记录人工同行审阅签署 (物理、教学、版权三维，严禁机器/Agent代签)
uv run python -m scripts.question_bank attest --id q-000001 --dimension physics --dimension pedagogy --dimension copyright --reviewer <GitHub_Username>

# 将已通过三维签署的草稿题目或测试集合正式发布
uv run python -m scripts.question_bank publish --id q-000001
uv run python -m scripts.question_bank publish --id mechanics.dynamics.newton-laws.quick

# 执行 Python 题库单元与集成测试
uv run pytest tests/question_bank tests/integration

# TypeScript 前端小测与表单类型检查、单元测试与构建
corepack yarn quiz:typecheck
corepack yarn quiz:test
corepack yarn forms:typecheck
corepack yarn forms:test
corepack yarn features:build
corepack yarn features:build:check

# 题目投稿与 Worker 单元测试与语法检查
corepack yarn submit:test
corepack yarn submit:check

# 跨端 Playwright 回归测试
corepack yarn e2e:quiz
corepack yarn e2e:forms
```

---

## 草稿与本地预览

在开发测试未发布的题目或小测集合时，可开启预览环境变量：

```powershell
$env:PLW_QUIZ_PREVIEW = "1"
uv run mkdocs serve
```

在预览模式下，题库前端与页面内小测会显示明显的草稿提示条，并允许在浏览器中试答草稿题目。正式生产构建与 CI 中严禁开启预览环境变量。

---

## 编写与贡献指南

### 通过网站投稿

推荐使用 `/quiz/contribute/`。表单提交的是 Submission v2 数据，由导入器转换为 Question v3 YAML。表单中的 `attribution` 属于投稿数据，导入时会转换为 `authors`；它不是 Question v3 的顶层字段。

### 手工编写 Question v3 YAML

新题目应放在 `question-bank/questions/`，并使用尚未占用的 `q-NNNNNN` ID。以下是可通过 Question v3 结构校验的最小判断题草稿：

```yaml
schema_version: 3
id: q-000001 # 请替换为尚未使用的题目 ID
version: 1
status: draft
locale: zh-CN
type: true_false
choice_order: fixed
stem: 静止的物体也具有惯性。
answer:
  value: true
solution: 一切有质量的物体都有惯性。
provenance:
  type: original
  note: 手工原创题
authors:
  - name: 作者姓名
    kind: human
license: CC-BY-SA-4.0
```

所有 Question v3 YAML 都必须提供 `schema_version`、`id`、`version`、`status`、`locale`、`type`、`choice_order`、`stem`、`solution`、`provenance`、`authors` 和 `license`。单选题与多选题还必须提供 `choices` 与 `answer`；判断题和数值题提供自动判分所需的 `answer`；自由作答题提供 `response`、`grading` 和 `reference_answer`，由学习者完成自评判分。草稿可以暂时省略分类和难度等元数据；发布题目所需字段与签署流程见 [REVIEWING.md](REVIEWING.md)。

自由作答题的 `response.format` 当前为 `plain_text`，`grading.mode` 当前为 `self_assessed`。评分标准通常包含“尚未掌握”“部分掌握”“基本掌握”三档，分数范围为 0 到 1。系统记录答案文本和自评积分，但不会把自评结果当作客观正确率，也不会自动加入错题本。

若尚未确定 `topics`、`concepts` 或其他分类信息，可以在草稿中省略这些可选字段，由维护者后续整理。不要把投稿表单 DTO 字段直接当作 YAML 字段；结构以 [`schemas/question.schema.json`](schemas/question.schema.json) 为准。

---

## 本地学习档案与个人题库架构 (v3 Local Learning Profile)

题库系统在浏览器本地实现了持久化学习档案（Local Learning Profile），无需用户账号或服务端数据库即可完成长期学习记录积累与个性化训练：

### 1. Learning 与 Library 严格解耦
- **Learning（系统学习状态）**：根据用户答题行为推导，包含作答次数、对错统计、错题状态机（`learning` / `mastered`）及掌握版本。
- **Library（用户主动资源）**：用户主动收藏与归类，包含题目收藏状态（`savedQuestions`）与自定义收藏夹（`collections`）。
- 两者完全独立：答错题目不会自动收藏；收藏题目不代表是错题；收藏题目在练习中答错仅影响 Learning 状态，不影响所属收藏夹。

### 2. 错题判定与掌握状态机
- **自动入错题本**：仅当客观判题结果为错误时（`evaluation.mode === "automatic"` 且 `evaluation.status === "incorrect"`）自动加入错题本待巩固状态（`learning`）。未答、自评与存疑标记均不自动入本。
- **再次答对**：答对已在错题本中的题目仅累计 `correctAfterLastWrong`，不会自动移出错题本或变更为已掌握。
- **主动标记掌握**：用户确认已掌握后转入 `mastered` 并绑定确认时的题目版本 `masteredQuestionVersion`；若后续题库更新使题目版本升级，界面会提示旧版本已掌握、当前版本待确认；若已掌握题目再次作答客观判错，自动回退到 `learning`。

### 3. 收藏与收藏夹语义
- **多收藏夹归属**：一道题目可归属于多个收藏夹，单一真相源保存在题目收藏记录的 `collectionIds` 数组中。
- **虚拟收藏夹**：全部收藏与未分类（`collectionIds.length === 0`）均为视图计算，不创建实体记录。
- **删除与移除语义**：删除收藏夹仅删除收藏夹元数据并清除关联引用，不会取消题目收藏（若无其他归属则自然转入“未分类”）；从某收藏夹移除仅剔除一个归属；只有显式“取消收藏”才会彻底删除该题的收藏记录。

### 4. 存储事务、多标签页并发与边界防护
- **Web Locks 互斥写入**：所有写操作通过 Web Locks 串行化并基于最新落盘快照提交，严格递增 `revision`；不支持锁或存储受限时进入只读模式。
- **世代隔离（profileEpoch）**：备份覆盖恢复或重置档案时生成全新 `profileEpoch`，彻底使其他旧标签页迟到的未保存作答与弹窗草稿失效，避免覆盖已恢复数据。
- **容量上限约束**：本地随机练习单次最多 50 题；近期 Attempt 最多 50 条；active Session 最多 30 个（单来源最多 5 个）；自由作答文本每题 20,000 码点；收藏夹最多 200 个；收藏/学习记录各最多 10,000 条；档案 JSON UTF-8 上限 4 MiB，备份文件上限 5 MiB。
- **数据迁移与备份**：由旧版 v2 升级为 v3 时保留历史并标记 `partial_legacy`，不伪造缺失的历史统计；备份文件采用深层校验与原子覆盖恢复，生产与预览环境严格双向隔离。
- **严格 Stale 策略**：练习恢复遵循严格 stale 策略，若题库指纹、组卷算法或任一题目版本发生变化，旧 Session 予以保护并不再继续答题，防止答案提交冲突。

### 5. 复制工具与 AI 辅助隐私
- 题目卡片提供“复制题目”、“复制 AI 提问”及“打开 DeepSeek ↗”等学习工具。
- 复制内容仅包含学习者题面与选项的原始 Markdown/LaTeX 及绝对资源 URL，严格排除官方答案、解析与 feedback。
- 所有数据交互仅操作本地剪贴板或静态外链导航，系统绝不自动向任何第三方 AI 服务或远端接口上传题目内容或用户作答。

