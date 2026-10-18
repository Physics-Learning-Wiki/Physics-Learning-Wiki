# 投稿与收录流程实施记录

基线：`84008c8`．本记录对应 2026-10-18 确认的完善计划．

## 实施批次

- [ ] A：Issue 派生编号、来源关联、幂等导入、PR 恢复、真实草稿状态、历史迁移清单．
- [ ] B：共享投稿契约、D1 迁移、凭证摘要、幂等操作、失败恢复、统一错误与许可记录．
- [ ] C：两类表单草稿与导出、数值容差和同尺度单位别名、媒体审核记录．
- [ ] D：进度与管理页面、作者修订、受管 PR 三方合并、部署清单与实际发布确认．
- [ ] E：社区导航和分页、明确撤稿、贡献统计审核 PR、分类初审、七日关注队列．

## 发布约束

GitHub 是稿件与审核记录的权威来源；D1 只保存凭证摘要、关联关系和操作记录．不购买或自动升级服务，不收集联系方式，不自动合并投稿 PR．已入库题目编号不迁移．

部署前由维护者核实 D1 套餐额度、Worker 凭证、Turnstile 与分支保护．远端配置与真实上线结果必须分别记录，不能由本地测试代替．

## 验证记录

实施前已验证：Worker 25 项测试，以及导入与社区相关 44 项测试通过．

A: 14 targeted tests passed; read-only remote migration inventory found no legacy open question PRs or closed community submissions. Production branch protection remains a separate administrator prerequisite.
