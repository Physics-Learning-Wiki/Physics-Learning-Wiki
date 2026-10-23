## 核心工具链升级验证（2026-10-23）

已在当前 `main` 分支实现 22 份核心工作流的升级，并按 Runner、Node、Python、Actions 与 Netlify 清理四个目的组织本地提交．尚未推送，也未触发真实 GitHub Actions 或部署．

### 源码与环境

升级前源提交为 `4e7f5159fa0067b68186bc7bc48cc9630b9b5401`，详见 [迁移基线](toolchain-upgrade-baseline-2026-10-22.md)．上游发布、完整 SHA、运行时下载校验与初始化约束见 [官方版本核查](toolchain-upgrade-upstream-2026-10-22.md)；后续人工维护方式见 [工具链维护说明](../.github/TOOLCHAIN.md)．

| 对象 | 验证值 |
| --- | --- |
| 本地系统 | Windows x64，Git Bash |
| Node.js / Corepack / Yarn | 24.22.1 / 0.36.0 / 1.22.22 |
| Python / uv | 托管 CPython 3.12.15（build 20261021）/ 0.13.5 |
| CI 目标 Runner | Ubuntu 24.04，本地未实际运行 |
| 主题提交 | `c6e4a545a212d1bdfd2db20f6ec7dfc71ed1bcb0`，未更改 |
| `yarn.lock` SHA-256 | `fa042940e7194728fc04e7443c8bb1347e9a12c39257e461bc2bc674f62a98f3`，未更改 |
| 新 `uv.lock` SHA-256 | `b01bc8ad1d9c3b48be133c4b44d08f1c1fac55bef8eb84f27694279dad707bef` |

Node、Corepack、uv 及目标 Python 均在临时目录安装，Python 测试使用独立项目环境．编辑器占用的旧 `.venv` 已按原配置恢复；系统全局工具未替换．Node 和 uv 的下载归档已对照官方 SHA-256，Python 由固定 uv 的内嵌清单下载并校验．

### 安装与锁文件

| 验证 | 结果 |
| --- | --- |
| Yarn：新目录、原本不存在的下载缓存、完整冻结安装 | 通过，244.73 秒 |
| Yarn：另一个新目录、同一下载缓存、`--offline` 冻结安装 | 通过，7.78 秒 |
| Sharp：分别使用上述两份新安装的原生模块 | 均通过 PNG 编解码、缩放及 WebP 编解码 |
| uv：新环境、空下载缓存、`uv sync --locked` | 通过 |
| uv：另一个新环境、同一缓存、离线锁定安装 | 通过 |
| Node 共用 Action 的 Bash 初始化、冻结安装和版本报告 | 实际执行通过；6 个 Bash run 块通过语法检查 |
| Yarn manifest 与 lock 失配 | `--frozen-lockfile` 拒绝，原锁文件哈希不变 |
| Python manifest 与 lock 失配 | 设置 `UV_LOCKED=true` 后，`uv sync`、`uv run` 均拒绝，原锁文件哈希不变 |
| Ruff / clang-format | format 独立环境中分别核验 0.4.4 / 18.1.5 |

运行时和依赖安装、测试及构建没有改写 `yarn.lock` 或新 `uv.lock`．下载验证曾因本地代理端口不可用而中断；最终 Yarn 冷安装移除该进程的代理配置后通过．未修改仓库下载地址、TLS 校验或依赖版本以绕过网络故障．

`uv lock` 未使用 `--upgrade`．业务包版本保持原锁定值；新增 `clang-format==18.1.5`、`ruff==0.4.4`，移除不适用于 Python 3.12 支持范围的 `exceptiongroup==1.3.1`、`tomli==2.4.1` 和 `rpds-py==0.30.0` 分支；保留原有 `rpds-py==2026.6.3`．Yarn 保留原 packageManager 校验哈希及现有补丁．`patch-package` 的 `changed.patch` 文件名和 1.3.0 补丁作用于 1.3.1 的两条既有警告仍保留．

### 代码、站点与浏览器

| 验收项 | 升级前对照 | 目标工具链 |
| --- | --- | --- |
| Python 测试 | 288 通过，521.31 秒 | 294 通过，413.24 秒，含新增 6 项工具链契约用例 |
| 相关 Node 任务 | 17 项通过 | 同一组 17 项全部通过 |
| 完整生产构建、SEO、blocking 性能审计 | 通过，180.82 秒 | 通过，174.95 秒 |
| Chromium 全量 E2E | 84 通过 | 83 直接通过，1 项重试后通过，159.93 秒 |
| 工作流静态检查 | — | actionlint 1.7.12 检查 22 份核心工作流通过 |
| 贡献指南格式检查与 Git diff 空白检查 | — | 通过 |

Python 执行范围为 `tests/question_bank`、`tests/integration`、`tests/seo`、`tests/test_check_format.py` 和 `tests/test_check_terminology.py`．题库的含草稿及发布模式校验、覆盖率检查和两次独立编译结果比较均通过．已有页面引用草稿题集的 warning 保留，不将其提升或降为其他门禁．

17 项 Node 任务包括 quiz/runtime/forms 类型、单元测试和产物检查，features 类型与产物检查，`submit:test`、`submit:check`、`submission:contract:check`，`media:check`、`media:test`、`post-build:test`．其中 Worker 安全及契约相关测试 37 项、HTML 后处理测试 16 项通过．

构建后的 283 个对照产物中，282 个逐字节相同，只有预期修改的 `intro/htc/index.html` 不同，未缺失对照文件．公式渲染、导航、题库页面和相关 JS/CSS 未出现额外差异；Pagefind、图片及 SEO 检查通过．构建时间仅为单次本地测量，不能据此声称性能提升．

全量 Chromium 运行中的一次重试来自 `tests/e2e/quiz-library.spec.ts:194` 的错题本掌握状态用例；随后在单 worker、无重试条件下连续运行 3 次全部通过．此前一次被中断的运行也出现过表单测试超时，其单独重跑通过．保留原超时、重试及断言设置，未修改页面实现或测试来掩盖波动．

actionlint 未调用本机未安装的 ShellCheck/Pyflakes；这部分结果仅覆盖 actionlint 自身的 YAML、表达式和工作流规则．共用初始化及修改的 shell 入口另通过 Bash 语法检查，百度通知包装入口通过只读 `--help` 调用．

### 已有失败

以下检查仍失败，且升级前后结果一致；本轮未修改其源码、配置或门槛：

- 根级 `corepack yarn tsc`：升级前后均有 320 条诊断，去除工具路径与命令头后的诊断内容逐条一致．这不影响已经通过的 quiz/runtime/forms/features 独立类型检查，但仍会影响既有 Check Scripts 工作流．
- `corepack yarn scripts:format:check`：同一批 15 个既有 TypeScript 文件失败；`quiz:format:check` 涉及其中 8 个文件．相关工作流继续执行这些检查．

因此，本报告不能被解读为所有 GitHub 检查均已变绿．后续应将这两项已有问题单独修复，不与本轮运行时兼容性结论混淆．

### 契约、范围与剩余验收

已对照源提交检查全部核心工作流的名称、事件、job ID/名称、条件、依赖、环境和并发配置．`Build`、`Physics-Learning-Wiki Page Build`、`site-artifact`、浏览器诊断及题库指标制品名称均保留，`workflow_run` 的来源校验和发布对账链路保留．新增回归用例保护 SHA 固定、写权限缓存、元数据事件不检出 PR 代码，以及 Build 与发布订阅关系．

直接 `git push` 的三个现有流程保留 checkout 认证；其他检出关闭凭据持久化．具有写权限的 Node/Python 任务显式关闭依赖缓存．投稿接口、审核规则、数据契约、Worker 写入开关与主题子模块均未改动．

四份范围外工作流 `build-pdf.yml`、`build-pdf-typst.yml`、`incrementally-build-pdf.yml`、`test.yml` 与源提交一致．未迁移 Wrangler、MkDocs、Node 26、Ubuntu 26.04 或包管理器．Netlify 专用脚本、环境分支和当前操作说明已清理；历史 ADR/设计文档保留当时的平台记录．

本机没有可用的 WSL 发行版或 Docker 环境，因而尚未完成 Ubuntu 24.04 的真实冷安装、托管 Actions 执行、站点部署与线上发布 SHA/状态核对．这些必须由后续真实 GitHub CI 与部署结果确认．机器人 Issue → 受管 PR → 审核流程仍按计划在正式上线后由维护者手动验收，本轮未创建测试 Issue 或 PR．

### 批次与回退

| 批次 | 本地提交 |
| --- | --- |
| Runner 与基线 | `acbe741` |
| Node、Corepack、Yarn | `338b651` |
| Python、uv、格式依赖组 | `6e10224` |
| Actions、安全策略、Netlify 清理及验收记录 | 本报告所属的 `ci(actions)` 提交 |

使用 `git show <提交>` 审查对应批次；需要回退时使用 `git revert <提交>`，同时保留该批的运行时配置和锁文件一致性．若要撤销整个升级，按第四批至第一批的顺序执行．若只回退前置运行时批次，须核对后续共用初始化和契约测试是否仍适用，并重新验证；不回退无关内容改动，也不降低性能预算或关闭失败检查．

原始日志、新旧性能报告、产物哈希和安装隔离环境保存在本地忽略目录 `artifacts/toolchain-upgrade/`，不会随提交进入仓库．主要日志为 `target-python.log`、`target-node.json`、`target-build.log`、`target-e2e-final.log`、`target-e2e-flaky-recheck.log`、`node-cold-final-install.log`、`node-warm-final-install.log`、`python-cold-install.log`、`python-warm-install.log`、`existing-checks-comparison.json` 和 `site-comparison.json`．
