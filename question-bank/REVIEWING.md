# 题目人工审核

题目只有在仓库元数据中拥有与当前版本、当前内容指纹一致的三维签署后才能发布。Issue 标签、PR 审批、CI 通过和 AI 检查都不能替代人工签署。

## 固定 rubric

审核每道题时逐项确认：

1. 物理结论、数值、单位、符号和适用条件正确。
2. 题意唯一，不依赖未说明的假设，不存在多个合理答案。
3. 干扰项对应可诊断的常见误解，不使用纯文字陷阱。
4. 逐项反馈和完整解析能解释正确答案及关键错误原因。
5. 难度、认知层级和预计时间适合大学基础物理。
6. 图像信息具有等价替代文本，视觉编码不只依赖颜色。
7. 来源、原创/改编声明、AI 辅助披露和 CC BY-SA 4.0 许可完整；受管资源无外部依赖。

## 牛顿专题 v1

首发预选与保留题记录在 `release-plans/newton-laws-v1.yml`。`@Leafuke` 应按题目实际完成审核的日期运行：

```powershell
uv run python -m scripts.question_bank attest --id QUESTION_ID --dimension physics --dimension pedagogy --dimension copyright --reviewer Leafuke
uv run python -m scripts.question_bank publish --id QUESTION_ID
```

如三个维度不是同日完成，应分别运行 `attest` 并使用相应的实际日期。任何题干、答案、反馈、解析、来源或资源文件修改都会改变内容指纹；修改后必须重新审核和签署。

24 道预选题全部发布后，将牛顿页面的 `quiz.state` 改为 `active`，再运行：

```powershell
uv run python -m scripts.question_bank validate --release
corepack yarn quiz:build:check
uv run mkdocs build --clean
```

只有上述检查和人工浏览器验收全部通过后，才能合并激活 PR 并关闭总跟踪 Issue #22。
