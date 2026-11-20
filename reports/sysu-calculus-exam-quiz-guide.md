# 中山大学高等数学真题录入实施指南

把 `D:\Programs\Physics-Learning-Wiki\References\高等数学真题` 中可核对的中山大学期末卷做成 PLW Quiz v3 整卷练习。先完成一套可本地试做、可逐题核对的草稿，再按同一流程处理其余试卷。每套保留原卷题序，交卷后显示参考解答，客观题自动判分，解答题由读者对照评分细则自评。使用现有题库、题集目录和答题运行器。

开始前阅读仓库根目录的 `AGENTS.md`、[题库说明](../question-bank/README.md)、[审核规范](../question-bank/REVIEWING.md) 和 [格式手册](../docs/intro/format.md)。以工作区当前的 [题目 schema](../question-bank/schemas/question.schema.json) 和 [题集 schema](../question-bank/schemas/set.schema.json) 为准。

## 盘点原卷和解析来源

目录直接包含 18 个 PDF、`23-24下/` 中的 6 张 JPG，以及一个 ZIP。ZIP 的 `高数上册/` 下 14 个 PDF 与目录中同名文件逐字节一致。ZIP 中的其他学科资料归入范围外。`2020高数上试题及解析（珠海数院）.pdf` 和 `中山大学2020高等数学一期末考试试题答案.pdf` 也逐字节一致，两份文件的卷首只确认了中山大学、2020 年和「高等数学一」，校区仍需其他证据。

| 本地材料 | 录入安排 |
| --- | --- |
| 2015、2016、2017、2021 年的题面版与「试题及解析」版 | 按卷首字段和逐题内容配对。用干净题面版转录，用解析版查答。 |
| 2018、2019 年及文件名标示不同场次的 2020 年资料 | 逐份检查卷首与题号。普通场、补考、不同校区或卷型在确有区别时分别建卷。 |
| `2022级高数一上期末解析.pdf`、`2022高数一下_all_pages.pdf`、`23高数一（II）真题期末_all_pages.pdf`、`高数上23-24.pdf` 和 `23-24下/` | 按卷首核对学年、学期、课程全名和卷型。照片先按印刷页码及题号重排，再核对与 PDF 是否重合。 |

维护一份逐卷盘点表及逐题对应表，可统一放在 `reports/sysu-calculus-exam-inventory.md`。逐卷记录学校、课程、学年学期、卷型或场次、原卷封面标示的题量与分值、各来源文件的角色、缺页和处理状态。逐题记录稳定题目 ID、原题号（含小题号）、题面与解答的相对路径及从 1 开始的 PDF 页码或照片文件名。PDF 页码与印刷页码不一致时同时记录。核对结果、存疑点和题集引用应能回查到同一行记录。

文件名用于识别候选材料，学期、校区和版权信息以可核实的卷首、署名或其他来源为准。用哈希发现相同文件，用题号、题文和公式比较不同版本。题面相同、解析另编的文件仍属于同一逻辑卷。只在完整题意、答案及作答形式均相同的情况下跨卷复用题目 ID，并在对应表中保留每次出现的位置。

## 先做一套整卷试点

使用 `2015高数上期末试题.pdf` 作为题面底本，以 `2015高数上试题及解析.pdf` 作为待复核的解答线索。两份卷首均标示中山大学 2015–2016 学年第 1 学期《高等数学一（I）》A 卷，原卷列出 14 道大题。试点应覆盖 14 道原题的位置和次序。遇到可拆分的小题时，在对应表中分别列出小题号及 ID。

1. 先录入两至三道题打通本地流程，其中至少一道需要写推导。确认交卷后自评、刷新续答和公式显示，再补齐整卷。
2. 完成后按盘点表处理其余可核实的逻辑卷。优先处理题面清晰、有可核对解答的卷，再处理照片、缺页和答案版。题面清楚而没有可用解析时，可以独立推导并标注来源。条件仍不明确的题号留在问题清单中，其他卷继续推进。
3. 题面缺失、无法核对的缺题或争议题应显式标记。部分录入的题集如需预览，描述里写明收录范围。完整覆盖且逐题核对后，再称为整卷。

## 转录、验算和题型选择

- 先用 `pdftotext -layout` 或 OCR 做定位和初稿，再用 `pdftoppm` 或 PDF 阅读器逐页核对题面、公式和图示。重点看极限方向、积分上下限、根号和分式覆盖范围、指数与下标、分段条件、区间开闭及符号正负。跨页题先按原题号拼接，再对照解析。
- 题面与参考解答分别核对。每题独立求解或以代入、求导回验、极限或边界检验交叉确认。来源解析有疑点时，记录原答案、核验过程及修订理由，并明确区分来源提供的答案和本站编写的解答。长题写出可复查的关键步骤，反馈指出本题常见的实际错误。
- 选择题、判断题保留原题型。引用原选项时用 `choice_order: fixed`。只要求一个常数且可用普通数值输入表达的填空可用 `numeric`，按题意设置误差和单位。需要分数原式、根式、含参数表达式、多个结果、集合或证明的题用 `free_response`，在参考答案中列出适用的等价形式。带依赖关系或共享条件的小题优先合为一个作答项。
- `free_response` 填写 `response`、`grading.mode: self_assessed`、`reference_answer` 与 `solution`。评分档对应具体关键步骤，覆盖 0 分、适用的部分得分和 1 分。原卷标出的分值及时长可登记为资料，页面结果按 Quiz v3 的练习分展示。使用 [自由作答样例](../question-bank/fixtures/valid/free-response.yml) 和 [数值题样例](../question-bank/fixtures/valid/numeric.yml)。
- 新题的 Markdown 行内公式用单 `$`，行间 `$$` 各自独占一行，公式块前后留空行。YAML 长题面和解析优先用 `|-` 保留 LaTeX 与换行。必要的插图按题库资源规范管理，核对图示条件和替代文本。原卷扫描件、水印、联系方式、个人信息及答题纸字段留在本地资料中。

## 写入题库并登记许可

题目放在 `question-bank/questions/math/calculus/sysu/<卷标识>/`，每题一个 UTF-8 YAML。按题库规则分配全库未占用的 `q-NNNNNN`，文件名和 ID 一致。写入盘点表后保持同一题目的 ID 稳定，批次续做前用对应表和工作区变更确认是否已有该题。题目从 `schema_version: 3`、`version: 1`、`status: draft` 开始。

题目从第一批起填齐 `topics`、`concepts`、`difficulty`、`cognitive_level`、`style`、`estimated_seconds` 和 `feedback`，避免只通过宽松草稿校验。主题使用 `math.calculus`，再按实际考点从 [微积分分类表](../question-bank/taxonomy/concepts/calculus.yml) 选择概念。`related_pages` 和 `objectives` 只填写页面注册表已存在的 ID。可在集合页用普通 Markdown 链接导向 [极限](../docs/math/calculus/limit.md)、[导数](../docs/math/calculus/derivative.md)、[积分](../docs/math/calculus/integral.md) 以及确有用到的 [常微分方程](../docs/math/differential-equations/ode-intro.md) 或 [矢量积分定理](../docs/math/vector-analysis/integral-theorems.md)。

- 原题按原意转成 Markdown 和 LaTeX 时，`provenance.type` 用 `reproduced`。改动题意、条件或结构时用 `adapted`，在 `provenance.note` 中说明变化。`authors` 使用可核实的署名。卷首写有学校而命题人未署名时，可如实标注「中山大学试卷，命题者未署名」。注明参考解答来自资料整理者、单独答案文件或本站独立推导。AI 参与转录、整理或推导时写 `ai_assisted: true`。
- `provenance.source` 优先填已核实的出处 URL。只有本地文件时，可用 `urn:plw:exam-source:sysu-calculus:2015-2016-term1-a` 这一形式的稳定来源标识，并在盘点表中登记它所指的文件。`provenance.note` 仍应让读者看得懂学年、学期、考试、原题号及解答来源。
- 来源可核对、授权待核实时，使用 `license: LicenseRef-Pending`，并在 `provenance.permission` 写明待核实的范围。已有专项许可时使用 `LicenseRef-Third-Party-Permission`，记录使用条款，可用 `permission_evidence` 附公开依据链接或内部记录编号。上游实际许可明确为 `CC-BY-NC-SA-4.0` 时使用该值。整卷编排和各道题分别标注，保留题面、解析与图示各自的来源。移除申请使用现有题库联系入口。[第三方试题许可说明](../question-bank/REVIEWING.md#第三方试题与题集的许可)

## 组卷和百科入口

在 `question-bank/sets/math/calculus/sysu/` 下每套建立一个固定题集。卷 ID 含可核实的学年、学期与卷型。默认固定题序、整卷交卷、交卷后自评。以下只展示题集结构，示例题号须换成实际分配的 ID，完整卷补齐所有题目。

```yaml
schema_version: 1
id: math.calculus.sysu-2015-2016-term1-a
title: 中山大学高等数学一（I）期末 A 卷（2015–2016 学年第 1 学期）
description: 中山大学高等数学一（I）期末 A 卷整卷练习，按原卷顺序作答，交卷后可核对解析并自评．
status: draft
tags: [课程真题, 中山大学, 高等数学, 期末考试]
license: LicenseRef-Pending
feedback_mode: deferred
self_assessment_timing: after_submit
selection:
  type: fixed
  questions: [q-999901, q-999902]
  order: fixed
```

试卷统一使用 `课程真题`、`中山大学`、`高等数学` 标签，从「知识小测 → 测试集合 → [课程真题](../docs/quiz/course-exams.md)」进入。目录从题库读取试卷和作答入口，正式构建显示已发布题集，本地预览可核对草稿。数学工具导读链接到高等数学筛选结果。[中山大学高等数学指引](../docs/math/calculus/sysu-exams.md)提供选卷说明和回学链接。保留 [小测首页的权利声明和编辑组联系方式](../docs/quiz/index.md)。

## 本地验收与人工交接

在仓库根目录运行以下检查。草稿校验通过后仍需核对原卷以及正式发布字段。

```powershell
uv run python -m scripts.question_bank validate --include-drafts
uv run python -m scripts.question_bank math-audit
uv run python -m scripts.question_bank coverage --preview

$env:PLW_QUIZ_PREVIEW = '1'
uv run mkdocs serve
# 停止本地服务后，在同一 PowerShell 中清理预览变量
Remove-Item Env:PLW_QUIZ_PREVIEW
```

从本地站点打开 `quiz/play/?set=math.calculus.sysu-2015-2016-term1-a`，以实际 set ID 代入。核对题序、桌面及手机窄屏公式显示、跳题与刷新恢复、交卷前答案可见性、交卷后作答锁定和自评、留空题处理、权利标注及联系入口。清理预览变量后核对正常构建，草稿题集只在本地预览时出现。记录实际执行的命令、检查结果和仍待核验的题号。只新增题库数据和集合页时，复用现有测试与前端资源。

交付包括题目和题集草稿、原卷与题目对应表、来源和版权状态以及验收记录。可以使用给定的实际审核者 GitHub 用户名生成一卷的审核清单，输出写入题库目录之外的新文件。清单内容变动后，重新生成并核对。

```powershell
uv run python -m scripts.question_bank.batch_review plan --set math.calculus.sysu-2015-2016-term1-a --reviewer YOUR-GITHUB-NAME --output reports/sysu-calculus-pilot-review-plan.json
```

AI 的交付以草稿和可复核材料为止。人工维护者负责实际的正确性、教学和版权审核，以及之后的签署、发布题目和题集。`attest`、批量 `apply`、`review` 签署记录与内容指纹均由实际审核者按现有流程处理。[批量审核指南](../question-bank/REVIEWING.md#批量记录已完成的人工审核)
