# 核心工具链维护

## 固定版本与来源

| 工具 | 版本 | 唯一配置来源 |
| --- | --- | --- |
| Node.js | 24.22.1 | 根目录 `.nvmrc` |
| Python | 3.12.15 | 根目录 `.python-version` |
| Corepack | 0.36.0 | 根目录 `.corepack-version` |
| uv | 0.13.5 | `pyproject.toml` 的 `[tool.uv].required-version` |
| Yarn | 1.22.22 | `package.json` 的 `packageManager`，保留完整哈希 |
| CPython 托管构建 | 20261021 | `actions/setup-python/action.yml` 中的构建日期 |
| GitHub 托管 Runner | Ubuntu 24.04 | 范围内工作流的 `runs-on` |

Node 支持范围为 `>=24.22.1 <25`，Python 支持范围为 `>=3.12.15,<3.13`．Python 解释器使用固定 uv 的内嵌下载清单；CI 设置 `UV_MANAGED_PYTHON=true`，避免选择 Runner 预装解释器．固定 Ubuntu 发行版后，其托管镜像仍由 GitHub 更新，CI 日志保留实际工具版本、锁文件哈希和主题子模块提交供排障．

官方 Action 和第三方 Action 的完整 SHA、发布版本与运行时校验来源见 [上游核查记录](../reports/toolchain-upgrade-upstream-2026-10-22.md)．

## 工作流约定

- Node 共用初始化位于 `actions/setup-node`：先选择 Node，再在 job 临时目录安装 Corepack、启用并核验 Yarn，然后按需恢复下载缓存，每次执行冻结安装．
- Python 共用初始化位于 `actions/setup-python`：`project` 安装锁定的项目及开发依赖；`format` 仅安装原版本的 Ruff、clang-format；`stdlib` 只准备解释器．项目及格式工具环境通过 `UV_LOCKED=true` 约束后续执行．
- 两种初始化的 `cache` 默认为 `false`．只有只读 job 可以显式启用缓存，具备仓库或 Issue、PR 写权限的 job 必须显式关闭；不缓存 `node_modules`，不因缓存命中跳过安装．
- 纯标准库脚本使用 `uv run --no-project python`．需要项目依赖的脚本使用 `uv run`；格式工具使用 `uv run --only-group format`，并从同一虚拟环境提供 remark 所需的 clang-format．
- 保留 `Build`、`Physics-Learning-Wiki Page Build`、制品名称及 `workflow_run` 订阅关系．保留直接推送任务所需认证，其余 checkout 关闭凭据持久化．高权限自动化继续使用可信主分支或受信任的发布提交．
- 当前分支可直接修改及推送，沿用用户确认的仓库策略；本轮不调整远端分支保护、内容审核规则、投稿接口或 Worker 写入开关．

## 范围与验收

本轮覆盖 22 份核心工作流．以下四份手动工作流保留原样，作为明确的历史例外，不代表已支持本轮运行时：

- `workflows/build-pdf.yml`
- `workflows/build-pdf-typst.yml`
- `workflows/incrementally-build-pdf.yml`
- `workflows/test.yml`

Netlify 构建入口已退役．本地使用 `uv run mkdocs serve` 快速预览；完整构建使用 Bash 环境下的 `corepack yarn site:build`，再用 `corepack yarn node scripts/test/serve-site.mjs --site site --host 127.0.0.1 --port 4173` 查看包含搜索和后处理的站点．

安装验收包括空下载缓存的新环境，以及已缓存下载内容的另一个新环境；锁文件失配必须失败且不得被改写．代码验收沿用 Python、Node、类型检查、构建产物检查、Sharp、Worker 安全与契约测试．站点验收包括题库校验、确定性编译、完整构建、Chromium E2E、SEO 与 blocking 性能审计．机器人实际稿件流程由维护者在正式上线后人工验收，本轮不创建测试 Issue 或 PR．

迁移前的源提交、环境、基线测试和迁移后的结果见 [验证记录](../reports/toolchain-upgrade-validation-2026-10-23.md)．

## 每月人工更新与回退

1. 每月检查官方运行时安全公告、Actions 发布记录及当前依赖维护情况，安全修复优先处理．本仓库不配置依赖更新机器人．
2. 更新对应版本来源；提升最低安全补丁时同步更新 Node engines 或 Python requires-python．更新 Python 构建日期前，核实固定 uv 内嵌清单提供该构建．
3. Python 使用指定 uv 执行 `uv lock`，核对包版本变化；普通运行时迁移不使用全量 `--upgrade`．Yarn 安装继续使用 `--frozen-lockfile`．
4. Action 从官方仓库核对发布引用；annotated tag 必须解析到 commit，再写入完整 40 位 SHA 和版本注释．检查该版本的接口和运行时变化．
5. 按 Runner、Node、Python、Actions 与退役入口四个目的组织独立提交，提交使用中文 Conventional Commits．每批验证通过后进入下一批．
6. 失败时回退对应批次提交及其版本文件、锁文件，保留无关内容修改；不降低测试门槛或性能预算．部署继续使用现有 Build → deploy 链路．

Windows 编辑器若仍占用旧虚拟环境，先关闭使用该解释器的终端或编辑器会话，再运行新版本 `uv sync --locked`．验证时可设置 `UV_PROJECT_ENVIRONMENT` 使用隔离环境；Node、Corepack 和 uv 也可放入临时目录，不需要改动系统全局安装．
