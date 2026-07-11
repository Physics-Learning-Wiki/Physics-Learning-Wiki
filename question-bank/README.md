# Physics Learning Wiki 题库

题库源文件使用 UTF-8 YAML；一道题一个文件，文件名必须与题目 `id` 一致。生产构建只会编译 `status: published` 的题，`draft` 只能通过显式预览模式加载，`retired` 永不进入新测验。

## 数据关系

- `scope.pages` 在阶段一必须且只能包含一个稳定页面 ID。
- `primary_objective` 是蓝图选题和结果汇总依据。
- `secondary_objectives` 只用于展示和检索。
- `concepts` 描述题目涉及的知识概念。
- AI 生成内容必须以 `authors[].kind: ai` 标识，且只能保持 draft，直到人工审核。

## 目录

- `schemas/`：题目与蓝图 JSON Schema。
- `questions/`：生产题库源文件。
- `blueprints/`：各页面测验蓝图。
- `fixtures/`：自动测试数据，不参与生产编译。

## 状态与审核

`published` 题必须同时记录物理审核和教学审核。两项审核可以由同一位维护者完成，但必须分别记录 GitHub 身份和审核日期。改编题还必须提供可核查来源与许可证说明。

完整的开发、预览和发布命令会在工程工具完成后补充。
