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
  - `concepts.yml`：核心物理概念集合（如 `mechanics.newton.inertia` 等），支持定义归属主题与同义词别名。

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
├── taxonomy/        # 物理分类法 (topics.yml, concepts.yml)
├── schemas/         # JSON Schema 约束定义 (question, set)
├── README.md        # 架构与维护说明
└── REVIEWING.md     # 同行审阅与审核签署规范
```

---

## 常用维护与构建命令

```powershell
# 校验题库全部题目、测试集合与页面引用 (无阻断发布 gate)
uv run python -m scripts.question_bank validate

# 运行题库多维度健康度与覆盖度诊断报告
uv run python -m scripts.question_bank coverage
uv run python -m scripts.question_bank coverage --format json

# 编译生成浏览器端 Manifest v3、Set Bundles 与 Catalogs
uv run python -m scripts.question_bank build

# 导入用户提交的结构化题目投稿 (自动分配 q-NNNNNN 编号至 inbox/)
uv run python -m scripts.question_bank import-issue --input submission.json

# 记录人工同行审阅签署 (物理、教学、版权三维)
uv run python -m scripts.question_bank attest --id q-000001 --dimension physics --dimension pedagogy --dimension copyright --reviewer <GitHub_Username>

# 将已通过三维签署的草稿题目或测试集合正式发布
uv run python -m scripts.question_bank publish --id q-000001
uv run python -m scripts.question_bank publish --id mechanics.dynamics.newton-laws.quick

# 执行 Python 题库单元与集成测试
uv run pytest tests/question_bank tests/integration

# TypeScript 前端小测应用类型检查、单元测试与构建
corepack yarn quiz:typecheck
corepack yarn quiz:test
corepack yarn quiz:build
corepack yarn quiz:build:check

# 题目投稿与 Worker 单元测试与语法检查
corepack yarn submit:test
corepack yarn submit:check
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

1. **新建题目**：推荐通过网站专用投稿通道 `/quiz/contribute/` 提交，或者在本地使用 `q-NNNNNN` 编号在 `question-bank/questions/` 下创建 YAML 文件。
2. **必填要素**：`type`、`stem`、`choices`（若适用）、`answer`、`solution`、`attribution` 与 `license: CC-BY-SA-4.0`。
3. **元数据归类**：若不确定所属的 `topics` 或 `concepts`，草稿中可留空，由维护者归纳整理。
4. **人工审核**：详见 [REVIEWING.md](REVIEWING.md)。每道题目需由审核者签署并验证内容指纹无误后方可 `publish`。
