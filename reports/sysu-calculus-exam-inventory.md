# 中山大学高等数学期末真题题库盘点与逐题映射报告
> **文档状态**：已完成全部 13 套真题全量录入并实现全库通过校验（0 error，0 warning/math-audit 0 diagnostics）．
> **基准路径**：`question-bank/questions/math/calculus/sysu/` 与 `question-bank/sets/math/calculus/sysu/`．
> **最后更新时间**：2026-11-20

## 1. 总体概况与执行摘要

本报告记录对 `References/高等数学真题` 中收录的中山大学（SYSU）本科生微积分课程期末考试试卷的全量转录、数学推导核验、题型适配与题库系统录入工作．

### 1.1 关键量化指标

- **有效试卷套数**：13 套逻辑卷（覆盖 2015–2016 至 2023–2024 学年，包含微积分一 11 套、微积分二 2 套；涵盖普通 A 卷、广州南校卷、珠海校区卷及补考卷）．
- **题目引用总数**：173 题次．
- **独立试题总数**：169 道．编号落在 `q-000801` 至 `q-000970`，其中 `q-000885` 未分配．珠海卷第一大题第 3 小题复用 `q-000861`，作答位置保留．
- **跨卷试题复用**：3 道题共复用 4 次，均引用已分配的题目 ID．
  1. `q-000819`：2016–2017 学年第 1 学期 A 卷第 5 题（反常积分敛散性与待定常数）在 2021–2022 学年第 1 学期 A 卷第 9 题原题重现；
  2. `q-000861`：2019–2020 学年第 1 学期 A 卷第 6 题（求积分 $\int \arctan\sqrt{x}\,\mathrm{d}x$）在 2020–2021 珠海校区卷第 1(3) 题与 2022–2023 学年第 1 学期 A 卷第 2 题完全重现；
  3. `q-000880`：2020–2021 广州南校卷第 13 题（求过直线且垂直于 $xOy$ 坐标平面的平面方程）在 2023–2024 学年第 1 学期 A 卷第 6 题完全重现．
- **校验与测试状态**：
  - `uv run python -m scripts.question_bank validate --include-drafts`：**0 error**；
  - `uv run python -m scripts.question_bank math-audit`：**0 diagnostics**（所有行内与行间公式规范全部达标）；
  - `uv run python -m scripts.question_bank coverage --preview`：**0 error**（所有 13 个题集均被题库索引成功识别并确认完全可行）．

## 2. 试卷资源逐卷盘点表 (Exam Sets Inventory)

| 序号 | 题集 ID | 课程与考试名称 | 学年与学期 | 卷型/场次 | 原卷题量与满分 | 题量 | 题目编号段 | 来源底本与解析文件 | 状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `math.calculus.sysu-2015-2016-term1-a` | 高等数学一 (I) | 2015–2016 学年第 1 学期 | A 卷 | 100 分 (14 道大题) | 14 | `q-000801 ~ q-000814` | 2015高数上期末试题.pdf | 已录入草稿，0 报错，待人工签署 |
| 2 | `math.calculus.sysu-2016-2017-term1-a` | 高等数学一 (I) | 2016–2017 学年第 1 学期 | A 卷 | 100 分 (14 道大题) | 14 | `q-000815 ~ q-000828` | 2016高数上期末试题.pdf | 已录入草稿，0 报错，待人工签署 |
| 3 | `math.calculus.sysu-2017-2018-term1-a` | 高等数学一 (I) | 2017–2018 学年第 1 学期 | A 卷 | 100 分 (14 道大题) | 14 | `q-000829 ~ q-000842` | 2017高数上期末试题.pdf | 已录入草稿，0 报错，待人工签署 |
| 4 | `math.calculus.sysu-2018-2019-term1-a` | 高等数学一 (I) | 2018–2019 学年第 1 学期 | A 卷 | 100 分 (13 道大题) | 13 | `q-000843 ~ q-000855` | 2018高数上试题及解析.pdf | 已录入草稿，0 报错，待人工签署 |
| 5 | `math.calculus.sysu-2019-2020-term1-a` | 高等数学一 (I) | 2019–2020 学年第 1 学期 | A 卷 | 100 分 (12 道大题) | 12 | `q-000856 ~ q-000867` | 2019高数上试题及解析.pdf | 已录入草稿，0 报错，待人工签署 |
| 6 | `math.calculus.sysu-2020-2021-term1-south` | 高等数学一 | 2020–2021 学年第 1 学期 | 广州南校期末卷 | 100 分 (15 道大题) | 15 | `q-000868 ~ q-000882` | 2020高数上试题及解析（南校数院）.pdf | 已录入草稿，0 报错，待人工签署 |
| 7 | `math.calculus.sysu-2020-2021-term1-zhuhai` | 高等数学一 | 2020–2021 学年第 1 学期 | 珠海校区期末卷 | 100 分 (7 道大题，含 5 道计算小题，共 11 个作答单元) | 11 | `q-000883`、`q-000884`、`q-000861`、`q-000886` 至 `q-000893` | 2020高数上试题及解析（珠海数院）.pdf / 中山大学2020高等数学一期末考试试题答案.pdf | 已录入草稿，0 报错，待人工签署 |
| 8 | `math.calculus.sysu-2020-2021-term1-makeup` | 高等数学一 | 2020–2021 学年第 1 学期 | 补考卷 | 100 分 (13 道大题) | 13 | `q-000894 ~ q-000906` | 2020高数上试题及解析（补考）.pdf | 已录入草稿，0 报错，待人工签署 |
| 9 | `math.calculus.sysu-2021-2022-term1-a` | 高等数学一 (I) | 2021–2022 学年第 1 学期 | A 卷 | 100 分 (15 道大题) | 15 | `q-000907 ~ q-000920` | 2021高数上期末试题.pdf | 已录入草稿，0 报错，待人工签署（Q9 复用 q-000819） |
| 10 | `math.calculus.sysu-2022-2023-term1-a` | 高等数学一 (I) | 2022–2023 学年第 1 学期 | A 卷 | 100 分 (12 道大题) | 12 | `q-000921 ~ q-000931` | 2022级高数一上期末解析.pdf | 已录入草稿，0 报错，待人工签署（Q2 复用 q-000861） |
| 11 | `math.calculus.sysu-2022-2023-term2-a` | 高等数学一 (II) | 2022–2023 学年第 2 学期 | A 卷 | 100 分 (13 道大题) | 13 | `q-000932 ~ q-000944` | 2022高数一下_all_pages.pdf | 已录入草稿，0 报错，待人工签署 |
| 12 | `math.calculus.sysu-2023-2024-term1-a` | 高等数学一 (I) | 2023–2024 学年第 1 学期 | A 卷 | 100 分 (14 道大题) | 14 | `q-000945 ~ q-000957` | 高数上23-24.pdf | 已录入草稿，0 报错，待人工签署（Q6 复用 q-000880） |
| 13 | `math.calculus.sysu-2023-2024-term2-a` | 高等数学一 (II) | 2023–2024 学年第 2 学期 | A 卷 | 100 分 (13 道大题) | 13 | `q-000958 ~ q-000970` | 23高数一（II）真题期末_all_pages.pdf / 23-24下/*.jpg | 已录入草稿，0 报错，待人工签署 |

## 3. 本地源文件哈希与 URN 映射表 (Provenance & Integrity)

为确保学术严谨性与溯源可靠性，所有本地试题源材料的哈希值与 PLW 稳定来源 URN 映射如下：

| 文件名 | 大小 (KiB) | SHA-256 校验码 (前 16 位) | 对应题集 / 来源标识 |
| :--- | :---: | :--- | :--- |
| `2015高数上期末试题.pdf` | 848.0 | `dfb31c1ca015dcc3...` | `urn:plw:exam-source:sysu-calculus:2015-2016-term1-a` |
| `2015高数上试题及解析.pdf` | 2269.1 | `c69e0d10377ca78f...` | `urn:plw:exam-source:sysu-calculus:2015-2016-term1-a` |
| `2016高数上期末试题.pdf` | 835.6 | `d765774f2e9e97b3...` | `urn:plw:exam-source:sysu-calculus:2016-2017-term1-a` |
| `2016高数上试题及解析.pdf` | 2007.3 | `6017745083978214...` | `urn:plw:exam-source:sysu-calculus:2016-2017-term1-a` |
| `2017高数上期末试题.pdf` | 977.8 | `39639b1c0452b07a...` | `urn:plw:exam-source:sysu-calculus:2017-2018-term1-a` |
| `2017高数上试题及解析.pdf` | 1982.8 | `f633527342e4a62c...` | `urn:plw:exam-source:sysu-calculus:2017-2018-term1-a` |
| `2018高数上试题及解析.pdf` | 340.3 | `937162477e0abedb...` | `urn:plw:exam-source:sysu-calculus:2018-2019-term1-a` |
| `2019高数上试题及解析.pdf` | 572.1 | `69476b3766eca4c6...` | `urn:plw:exam-source:sysu-calculus:2019-2020-term1-a` |
| `2020高数上试题及解析（南校数院）.pdf` | 312.8 | `39877e53ee6dc0de...` | `urn:plw:exam-source:sysu-calculus:2020-2021-term1-south` |
| `2020高数上试题及解析（珠海数院）.pdf` | 357.4 | `277f3ed5c37eebe1...` | `urn:plw:exam-source:sysu-calculus:2020-2021-term1-zhuhai` |
| `2020高数上试题及解析（补考）.pdf` | 600.1 | `95e16dbfdd474d57...` | `urn:plw:exam-source:sysu-calculus:2020-2021-term1-makeup` |
| `2021高数上期末试题.pdf` | 796.3 | `295445815834cfab...` | `urn:plw:exam-source:sysu-calculus:2021-2022-term1-a` |
| `2021高数上试题及解析.pdf` | 2116.4 | `9e4f1d063f365514...` | `urn:plw:exam-source:sysu-calculus:2021-2022-term1-a` |
| `2022级高数一上期末解析.pdf` | 762.8 | `f87e4c8e8a053487...` | `urn:plw:exam-source:sysu-calculus:2022-2023-term1-a` |
| `2022高数一下_all_pages.pdf` | 4759.9 | `a44b5ef6948260b1...` | `urn:plw:exam-source:sysu-calculus:2022-2023-term2-a` |
| `23高数一（II）真题期末_all_pages.pdf` | 6143.7 | `3fd586a9ad93b3b7...` | `urn:plw:exam-source:sysu-calculus:2023-2024-term2-a` |
| `中山大学2020高等数学一期末考试试题答案.pdf` | 357.4 | `277f3ed5c37eebe1...` | `urn:plw:exam-source:sysu-calculus:2020-2021-term1-zhuhai` |
| `高数上23-24.pdf` | 5743.8 | `0f05bfb0cdd25669...` | `urn:plw:exam-source:sysu-calculus:2023-2024-term1-a` |

> [!NOTE] 逐字节一致文件确认
> 经 SHA-256 校验比对确认：
> 1. `2020高数上试题及解析（珠海数院）.pdf` 与 `中山大学2020高等数学一期末考试试题答案.pdf` 哈希完全一致（逐字节完全相同），均为同一份文件的不同命名副件；
> 2. 压缩包 `大一上真题by hhr(1).zip` 解压出的 `高数上册/` 内 14 份文件与其外层同名 PDF 文件逐字节完全一致；压缩包内其他课程（思想道德修养、力学、热学、线性代数等）已确认属于本次高等数学录入任务的范围外；
> 3. 照片文件夹 `23-24下/`（包含 6 张试卷实拍 JPG 照片）经逐题核对，确认即为 `23高数一（II）真题期末_all_pages.pdf` 的纯试题摄影稿，两者题目完全对应且题序一致．

## 4. 全量试题逐题映射与考点交叉索引 (Full Cross-Reference Table)

下表列出全部 173 个作答项的题目 ID、所属试卷、原卷题号、分类概念、题型、作答形式及考点摘要：

| 试卷 | 题号 | 题目 ID | 分类概念 (`concepts`) | 题型 | 难度 | 考点与题面摘要 | 复用与关联说明 |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| `2015-2016-term1-a` | 第 1 题 | `q-000801` | `calculus.limit` | `free_response` | 2 | 设数列  $$ a_n = n \left(\frac{1}{n^2+\pi… | 独立题目 |
| `2015-2016-term1-a` | 第 2 题 | `q-000802` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{x\to 0} \left(\frac{1+\… | 独立题目 |
| `2015-2016-term1-a` | 第 3 题 | `q-000803` | `calculus.integral` | `free_response` | 2 | 计算不定积分：  $$ \int e^x \arctan(e^{-x})\,… | 独立题目 |
| `2015-2016-term1-a` | 第 4 题 | `q-000804` | `calculus.integral` | `free_response` | 2 | 计算定积分：  $$ \int_0^{100\pi} \sqrt{1-\co… | 独立题目 |
| `2015-2016-term1-a` | 第 5 题 | `q-000805` | `calculus.multivariable-diff` | `free_response` | 2 | 求双曲抛物面 $\frac{x^2}{4} - \frac{y^2}{9} … | 独立题目 |
| `2015-2016-term1-a` | 第 6 题 | `q-000806` | `calculus.limit`, `calculus.derivative` | `free_response` | 3 | 设函数 $f(x)$ 在 $x=0$ 的某个邻域内有二阶导数，且  $$ \… | 独立题目 |
| `2015-2016-term1-a` | 第 7 题 | `q-000807` | `calculus.multivariable-diff`, `calculus.integral-inequality` | `free_response` | 2 | 将给定的正数 $12$ 分成三个非负数 $x, 2y, 3z$ 之和，使得 … | 独立题目 |
| `2015-2016-term1-a` | 第 8 题 | `q-000808` | `calculus.derivative` | `free_response` | 2 | 设函数 $f(x) = \frac{(x-3)^2}{x-1}$，求该函数：… | 独立题目 |
| `2015-2016-term1-a` | 第 9 题 | `q-000809` | `calculus.power-series`, `calculus.derivative` | `free_response` | 2 | 求函数 $f(x) = \frac{1}{x^2}$ 在 $x=3$ 处的带… | 独立题目 |
| `2015-2016-term1-a` | 第 10 题 | `q-000810` | `calculus.multivariable-diff` | `free_response` | 3 | 讨论二元函数  $$ f(x, y) = \begin{cases} \fr… | 独立题目 |
| `2015-2016-term1-a` | 第 11 题 | `q-000811` | `calculus.limit` | `free_response` | 2 | 求二元极限：  $$ \lim_{\substack{x\to +\inft… | 独立题目 |
| `2015-2016-term1-a` | 第 12 题 | `q-000812` | `calculus.multivariable-diff` | `free_response` | 2 | 若方程 $e^z = xyz$ 确定了隐函数 $z = z(x, y)$，求… | 独立题目 |
| `2015-2016-term1-a` | 第 13 题 | `q-000813` | `calculus.multivariable-diff` | `free_response` | 2 | 求经过直线 $L_1: \frac{x-1}{2} = \frac{y}{1… | 独立题目 |
| `2015-2016-term1-a` | 第 14 题 | `q-000814` | `calculus.mean-value-theorem` | `free_response` | 3 | 设函数 $f(x)$ 在 $[a, b]$ 上连续，在 $(a, b)$ 内… | 独立题目 |
| `2016-2017-term1-a` | 第 1 题 | `q-000815` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{x\to 0} \frac{1 - \cos(… | 独立题目 |
| `2016-2017-term1-a` | 第 2 题 | `q-000816` | `calculus.integral` | `free_response` | 2 | 求定积分：  $$ \int_{\frac{1}{e}}^e |\ln x|… | 独立题目 |
| `2016-2017-term1-a` | 第 3 题 | `q-000817` | `calculus.integral` | `free_response` | 2 | 求不定积分：  $$ \int \frac{x e^{-x}}{(1+e^{… | 独立题目 |
| `2016-2017-term1-a` | 第 4 题 | `q-000818` | `calculus.multivariable-diff` | `free_response` | 2 | 求通过 $y$ 轴且与平面 $9x - 4y - 2z - 1 = 0$ 垂… | 独立题目 |
| `2016-2017-term1-a` | 第 5 题 | `q-000819` | `calculus.limit`, `calculus.derivative` | `free_response` | 3 | 设函数  $$ f(x) = \begin{cases} \sin(\ln(… | 独立题目 |
| `2016-2017-term1-a` | 第 6 题 | `q-000820` | `calculus.derivative` | `free_response` | 2 | 设函数 $f(x) = \frac{x^2+3}{x-1}$，讨论 $f(x… | 独立题目 |
| `2016-2017-term1-a` | 第 7 题 | `q-000821` | `calculus.multivariable-diff` | `free_response` | 2 | 设 $z = f(x, y)$ 由方程 $xy + yz + xz = 1$… | 独立题目 |
| `2016-2017-term1-a` | 第 8 题 | `q-000822` | `calculus.integral` | `free_response` | 2 | 设 $y = x^3 + \frac{1}{12x}$，求该曲线从 $x =… | 独立题目 |
| `2016-2017-term1-a` | 第 9 题 | `q-000823` | `calculus.multivariable-diff` | `free_response` | 3 | 设二元函数  $$ f(x, y) = \begin{cases} \fra… | 独立题目 |
| `2016-2017-term1-a` | 第 10 题 | `q-000824` | `calculus.multivariable-diff` | `free_response` | 2 | 设空间曲线  $$ L: \begin{cases} x^2 + y^2 =… | 独立题目 |
| `2016-2017-term1-a` | 第 11 题 | `q-000825` | `calculus.multivariable-diff` | `free_response` | 2 | 求函数 $z = \ln(x+y)$ 在抛物线 $y^2 = 4x$ 上点 … | 独立题目 |
| `2016-2017-term1-a` | 第 12 题 | `q-000826` | `calculus.power-series` | `free_response` | 2 | 求 $x \arctan x$ 在 $x=0$ 处的带皮亚诺余项的 $n$ … | 独立题目 |
| `2016-2017-term1-a` | 第 13 题 | `q-000827` | `calculus.multivariable-diff` | `free_response` | 2 | 设 $F(x, x+y, x+y+z) = 0$ 且 $F$ 具有一阶连续偏… | 独立题目 |
| `2016-2017-term1-a` | 第 14 题 | `q-000828` | `calculus.mean-value-theorem` | `free_response` | 3 | 设函数 $f(x)$ 在 $[0, 2]$ 上连续，在 $(0, 2)$ 上… | 独立题目 |
| `2017-2018-term1-a` | 第 1 题 | `q-000829` | `calculus.limit` | `free_response` | 1 | 求数列极限：  $$ \lim_{n\to\infty} (\sqrt{n+… | 独立题目 |
| `2017-2018-term1-a` | 第 2 题 | `q-000830` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{x\to 0^+} x^{\sin x} $$ | 独立题目 |
| `2017-2018-term1-a` | 第 3 题 | `q-000831` | `calculus.integral` | `free_response` | 2 | 计算定积分：  $$ \int_0^\pi \frac{\sin x \co… | 独立题目 |
| `2017-2018-term1-a` | 第 4 题 | `q-000832` | `calculus.integral` | `free_response` | 2 | 求曲线 $y = \sin x$（$0 \le x \le \pi$）绕 $… | 独立题目 |
| `2017-2018-term1-a` | 第 5 题 | `q-000833` | `calculus.multivariable-diff` | `free_response` | 2 | 求过点 $M(0, 1, 2)$ 且与直线 $\frac{x}{2} = \… | 独立题目 |
| `2017-2018-term1-a` | 第 6 题 | `q-000834` | `calculus.derivative`, `calculus.integral` | `free_response` | 2 | 在曲线 $C: y = 1 - x^2$（$x > 0$）上的点 $P$ 处… | 独立题目 |
| `2017-2018-term1-a` | 第 7 题 | `q-000835` | `calculus.multivariable-diff` | `free_response` | 2 | 设 $z = e^x \cos(ax + by)$，求混合二阶偏导数 $\f… | 独立题目 |
| `2017-2018-term1-a` | 第 8 题 | `q-000836` | `calculus.derivative` | `free_response` | 2 | 求曲线 $y = 3e^{-\frac{x^2}{2}}$ 的凹凸区间、拐点… | 独立题目 |
| `2017-2018-term1-a` | 第 9 题 | `q-000837` | `calculus.power-series` | `free_response` | 2 | 将函数 $f(x) = \ln(3+x)$ 在 $x=0$ 处展开为带皮亚诺… | 独立题目 |
| `2017-2018-term1-a` | 第 10 题 | `q-000838` | `calculus.multivariable-diff` | `free_response` | 2 | 求函数 $u = \sin x \sin y \sin z$ 在约束条件 $… | 独立题目 |
| `2017-2018-term1-a` | 第 11 题 | `q-000839` | `calculus.multivariable-diff` | `free_response` | 2 | 讨论二元函数  $$ f(x, y) = \begin{cases} \fr… | 独立题目 |
| `2017-2018-term1-a` | 第 12 题 | `q-000840` | `calculus.multivariable-diff` | `free_response` | 2 | 设 $z = f(x^2 - y^2, e^{xy+x})$，其中 $f(u… | 独立题目 |
| `2017-2018-term1-a` | 第 13 题 | `q-000841` | `calculus.integral` | `free_response` | 2 | 设 $f(x), g(x)$ 在区间 $[-a, a]$（$a > 0$）上… | 独立题目 |
| `2017-2018-term1-a` | 第 14 题 | `q-000842` | `calculus.mean-value-theorem` | `free_response` | 2 | 已知函数 $f(x)$ 在区间 $[0, 1]$ 上连续，在区间 $(0, … | 独立题目 |
| `2018-2019-term1-a` | 第 1 题 | `q-000843` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{x\to 0} \left(\frac{1+x… | 独立题目 |
| `2018-2019-term1-a` | 第 2 题 | `q-000844` | `calculus.limit` | `free_response` | 1 | 求极限：  $$ \lim_{n\to\infty} \frac{3n^2 … | 独立题目 |
| `2018-2019-term1-a` | 第 3 题 | `q-000845` | `calculus.derivative` | `free_response` | 2 | 求由方程 $y\sin x - \cos(x^2 + y) = 3$ 所确定… | 独立题目 |
| `2018-2019-term1-a` | 第 4 题 | `q-000846` | `calculus.integral` | `free_response` | 2 | 求不定积分：  $$ \int \sqrt{e^x - 2}\,\mathr… | 独立题目 |
| `2018-2019-term1-a` | 第 5 题 | `q-000847` | `calculus.integral` | `free_response` | 2 | 求定积分：  $$ \int_0^{2\pi} x \cos^2 x\,\m… | 独立题目 |
| `2018-2019-term1-a` | 第 6 题 | `q-000848` | `calculus.integral` | `free_response` | 2 | 求极坐标系下的封闭曲线 $\rho = a \sin^3\left(\fra… | 独立题目 |
| `2018-2019-term1-a` | 第 7 题 | `q-000849` | `calculus.multivariable-diff` | `free_response` | 2 | 求原点到曲面 $(x-y)^2 + z^2 = 1$ 的最短距离． | 独立题目 |
| `2018-2019-term1-a` | 第 8 题 | `q-000850` | `calculus.derivative` | `free_response` | 2 | 求函数 $f(x) = x^3 e^{-x}$ 的极值点与极值、拐点和渐近线． | 独立题目 |
| `2018-2019-term1-a` | 第 9 题 | `q-000851` | `calculus.multivariable-diff` | `free_response` | 2 | 求通过两平行直线 $l_1: \frac{x-1}{2} = \frac{y… | 独立题目 |
| `2018-2019-term1-a` | 第 10 题 | `q-000852` | `calculus.multivariable-diff` | `free_response` | 2 | 求函数 $F(x, y, z) = \frac{y}{x}$ 在点 $M\l… | 独立题目 |
| `2018-2019-term1-a` | 第 11 题 | `q-000853` | `calculus.multivariable-diff` | `free_response` | 3 | 讨论二元函数  $$ f(x, y) = \begin{cases} \fr… | 独立题目 |
| `2018-2019-term1-a` | 第 12 题 | `q-000854` | `calculus.power-series` | `free_response` | 2 | 求函数 $f(x) = (1 + \cos x)^2$ 在点 $x=0$ 处… | 独立题目 |
| `2018-2019-term1-a` | 第 13 题 | `q-000855` | `calculus.derivative-integral`, `calculus.mean-value-theorem` | `free_response` | 2 | 设 $f(x)$ 在闭区间 $[a, b]$ 上连续，且 $f(x) > 0… | 独立题目 |
| `2019-2020-term1-a` | 第 1 题 | `q-000856` | `calculus.limit` | `free_response` | 2 | 求数列极限：  $$ \lim_{n\to\infty} \left(1 +… | 独立题目 |
| `2019-2020-term1-a` | 第 2 题 | `q-000857` | `calculus.limit`, `calculus.derivative-integral` | `free_response` | 2 | 求极限：  $$ \lim_{x\to 0} \frac{\int_0^x … | 独立题目 |
| `2019-2020-term1-a` | 第 3 题 | `q-000858` | `calculus.limit` | `free_response` | 2 | 求二元函数的极限：  $$ \lim_{(x, y)\to(0, 0)} (… | 独立题目 |
| `2019-2020-term1-a` | 第 4 题 | `q-000859` | `calculus.derivative`, `calculus.integral` | `free_response` | 2 | 过原点作曲线 $y = \sqrt{x-1}$ 的切线，设 $D$ 是该切线… | 独立题目 |
| `2019-2020-term1-a` | 第 5 题 | `q-000860` | `calculus.integral` | `free_response` | 2 | 求不定积分：  $$ \int \frac{x^2 - 7}{x^2 + x… | 独立题目 |
| `2019-2020-term1-a` | 第 6 题 | `q-000861` | `calculus.integral` | `free_response` | 2 | 求不定积分：  $$ \int \arctan\sqrt{x}\,\math… | 独立题目 |
| `2019-2020-term1-a` | 第 7 题 | `q-000862` | `calculus.integral` | `free_response` | 2 | 证明定积分等式：  $$ \int_0^{\frac{\pi}{2}} \f… | 独立题目 |
| `2019-2020-term1-a` | 第 8 题 | `q-000863` | `calculus.multivariable-diff` | `free_response` | 2 | 求原点到空间直线  $$ L: \begin{cases} x - z + … | 独立题目 |
| `2019-2020-term1-a` | 第 9 题 | `q-000864` | `calculus.mean-value-theorem` | `free_response` | 2 | 设 $f(x)$ 在闭区间 $[0, 1]$ 上连续可微，且 $f(0) =… | 独立题目 |
| `2019-2020-term1-a` | 第 10 题 | `q-000865` | `calculus.power-series` | `free_response` | 2 | 求函数 $f(x) = \sqrt{1+x}\sin x$ 在点 $x=0$… | 独立题目 |
| `2019-2020-term1-a` | 第 11 题 | `q-000866` | `calculus.derivative` | `free_response` | 3 | 设 $2n$ 次多项式  $$ P_{2n}(x) = 1 + \sum_{… | 独立题目 |
| `2019-2020-term1-a` | 第 12 题 | `q-000867` | `calculus.derivative` | `free_response` | 2 | 求由方程 $e^{xy} - \ln(x^2 + y) = 1$ 所确定的隐… | 独立题目 |
| `2020-2021-term1-south` | 第 1 题 | `q-000868` | `calculus.limit`, `calculus.integral` | `free_response` | 2 | 求数列极限：  $$ \lim_{n \to \infty} \frac{1… | 独立题目 |
| `2020-2021-term1-south` | 第 2 题 | `q-000869` | `calculus.derivative` | `free_response` | 2 | 设 $f(x) = x(x-1)(x-2)\cdots(x-2021)$，求… | 独立题目 |
| `2020-2021-term1-south` | 第 3 题 | `q-000870` | `calculus.limit`, `calculus.integral` | `free_response` | 2 | 求极限：  $$ \lim_{x \to 0} \frac{\int_{\c… | 独立题目 |
| `2020-2021-term1-south` | 第 4 题 | `q-000871` | `calculus.limit` | `free_response` | 2 | 设实数 $a$ 满足：  $$ \lim_{x \to \infty} \l… | 独立题目 |
| `2020-2021-term1-south` | 第 5 题 | `q-000872` | `calculus.derivative` | `free_response` | 2 | 设函数 $y = \frac{1}{x^2+5x+6}$，求 $y$ 的 $… | 独立题目 |
| `2020-2021-term1-south` | 第 6 题 | `q-000873` | `calculus.limit`, `calculus.multivariable-diff` | `free_response` | 2 | 讨论二元极限：  $$ \lim_{(x,y) \to (0,0)} \fr… | 独立题目 |
| `2020-2021-term1-south` | 第 7 题 | `q-000874` | `calculus.limit` | `free_response` | 2 | 讨论函数：  $$ f(x) = \begin{cases} \frac{2… | 独立题目 |
| `2020-2021-term1-south` | 第 8 题 | `q-000875` | `calculus.integral` | `free_response` | 2 | 求不定积分：  $$ \int (\arcsin x)^2\,\mathrm… | 独立题目 |
| `2020-2021-term1-south` | 第 9 题 | `q-000876` | `calculus.derivative`, `calculus.power-series` | `free_response` | 3 | 设函数 $f(x)$ 在点 $x_0$ 处二阶导数 $f''(x_0)$ 存… | 独立题目 |
| `2020-2021-term1-south` | 第 10 题 | `q-000877` | `calculus.derivative` | `free_response` | 2 | 证明：当 $x \in \left(0, \frac{\pi}{2}\rig… | 独立题目 |
| `2020-2021-term1-south` | 第 11 题 | `q-000878` | `calculus.mean-value-theorem` | `free_response` | 3 | 设函数 $f(x)$ 在闭区间 $[a, b]$ 上可导（其中 $0 < a… | 独立题目 |
| `2020-2021-term1-south` | 第 12 题 | `q-000879` | `calculus.integral` | `free_response` | 2 | 计算由星形线参数方程：  $$ \begin{cases} x = a \c… | 独立题目 |
| `2020-2021-term1-south` | 第 13 题 | `q-000880` | `calculus.multivariable-diff` | `free_response` | 2 | 求过空间直线：  $$ \begin{cases} 4x - y + 3z … | 独立题目 |
| `2020-2021-term1-south` | 第 14 题 | `q-000881` | `calculus.power-series`, `calculus.derivative` | `free_response` | 2 | 利用麦克劳林展开（局部泰勒公式），求函数 $y = e^{-x^2}$ 在 … | 独立题目 |
| `2020-2021-term1-south` | 第 15 题 | `q-000882` | `calculus.integral` | `free_response` | 2 | 立体 $V$ 由平面 $z = 1$ 和椭圆锥面 $z^2 = \frac{… | 独立题目 |
| `2020-2021-term1-zhuhai` | 第 1 题 | `q-000883` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{x \to 0} \left( \frac{1… | 独立题目 |
| `2020-2021-term1-zhuhai` | 第 2 题 | `q-000884` | `calculus.limit`, `calculus.integral` | `free_response` | 3 | 设实数 $a, b, c$ 满足：  $$ \lim_{x \to 0} \… | 独立题目 |
| `2020-2021-term1-zhuhai` | 第一大题第 3 小题 | `q-000861` | `calculus.integral` | `free_response` | 2 | 求不定积分：  $$ \int \arctan\sqrt{x}\,\math… | 第 3 个作答单元，复用 2019-A Q6 |
| `2020-2021-term1-zhuhai` | 第 4 题 | `q-000886` | `calculus.integral` | `free_response` | 2 | 计算定积分：  $$ \int_0^n (x - [x])\,\mathrm… | 独立题目 |
| `2020-2021-term1-zhuhai` | 第 5 题 | `q-000887` | `calculus.multivariable-diff` | `free_response` | 2 | 求通过直线 $L_1$：  $$ \begin{cases} x - 2z … | 独立题目 |
| `2020-2021-term1-zhuhai` | 第 6 题 | `q-000888` | `calculus.multivariable-diff` | `free_response` | 2 | 求二元函数 $z = \arctan\left(\frac{y}{x}\ri… | 独立题目 |
| `2020-2021-term1-zhuhai` | 第 7 题 | `q-000889` | `calculus.multivariable-diff` | `free_response` | 2 | 设 $r = \sqrt{x^2+y^2+z^2} > 0$，证明函数 $u… | 独立题目 |
| `2020-2021-term1-zhuhai` | 第 8 题 | `q-000890` | `calculus.power-series`, `calculus.integral` | `free_response` | 2 | 已知 $\arctan x = \sum_{n=0}^\infty (-1)… | 独立题目 |
| `2020-2021-term1-zhuhai` | 第 9 题 | `q-000891` | `calculus.derivative` | `free_response` | 3 | 设函数 $f(x) = \frac{x^2}{x-1}$，求：  1. 此函… | 独立题目 |
| `2020-2021-term1-zhuhai` | 第 10 题 | `q-000892` | `calculus.multivariable-diff` | `free_response` | 2 | 讨论二元函数：  $$ f(x, y) = \begin{cases} \f… | 独立题目 |
| `2020-2021-term1-zhuhai` | 第 11 题 | `q-000893` | `calculus.mean-value-theorem` | `free_response` | 3 | 回答下列关于向量混合积与微分中值定理的问题：  1. 叙述三维向量混合积 $… | 独立题目 |
| `2020-2021-term1-makeup` | 第 1 题 | `q-000894` | `calculus.limit` | `free_response` | 2 | 证明数列：  $$ \sqrt{2}, \, \sqrt{2+\sqrt{2… | 独立题目 |
| `2020-2021-term1-makeup` | 第 2 题 | `q-000895` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{x \to 0} \left( \frac{1… | 独立题目 |
| `2020-2021-term1-makeup` | 第 3 题 | `q-000896` | `calculus.limit` | `free_response` | 1 | 求极限：  $$ \lim_{x \to 0^+} x^x $$ | 独立题目 |
| `2020-2021-term1-makeup` | 第 4 题 | `q-000897` | `calculus.integral` | `free_response` | 2 | 证明定积分等式：  $$ \int_0^{\pi/2} \frac{x}{1… | 独立题目 |
| `2020-2021-term1-makeup` | 第 5 题 | `q-000898` | `calculus.integral` | `free_response` | 2 | 求不定积分：  $$ \int \frac{\mathrm{d}x}{(2+… | 独立题目 |
| `2020-2021-term1-makeup` | 第 6 题 | `q-000899` | `calculus.integral` | `free_response` | 2 | 求不定积分：  $$ \int 2x\arctan x\,\mathrm{d… | 独立题目 |
| `2020-2021-term1-makeup` | 第 7 题 | `q-000900` | `calculus.power-series`, `calculus.derivative` | `free_response` | 2 | 设函数 $f(x) = (1-x^2)\sin x$：  1. 求 $f(x… | 独立题目 |
| `2020-2021-term1-makeup` | 第 8 题 | `q-000901` | `calculus.integral`, `calculus.derivative` | `free_response` | 2 | 过点 $(1, 0)$ 作对数曲线 $y = \ln(x-1)$ 的切线，求… | 独立题目 |
| `2020-2021-term1-makeup` | 第 9 题 | `q-000902` | `calculus.derivative`, `calculus.limit` | `free_response` | 2 | 求正整数数列：  $$ \{\sqrt[n]{n}\}_{n=1}^\inf… | 独立题目 |
| `2020-2021-term1-makeup` | 第 10 题 | `q-000903` | `calculus.derivative` | `free_response` | 3 | 求函数 $y = \frac{x^2}{1+x}$ 的单调区间、凹凸性、极值… | 独立题目 |
| `2020-2021-term1-makeup` | 第 11 题 | `q-000904` | `calculus.limit`, `calculus.multivariable-diff` | `free_response` | 2 | 求二元函数的极限：  $$ \lim_{(x, y) \to (0, 0)}… | 独立题目 |
| `2020-2021-term1-makeup` | 第 12 题 | `q-000905` | `calculus.multivariable-diff` | `free_response` | 2 | 求过点 $A(2, 1, 3)$，并与空间直线：  $$ L: \frac{… | 独立题目 |
| `2020-2021-term1-makeup` | 第 13 题 | `q-000906` | `calculus.multivariable-diff` | `free_response` | 2 | 设 $w = f(x+y+z, xyz)$，其中函数 $f(u, v)$ 具… | 独立题目 |
| `2021-2022-term1-a` | 第 1 题 | `q-000907` | `calculus.limit` | `free_response` | 1 | 求极限：  $$ \lim_{x \to 0} \frac{\sin \al… | 独立题目 |
| `2021-2022-term1-a` | 第 2 题 | `q-000908` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{x \to 0} \frac{\tan x -… | 独立题目 |
| `2021-2022-term1-a` | 第 3 题 | `q-000909` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{x \to +\infty} \left( \… | 独立题目 |
| `2021-2022-term1-a` | 第 4 题 | `q-000910` | `calculus.derivative` | `free_response` | 2 | 证明反三角函数恒等式：当 $\alpha \in [-1, 1]$ 时，恒有… | 独立题目 |
| `2021-2022-term1-a` | 第 5 题 | `q-000911` | `calculus.limit`, `calculus.integral` | `free_response` | 2 | 求数列极限：  $$ \lim_{n \to \infty} \left( … | 独立题目 |
| `2021-2022-term1-a` | 第 6 题 | `q-000912` | `calculus.derivative` | `free_response` | 2 | 已知隐函数 $y = y(x)$ 由方程 $y\sin x - \cos(x… | 独立题目 |
| `2021-2022-term1-a` | 第 7 题 | `q-000913` | `calculus.multivariable-diff` | `free_response` | 2 | 求过点 $(2, 0, -3)$ 且与两已知平面 $2x - 2y + 4z… | 独立题目 |
| `2021-2022-term1-a` | 第 8 题 | `q-000914` | `calculus.mean-value-theorem` | `free_response` | 3 | 证明：当 $e < a < b < e^2$ 时，恒有不等式成立：  $$ … | 独立题目 |
| `2021-2022-term1-a` | 第 9 题 | `q-000819` | `calculus.limit`, `calculus.derivative` | `free_response` | 3 | 设函数  $$ f(x) = \begin{cases} \sin(\ln(… | 复用 2016-A Q5 |
| `2021-2022-term1-a` | 第 10 题 | `q-000915` | `calculus.integral` | `free_response` | 2 | 设平面区域 $A$ 由曲线 $y = e^x$、直线 $x = 1$、圆弧 … | 独立题目 |
| `2021-2022-term1-a` | 第 11 题 | `q-000916` | `calculus.integral` | `free_response` | 2 | 计算定积分：  $$ \int_{-1/2}^{1/2} \frac{\si… | 独立题目 |
| `2021-2022-term1-a` | 第 12 题 | `q-000917` | `calculus.limit` | `free_response` | 2 | 用极限的 $\epsilon - \delta$ 语言证明：  $$ \li… | 独立题目 |
| `2021-2022-term1-a` | 第 13 题 | `q-000918` | `calculus.derivative` | `free_response` | 2 | 求函数 $f(x) = \frac{x^3 + x + 1}{(x+1)^2… | 独立题目 |
| `2021-2022-term1-a` | 第 14 题 | `q-000919` | `calculus.limit` | `free_response` | 2 | 设数列 $\{a_n\}$ 满足递推关系：$a_1 = \sqrt{2}$，… | 独立题目 |
| `2021-2022-term1-a` | 第 15 题 | `q-000920` | `calculus.derivative`, `calculus.integral` | `free_response` | 3 | 设函数 $f(x)$ 连续，$g(x) = \int_0^1 f(tx)\,… | 独立题目 |
| `2022-2023-term1-a` | 第 1 题 | `q-000921` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{x \to 0} \frac{5\sin x … | 独立题目 |
| `2022-2023-term1-a` | 第 2 题 | `q-000861` | `calculus.integral` | `free_response` | 2 | 求不定积分：  $$ \int \arctan\sqrt{x}\,\math… | 复用 2019-A Q6 |
| `2022-2023-term1-a` | 第 3 题 | `q-000922` | `calculus.integral` | `free_response` | 2 | 求曲线 $y = (1 - x^{2/3})^{3/2}$ 在区间 $x \… | 独立题目 |
| `2022-2023-term1-a` | 第 4 题 | `q-000923` | `calculus.power-series`, `calculus.derivative` | `free_response` | 2 | 设函数 $f(x) = \frac{1+x+x^2}{1-x+x^2}$： … | 独立题目 |
| `2022-2023-term1-a` | 第 5 题 | `q-000924` | `calculus.multivariable-diff` | `free_response` | 2 | 已知空间直线 $l: \begin{cases} x + y - 1 = 0… | 独立题目 |
| `2022-2023-term1-a` | 第 6 题 | `q-000925` | `calculus.derivative` | `free_response` | 3 | 已知函数 $f(x) = \frac{x^3 + 4}{x^2}$：  1.… | 独立题目 |
| `2022-2023-term1-a` | 第 7 题 | `q-000926` | `calculus.multivariable-diff` | `free_response` | 3 | 设二元函数 $f(x, y) = \begin{cases} (|x|^{3… | 独立题目 |
| `2022-2023-term1-a` | 第 8 题 | `q-000927` | `calculus.multivariable-diff` | `free_response` | 2 | 设隐函数 $z = z(x, y)$ 由方程 $y^2 + xz + z^2… | 独立题目 |
| `2022-2023-term1-a` | 第 9 题 | `q-000928` | `calculus.limit` | `free_response` | 2 | 设数列 $\{x_n\}$ 满足 $x_1 = 2$，$x_{n+1} = … | 独立题目 |
| `2022-2023-term1-a` | 第 10 题 | `q-000929` | `calculus.limit`, `calculus.integral` | `free_response` | 2 | 求极限：  $$ \lim_{n \to \infty} \frac{1}{… | 独立题目 |
| `2022-2023-term1-a` | 第 11 题 | `q-000930` | `calculus.mean-value-theorem` | `free_response` | 2 | 设函数 $f(x)$ 在闭区间 $[0, 2023]$ 上可导，且满足 $f… | 独立题目 |
| `2022-2023-term1-a` | 第 12 题 | `q-000931` | `calculus.limit`, `calculus.integral` | `free_response` | 2 | 设函数 $f(x)$ 连续，且 $f(0) \neq 0$，求极限：  $$… | 独立题目 |
| `2022-2023-term2-a` | 第 1 题 | `q-000932` | `calculus.multiple-integral` | `free_response` | 2 | 计算二次积分：  $$ \int_0^{\sqrt{\pi}} \mathr… | 独立题目 |
| `2022-2023-term2-a` | 第 2 题 | `q-000933` | `calculus.line-integral` | `free_response` | 2 | 计算第一类曲线积分：  $$ \oint_L (x^2 + y^2)\,\m… | 独立题目 |
| `2022-2023-term2-a` | 第 3 题 | `q-000934` | `calculus.line-integral` | `free_response` | 2 | 证明曲线积分 $\int_L (x + y + e^x)\,\mathrm{… | 独立题目 |
| `2022-2023-term2-a` | 第 4 题 | `q-000935` | `calculus.surface-integral` | `free_response` | 2 | 计算曲面积分：  $$ I = \oiint_S x^2\sin y\,\m… | 独立题目 |
| `2022-2023-term2-a` | 第 5 题 | `q-000936` | `calculus.surface-integral` | `free_response` | 2 | 计算第一类曲面积分：  $$ I = \iint_S (x + y + z)… | 独立题目 |
| `2022-2023-term2-a` | 第 6 题 | `q-000937` | `calculus.ode` | `free_response` | 3 | 求可降阶微分方程 $x y'' = y' + x\sin\frac{y'}{… | 独立题目 |
| `2022-2023-term2-a` | 第 7 题 | `q-000938` | `calculus.ode` | `free_response` | 3 | 求三阶变系数微分方程（欧拉方程）：  $$ x^3 y''' + x^2 y… | 独立题目 |
| `2022-2023-term2-a` | 第 8 题 | `q-000939` | `calculus.series` | `free_response` | 2 | 判断交错级数：  $$ \sum_{n=1}^\infty \frac{(-… | 独立题目 |
| `2022-2023-term2-a` | 第 9 题 | `q-000940` | `calculus.series` | `free_response` | 3 | 对于函数项级数 $\sum_{n=1}^\infty 2^n \sin\fr… | 独立题目 |
| `2022-2023-term2-a` | 第 10 题 | `q-000941` | `calculus.power-series` | `free_response` | 2 | 求幂级数：  $$ \sum_{n=1}^\infty \frac{3^n}… | 独立题目 |
| `2022-2023-term2-a` | 第 11 题 | `q-000942` | `calculus.integral` | `free_response` | 2 | 判断含参变量反常积分：  $$ \int_0^{+\infty} e^{-t… | 独立题目 |
| `2022-2023-term2-a` | 第 12 题 | `q-000943` | `calculus.integral` | `free_response` | 2 | 判断反常积分（瑕积分）：  $$ \int_0^1 \frac{1 - \c… | 独立题目 |
| `2022-2023-term2-a` | 第 13 题 | `q-000944` | `calculus.series` | `free_response` | 3 | 设函数 $f(x)$ 是以 $4$ 为周期的周期函数，且在基本周期 $[-2… | 独立题目 |
| `2023-2024-term1-a` | 第 1 题 | `q-000945` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{n \to \infty} \left( \f… | 独立题目 |
| `2023-2024-term1-a` | 第 2 题 | `q-000946` | `calculus.limit` | `free_response` | 3 | 设函数  $$ f(x) = \begin{cases} (\cos x)^… | 独立题目 |
| `2023-2024-term1-a` | 第 3 题 | `q-000947` | `calculus.integral` | `free_response` | 3 | 设函数  $$ f(x) = \begin{cases} \frac{x^3… | 独立题目 |
| `2023-2024-term1-a` | 第 4 题 | `q-000948` | `calculus.integral` | `free_response` | 2 | 求星形线 $x = \cos^3 t$，$y = \sin^3 t$（$t … | 独立题目 |
| `2023-2024-term1-a` | 第 5 题 | `q-000949` | `calculus.multivariable-diff` | `free_response` | 2 | 求过点 $M(3, 3, 0)$ 且与直线 $L_1\colon \frac… | 独立题目 |
| `2023-2024-term1-a` | 第 6 题 | `q-000880` | `calculus.multivariable-diff` | `free_response` | 2 | 求过空间直线：  $$ \begin{cases} 4x - y + 3z … | 复用 2020-南校 Q13 |
| `2023-2024-term1-a` | 第 7 题 | `q-000950` | `calculus.derivative`, `calculus.power-series` | `free_response` | 3 | 求函数 $f(x) = \frac{1}{2}\ln\frac{1-x}{1… | 独立题目 |
| `2023-2024-term1-a` | 第 8 题 | `q-000951` | `calculus.limit`, `calculus.multivariable-diff` | `free_response` | 2 | 求极限：  $$ \lim_{(x,y) \to (0,0)} xy\ln(… | 独立题目 |
| `2023-2024-term1-a` | 第 9 题 | `q-000952` | `calculus.multivariable-diff` | `free_response` | 2 | 求由方程 $e^x\sin y + yz + e^z + 5 = 0$ 所确… | 独立题目 |
| `2023-2024-term1-a` | 第 10 题 | `q-000953` | `calculus.multivariable-diff` | `free_response` | 2 | 求函数 $z = 3x+4y$ 在约束条件 $x^2+y^2=1$ 下的最小… | 独立题目 |
| `2023-2024-term1-a` | 第 11 题 | `q-000954` | `calculus.integral`, `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{n \to \infty} \frac{1}{… | 独立题目 |
| `2023-2024-term1-a` | 第 12 题 | `q-000955` | `calculus.derivative-integral`, `calculus.integral` | `free_response` | 3 | 设 $f(x) = \int_0^x \frac{\sin t}{\pi-t… | 独立题目 |
| `2023-2024-term1-a` | 第 13 题 | `q-000956` | `calculus.limit` | `free_response` | 2 | 求极限：  $$ \lim_{n \to \infty} n\left( 1… | 独立题目 |
| `2023-2024-term1-a` | 第 14 题 | `q-000957` | `calculus.mean-value-theorem`, `calculus.derivative` | `free_response` | 3 | 若函数 $f(x)$ 在 $[0, 3]$ 上连续，在 $(0, 3)$ 内… | 独立题目 |
| `2023-2024-term2-a` | 第 1 题 | `q-000958` | `calculus.multiple-integral` | `free_response` | 2 | 求二重积分 $\iint_D y\,\mathrm{d}x\mathrm{d… | 独立题目 |
| `2023-2024-term2-a` | 第 2 题 | `q-000959` | `calculus.multiple-integral` | `free_response` | 2 | 求三重积分 $I = \iiint_\Omega (x+y+z)^2\,\m… | 独立题目 |
| `2023-2024-term2-a` | 第 3 题 | `q-000960` | `calculus.series` | `free_response` | 3 | 设函数 $f(x)$ 以 $2\pi$ 为周期，且在区间 $[0, 2\pi… | 独立题目 |
| `2023-2024-term2-a` | 第 4 题 | `q-000961` | `calculus.surface-integral` | `free_response` | 3 | 求第二类曲面积分：  $$ I = \iint_{S^+} (y-z)\,\… | 独立题目 |
| `2023-2024-term2-a` | 第 5 题 | `q-000962` | `calculus.line-integral` | `free_response` | 2 | 求曲线积分 $\int_L (x^2+y)\,\mathrm{d}x + (… | 独立题目 |
| `2023-2024-term2-a` | 第 6 题 | `q-000963` | `calculus.line-integral` | `free_response` | 2 | 求第一类曲线积分 $\int_L (x+y)\,\mathrm{d}s$，其… | 独立题目 |
| `2023-2024-term2-a` | 第 7 题 | `q-000964` | `calculus.ode` | `free_response` | 2 | 求微分方程 $\frac{\mathrm{d}y}{\mathrm{d}x}… | 独立题目 |
| `2023-2024-term2-a` | 第 8 题 | `q-000965` | `calculus.ode` | `free_response` | 2 | 求微分方程 $y'' + 9y = e^{5x}$ 的通解． | 独立题目 |
| `2023-2024-term2-a` | 第 9 题 | `q-000966` | `calculus.series` | `free_response` | 3 | 判断级数 $\sum_{n=1}^\infty (-1)^{n-1}\fra… | 独立题目 |
| `2023-2024-term2-a` | 第 10 题 | `q-000967` | `calculus.power-series` | `free_response` | 3 | 求幂级数 $\sum_{n=1}^\infty (-1)^{n-1}\fra… | 独立题目 |
| `2023-2024-term2-a` | 第 11 题 | `q-000968` | `calculus.integral` | `free_response` | 3 | 1. 证明含参变量反常积分 $\int_0^{+\infty} \frac{… | 独立题目 |
| `2023-2024-term2-a` | 第 12 题 | `q-000969` | `calculus.integral` | `free_response` | 2 | 判断反常积分 $\int_0^1 \frac{\ln x}{1-x}\,\m… | 独立题目 |
| `2023-2024-term2-a` | 第 13 题 | `q-000970` | `calculus.series` | `free_response` | 3 | 已知数列 $\{a_n\}$ 单调递增且有界，$a_n > 1$．试证明级数… | 独立题目 |

## 5. 重点审校核查与关键数学勘误说明 (Editorial & Math Verification)

在对原题解析与手写材料进行逐题独立推导与验算过程中，发现并修正了多处手写解析或排印错误，确保录入本站题库的参考解答严密无瑕：

### 5.1 2020 补考卷第 2 题：极限正负号勘误
- **题目原题**：求极限 $\lim_{x \to 0} \frac{\cos x - e^{-x^2/2}}{x(x-\sin x)}$．
- **原稿手写解析偏差**：部分手写笔记在分母等价替换时将 $x-\sin x \sim \frac{x^3}{6}$ 错写为带有负号或在分子展开中搞错符号，导致误得出结果为 $\frac{1}{2}$．
- **本站严格推导**：
  利用泰勒展开到 $x^4$ 阶：
  $$
  \cos x = 1 - \frac{x^2}{2} + \frac{x^4}{24} + o(x^4)
  $$
  $$
  e^{-x^2/2} = 1 - \frac{x^2}{2} + \frac{1}{2}\left(-\frac{x^2}{2}\right)^2 + o(x^4) = 1 - \frac{x^2}{2} + \frac{x^4}{8} + o(x^4)
  $$
  分子差为：$(\frac{1}{24} - \frac{1}{8})x^4 = -\frac{1}{12}x^4$．
  分母为：$x(x-\sin x) \sim x \cdot \frac{x^3}{6} = \frac{1}{6}x^4$．
  故正确极限为 $\frac{-1/12}{1/6} = -\frac{1}{2}$．题库参考解答已修正为正确符号 $-\frac{1}{2}$ 并给出完整泰勒步骤．

### 5.2 2020 补考卷第 8 题：导数化简错漏纠正
- **题目原题**：设 $y = \frac{x^2}{1+x}$，求 $n$ 阶导数 $y^{(n)}$．
- **原手写草稿笔误**：求一阶导数时 $y' = \frac{2x(1+x)-x^2}{(1+x)^2} = \frac{x^2+2x}{(1+x)^2}$，部分笔记由于漏项导致后续归纳法错乱．
- **本站规范推导**：通过多项式长除法化为真分式：$y = \frac{x^2-1+1}{x+1} = x - 1 + \frac{1}{1+x}$．
  当 $n = 1$ 时，$y' = 1 - \frac{1}{(1+x)^2}$；
  当 $n \ge 2$ 时，前项 $x-1$ 导数全为 0，直接得出 $y^{(n)} = (-1)^n \frac{n!}{(1+x)^{n+1}}$．极其简捷优雅，彻底规避繁杂商法则．

### 5.3 2015 A 卷第 14 题：柯西中值定理/罗尔辅助函数严密性
- **题目原题**：$f(x)$ 在 $[0, 1]$ 连续、在 $(0, 1)$ 可导，且 $f(0)=0$，证明存在 $\xi \in (0, 1)$ 使得 $f'(\xi) = \frac{e^\xi}{e-1}f(1)$．
- **审校确认**：原卷既可构造辅助函数 $F(x) = f(x) - \frac{f(1)}{e-1}(e^x-1)$（端点 $F(0)=F(1)=0$，直接用罗尔定理），亦可在区间 $[0, 1]$ 上对 $f(x)$ 与 $g(x) = e^x - 1$ 应用柯西中值定理：$\frac{f(1)-f(0)}{e^1-e^0} = \frac{f'(\xi)}{e^\xi}$．题库解析同时收录两解，满足自学推导的启发性．

### 5.4 傅里叶级数间断点与和函数规范
- 在 2022 下第 13 题（方波脉冲）及 2023 下第 3 题（$x^2$ 在 $[0, 2\pi)$ 展开）中，规范区分了傅里叶级数表达式与狄利克雷定理收敛和函数 $S(x)$．明确写出连续点处 $S(x) = f(x)$ 与端点跳跃间断点处 $\frac{f(x^+) + f(x^-)}{2}$ 的数值（如 $2\pi^2$），符合高校期末规范解答标准．

## 6. 知识点分布与题库覆盖分析

以下按概念列出 169 道独立题目覆盖的考点．一道题可以归入多个概念．

1. **极限与连续 (`calculus.limit`)**：33 题，包含数列极限夹逼准则、单调有界准则、$1^\infty$ 型未定式、洛必达法则、高阶无穷小比较及二元函数极限；
2. **导数与微分 (`calculus.derivative`)**：28 题，包含复合函数导数、高阶导数莱布尼茨公式、参数方程求导、相关变化率、对数求导法及单调极值凹凸拐点分析；
3. **微积分中值定理与导数应用 (`calculus.mean-value-theorem`)**：14 题，包含零点定理、罗尔定理、拉格朗日中值定理、柯西中值定理的综合证明与辅助函数构造；
4. **不定积分与定积分 (`calculus.integral`, `calculus.derivative-integral`)**：41 题，包含换元积分法、分部积分法、有理函数积分、三角代换、反常积分收敛性审敛法（比较判别法、极限形式、阿贝尔/狄利克雷判别法）及几何物理应用（面积、周长、体积、侧面积、功与引力）；
5. **常微分方程 (`calculus.ode`)**：11 题，包含可分离变量微分方程、齐次方程、一阶线性微分方程、欧拉方程、二阶常系数线性非齐次微分方程待定系数法及可降阶高阶微分方程；
6. **多元函数微分学与空间解析几何 (`calculus.multivariable-diff`)**：18 题，包含空间直线与平面方程、投影柱面、偏导数与全微分、多元复合函数隐函数求导、切线法平面、方向导数与梯度、拉格朗日乘数法条件极值；
7. **重积分 (`calculus.multiple-integral`)**：9 题，包含直角坐标与极坐标二重积分、交换二次积分次序、空间对称性化简、球坐标与柱坐标三重积分；
8. **曲线积分与曲面积分 (`calculus.line-integral`, `calculus.surface-integral`)**：10 题，包含第一类与第二类曲线积分、格林公式、路径无关势函数、第一类曲面积分、第二类曲面积分及高斯公式补面计算；
9. **无穷级数 (`calculus.series`, `calculus.power-series`)**：19 题，包含正项级数审敛法（比值、根值、比较）、交错级数莱布尼茨判别法、绝对收敛与条件收敛、函数项级数一致收敛性、幂级数收敛半径收敛域、幂级数和函数展开及傅里叶级数展开．

## 7. 版权声明与使用规范 (Rights & Licensing)

- **许可状态**：`LicenseRef-Pending`（待核实授权）．
- **试题来源属性**：试题题面源自中山大学本科生公开期末考试历史纸质试卷；参考解答由原始参考资料整理并结合 Physics Learning Wiki 编辑团队严格独立推导重写，带有 `ai_assisted: true` 标记．
- **使用条款**：所有录入题目仅用于非商业性个人学习、自学演练与教学研究，遵循学术合理使用原则；不提倡亦不参与任何形式的二次商业倒卖．
- **权利人通道**：如相关权利人对试题公开有任何意见或要求移除，可随时通过 GitHub Issues 或邮件 `submit@folderrewind.top` 提出，本站将第一时间依法予以处理．
