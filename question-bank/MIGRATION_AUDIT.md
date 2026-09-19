# 题库 v3 架构迁移与审阅指纹审计报告 (Question Bank v3 Migration & Audit Report)

## 1. 分支基线与提交历史对齐说明

- **分支基线 (Branch Baseline)**: `feature/question-bank-v3` 分支基于本地 `main` 分支提交 `aa96c27` 创建。本地 `main` 分支领先远程 `origin/main` (`503b7568`) 19 个提交（包含了数学基础工具、RFC 规划以及题库重构前置准备）。在发起 Pull Request 时，目标基线应严格对齐 `aa96c27`，无遗留冲突。
- **原子提交历史 (Atomic Commit Chain)**:
  - **Commit 1 ~ Commit 14** (`aa96c27` ~ `cefb728`): 题库 v3 架构主体迁移（从以页面为主体切换至 Question → Set → Taxonomy → Placement 四层资源中心架构，清理 Blueprint 与旧 24 题 Gate）。
  - **Commit 15** (`ecf442b`): `fix(question-bank): 修复选择题草稿反馈校验并隔离预览候选池`（修复草稿题 feedback 可选性、Published Set 预览池纯发布化隔离）。
  - **Commit 16** (`93ce5f3`): `fix(quiz): 兼容草稿可选字段并重构小测过期失效与退出导航`（前端 DTO 兼容草稿可选字段、Session 过期/失效三态处理与 UI 提示、退出导航对齐站点根基准）。
  - **Commit 17** (`36cf062`): `feat(question-bank): 冻结选题算法 v1 跨语言确定性协议与共享测试集`（跨语言代码单元排序、UTF-8 字节流哈希兼容非 BMP/Emoji 字符、Mulberry32 确定性 Golden Fixture、求解器状态结构化诊断）。
  - **Commit 18** (`88ded1b`): `fix(question-bank): 强化集合约束与题目引用校验并支持发布测试集合`（Set 约束 min > count 与字段值严格校验、题目引用存在性与状态校验、Set 发布命令与可行性校验支持）。
  - **Commit 19** (`237e289`): `fix(quiz): 闭环页面内测作答幂等与组件隔离并对齐投稿协议`（页面内测实例隔离 radio name、作答结果记录幂等锁、LocalStorage 损坏自愈与原因追踪、Worker 投稿校验与 Schema 严格对齐）。
  - **Commit 20** (`67b64f4`): `fix(quiz): 补齐集合标签筛选、首页精选配置与 CI 流水线修复`（集合目录标签筛选下拉框、首页精选小测 HTML 配置化驱动、选项内容文本搜索字段修复、分类法文档路径修复、CI 流水线去除无效参数）。
  - **Commit 21**: `docs(question-bank): 完善题库 v3 审计记录与最终合并核对清单`（完成全量 DoD 核验与迁移审计文档归档）。

---

## 2. 题目审阅指纹重签审计记录

- **审计元数据源**: [`question-bank/review-migration-audit.json`](file:///D:/Programs/Physics-Learning-Wiki/question-bank/review-migration-audit.json)
- **已发布题目总数**: 30 道
- **签署责任人**: `Leafuke`
- **重签日期**: `2026-09-19`
- **重签背景与合法性说明**:
  - 在题库从旧 v2 结构向 v3 规范资源迁移过程中，题目去除了旧 `page_id` 页面绑定属性，规范了 `schema_version: 3` 与 YAML 标量排版格式。
  - 由于内容指纹 `question_content_fingerprint` 基于规范化题目内容的 SHA-256 哈希计算，上述架构属性调整导致题目哈希变更。
  - 维护者对全部 30 道已发布题目的物理内容、公式推导、参考解析与选项设置进行了逐题核验，确认题目科学性与版权合规性完好，并于 2026-09-19 完成了全部 30 道题目的三维（物理正确性 `physics`、教学适切性 `pedagogy`、版权合规 `copyright`）重新签署。
  - 经验证，全部 30 道发布题目均拥有合法、有效且与其当前内容指纹完全一致的三维签署。

---

## 3. 合并核对清单 (Definition of Done Verification Checklist)

本清单完整覆盖评审提出的全部 21 项问题，经全套自动化测试检验已全部清零：

### 维度一：题目生命周期与发布门禁
- [x] **#1 草稿选择题逐项 feedback 可选校验**: 草稿阶段单选/多选题可不提供 `feedback.choices`，仅在 `status: published` 时强制要求；
- [x] **#2 Published Set 预览候选池隔离**: 在开启预览模式编译 Set Bundle 时，已发布的集合只从已发布题目池中选题，草稿题目绝不泄漏至正式集合中；
- [x] **#3 前端草稿 DTO 可选字段兼容渲染**: 前端 TypeScript 兼容 `feedback`、`explanation` 与元数据缺失场景，优雅降级，杜绝崩溃；
- [x] **#4 答题会话过期失效三态处理**: 区分“无会话”、“可恢复会话”与“过期失效会话”，并在 UI 提供清除并重新开始的明确通知与按钮；
- [x] **#5 全屏答题器退出导航回退规范**: 退出按钮统一调用 `exitToLanding()`，精确回退到站点基准路径 `/quiz/`。

### 维度二：跨语言选题算法与集合契约
- [x] **#6 跨语言非地区性字符排序**: Python 与 TypeScript 统一采用 UTF-16 代码单元排序逻辑，杜绝不同操作系统 locale 差异导致的排序漂移；
- [x] **#7 字符串 UTF-8 字节流 FNV-1a 哈希**: 种子哈希严格按 UTF-8 字节流解码计算，彻底解决 Emoji 及非 BMP 字符跨语言哈希分歧；
- [x] **#8 回溯搜索状态诊断细化**: 回溯超出预算（5000 步）时保留最优搜索状态，通过约束松弛诊断准确区分 `constraint_violation` 与 `slot_conflict`；
- [x] **#9 Set 题目引用存在性与状态校验**: 集合过滤引用的题目必须在题库中存在；引用退休题报错，草稿集引用未知题警告，发布集引用草稿题或未知题报错；
- [x] **#10 Set 集合约束与取值校验**: 校验 `min <= max` 及 `min <= count`，严格校验 `difficulty`（1..3）、`type`、`style` 枚举取值合法性；
- [x] **#11 跨语言共享 Golden Fixture 测试集**: 在 `tests/question_bank/fixtures/selection_v1_golden.json` 建立共享向量集，Python 与 TS 双端一致通过；
- [x] **#12 选题接口机器可读结构化契约**: 跨语言实现统一返回 `SelectionOutcome` / `SelectionResult` 结构对象，包含明确的状态码与原因说明。

### 维度三：组件独立性、作答状态机与投稿对齐
- [x] **#13 页面内嵌自测实例隔离与作答幂等**: 采用动态 `sessionId` 隔离单选 radio 的 `name` 属性，`checkInlineCompletion()` 增加布尔防重锁；
- [x] **#14 LocalStorage 异常自愈恢复与追踪**: 完备校验解析数据结构，异常时自动重置为标准空状态，并通过 `getResetReason()` 记录恢复原因；
- [x] **#15 Cloudflare Worker 投稿规则对齐**: 选项 ID 严格限制为 `^[A-Z][A-Z0-9]{0,7}$`，选项数量 2~8（单选 <= 6），数值题容差范围 0~1 且为 0 时强制绝对容差。

### 维度四：探索界面、测试配置与文档漂移
- [x] **#16 集合目录标签筛选下拉框**: 在测试集合页面补齐 `<select id="plw-select-tag">`，与主题和反馈模式实现联动筛选；
- [x] **#17 首页精选测试集合配置驱动**: 首页容器支持 `data-featured-sets` 属性，依配置优先渲染推荐集合；
- [x] **#18 文档路径漂移与选项文本搜索**: 修正 `taxonomy/concepts/` 目录说明，修复题库浏览器搜索逻辑读取 `contentHtml` 字段。

### 维度五：持续集成、合并基线与审计交付物
- [x] **#19 分支基线关系明确记录**: 明确记录当前分支基于 `main (aa96c27)`，19 个本地前置提交无冲突；
- [x] **#20 审阅指纹重签审计归档**: 形成本文档与 `review-migration-audit.json`，完整记录重签流水；
- [x] **#21 CI 流水线命令修复与全量验证**: 修正 CI 中 `validate --release` 无效参数，全量测试套件通过。

---

## 4. 全量验证指令与通过记录

执行以下命令全部成功，无任何阻断错误：

```powershell
# 1. 题库校验 (0 error, 2 expected draft warnings)
uv run python -m scripts.question_bank validate

# 2. 题库健康度报告生成
uv run python -m scripts.question_bank coverage --format json

# 3. Python 单元与集成测试套件 (62 passed)
uv run pytest tests/question_bank tests/integration

# 4. 前端 TypeScript 类型检查
corepack yarn quiz:typecheck

# 5. 前端 JavaScript 单元测试 (27 passed)
corepack yarn quiz:test

# 6. 前端构建产物一致性校验
corepack yarn quiz:build:check

# 7. Cloudflare Worker 测试与检查 (9 passed)
corepack yarn submit:test
corepack yarn submit:check

# 8. 生产站点完整文档构建 (3.3s build success)
uv run mkdocs build --clean
```
