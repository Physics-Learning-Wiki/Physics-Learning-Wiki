## 工具链升级官方版本核查（2026-10-22）

本报告记录核心工作流所需的官方版本、完整 commit SHA、下载与引导方式．不涵盖 PDF、Typst、`test.yml` 或增量 PDF 工作流的升级．

### GitHub Actions 固定提交

通过官方 Git refs API 读取指定引用；遇到 annotated tag 时继续读取 tag object，直到取得 commit object．以下 SHA 均为提交而非 tag object．

| Action | 核查引用 | 完整 commit SHA |
| --- | --- | --- |
| [actions/checkout](https://github.com/actions/checkout/releases/tag/v7.0.1) | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| [actions/setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0) | v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| [actions/upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) | v7.0.2 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |
| [actions/download-artifact](https://github.com/actions/download-artifact/releases/tag/v8.0.2) | v8.0.2 | `9000827ccba6bdab643e8b6fd33ac0654aef8333` |
| [actions/github-script](https://github.com/actions/github-script/releases/tag/v9.0.0) | v9.0.0 | `3a2844b7e9c422d3c10d287c895573f7108da1b3` |
| [astral-sh/setup-uv](https://github.com/astral-sh/setup-uv/releases/tag/v10.3.2) | v10.3.2 | `07a047e608db84b3d8c06cd9a7c7dcc9c355c18e` |
| [peaceiris/actions-gh-pages](https://api.github.com/repos/peaceiris/actions-gh-pages/git/ref/tags/v4) | v4 | `84c30a85c19949d7eee79c4ff27748b70285e453` |
| [tj-actions/changed-files](https://api.github.com/repos/tj-actions/changed-files/git/ref/tags/v46) | v46 | `ed68ef82c095e0d48ec87eccea555d944a631a4c` |
| [marocchino/sticky-pull-request-comment](https://api.github.com/repos/marocchino/sticky-pull-request-comment/git/ref/heads/v2) | v2 分支，当前为 v2.9.4 | `773744901bac0e8cbb5a0dc842800d45e9b2b405` |
| [amannn/action-semantic-pull-request](https://api.github.com/repos/amannn/action-semantic-pull-request/git/ref/tags/v5) | v5 | `e32d7e603df1aa1ba07e981f2a23455dee596825` |
| [actions/stale](https://api.github.com/repos/actions/stale/git/ref/tags/v9) | v9 | `5bef64f19d7facfb25b37b414482c7164d639639` |

`github-script v9.0.0` 的 tag object 为 `d746ffe35508b1917358783b479e04febd2b8f71`；`actions-gh-pages v4` 的 tag object 为 `329bcc8f12caed2cefe5a5b80781499a6f3b361b`，均已 peel．Sticky comment 的 `v2` 是分支而非 tag，另通过 `git ls-remote` 交叉核实．

升级时保留 checkout 对高权限事件检出 fork 代码的默认限制，保留 download-artifact v8 的摘要不匹配即失败行为．github-script v9 中 `require('@actions/github')` 已不可用，且脚本不能用 `const` 或 `let` 重新声明注入的 `getOctokit`．参见 [checkout 说明](https://github.com/actions/checkout/tree/3d3c42e5aac5ba805825da76410c181273ba90b1)、[artifact v8 说明](https://github.com/actions/download-artifact/releases/tag/v8.0.0)、[github-script v9 说明](https://github.com/actions/github-script/releases/tag/v9.0.0)．

### 固定运行时下载与校验

下列四个下载地址均通过 HTTP HEAD 返回 200．SHA-256 来自官方校验清单或固定源码 manifest；本次没有下载并解压全部运行时，也没有将可下载性作为兼容性测试结论．

| 运行时 | 官方下载 | 预期 SHA-256 |
| --- | --- | --- |
| Node.js 24.22.1，Windows x64 ZIP | [node-v24.22.1-win-x64.zip](https://nodejs.org/dist/v24.22.1/node-v24.22.1-win-x64.zip) | `d2046d28c2c3dcd211ac5145c0bf30e2047ef9dfb306693c8c6e2eccd8b95fa5` |
| uv 0.13.5，Windows x64 ZIP | [uv-x86_64-pc-windows-msvc.zip](https://github.com/astral-sh/uv/releases/download/0.13.5/uv-x86_64-pc-windows-msvc.zip) | `a38b8d1902b7cfbc76b423ba1bb456f623f42064cdc72628b6075b89afd1019a` |
| CPython 3.12.15，Linux GNU x64，build 20261021 | [install_only_stripped.tar.gz](https://github.com/astral-sh/python-build-standalone/releases/download/20261021/cpython-3.12.15%2B20261021-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz) | `6d7521138fd33afddc1ccd08abb007d9a2829e38117c2576f9efdc0ec73ce772` |
| CPython 3.12.15，Windows x64，build 20261021 | [install_only_stripped.tar.gz](https://github.com/astral-sh/python-build-standalone/releases/download/20261021/cpython-3.12.15%2B20261021-x86_64-pc-windows-msvc-install_only_stripped.tar.gz) | `aac5d331fc3307343f95928fdbea4583f0d53973d08c7e1d081884fbd229a0e1` |

Node 的值取自 [SHASUMS256.txt](https://nodejs.org/dist/v24.22.1/SHASUMS256.txt)；下载后用 PowerShell `Get-FileHash -Algorithm SHA256` 对照具体文件的值．需要验证发布者身份时，可进一步验证同目录的 `SHASUMS256.txt.sig` 与 [Node 发布密钥](https://github.com/nodejs/node#release-keys)．

uv 的值同时匹配 [release asset digest](https://api.github.com/repos/astral-sh/uv/releases/tags/0.13.5) 和 [setup-uv 固定提交内的已知校验值](https://github.com/astral-sh/setup-uv/blob/07a047e608db84b3d8c06cd9a7c7dcc9c355c18e/src/download/checksum/known-checksums.json)；也可对照 [独立 SHA-256 文件](https://github.com/astral-sh/uv/releases/download/0.13.5/uv-x86_64-pc-windows-msvc.zip.sha256)．

Python 两个值取自 [uv 0.13.5 固定源码 manifest](https://github.com/astral-sh/uv/blob/46776a95d6686ac0160c10611327ce491e6b202f/crates/uv-python-managed/download-metadata.json)．uv 默认使用内嵌 manifest 下载并校验托管解释器．

### Python manifest 与执行约束

- setup-uv 的 Action 版本与 uv CLI 版本分别固定；`[tool.uv] required-version = "==0.13.5"` 可由 setup-uv 的 `version-file: pyproject.toml` 读取．[官方配置说明](https://github.com/astral-sh/setup-uv/blob/07a047e608db84b3d8c06cd9a7c7dcc9c355c18e/docs/advanced-version-configuration.md)
- uv 0.13.5 对应上述 CPython 3.12.15 的构建日期为 `20261021`；CI 显式设置 `UV_PYTHON_CPYTHON_BUILD: "20261021"`、`UV_MANAGED_PYTHON: "true"`，并用 `.python-version` 固定 `3.12.15`．不要通过指向 main/latest 的 `UV_PYTHON_DOWNLOADS_JSON_URL` 覆盖内嵌 manifest．[官方环境变量说明](https://docs.astral.sh/uv/configuration/environment/#uv_python_cpython_build)
- `UV_LOCKED: "true"` 覆盖 `uv sync` 和后续 `uv run`，避免只有安装步骤检查锁文件、后续命令又自动改写锁文件．[官方同步语义](https://docs.astral.sh/uv/concepts/projects/sync/)
- 具有写权限的机器人 job 显式禁用 uv 和 Node 依赖缓存；setup-uv 的 `auto` 只针对部分敏感事件禁用缓存．[setup-uv 缓存规则](https://github.com/astral-sh/setup-uv/blob/07a047e608db84b3d8c06cd9a7c7dcc9c355c18e/docs/caching.md)

### Corepack 与 Yarn 下载缓存的最小初始化顺序

`setup-node` 在执行缓存恢复时会调用 `yarn --version` 与 `yarn cache dir`；因此必须在缓存恢复前完成 Corepack 引导，避免依赖 Runner 预装的 Yarn．两次调用 setup-node 可以分别负责选择 Node 与恢复下载缓存；第二次不再选择 Node，沿用第一次设置的 PATH．[官方实现](https://github.com/actions/setup-node/blob/949feb2413d6458794dcd2491c4babbbce0c15c1/src/cache-utils.ts)

以下是 Ubuntu 24.04 只读 Node job 的初始化片段；`.nvmrc` 为 `24.22.1`，`packageManager` 为 `yarn@1.22.22`．Corepack 0.36.0 的 Node 要求包含 `^24.15.0`，支持该 Node 补丁版本．[Corepack 固定源码](https://github.com/nodejs/corepack/blob/v0.36.0/package.json)

```yaml
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
    with:
      persist-credentials: false

  - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
    with:
      node-version-file: .nvmrc
      package-manager-cache: false

  - name: Bootstrap Corepack and Yarn
    shell: bash
    run: |
      npm install --global corepack@0.36.0
      corepack enable yarn
      test "$(corepack yarn --version)" = "1.22.22"

  - name: Restore Yarn download cache
    uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
    with:
      cache: yarn
      cache-dependency-path: yarn.lock
      package-manager-cache: false

  - run: corepack yarn install --frozen-lockfile
```

需要缓存的只读 job 使用该顺序；写权限 job 省略第二次 setup-node．缓存只保存下载内容，每次仍执行冻结安装．以上片段依据官方行为核查，仍须由仓库 CI 对安装、原生模块与构建作实际验收．
