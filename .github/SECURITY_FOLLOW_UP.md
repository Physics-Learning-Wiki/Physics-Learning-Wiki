# 安全运维待办

本轮仓库修改不应用 GitHub 或 Cloudflare 服务端配置．2026-10-17 的 GitHub 只读查询确认 `main.protected=false`，Rulesets 为空；旧 Build #39007735805 的页面构建、测试、预算及 `gh-pages` 发布成功，失败发生在发布后的百度通知．在实际配置并取得以下证据之前，不能把整体安全整改标记为完成．

先将本轮代码经 PR 审阅合入 `main`，确认最新 `Build` 成功；以下工作由持有对应平台管理权限的维护者完成．所有示例命令均在仓库根目录运行．

## GitHub 分支保护

1. 安装并登录 `gh`，确认账号具有仓库管理员权限，并确认最新 PR 已产生两项成功检查：`Check Characters`、`Physics-Learning-Wiki Page Build`．

   ```bash
   gh auth status
   gh api repos/Physics-Learning-Wiki/Physics-Learning-Wiki --jq .permissions.admin
   ```

2. 应用仓库内策略，再独立回读．Python 入口适用于 Windows；安装 uv 后执行：

   ```bash
   uv run python scripts/admin/branch_protection.py
   uv run python scripts/admin/branch_protection.py --check
   gh api repos/Physics-Learning-Wiki/Physics-Learning-Wiki/branches/main --jq .protected
   ```

   预期 `--check` 退出码为 `0`，输出 `Main branch protection matches all required checks, review and bypass settings`，最后一个命令返回 `true`．`404`、权限错误或任一策略不符都不是通过；用有 Administration 写权限的凭证重新执行，或按 [分支保护规范](BRANCH_PROTECTION.md#方法三github-web-控制台手动勾选) 在网页配置．

3. 保存脱敏的命令输出与配置页面截图．用一个普通文档 PR 确认必须有一名有写权限且不是最新推送者的维护者审批、过期审批失效、分支需保持最新、会话需解决，且无需等待路径过滤的 `Check Question Bank`．不要用强推测试保护．

策略同时核对管理员约束、检查严格模式、禁止强推和删除；仅查询 `protected=true` 不能替代 `--check`．经典分支保护生效后，Rulesets 列表仍可为空．

## 百度通知配置与独立重试

百度通知已从 `Build` 的部署 Job 移到独立工作流 [`seo-notify.yml`](workflows/seo-notify.yml)．它在主仓库 `main` 上的 Build 成功后自动触发，也可手动执行；每次读取当前 `gh-pages/sitemap.xml`，无需旧构建产物、uv 或项目 Python 依赖．缺少令牌时输出 Warning 并在摘要标记 `skipped`；网络、HTTP、响应解析或 API 拒绝会令该通知工作流失败，保留错误与摘要，Pages 的 Build 结果独立保留．

1. 登录 [百度搜索资源平台](https://ziyuan.baidu.com/site)，在「站点管理」中添加并按提示验证实际网站；已有站点直接选择它．进入「资源提交 → 普通收录 → API 提交」，在平台提供的接口地址 `.../urls?site=...&token=...` 中取得 `token` 参数的值．`site` 参数以平台生成的地址为准，核对工作流 `SITE`（当前为 `physics-learning-wiki.github.io/Physics-Learning-Wiki/`）并通过 PR 同步差异．当前站点位于 GitHub Pages 子目录；如果平台要求在域名根路径验证，先确认能控制那个验证地址，不能把子目录验证文件当成根目录验证已完成．无法完成验证时可暂不配置百度通知，缺少令牌会明确跳过．不要复制整条接口 URL 作为 token．
2. 在 GitHub 仓库 `Settings → Secrets and variables → Actions → New repository secret` 中新建 `BaiduToken`，值为上一步 token．也可以使用下面的交互命令；不要将 token 写入命令参数、日志或仓库文件．

   ```bash
   gh secret set BaiduToken --repo Physics-Learning-Wiki/Physics-Learning-Wiki
   gh secret list --repo Physics-Learning-Wiki/Physics-Learning-Wiki
   ```

3. 本轮修复合入 `main` 后，在 `Actions → Search engine notification → Run workflow` 选择 `main`，或执行：

   ```bash
   gh workflow run seo-notify.yml --ref main --repo Physics-Learning-Wiki/Physics-Learning-Wiki
   gh run list --workflow seo-notify.yml --limit 5 --repo Physics-Learning-Wiki/Physics-Learning-Wiki
   ```

4. 打开新运行的 Summary，确认记录了当前 `gh-pages` 提交、状态 `success`、接收 URL 数和当日剩余额度．`skipped` 只表示未发送，不能当作百度同步已验收．若失败，修正站点属性、令牌、配额或网络问题，再点该工作流的 `Re-run failed jobs` 或重新手动执行；会提交当时最新的发布 Sitemap，不会再次部署 Pages．无需重跑仍使用旧脚本的 Build #39007735805．

## 社区机器人真实链路验收

此过程会创建实际 Issue、分支和 PR，需要人工协调与审阅．先确认仓库 `Settings → Actions → General → Workflow permissions` 允许 Actions 创建 PR（若组织策略禁止，应由组织管理员调整）．沿用既有 `GITHUB_TOKEN` / `COMMUNITY_BOT_TOKEN` 选择，不要求为本轮修复新增凭证．

1. 优先使用已审核、可公开的实际投稿；如果没有，先通过站点投稿表单提交一篇明确标注「同步验收、请勿合并」的短文本．记录 Issue 编号，在审核后添加 `投稿-已收录` 标签，并保持 Issue 开放．
2. 在 `Actions → Generate Community Pages → Run workflow` 选择 `main`，或执行：

   ```bash
   gh workflow run generate-community.yml --ref main --repo Physics-Learning-Wiki/Physics-Learning-Wiki
   gh run list --workflow generate-community.yml --limit 5 --repo Physics-Learning-Wiki/Physics-Learning-Wiki
   gh pr list --state open --base main --repo Physics-Learning-Wiki/Physics-Learning-Wiki
   ```

3. 打开生成的唯一社区 PR，检查 `docs/community/<Issue编号>.md`、索引和 `data/community-generated.json` 的差异、署名、链接及公式；记录分支名和最新 SHA．再次触发应复用同一个开放 PR；在来源 Issue 未变化且 main 未变化时，不应增加生成差异．如报告多个候选 PR，先人工协调后重跑；如生成成功而创建 PR 失败，对同一个 Actions 运行执行 `Re-run failed jobs`，保留原运行 ID 以恢复创建．
4. 确认该 PR 最新提交上的 `Check Characters` 与 `Physics-Learning-Wiki Page Build` 均运行并通过．如 Actions 提示人工批准，点 `Approve and run`；如没有生成检查运行，按 [分支保护规范](BRANCH_PROTECTION.md#3-自动化机器人-pr-审阅与闭环策略) 检查现有机器人 Token 和仓库策略，不要用其他提交上的手动 Build 代替．由另一名具备写权限的维护者审阅；验收稿保持不合并．
5. 从同一 Issue 移除 `投稿-已收录`（或关闭 Issue），再触发同步，确认该 PR 的对应受管页面与索引条目撤销，手写文件和维护者提交保留．检查清单没有遗留该 Issue，再关闭验收 PR，保留机器人分支．若使用真实稿件并计划合并，请先与作者确认撤稿演练及恢复收录安排．
6. 下次有新的已收录投稿时再同步，确认关闭/合并旧 PR 后创建后继分支．保存运行 URL、PR URL、最新检查 SHA、撤稿差异和审阅记录．这些真实结果不能由临时 bare 仓库测试替代．

## Worker 与 Cloudflare

当前前端向 `https://submit.folderrewind.top` 的根路径 `/` 发送 POST（见两个表单模块）；限流规则只匹配 `/submit` 将漏掉真实入口．请在有 Cloudflare 管理权限的账号中逐项核对：

1. 在 GitHub 的 Fine-grained PAT 或 GitHub App 管理页核对生产 Worker 所用 `GITHUB_TOKEN`：仅目标仓库，`Issues: Read and write`、`Metadata: Read`，其余内容、Actions、PR、Administration 权限均不授予．记录凭证类型、范围、权限、到期日；如不符则创建替代凭证，通过 Cloudflare Worker 的 Secrets 更新后验证，再撤销旧凭证，不记录密钥．这不是社区 PR 机器人使用的凭证．
2. 在 Cloudflare `Workers & Pages → physics-learning-wiki-submit → Settings → Variables and Secrets → Add` 添加变量；已有同名变量用 Edit 更新．`ENVIRONMENT`、`ALLOWED_HOSTNAMES` 选择 Text 类型，值分别为 `production`、`physics-learning-wiki.github.io`；`GITHUB_TOKEN`、`TURNSTILE_SECRET_KEY` 选择 Secret 类型，分别填写最小权限 GitHub Token 和当前 Turnstile widget 的 Secret Key．点击 `Deploy` 使更改生效．仓库 `wrangler.toml` 不代表线上环境已经设置；若有实际命名环境，先确认生产路由绑定到哪个环境，避免改到预览环境．
3. 在 Cloudflare `Turnstile` 选择前端正在使用的 widget，再点 `Settings → Hostname management`；核对域名为 `physics-learning-wiki.github.io`，没有 localhost / 127.0.0.1，点 `Save`．当前前端 Site Key 为 `0x4AAAAAADWCCejih_jntWim`，必须选择对应 widget，其 Secret Key 才能与前端配对；不要只更换服务端密钥而保留不匹配的前端 Site Key．普通投稿 action 为 `submit-general`、题目投稿为 `submit-question`（action 由表单传入，Worker 严格比对，无需在控制台添加两个 widget）．`ALLOWED_HOSTNAMES` 校验的是 Turnstile 验证结果中的 hostname；仅伪造 HTTP `Origin: localhost` 不是有效的主机名拒绝验收．用生产配置验证本地来源拿不到可接受的验证结果，再从正式表单各完成一次明确标注的普通/题目投稿，记录 Issue 与成功响应，验收后人工关闭测试 Issue．
4. 返回账户的网站列表，选择 `folderrewind.top`，进入新版 `Security → Security rules → Create rule → Rate limiting rules`（旧版入口为 `Security → WAF → Rate limiting rules`）．此处是域名的安全配置，不是 Worker 的 Settings．建立覆盖整个投稿主机名 POST 的规则，包含真实根路径入口．Worker 当前不按路径限制 POST，所以不要增加只匹配 `/` 或 `/submit` 的条件；匹配示例：

   ```text
   (http.host eq "submit.folderrewind.top" and http.request.method eq "POST")
   ```

   在 `With the same characteristics` 选择 `IP`，`When rate exceeds` 填 15 次 / 60 秒，`Then take action` 选 `Block`，`Duration` 选 1 小时，最后点 `Deploy`（不是 Save as Draft）．Block 便于此跨域 fetch 接口处理；若选择 Managed Challenge，必须实际验证表单可完成挑战并正常投稿．

   根据 2026-10-17 核对的 [官方套餐表](https://developers.cloudflare.com/waf/rate-limiting-rules/#availability)，Free 只支持 Path 等有限匹配字段、10 秒窗口和 10 秒阻断；Pro 支持 Host、60 秒窗口和 1 小时阻断，但不支持 Method 字段，可仅按专用投稿 Host 统计全部请求（包括 OPTIONS），这与只统计 POST 的策略不同；上述完整 Host + POST 表达式需要 Business 或相应更高套餐．套餐指 `folderrewind.top` 的网站套餐，Workers Paid 不会自动升级该网站的 WAF 能力．若目标能力不可用，不应登记为已完成；应选择代码侧限流或可用套餐，再明确验收策略，不要把 10 秒配置当作 60 秒配置．
5. 返回 `Workers & Pages → physics-learning-wiki-submit → Settings → Domains & Routes`，确认自定义域名包含 `submit.folderrewind.top`；若尚未绑定，使用 `Add → Custom Domain` 添加并确认域名所属区域正确．排查公开 `workers.dev`、预览地址或其他路径能否绕过保护；未使用的 `workers.dev` 可在该条目点 `Disable`，预览 URL 需要另外停用或限制访问．后续使用 Wrangler 发布时，还需在经审阅的配置中保持 `workers_dev = false`，否则可能重新开启该入口．使用中的入口要建立等效保护；若使用其他 Cloudflare 区域或独立 Worker 入口，先确认 WAF 确实覆盖它，再验收．
6. 在约定窗口从受控测试 IP 向同一生产入口发送 16 次不带有效 Turnstile 的 POST（例如 `{}`），避免创建 Issue，保存前 15 次应用拒绝、触发阈值后的 WAF 阻断及 Security Events 中对应规则 ID．同时从未限流的来源完成正常投稿，证明不是所有请求都被误拦．测试前协调该 IP 在阻断时段内不可用于正常投稿；不要用共享网络或 CI 出口做演练．

   Windows PowerShell 示例（仅在协调好的测试窗口手动运行）：

   ```powershell
   1..16 | ForEach-Object {
       $rateProbeStatus = curl.exe --silent --show-error --max-time 10 --output NUL --write-out '%{http_code}' --request POST --header 'Content-Type: application/json' --data '{}' 'https://submit.folderrewind.top/'
       '{0}: HTTP {1}' -f $_, $rateProbeStatus
   }
   ```

   应用校验通常返回 `400`，限流拦截应与 Cloudflare 事件中的规则 ID 对应；只有一串 `400` 不能证明限流生效．

保存脱敏的规则页面/回读、Worker 部署版本、限流命中、Turnstile 拒绝和正常投稿结果．核验目标与权限细节参见 [Worker 运维规范](../workers/README.md)．本地测试不能替代生产证据．

控制台步骤来源：[Worker 变量](https://developers.cloudflare.com/workers/configuration/environment-variables/)、[Worker Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)、[Turnstile widget 管理](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/)、[创建限流规则](https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/)、[停用 workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)．

以上真实运维与 CI 证据完成前，登记为「仓库修补已提交审阅，线上安全验收待办」；只有本轮修改合入且 CI 实际通过后，才可登记「仓库整改与 CI 验收完成」．
