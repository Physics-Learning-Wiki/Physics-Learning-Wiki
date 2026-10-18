# 投稿与收录运维

## 数据与权限

`contracts/submission.schema.json` 是 SubmissionEnvelope v1 的字段契约，浏览器与 Worker 使用生成校验器，Python 导入使用同一 Schema．合法历史 v2 题目继续适配；新网页题目使用 `q-issue-<Issue 编号>`，已入库编号不变．管理凭证只保存在作者回执中，D1 仅保存摘要和操作关联，公开 Issue 保留稿件及许可历史．历史匿名稿件不能凭公开编号认领．

Worker 先配置 D1 迁移并以关闭写入的模式部署，再切换前端，最后启用写入．迁移、额度、凭证、Turnstile 和故障暂停步骤见 [Worker 部署说明](../workers/DEPLOYMENT.md)．不购买或自动升级套餐．

## 维护者处理

- 手动状态标签先由维护者工作流转为绑定修订版本的记录；标签本身不作为某个版本已处理或已发布的证据．
- 分类初审只检查实际正文及对应题型契约，不按机器载荷长度判断质量，不自动关闭短勘误．需要作者补充时标记 `needs_info` 且 `waitingFor=author`；自动整理失败标记 `waitingFor=maintainer`．
- 题目使用 `题库-接受整理`；社区稿件首次使用 `投稿-已收录`，已上线稿件的新版本使用 `投稿-接受修订`．接受决定针对执行时读取的最新修订．重新接受新版本时先移除再添加该标签．
- 同一投稿的作者修订串行处理，未合并的受管 PR 自动做三方合并，发生冲突时不推送远端．新内容使 PR 回到 Draft，旧题目指纹的三维审核签署失效．已发布题目的后续修订经维护者接受后创建新的审核 PR，保留既有题目 ID 并递增版本；合并门禁禁止草稿替换线上题目，须先重新完成三维签署并转为 published．
- 插图逐项记录 `submission.media_review`：`pending`、`imported` 或 `omitted`．入库项填写受管 asset，舍弃项填写原因；正式题目不得遗留外链插图或未决授权．继续执行类型、大小及性能预算检查．
- 机器人 PR 使用 `GITHUB_TOKEN`，维护者批准 Actions 检查，核对 PR 最新 SHA 上 `Check Characters` 和 `Physics-Learning-Wiki Page Build` 成功后人工合并．不得以旧提交检查或其他分支 Build 代替．
- 普通文章归入主线页面时填写 `source_issue`、`submission_id`、`submission_revision`、`submission_type` 和 `submission_reviewed: true`；一个稿件只指定一个主要入口．社区页面由受管清单生成．

## 发布与撤稿

构建写入 `_generated/submissions/release.json`，包含源码 SHA、来源 Issue、修订版本、内容指纹和资源 URL．普通稿件页面同时嵌入版本标记，题目使用正式题库目录中的指纹核对．部署后的对账工作流确认线上清单、页面标记和题目目录后，才写入 `published`．草稿合并只记录 `draft_ready`．新版待审核时仍显示旧版真实上线信息．

作者撤稿只产生申请．维护者批准后给 Issue 添加 `投稿-撤稿批准`；社区同步产生移除页面的审核 PR，题目需在审核 PR 中转为 `retired`．合并并确认真实部署下线后才记录 `withdrawn`．关闭 Issue 不下线，历史关闭稿件须经过迁移审阅后才可重新收录．回滚同样通过实际部署清单重新对账．

## 关注队列

每日任务更新同一条「投稿维护关注队列」Issue．只计算等待维护者处理且超过 7 个自然日的稿件，机器活动不重置计时．作者新修订、撤稿申请、维护者评论与标签等实质操作会更新处理起点．首次进入队列或记录实质变化才提醒，单纯时间流逝不重复评论．等待作者补充及已完成处理的稿件不进入队列．同步失败的 Actions 也应由维护者检查．

贡献者墙使用实际线上清单统计发布贡献，分页读取 Issues 并排除 PR，更新进入与社区同步共用的 Draft PR．API 或部署核验失败会停止更新并保留原文件．

## 上线验收与回退

1. 管理员应用现有 [主分支保护策略](BRANCH_PROTECTION.md) 并运行 `uv run python scripts/admin/branch_protection.py --check` 回读核对．仓库中的配置文件不等于已启用服务端保护．
2. 核实 Cloudflare 当前账户 D1 额度和 Worker 权限，创建数据库、应用迁移；核对真实域名及 Turnstile 的两种 action．记录检查日期及结果．
3. 在测试稿件上验证「提交 → 修订 → 审核 PR → 人工合并 → 实际页面可访问 → 撤稿 → 实际下线」，检查对应 PR 最新 SHA、回执和线上版本一致．本地 mock 与预览构建不能替代此步骤．
4. 故障时设 `SUBMISSIONS_ENABLED=false` 或 `AUTHOR_MUTATIONS_ENABLED=false` 暂停新增修改操作；GET 回执查询、公开稿件历史和本地草稿继续保留．不要清空 D1 或删除待确认操作后盲目重投．

可复查的本地验证与尚未完成的环境条件记录在 [实施记录](SUBMISSION_IMPLEMENTATION.md)．
