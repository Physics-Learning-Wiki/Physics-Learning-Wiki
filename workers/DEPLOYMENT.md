# 投稿接口部署与恢复

代码部署、D1 绑定和真实网站验收分别记录．默认暂停新版写入，已有回执查询不受写入开关影响．

## 部署顺序

1. 在当前 Cloudflare 账户确认 Workers 套餐、D1 已用量和包含额度．目标为零新增费用；不购买或自动升级套餐．免费额度耗尽会影响可用性，不能登记为投稿成功．
2. 使用项目锁定的 CLI 创建数据库并将返回的实际 UUID 写入生产配置，取消 D1 绑定示例的注释．数据库名使用 plw-submissions，绑定名使用 SUBMISSIONS_DB．
3. 验证本地迁移，再在确认的生产环境使用 --remote 应用迁移．不要删除已有数据库或回执记录．

       corepack yarn wrangler d1 create plw-submissions
       corepack yarn wrangler d1 migrations apply plw-submissions --local
       corepack yarn wrangler d1 migrations apply plw-submissions --remote

4. 核对既有 GITHUB_TOKEN 只允许目标仓库的 Issues 写入与 Metadata 读取；核对 Turnstile 密钥、生产 hostname 和 action．可显式配置 SUBMISSION_BOT_ID 为该凭证主体的 GitHub 用户 ID；省略时 Worker 通过只读 /user 确认．
5. 先部署后端，在预览环境验证两种投稿、断网重试、查询、修订与撤稿申请．通过后将两个写入开关改为 true，再发布新版前端．
6. 用以下只读命令独立验证主分支保护，并保存最新 PR 检查 SHA、人工审阅和实际网页结果．

       uv run python scripts/admin/branch_protection.py --check

## 开关与失败恢复

SUBMISSIONS_ENABLED=false 或 AUTHOR_MUTATIONS_ENABLED=false 会暂停新增和修改操作，保留已存在回执查询．D1 未配置或不可用时返回明确的 503，前端保留草稿和操作编号．

202 表示服务正在核对上游结果．重试必须复用同一回执、管理凭证、操作编号和提交快照．不得因为响应丢失而另起投稿．Worker 用独立操作标记核对由原服务身份创建的 Issue 或评论；不确定时不重复写入．

如果长期无法确认，维护者在 D1 控制台查看 submission_operations 的 operation_id 和状态，再核对 GitHub 上由投稿服务身份写入、以该操作标记结尾的记录．确认写入存在后通过持凭证查询完成恢复；只有独立确认上游未写入时才可人工将该操作从 sending / uncertain 改为 failed，使作者复用原编号重试．保存核验记录，不能仅根据超时时长重置．

管理凭证仅保存摘要；遗失时使用编辑组邮箱人工核验，不能通过公开 Issue 编号自动认领．需要吊销时由维护者替换对应摘要，记录处置原因，原始凭证不得进入日志或 Issue．
