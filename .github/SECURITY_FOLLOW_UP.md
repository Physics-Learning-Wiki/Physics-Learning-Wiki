# 安全运维待办

本轮仓库整改不应用 GitHub 或 Cloudflare 服务端配置．2026-10-17 只读核查结果为 `main.protected=false`，且没有 Ruleset；在实际配置并回读之前，不能把整体安全整改标记为完成．

## GitHub 分支保护

在代码门禁修复合并、两项必需检查已产生成功记录后，由管理员执行配置脚本，再执行 `--check` 保存回读结果．确认审批数、最新推送审批、过期审批失效、管理员限制、严格检查、会话解决和禁止强推/删除全部生效．验证普通文档 PR 不会等待路径过滤的题库检查．

```bash
bash scripts/admin/configure-branch-protection.sh
bash scripts/admin/configure-branch-protection.sh --check
```

## Worker 与 Cloudflare

- 核对生产 Worker 的 GitHub 凭证仅限目标仓库的 Issues 写入与 Metadata 读取；记录凭证类型、资源范围、权限和有效期，不记录密钥．
- 核对 `ENVIRONMENT=production`、Turnstile 主机名及 action 配置，并验证 localhost 来源被拒绝．
- 根据真实生产请求地址确认 WAF 规则覆盖 Worker 入口；核对每 IP 的请求窗口、阈值和处置方式与 `workers/README.md` 一致．若 workers.dev 入口不受当前区域 WAF 覆盖，需要先协调受保护入口再验收．
- 保存脱敏的规则回读、限流命中结果和正常投稿成功记录；本地单元测试不能替代生产证据．

以上证据完成前，本轮只能登记为「仓库整改与 CI 验收完成，线上安全验收待办」．
