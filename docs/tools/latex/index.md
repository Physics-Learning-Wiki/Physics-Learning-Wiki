---
author: Physics Learning Wiki Team
---

## LaTeX 物理写作概览

LaTeX 是物理学习与科研工作中不可或缺的核心工具．它最本质的价值并非单纯的「版面美观」，而是通过结构化、声明式的写作方式，让物理推导中的巨量公式、物理量符号、单位、图表、定理环境以及文献引用能够保持绝对的严谨、统一与可复用．

无论你是在整理理论力学的微积分推导、撰写大学物理实验报告、完成课程大作业，还是准备发表第一篇国际期刊学术论文，LaTeX 都能为你提供远比传统所见即所得富文本编辑器（如 Microsoft Word / WPS）更加稳定、专业且可长期维护的排版体验．

## 为什么物理学习与研究离不开 LaTeX

1.  **高密度数学与物理公式的精确控制**：物理学包含海量的上下标、矢量粗体、张量指标、微商算子与积分记号．LaTeX 能以最符合逻辑的文本语法精确表达每一个数学结构，避免所见即所得编辑器频繁出现的字体走样与对齐断层．
2.  **全自动化的交叉引用体系**：在几十页的物理笔记或实验报告中，只要使用 `\label` 和 `\ref` / `\eqref`，公式、图表、章节和文献的序号就会全自动更新，彻底告别手工修改编号导致的遗漏与错位．
3.  **标准物理单位与符号规范**：配合 `siunitx`、`bm` 等现代专业宏包，能够天然符合 IUPAP（国际纯粹与应用物理学联合会）与国家标准对于物理量正斜体与单位的排版要求．
4.  **极佳的纯文本版本控制生态**：LaTeX 源码本质上是轻量的纯文本，能够完美配合 Git 进行版本追踪、分支管理和远程代码仓库备份，推导过程的每一次修改都清晰可查．
5.  **学术界通用的绝对标准**：国际主流物理期刊（如美国物理学会 APS 的 Physical Review 系列、IOP、AIP、Springer 等）和预印本平台 arXiv 均以 LaTeX 源文件作为标准投稿格式．

## LaTeX 的极小认知模型

对于初学者而言，不要被复杂的命令行或繁多的宏包吓退．你可以将 LaTeX 的工作流理解为一个清晰的「编译流水线」：

```text
+-------------------+        +--------------------+        +--------------------+
| 源码文件 (.tex)    | -----> |  编译引擎 (Compiler) | -----> |  成品文档 (.pdf)    |
| 纯文本写作 + 标签  |        | XeLaTeX / pdfLaTeX |        | 排版严谨的印刷级文档 |
+-------------------+        +--------------------+        +--------------------+
          ^                            ^
          |                            |
   +--------------+             +--------------+
   | 文献库 (.bib) |             |  专业宏包集  |
   | 图表文件     |             | amsmath 等   |
   +--------------+             +--------------+
```

-   **源码（.tex 文件）**：只负责记录正文内容、逻辑结构和命令标记，例如 `\section{...}` 表示小节，`$E=mc^2$` 表示物理公式．
-   **宏包（Package）**：类似于编程语言中的标准库或第三方库（如 Python 的 `numpy`）．例如 `amsmath` 提供高级公式环境，`siunitx` 规范物理单位，`graphicx` 提供图片插入支持．
-   **编译引擎（Engine）**：负责将源码与宏包按照排版算法渲染为最终的 PDF 文件．在中文物理写作中，我们最为推荐使用现代的 **XeLaTeX** 引擎．
-   **编辑器（Editor）**：提供语法高亮、代码补全、快捷编译和双向定位的生产力工具．推荐使用 **VS Code + LaTeX Workshop** 插件组合．

## 知识架构与子页面导学

为了帮助不同阶段的学习者高效查找所需内容，本子专栏将 LaTeX 物理写作拆分为以下 5 个系统化专题：

| 专题页面 | 核心解决问题 | 适合阅读场景 |
| :--- | :--- | :--- |
| [环境搭建 (VS Code + TeX Live)](./installation.md) | 本地 TeX Live 与 VS Code 的保姆级安装步骤、国内镜像加速、`settings.json` 完整配置、SyncTeX 双向跳转定位与在线 Overleaf 选型 | 首次上手、需要配置或优化本地高效物理写作环境时 |
| [物理公式与专业宏包](./math-and-physics.md) | 行内与行间公式、多行推导对齐（`align` / `cases`）、物理量符号规范（矢量 `\bm`、正体微分 `\mathrm{d}`）、`siunitx` 单位排版以及 `physics` / `physics2` 宏包辨析 | 学习记录推导、撰写公式密集型笔记或论文时 |
| [图表、文献与长文档管理](./figures-tables-bib.md) | 插入图片与浮动体控制、规范三线表（`booktabs`）、小数点对齐、`\label` 交叉引用、BibTeX / Zotero 文献库联动以及多文件工程结构（`\input` / `\include`） | 撰写正式物理实验报告、长篇期末大作业或毕业论文时 |
| [物理实战模板与期刊排版](./templates.md) | 标准中文大学物理实验报告模板、推导笔记模板，以及国际主流物理期刊（APS REVTeX 4-2）官方模板解析 | 需要开箱即用的专业模板，直接复制代码开工时 |
| [常见问题与排错指南](./troubleshooting.md) | 如何读懂编译日志日志、高频报错（`Undefined control sequence`、缺少宏包、中文字体缺失等）急救指南与物理排版红黑榜 | 编译报错排查、修 bug 或规范排版习惯时 |

## 极简可用物理文档示例

下面是一份结构完整、可直接复制运行的中文物理笔记最小模板．它包含了最核心的中文文档类、数学宏包、单位宏包以及基础的物理推导与三线表格：

```tex
\documentclass[UTF8]{ctexart}

% 常用数学与物理宏包
\usepackage{amsmath, amssymb, bm}
\usepackage{siunitx}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{hyperref}

\title{单摆小角振动的动力学方程与周期测量}
\author{物理学人}
\date{\today}

\begin{document}
  \maketitle

  \section{物理模型与运动方程}
  考虑摆长为 $l$、摆球质量为 $m$ 的理想单摆．摆球在微小角位移 $\theta$ 时的切向运动方程为：

  \begin{equation}
    m l \ddot{\theta} = - m g \sin\theta.
    \label{eq:pendulum-motion}
  \end{equation}

  在小角度近似下，有 $\sin\theta \approx \theta$．将式~\eqref{eq:pendulum-motion} 化简为标准简谐振动微分方程：

  \begin{equation}
    \ddot{\theta} + \omega_0^2 \theta = 0, \qquad \text{其中 } \omega_0 = \sqrt{\frac{g}{l}}.
  \end{equation}

  由此可解出该单摆的小角振动固有周期为：

  \begin{equation}
    T = \frac{2\pi}{\omega_0} = 2\pi \sqrt{\frac{l}{g}}.
  \end{equation}

  \section{实验测量数据示例}
  在当地重力加速度测量实验中，设定摆长为 $l = \qty{1.000}{\meter}$，测量得到的若干组单摆周期数据如表~\ref{tab:period-data} 所示：

  \begin{table}[htbp]
    \centering
    \caption{单摆周期实测数据记录表}
    \label{tab:period-data}
    \begin{tabular}{ccc}
      \toprule
      测量序号 & 50 次全振动总时间 $t$ / \unit{\second} & 单次周期 $T$ / \unit{\second} \\
      \midrule
      1 & 100.32 & 2.0064 \\
      2 & 100.28 & 2.0056 \\
      3 & 100.35 & 2.0070 \\
      \bottomrule
    \end{tabular}
  \end{table}

\end{document}
```

???+ tip "关于编译引擎的选择"
    上述示例使用了 `ctexart` 中文文档类，建议在本地环境中使用 **XeLaTeX** 引擎进行编译．如果你已经配置好了 VS Code，直接在侧边栏构建面板中选择 `Recipe: xelatex` 即可一键生成排版工整的 PDF．

## 物理学习者的推荐进阶路线

学习 LaTeX 最忌讳的是「在第一天就试图记住所有宏包和复杂语法」．更科学的学习方法是以物理任务为导向逐步推进：

1.  **第一阶段（打好地基）**：花 30 分钟阅读 [环境搭建 (VS Code + TeX Live)](./installation.md)，在个人电脑上安装好工具链并成功编译上述最小模板．
2.  **第二阶段（应付日常）**：查阅 [物理公式与专业宏包](./math-and-physics.md)，掌握 `align` 推导对齐和 `\qty` 单位输入，结合 [物理实战模板](./templates.md) 中的实验报告模板，完成一份正式的大学物理实验报告．
3.  **第三阶段（工程化管理）**：阅读 [图表、文献与长文档管理](./figures-tables-bib.md)，学会使用 `\input` 拆分章节，并用 Zotero 和 `.bib` 文件管理参考文献，将学期课程笔记汇总为一本结构清晰的 PDF 讲义．
4.  **第四阶段（学术发表）**：熟练运用 APS 的 REVTeX 模板，掌握规范的双栏排版与矢量绘图无损嵌入，顺畅进行科研论文写作与预印本发布．

## 与本站其他工具的协作

-   **全站排版要求**：撰写 Wiki 文档与日常物理报告时，请参考 [格式手册](../../intro/format.md)．
-   **数学符号标准**：物理公式与量纲表达的一致性，请对照 [数学符号表](../../intro/symbol.md)．
-   **数据计算与模拟**：使用 [Python 科学计算](../python-scicomp.md) 进行数值积分、常微分方程求解与拟合．
-   **矢量图形绘制**：使用 [绘图工具](../plotting.md) 生成高质量的矢量插图（PDF / SVG），无损嵌入到 LaTeX 文档中．
