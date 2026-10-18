## Sharp 原生依赖

生产图片优化使用 `sharp@0.35.4`，Wrangler 3 同时可选依赖 `sharp@0.33.5`．两者分别需要 `@img/sharp-libvips-linux-x64@1.3.3` 和 `1.0.4`，不可通过 `resolutions` 强制互换．

使用完整 `package.json` 与冻结的 `yarn.lock`，在临时目录通过 Yarn Classic 1.22.22 的 `--ignore-platform --ignore-scripts` 安装保留 Linux 包，复现的原始布局为：

```text
node_modules/@img/sharp-linux-x64/                         0.35.4
node_modules/@img/sharp-libvips-linux-x64/                  1.0.4
node_modules/@img/sharp-linux-x64/node_modules/@img/
  sharp-libvips-linux-x64/                                 1.3.3
```

`readelf -d` 显示新版原生模块需要 `libvips-cpp.so.8.18.6`．其 ELF RPATH 包含同级的 libvips 包路径，却不包含上面的嵌套位置；下载成功仍会导致加载失败．

修复后静态检查确认，两版原生模块所需的库均存在于其 RPATH 中．此检查可在 Windows 上读取 Linux 二进制，但实际动态加载仍以 Ubuntu CI 为准．

根 `package.json` 将 `@img/sharp-libvips-linux-x64@1.3.3` 显式声明为可选依赖，以使该版本保持在根目录，旧版本与 Wrangler 的原生模块一起位于 `wrangler/node_modules/@img/`．该声明仅针对生产 CI 使用的 Linux glibc x64，其他平台按可选依赖的平台限制跳过．更新 Sharp 或 Wrangler 时须复核配对与安装布局．参见 [Sharp 官方安装说明](https://sharp.pixelplumbing.com/install/)．

安装依赖后运行：

```sh
corepack yarn --frozen-lockfile
corepack yarn media:check
corepack yarn media:test
```

`media:check` 在内存中创建 PNG、缩放、编码为 WebP 并解码，验证实际原生处理能力．题库检查和生产构建工作流均在依赖安装后立即执行该检查；Linux 上失败时会列出 libvips 文件、原生模块及 `ldd` 结果，并保留失败退出码．

修改依赖后应在 Ubuntu / Node 20 的干净安装中复核 `media:check` 和 `media:test`．可进一步检查链接路径：

```sh
find node_modules -name 'sharp-*.node' -exec ldd {} \;
find node_modules -name 'libvips-cpp.so*' -print
```

安装系统 libvips 或跳过图片测试会掩盖依赖布局错误，不作为修复措施．
