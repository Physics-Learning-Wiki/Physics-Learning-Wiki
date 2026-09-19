# 题库 v3 架构迁移与审阅指纹审计报告 (Question Bank v3 Migration & Audit Report)

## 1. 分支基线与提交历史对齐说明

### 1.1 分支基线与合并推进方案

- **分支起点**: `feature/question-bank-v3` 分支基于本地 `main` 分支提交 `aa96c27` 创建。
- **与远端 main 的关系**: 本地 `main` 分支（`aa96c27`）领先远程 `origin/main` (`503b7568`) 19 个前置提交（涵盖数学基础工具、RFC 规划以及题库重构前置准备）。
- **合并方案规划**:
  - **方案 A（推荐，标准双阶段 PR / 合并流程）**:
    1. **阶段一（前置基线合入）**: 将本地 `main` 的 19 个基础提交（`503b7568` ~ `aa96c27`）单独推送至 `origin/main`（或发起前置基座 PR 并合并）。
    2. **阶段二（题库 v3 独立合入）**: 当 `origin/main` 对齐至 `aa96c27` 后，发起 `feature/question-bank-v3` 到 `main` 的 Pull Request。该 PR 将仅包含纯净的题库 v3 迁移与 Hardening 提交（Commit 1 ~ Commit 25），评审范围高度聚焦，与执行计划严格一一对应。
  - **方案 B（备选，单 PR 整体交付）**:
    若团队选择直接将 `feature/question-bank-v3` 合并至 `origin/main`（`503b7568`），评审者需知悉前 19 个提交为底座准备工作，真正的题库 v3 迁移自提交 `aa96c27` 开始。

### 1.2 原子提交链 (Atomic Commit Chain)

- **第一阶段：题库 v3 架构主体迁移 (Commit 1 ~ Commit 14)**
  - **Commit 1 ~ Commit 14** (`aa96c27` ~ `cefb728`): 题库 v3 架构主体迁移（从以页面为主体切换至 Question → Set → Taxonomy → Placement 四层资源中心架构，清理 Blueprint 与旧 24 题 Gate）。
- **第二阶段：第一轮代码强化与质量收口 (Commit 15 ~ Commit 21)**
  - **Commit 15** (`ecf442b`): `fix(question-bank): 修复选择题草稿反馈校验并隔离预览候选池`
  - **Commit 16** (`93ce5f3`): `fix(quiz): 兼容草稿可选字段并重构小测过期失效与退出导航`
  - **Commit 17** (`36cf062`): `feat(question-bank): 冻结选题算法 v1 跨语言确定性协议与共享测试集`
  - **Commit 18** (`88ded1b`): `fix(question-bank): 强化集合约束与题目引用校验并支持发布测试集合`
  - **Commit 19** (`237e289`): `fix(quiz): 闭环页面内测作答幂等与组件隔离并对齐投稿协议`
  - **Commit 20** (`67b64f4`): `fix(quiz): 补齐集合标签筛选、首页精选配置与 CI 流水线修复`
  - **Commit 21** (`5aa997c`): `docs(question-bank): 完善题库 v3 审计记录与最终合并核对清单`
- **第三阶段：第二轮深度加固与阻塞问题彻底清零 (Commit 22 ~ Commit 25)**
  - **Commit 22** (`9ecd39e`): `fix(quiz): 切换选题回溯至惰性生成器并修复未约束搜索耗尽诊断`
    - TypeScript 选题引擎实现基于索引游标的惰性 `combinations<T>` 生成器，杜绝在大候选集（如 $C(40, 20)$）下预先分配数亿数组导致的堆内存耗尽与事件循环冻结；
    - 约束搜索与非约束搜索双重检测 `if (exhausted)`，修复无解松弛阶段步数超限误报 `slot_conflict` 的诊断偏差；
    - 补充 Golden fixture 耗尽测试向量与毫秒级组合性能测试。
  - **Commit 23** (`7903b55`): `fix(submit): 严格对齐 Worker 投稿校验与题库导入 Schema 契约`
    - 多选题严格限制 3~8 个选项且至少 2 个不重复有效答案；
    - 数值题强制要求容差（绝对/相对）与可接受单位数组，并严格校验规范单位从属关系；
    - 概念与主题分类强制点分小写命名空间正则（`^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]+)+$`）；
    - Markdown 校验拦截危险 HTML 标签与 `on*` 事件处理器注入；
    - 补充 Python 端到端导入测试，断言 Worker 校验通过的各种题型导入题库均 100% 通过 Repository 校验。
  - **Commit 24** (`402fed2`): `fix(quiz): 修复失效小测键盘异常、闭环集合不可行失效流程与存储提示`
    - `PlaySurface` 对 `this.session` 增加空指针防卫，确保在会话未就绪或处于失效提示时仅安全响应 Escape，杜绝按键解构崩溃；
    - 退役集合（retired）与不可行集合（infeasible/unrunnable）联动历史 active session 检测，渲染专有失效通知与一键清除动作；
    - `QuizStore` 增加 `consumeResetReason()` 消费机制，小测发现页与首页动态渲染可关闭的存储重置提示横幅；
    - 错题重做会话（adhoc）严格设为页面内临时会话，不作为持久 active session 跨页面污染正常集合进度。
  - **Commit 25**: `docs(question-bank): 修正审计报告表述、相对链接与分支合并基线说明`
    - 清理残留本地 `file:///` 绝对路径，统一为相对路径；
    - 精确化字符集排序描述与 CI 触发状态描述；
    - 完备记录合并方案与全量自动化验证通过记录。

---

## 2. 题目审阅指纹重签审计记录

- **审计元数据源**: [`review-migration-audit.json`](./review-migration-audit.json)
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

本清单完整覆盖执行计划与两轮代码评审提出的全部 25 项要求，经全套自动化测试检验已全部清零：

### 维度一：题目生命周期与发布门禁
- [x] **#1 草稿选择题逐项 feedback 可选校验**: 草稿阶段单选/多选题可不提供 `feedback.choices`，仅在 `status: published` 时强制要求；
- [x] **#2 Published Set 预览候选池隔离**: 在开启预览模式编译 Set Bundle 时，已发布的集合只从已发布题目池中选题，草稿题目绝不泄漏至正式集合中；
- [x] **#3 前端草稿 DTO 可选字段兼容渲染**: 前端 TypeScript 兼容 `feedback`、`explanation` 与元数据缺失场景，优雅降级，杜绝崩溃；
- [x] **#4 答题会话过期失效三态处理**: 区分“无会话”、“可恢复会话”与“过期失效会话”，并在 UI 提供清除并重新开始的明确通知与按钮；
- [x] **#5 全屏答题器退出导航回退规范**: 退出按钮统一调用 `exitToLanding()`，精确回退到站点基准路径 `/quiz/`。

### 维度二：跨语言选题算法与集合契约
- [x] **#6 跨语言非地区性字符排序与 ASCII 字符集对齐**: Question ID 被 Schema 严格约束为纯 ASCII 字符（`^[a-z0-9-]+$`），Python 字符序（`ord(c)`）与 JavaScript code-unit 排序（`charCodeAt`）在合法 ASCII 空间完全等价，杜绝了操作系统 locale 差异；
- [x] **#7 字符串 UTF-8 字节流 FNV-1a 哈希**: 种子哈希严格按 UTF-8 字节流解码计算，彻底解决 Emoji 及非 BMP 字符跨语言哈希分歧；
- [x] **#8 回溯搜索状态诊断细化与耗尽检查**: 求解器回溯超出预算（5000 步）时保留最优搜索状态，两轮搜索均严格检验 `exhausted` 状态，准确区分 `constraint_violation`、`slot_conflict` 与 `exhausted`；
- [x] **#9 Set 题目引用存在性与状态校验**: 集合过滤引用的题目必须在题库中存在；引用退休题报错，草稿集引用未知题警告，发布集引用草稿题或未知题报错；
- [x] **#10 Set 集合约束与取值校验**: 校验 `min <= max` 及 `min <= count`，严格校验 `difficulty`（1..3）、`type`、`style` 枚举取值合法性；
- [x] **#11 跨语言共享 Golden Fixture 测试集**: 在 `tests/question_bank/fixtures/selection_v1_golden.json` 建立共享向量集，Python 与 TS 双端一致通过；
- [x] **#12 选题接口机器可读结构化契约**: 跨语言实现统一返回 `SelectionOutcome` / `SelectionResult` 结构对象，包含明确的状态码与原因说明；
- [x] **#13 惰性组合生成器与计算安全**: TypeScript 端使用生成器 `function* combinations` 替代全量数组预分配，在大组合下保持 $O(1)$ 内存占用与毫秒级搜索预算拦截。

### 维度三：组件独立性、作答状态机与投稿对齐
- [x] **#14 页面内嵌自测实例隔离与作答幂等**: 采用动态 `sessionId` 隔离单选 radio 的 `name` 属性，`checkInlineCompletion()` 增加布尔防重锁；
- [x] **#15 LocalStorage 异常自愈恢复与重置通知**: 完备校验解析数据结构，异常时自动重置为标准空状态，并通过 `consumeResetReason()` 向用户展示一次性可关闭通知横幅；
- [x] **#16 Cloudflare Worker 投稿规则全面对齐**: 多选限制 3~8 项且 2+ 答案，数值强制容差与单位，分类法限制点分小写命名空间，防范 XSS 与属性事件注入；
- [x] **#17 失效小测键盘交互安全防卫**: `PlaySurface` 在无有效 session 状态下安全拦截按键，仅允许 Escape 退出，杜绝控制流未定义属性异常；
- [x] **#18 退役与不可用集合状态闭环**: 对退役（retired）或题目不可行（infeasible）的 Set，提供明确的失效通知与历史会话清除动作；
- [x] **#19 错题重做临时会话隔离**: 错题重做标记为页面内临时会话，退出即销毁，不持久化到 LocalStorage 污染正常集合进度。

### 维度四：探索界面、测试配置与文档漂移
- [x] **#20 集合目录标签筛选下拉框**: 在测试集合页面补齐 `<select id="plw-select-tag">`，与主题和反馈模式实现联动筛选；
- [x] **#21 首页精选测试集合配置驱动**: 首页容器支持 `data-featured-sets` 属性，依配置优先渲染推荐集合；
- [x] **#22 文档路径漂移与选项文本搜索**: 修正 `taxonomy/concepts/` 目录说明，修复题库浏览器搜索逻辑读取 `contentHtml` 字段。

### 维度五：持续集成、合并基线与审计交付物
- [x] **#23 分支基线与合并方案明确说明**: 详尽阐述 `aa96c27`、19 个本地提交与 `origin/main` 的关系，给出方案 A 与方案 B 两种操作指南；
- [x] **#24 审阅指纹重签审计归档**: 形成本文档与 `review-migration-audit.json`（相对路径链接），记录全部 30 道题目的重签流水；
- [x] **#25 自动化流水线全量检验与 CI 状态说明**: 本地全套校验无错误，修正 CI 中 `validate --release` 无效参数，明确待 PR 触发远端 Actions 流程。

---

## 4. 全量验证指令与通过记录

本地已执行全部自动化测试套件与静态检查，全部通过且 0 错误（远端 GitHub Actions 将在发起 PR 后复核）：

```powershell
# 1. 题库校验 (0 error, 2 expected draft warnings)
python -m scripts.question_bank validate

# 2. 题库健康度报告生成
python -m scripts.question_bank coverage --format json

# 3. Python 单元与集成测试套件 (63 passed)
pytest tests/question_bank tests/integration

# 4. 前端 TypeScript 类型检查 (0 error)
npm run quiz:typecheck

# 5. 前端 JavaScript 单元测试 (29 passed)
npm run quiz:test

# 6. 前端构建产物一致性校验 (Clean)
npm run quiz:build:check

# 7. Cloudflare Worker 测试与检查 (11 passed, 0 error)
npm run submit:test
npm run submit:check

# 8. 生产站点完整文档构建 (0 error, 3.3s build success)
python -m mkdocs build --clean
```
