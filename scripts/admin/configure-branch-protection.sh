#!/usr/bin/env bash
# scripts/admin/configure-branch-protection.sh
# 仓库管理员配置 GitHub main 分支保护规则的执行脚本。
# 前置条件：已安装 gh CLI 并执行 gh auth login（需具备 repo 管理员权限）。

set -euo pipefail

REPO="${1:-Physics-Learning-Wiki/Physics-Learning-Wiki}"
BRANCH="main"
CONFIG_FILE="$(dirname "$0")/branch-protection-config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "[ERROR] 配置文件未找到: $CONFIG_FILE"
  exit 1
fi

echo "==> 正在为仓库 $REPO 的 $BRANCH 分支应用分支保护规则..."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/branches/$BRANCH/protection" \
  --input "$CONFIG_FILE"

echo "==> 分支保护规则已成功应用！"
echo "==> 正在查询当前保护配置进行验证..."

gh api "/repos/$REPO/branches/$BRANCH/protection" --jq '{
  required_status_checks: .required_status_checks.contexts,
  strict_up_to_date: .required_status_checks.strict,
  enforce_admins: .enforce_admins.enabled,
  required_approving_review_count: .required_pull_request_reviews.required_approving_review_count,
  dismiss_stale_reviews: .required_pull_request_reviews.dismiss_stale_reviews,
  allow_force_pushes: .allow_force_pushes.enabled,
  allow_deletions: .allow_deletions.enabled
}'
