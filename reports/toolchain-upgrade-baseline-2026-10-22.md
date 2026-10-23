## 核心工具链迁移基线（2026-10-22）

源提交：`4e7f5159fa0067b68186bc7bc48cc9630b9b5401`．本次实施基于工作区的实际提交，而非前期分析引用的 `a2ab1b69`．

### 记录环境

本地为 Windows x64，使用 Node.js 24.15.0、Python 3.14.4、Corepack 0.34.6、uv 0.11.28 和 Yarn 1.22.22．这是升级前工作区的可重复对照；并非原 CI 的 Node 20、Python 3.10 环境，也不是 Ubuntu Runner 的验收结果．

| 对象 | 基线 |
| --- | --- |
| 主题子模块 | `c6e4a545a212d1bdfd2db20f6ec7dfc71ed1bcb0` |
| `yarn.lock` SHA-256 | `fa042940e7194728fc04e7443c8bb1347e9a12c39257e461bc2bc674f62a98f3` |
| `uv.lock` SHA-256 | `48e24d05293a4c1dc6513acabb3748ac75c36b8b42ddb99f02f954d86e14d079` |

### 测试与构建

| 检查 | 结果 |
| --- | --- |
| Python：题库、集成、SEO、格式及术语检查器 | 288 通过，521.31 秒 |
| 相关 Node 任务 | 17 项通过 |
| 完整生产构建、SEO 与 blocking 性能审计 | 通过，180.82 秒 |
| Chromium 全量 E2E | 84 通过，约 178 秒 |

Node 任务包括 quiz、runtime、forms 的类型检查、单元测试及构建产物检查，features 类型与产物检查，Worker 的 `submit:test`、`submit:check`、`submission:contract:check`，Sharp 的 `media:check`、`media:test` 及 `post-build:test`．

构建对照保留所有 HTML、站点静态 JS/CSS 及相关 manifest、sitemap 的哈希，共 283 个产物．性能预算使用原 `scripts/perf/budgets.json`，不调整阈值或图片白名单．

### 已有故障与本地限制

- 根级 `corepack yarn tsc` 存在 320 条诊断，包含主题子模块的路径别名、RxJS 和 JSX 配置问题．
- `scripts:format:check` 有 15 个既有源码文件不符合格式，`quiz:format:check` 涉及其中 8 个．
- 首次构建获取 authors cache 遇到网络连接重置；在本地 Node 使用环境代理后重试成功，未修改仓库构建逻辑．
- 上述失败与目标工具链的对照及完整验收结果另见迁移验证报告．原始日志和产物哈希保存在本地忽略目录 `artifacts/toolchain-upgrade/`；本报告保留可供提交审查的结果摘要．

### 第一批边界

第一批仅固定 22 份核心工作流的 Runner 为 `ubuntu-24.04` 并记录本基线．`build-pdf.yml`、`build-pdf-typst.yml`、`incrementally-build-pdf.yml` 和 `test.yml` 保留原样．工作流名称、检查名称、事件、并发策略和部署制品不变．Ubuntu 托管镜像仍会由 GitHub 更新，发行版固定不等于整个系统镜像不可变．
