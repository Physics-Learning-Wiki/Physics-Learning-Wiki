# 投稿与收录流程实施记录

基线：`84008c8`．本记录对应 2026-10-18 确认的完善计划．

## 实施批次

以下勾选表示代码与本地验证完成，生产环境真实链路另行记录．

- [x] A：Issue 派生编号、来源关联、幂等导入、PR 恢复、真实草稿状态、历史迁移清单．
- [x] B：共享投稿契约、D1 迁移、凭证摘要、幂等操作、失败恢复、统一错误与许可记录．
- [x] C：两类表单草稿与导出、数值容差和同尺度单位别名、媒体审核记录．
- [x] D：进度与管理页面、作者修订、受管 PR 三方合并、部署清单与实际发布确认．
- [x] E：社区导航和分页、明确撤稿、贡献统计审核 PR、分类初审、七日关注队列．

## 发布约束

GitHub 是稿件与审核记录的权威来源；D1 只保存凭证摘要、关联关系和操作记录．不购买或自动升级服务，不收集联系方式，不自动合并投稿 PR．已入库题目编号不迁移．

部署前由维护者核实 D1 套餐额度、Worker 凭证、Turnstile 与分支保护．远端配置与真实上线结果必须分别记录，不能由本地测试代替．

## 验证记录

实施前已验证：Worker 25 项测试，以及导入与社区相关 44 项测试通过．

A: 14 targeted tests passed; read-only remote migration inventory found no legacy open question PRs or closed community submissions. 2026-10-18 已应用并回读验证 main 保护，详见 submission-protection-verification.json；只读历史清单见 submission-migration.json．

B: 31 Worker/contract tests passed, including real Miniflare D1 SQLite concurrency, response-loss recovery, revision authentication and withdrawal requests. Generated contract check passes. D1 provisioning and both production write flags remain explicitly disabled until operator validation.

C: 8 browser form regressions passed after aligning chapter separators and selectable taxonomy IDs. Forms typecheck/unit/build checks, runtime tests and Quiz grading tests pass. Draft and receipt storage are separate; authorization must be confirmed again on restore.

D：新增部署清单、正文版本标记及线上 SHA / 题库指纹核验；34 项 Worker 测试通过，覆盖上游成功但 D1 写回失败、匿名凭证、版本冲突和实际线上版本状态．本地裸 Git 远端验证三个并行投稿 PR、五次重试、PR 创建失败恢复和人工编辑合并．

E：社区列表每页 20 条，已关闭的已发布 Issue 继续保留，撤稿以批准记录和实际部署为准．分类初审、贡献统计审核 PR 和每日同一关注队列已实现；103 条记录、手写文件保护、三方合并、类型初审和不重复提醒均有测试．

## 环境与剩余上线条件

- 2026-10-18 已应用并回读 main 保护：两个必需检查、严格更新、至少一次审批、最新推送审批、旧审批失效、管理员约束、会话解决及禁止强推与删除均通过．
- Cloudflare 账户额度、生产 D1 创建和迁移、Worker 密钥范围、真实 Turnstile 及生产端到端链路尚未验证；未购买或自动升级服务．新版写入开关保持关闭．
- 真实人工审批、最新 SHA 检查、公开页面上线与下线验收须在部署后按 SUBMISSION_OPERATIONS.md 进行，不以本地测试替代．
- Windows 本机完整构建须使 Git Bash 可执行，并为 Node 24 设置 NODE_USE_ENV_PROXY=1 使用已有代理；不改动仓库预算或跳过构建步骤．

补充：状态标签不带版本信息，因此公开状态仅采用受信任的版本记录；维护者手动标签由专门工作流记录为当前修订的决定，陈旧标签不能把新稿误标为 resolved．专项 Worker 与分类/关注队列测试已覆盖．

## 最终验证（2026-10-18）

- Python 最终全套：247 项通过（包含最后的版本状态、迟到事件与实际撤稿核验回归）．
- Worker：34 项通过，真实 D1 SQLite 测试覆盖并发、响应丢失、D1 写回失败和旧响应不能倒退新版本．
- 浏览器：完整 E2E 69 项通过，包含投稿表单 11 项；使用生产压缩后的页面验证回执管理、修订、数值试算及草稿恢复．
- 前端：forms、quiz、runtime 的类型、单测和生成产物检查，以及 features 类型与产物检查均通过；共享契约生成、Worker 语法、媒体与后处理测试通过．
- 生产构建与阻断式性能门禁通过，预算文件未调整．完整测试会暂时写入题目样例，最终交付构建在测试结束后的干净目录重新执行，避免样例进入发布清单．
- 修改页面字符检查、术语检查和工作流 YAML 解析通过．折叠框内空行的四格缩进按仓库格式约束保留．
- Cloudflare CLI 只读检查确认当前未登录，无法核实账户额度、生产 D1、Worker 密钥和 Turnstile．未部署、未购买或升级服务；生产真实投稿及人工审核上线/下线仍为外部验收条件．

最终复核：干净构建已验证发布清单源码 SHA 与构建提交一致，且不含测试题目．撤稿额外核对旧页面实际 404/410 与线上题目目录移除；缓存旧资源和 5xx 不得被记录为已撤回，新增专项测试通过．

最终交付验证：代码提交 `6bef0d6` 在干净目录完成全流程生产构建，发布清单 SHA 一致、测试样例为零、性能门禁通过；随后完整 Python 247 项和浏览器 E2E 69 项再次通过，工作区清理检查通过．本记录之后的提交仅更新验收记录，不改变构建源码．

## 题集投稿首发扩展（2026-10-21）

- 已实现固定题单的混合组卷：已有题目只读引用，新题独立编辑、署名和声明来源；支持排序、复制、草稿导入导出、整卷试做与收藏夹引用导入．试做复用判分和选项排序逻辑，使用内存状态，不写入学习档案．编辑器完成状态恢复后才启用输入，导航清理不会覆盖未保存的新题字段．
- 新投稿类型为 `quiz-set`，复用原有回执、幂等提交和修订接口，新增 Turnstile action `submit-quiz-set`．投稿没有额外题数上限，继续执行 UTF-8 请求 131072 字节及公开 Issue 60000 字节限制．题集编辑组件不读取或恢复单题投稿的待确认回执．
- Set Schema v1 增加可选版本、作者、来源、许可和投稿元数据；存量资源兼容．题集与新题按持久条目键生成稳定编号，一个受管 PR 包含题集、新题及多资源基线．导入逐资源三方合并，并限制资源目录、符号链接与 Windows junction；失败不推送部分资源．
- 新题可独立签署、发布和复用，题集沿用 PR 人工审批．移出题单不删除新题；题集撤回后仍可维护自创新题．已退役资源不会因内容修订自动恢复，题目进度也不能覆盖主要题集已经核验的撤回状态．
- 发布清单 v2 保留主要题集与独立题目资源，读取兼容 v1．线上核验覆盖 manifest、题集目录、bundle 与依赖题目指纹，管理页分别展示当前修订进度和已核验的线上新题版本．题集下线须同时核实 manifest 与题集目录移除．

### 本地验证

- Python 题库、集成与 SEO 全套一次运行 255 项通过；后续补充的题集专项 15 项、相关导入/记录/发布回归 25 项通过，覆盖现有题组卷、混合组卷、无效引用、重试、冲突、旧版保护、部分发布和目录逃逸．
- Worker 37 项通过，包含真实 Miniflare D1 的题集创建、幂等修订和独立资源发布状态．
- 完整浏览器 E2E 84 项通过，最终题集专项 5 项复验通过，覆盖五类题型、随机题序与即时反馈、草稿恢复、未保存编辑、收藏夹隐私、管理回执修订和单题回执隔离．预览中的公式及受管图片在展开时按需加载．
- forms、quiz、runtime 的专项类型、单测和生成产物检查，以及 features 类型与产物检查、共享契约检查、后处理数学测试、题库公式审计与修改页面术语检查通过．
- 完整生产构建与阻断式性能审计通过；最后的前端隔离修复重新生成构建产物并在生产页面复验．预算、图片允许清单和生产写入开关均未调整．
- 全局 Prettier 检查存在 15 个既有失败文件，以 Git HEAD 经工作区过滤后的内容复核一致；本次修改的 TypeScript 文件检查通过．根 TypeScript 配置的 Git HEAD 源码基线与本次改动均为 320 条诊断，比较未新增诊断；专项模块类型检查通过．

### 生产环境仍待验收

2026-10-21 只读执行 Wrangler 身份检查返回 `Not logged in`．未配置生产 D1、未部署 Worker、未启用写入，也未进行真实匿名投稿、人工审批及上线/撤回验收．部署前按 [运维说明](SUBMISSION_OPERATIONS.md) 核实账户额度、凭证、三种 Turnstile action 与分支保护；本地工作区构建不能代替提交后 CI 的 SHA 与线上资源核验．
