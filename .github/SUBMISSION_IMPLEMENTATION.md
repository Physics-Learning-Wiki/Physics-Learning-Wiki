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
