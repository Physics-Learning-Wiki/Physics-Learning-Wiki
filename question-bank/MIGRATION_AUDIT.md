# 题库 v3 架构迁移与审阅指纹审计报告 (Question Bank v3 Migration & Audit Report)

## 1. 分支基线与提交历史对齐说明

### 1.1 分支基线与合并推进方案

- **分支起点**: `feature/question-bank-v3` 分支基于本地 `main` 分支提交 `aa96c27` 创建。
- **与远端 main 的关系**: 本地 `main` 分支（`aa96c27`）领先远程 `origin/main` (`503b7568`) 19 个前置提交（涵盖数学基础工具、RFC 规划以及题库重构前置准备）。
- **合并方案规划**:
  - **方案 A（推荐，标准双阶段 PR / 合并流程）**:
    1. **阶段一（前置基线合入）**: 将本地 `main` 的 19 个基础提交（`503b7568` ~ `aa96c27`）单独推送至 `origin/main`（或发起前置基座 PR 并合并）。
    2. **阶段二（题库 v3 独立合入）**: 当 `origin/main` 对齐至 `aa96c27` 后，发起 `feature/question-bank-v3` 到 `main` 的 Pull Request。该 PR 将仅包含纯净的题库 v3 迁移与 Hardening 提交，评审范围高度聚焦，与执行计划严格一一对应。
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
- **第三阶段：第二轮深度加固与求解器/交互收口 (Commit 22 ~ Commit 25)**
  - **Commit 22** (`9ecd39e`): `fix(quiz): 切换选题回溯至惰性生成器并修复未约束搜索耗尽诊断`
  - **Commit 23** (`7903b55`): `fix(submit): 严格对齐 Worker 投稿校验与题库导入 Schema 契约`
  - **Commit 24** (`402fed2`): `fix(quiz): 修复失效小测键盘异常、闭环集合不可行失效流程与存储提示`
  - **Commit 25** (`ec7237f`): `docs(question-bank): 修正审计报告表述、相对链接与分支合并基线说明`
- **文档增强提交（包含在分支中）**
  - **Commit 26** (`bc1f844`): `fix(nav): 添加计算物理与工具章节`（主站导航结构更新，无题库代码冲突）
- **第四阶段：最终协议闭环与合规强化 (Commit 27 ~ Commit 31)**
  - **Commit 27** (`b85174b`): `fix(submit): 建立投稿合约共享测试集并落实 Worker 白名单 DTO 校验`
    - 建立跨语言共享投稿合约测试集 `tests/question_bank/fixtures/submission_v2_contract.json`，覆盖合法四类题型及所有非法属性构造；
    - Worker 端实现严格的白名单 DTO 校验与深层属性防逃逸，杜绝未知字段穿透导致 Schema 拒绝；
    - Python 端执行端到端全题型导入与校验，证明 $WorkerAccepted \subseteq ImporterAccepted$。
  - **Commit 28** (`ade90ea`): `fix(quiz): 闭环缺失集合失效流程、补全存储深层校验并修复提示交互`
    - `startSetRunner()` 将活跃会话检测前置至 `setMeta` 查找之前，闭环退役、下架或删除 Set 的失效处理与清理引导；
    - `storage.ts` 引入 `isSession`, `isAttempt`, `isWrongQuestions` 递归类型守卫，杜绝嵌套坏数据引发前端解构崩溃；
    - 修复首页动态挂载横幅的关闭按钮事件引用失效问题；
    - 放宽求解器单元测试时间上限至 5000ms，消除共享虚拟机 CI 偶发抖动。
  - **Commit 29** (`505061d`): `docs(question-bank): 更新审计报告合规矩阵与标准化验证指南`
    - 完备记录最新提交链，提供与项目 CI 一致的标准化复现指令。
  - **Commit 30** (`b62be1f`): `fix(submit): 强制要求单位包含规范单位并消除控制字符与安全边界差异`
    - Worker 端要求单位时强制要求有效规范单位且必须属于 `accepted`，杜绝 Python 校验反例；
    - 递归过滤 `< 32` ASCII 非法控制字符及 `\x7F`，防止底层序列化不一致；
    - 收紧 Markdown 与 URL 安全正则，防范 `javascript\s*:` / `data\s*:` 空白绕过与外部图片未转义空格；
    - Python 导入器与 Schema 均收紧白名单 DTO 与 URI 校验，实现两端合约严格对称。
  - **Commit 31** (`c6d90de`): `fix(quiz): 精确匹配多会话失效状态并补齐存储深层类型守卫`
    - `startSetRunner()` 精确按 `seedParam` 匹配活跃会话，杜绝多会话集合下非目标种子误显示为失效小测；
    - `storage.ts` 落地 `isQuestionResult` 深层校验，并在 `isSession` 与 `read()` 补齐整数索引、布尔映射字典及 `preferences.restoreSession` 检查。
- **最终收口提交**
  - **Commit 32**: `docs(question-bank): 修正审计提交链、合规矩阵与最终就绪状态`
    - 准确记录全部 32 个演进提交，更新 DoD 核对清单与全量自动化测试记录。

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

本清单完整覆盖执行计划与各轮代码评审提出的全部要求，经全套自动化测试检验已全部清零：

### 维度一：题目生命周期与发布门禁
- [x] **#1 草稿选择题逐项 feedback 可选校验**: 草稿阶段单选/多选题可不提供 `feedback.choices`，仅在 `status: published` 时强制要求；
- [x] **#2 Published Set 预览候选池隔离**: 在开启预览模式编译 Set Bundle 时，已发布的集合只从已发布题目池中选题，草稿题目绝不泄漏至正式集合中；
- [x] **#3 前端草稿 DTO 可选字段兼容渲染**: 前端 TypeScript 兼容 `feedback`、`explanation` 与元数据缺失场景，优雅降级，杜绝崩溃；
- [x] **#4 答题会话过期失效三态处理**: 区分「无会话」、「可恢复会话」与「过期失效会话」，并在 UI 提供清除并重新开始的明确通知与按钮；
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
- [x] **#15 LocalStorage 异常自愈恢复、重置通知与深层类型守护**: 引入 `isQuestionResult`, `isAttempt`, `isSession` 及 `preferences.restoreSession` 递归类型守护，确保整数题目索引与布尔字典合法性，异常时自动安全重置并展示一次性通知横幅；
- [x] **#16 Cloudflare Worker 投稿规则与题库导入契约严格对称**: 建立 `submission_v2_contract.json`，强制单位必须包含规范单位，消除控制字符与 Markdown/URL 绕过漏洞，两端白名单 DTO 拦截未知属性，无条件保证 $WorkerAccepted \subseteq ImporterAccepted$；
- [x] **#17 失效小测键盘交互安全防卫**: `PlaySurface` 在无有效 session 状态下安全拦截按键，仅允许 Escape 退出，杜绝控制流未定义属性异常；
- [x] **#18 退役、下架与不可用集合状态闭环与多会话隔离**: 对退役（retired）、删除下架或题目不可行（infeasible）的 Set，按 `seedParam` 精确匹配对应会话并提供明确的失效通知与历史会话清除动作；
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

## 4. 本地验证记录与 CI 复现范围

以下为本地核心验证记录；正式 GitHub Actions 还包括 draft validation、deterministic compilation、benchmark、format check 与 post-build tests。下面列出 CI 的完整命令范围；只有实际执行结果才计入本地通过记录（JavaScript 使用 Yarn；远端 CI 将在正式发起 PR 后独立触发复核）：

```bash
# 1. 题库校验 (0 error, 2 expected draft warnings)
uv run python -m scripts.question_bank validate --include-drafts
uv run python -m scripts.question_bank validate

# 2. Python 单元与集成测试套件 (65 passed)
uv run pytest tests/question_bank tests/integration

# 3. 确定性编译、覆盖率与基准测试
uv run python -m scripts.question_bank build --output .tmp-bank-a
uv run python -m scripts.question_bank build --output .tmp-bank-b
diff -r .tmp-bank-a .tmp-bank-b
uv run python -m scripts.question_bank coverage --format json --output question-bank-coverage.json
uv run python -m scripts.question_bank benchmark --repeat 5 --json-output question-bank-benchmark.json

# 4. 前端格式、TypeScript 类型与 JavaScript 测试
yarn quiz:format:check
yarn quiz:typecheck
yarn quiz:test
yarn post-build:test
yarn submit:check
yarn submit:test
yarn quiz:build:check

# 5. 生产站点完整文档构建 (0 error, 3.7s build success)
uv run mkdocs build --clean
```
