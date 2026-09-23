---
author: Physics Learning Wiki Team
---

## 图表、文献与长文档管理

在完成了一两次短篇推导后，你将不可避免地需要撰写长篇物理文档——例如包含数十组测量数据的大学物理实验报告、结构严谨的学期课程论文，或是贯穿整个学期的系统性物理讲义．

在处理这些长文档时，如何优雅地排版高质量矢量图、构建符合期刊标准的三线表、实现全自动交叉引用、管理数百条参考文献，以及将代码合理拆分为多文件工程，是衡量一个物理研究者工程化能力的关键．

## 物理插图系统与浮动体机制

在 LaTeX 中插入外部图像，必须在导言区载入标准插图宏包：

```tex
\usepackage{graphicx}
```

### 1. 插入图片的基本语法

```tex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.75\textwidth]{figures/hall-effect.pdf}
  \caption{霍尔效应测量载流子浓度与霍尔电压关系示意图}
  \label{fig:hall-effect}
\end{figure}
```

???+ tip "物理插图格式首选：PDF 矢量图"
    在物理研究中，建议优先使用 Python（Matplotlib）、Origin、Mathematica 或 GeoGebra 导出 **`.pdf` 矢量图格式**，而不是 `.png` 或 `.jpg` 位图．

    -   **无限缩放不失真**：PDF 矢量图在放大数倍打印或在屏幕上精读时，曲线、坐标轴与数据点均保持绝对锐利；
    -   **文字与正文融为一体**：矢量图中的文本在嵌入 LaTeX 时能保持最佳清晰度与字体衬线比例；
    -   **文件体积更小**：由线条和矢量路径构成，通常仅几十 KB 大小．

### 2. 理解浮动体机制（Float）与位置控制

很多新手常抱怨：「为什么我把图片写在第三段后面，编译出来却跑到了页面最顶端甚至下一页？」

这是因为 LaTeX 具有精密的版面排版引擎，它会自动避免页面底部留出大片难看的空白，将图片或表格视为「浮动体」（Float）．你可以通过位置参数给予编译器排版提示：

-   `h`（here）：尽量放在代码书写的位置；
-   `t`（top）：放在当前页或下一页的页面顶部；
-   `b`（bottom）：放在页面底部；
-   `p`（page）：单独成页（多张大图集中排布）；
-   **推荐组合：`[htbp]`**（赋予排版器最大的弹性以达到最佳页面密度）．

???+ note "如何强制图片「绝对就地显示」"
    如果写实验报告时，老师要求某张电路图必须紧随文字之后，绝对不允许移动，可以使用 `float` 宏包：
    ```tex
    \usepackage{float}
    % 在图表环境中使用大写 [H] 强制就地排版
    \begin{figure}[H]
      \centering
      \includegraphics[width=0.6\textwidth]{figures/circuit.pdf}
      \caption{惠斯通电桥实物接线图}
      \label{fig:bridge-circuit}
    \end{figure}
    ```

### 3. 多图并排与子图标题（`subcaption` 宏包）

在对比实验结果时（例如对比不同阻尼下的受迫振动振幅曲线），经常需要两张或三张子图横向并排．请使用现代官方推荐的 `subcaption` 宏包：

```tex
\usepackage{subcaption}

\begin{figure}[htbp]
  \centering
  \begin{subfigure}[b]{0.48\textwidth}
    \centering
    \includegraphics[width=\textwidth]{figures/underdamped.pdf}
    \caption{欠阻尼振动曲线 ($\gamma < \omega_0$)}
    \label{fig:sub-underdamped}
  \end{subfigure}
  \hfill
  \begin{subfigure}[b]{0.48\textwidth}
    \centering
    \includegraphics[width=\textwidth]{figures/overdamped.pdf}
    \caption{过阻尼振动曲线 ($\gamma > \omega_0$)}
    \label{fig:sub-overdamped}
  \end{subfigure}
  \caption{不同阻尼参量下的单摆运动位移响应对比}
  \label{fig:damped-comparison}
\end{figure}
```

## 规范物理实验数据表格

物理学术期刊和实验报告中，**严禁使用全网格的横竖线**（如普通 Word 默认网格）．科学表格的核心原则是：**横平竖直，且原则上无竖线**，由顶线、底线（粗线）和中间栏目分割线（细线）构成，被称为**三线表**．

### 1. `booktabs` 规范三线表

在导言区载入：

```tex
\usepackage{booktabs}
```

标准三线表结构：

```tex
\begin{table}[htbp]
  \centering
  \caption{不同温度下金属铜导线的电阻率实测值}
  \label{tab:resistivity}
  \begin{tabular}{ccc}
    \toprule
    温度 $T$ / \unit{\kelvin} & 电阻 $R$ / \unit{\ohm} & 电阻率 $\rho$ / (\unit{\nano\ohm\meter}) \\
    \midrule
    100 & 0.35 & 3.48 \\
    200 & 1.05 & 10.45 \\
    300 & 1.72 & 17.10 \\
    \bottomrule
  \end{tabular}
\end{table}
```

-   `\toprule`：顶线（较粗）；
-   `\midrule`：栏目分界线（较细）；
-   `\bottomrule`：底线（较粗）；
-   `\cmidrule(lr){2-3}`：部分列横线，适合复合表头．

### 2. 小数点与科学数据对齐：`siunitx` 的 `S` 列

在传统表格中，如果数据包含正负号、指数或不同有效位数，简单的居中 `c` 会导致小数点错乱错位．`siunitx` 提供了神奇的 **`S` 列格式**：

```tex
\begin{table}[htbp]
  \centering
  \caption{普朗克常数光电效应法测量数据表}
  \label{tab:photoelectric}
  \begin{tabular}{c S[table-format=3.1] S[table-format=1.3] S[table-format=1.2e2]}
    \toprule
    {滤光片波长} & {截止电压 $U_{\mathrm{a}}$} & {入射光频率 $\nu$} & {估算常数 $h$} \\
    {/ \unit{\nano\meter}} & {/ \unit{\volt}} & {/ \unit{\peta\hertz}} & {/ (\unit{\joule\second})} \\
    \midrule
    365.0 & -1.82 & 8.214 & 6.58e-34 \\
    404.7 & -1.45 & 7.408 & 6.64e-34 \\
    435.8 & -1.21 & 6.879 & 6.61e-34 \\
    546.1 & -0.58 & 5.490 & 6.63e-34 \\
    \bottomrule
  \end{tabular}
\end{table}
```

???+ note "注意保护非数据表头"
    在 `S` 列中，非数值内容（例如文字表头、单位）必须用一对花括号 `{...}` 包裹起来，以防止 `siunitx` 将其当做数字解析报错．

## 自动化交叉引用与超链接体系

在物理写作中，凡提到具体某条公式、某张图或某张表时，**严禁写「见上图」或「见前述公式」**，而必须使用标签引用．

### 1. 核心规则：`\label` 的位置

-   **公式**：`\label{eq:name}` 必须写在 `equation` 或 `align` 环境内部；
-   **图表**：`\label{fig:name}` 或 `\label{tab:name}` **必须严格写在 `\caption{...}` 之后或内部**！如果写在 `\caption` 之前，编译生成的引用编号会错乱变成当前小节号．

### 2. 标签前缀命名最佳实践

| 对象类型 | 推荐前缀 | 示例 | 引用命令 |
| :--- | :--- | :--- | :--- |
| 数学公式 | `eq:` | `\label{eq:schrodinger}` | `式~\eqref{eq:schrodinger}` |
| 插图 | `fig:` | `\label{fig:spectrum}` | `图~\ref{fig:spectrum}` |
| 表格 | `tab:` | `\label{tab:constants}` | `表~\ref{tab:constants}` |
| 章节/小节 | `sec:` | `\label{sec:derivation}` | `第~\ref{sec:derivation} 节` |

???+ tip "波浪号 `~` 的物理含义：不可断行空格"
    在输入 `图~\ref{fig:1}` 或 `式~\eqref{eq:2}` 时，中间的波浪号 `~` 表示「无间断空格」（Tie）．它确保排版在行末换行时，「图」字和数字「1」永远紧挨在一起，绝不会发生「图」在行末、「1」在下一行开头的尴尬分行．

### 3. 超链接宏包配置：`hyperref`

```tex
\usepackage{hyperref}
\hypersetup{
  colorlinks = true,      % 链接着色而非带有粗糙方框
  linkcolor = blue,       % 内部交叉引用颜色
  citecolor = forestgreen,% 参考文献引用颜色
  urlcolor = cyan         % 外部网址超链接颜色
}
```

## 参考文献管理与 BibTeX / Zotero 工作流

当引用的学术论文和教材超过 3 篇时，手工写参考文献就是一场噩梦．BibTeX 将文献信息与文档正文完全解耦，自动负责编号与排序．

### 1. 结构化文献库文件：`references.bib`

在工程根目录新建文本文件 `references.bib`，存储参考文献元数据：

```bibtex
% 学术期刊文章 (Journal Article)
@article{einstein1905,
  author  = {Albert Einstein},
  title   = {Zur Elektrodynamik bewegter K{\"o}rper},
  journal = {Annalen der Physik},
  volume  = {322},
  number  = {10},
  pages   = {891--921},
  year    = {1905},
  doi     = {10.1002/andp.19053221004}
}

% 物理教材/专著 (Book)
@book{griffiths2017,
  author    = {David J. Griffiths},
  title     = {Introduction to Electrodynamics},
  edition   = {4th},
  publisher = {Cambridge University Press},
  year      = {2017}
}
```

### 2. 在正文中引用与生成参考文献列表

在主文档 `.tex` 中：

```tex
\documentclass[UTF8]{ctexart}
\usepackage{cite} % 自动压缩与排序引用编号, 如 [1-3]

\begin{document}
  正如爱因斯坦在狭义相对论开创性文献中所述~\cite{einstein1905}，光速在所有惯性系中均保持不变．电动力学经典讲法可参考 Griffiths 专著~\cite{griffiths2017}．

  % 页面末尾输出参考文献列表
  \bibliographystyle{unsrt} % 样式: 按正文引用出现的先后顺序编号
  \bibliography{references}  % 载入 references.bib 文件 (不带后缀)
\end{document}
```

### 3. Zotero 文献管理联动

推荐使用开源文献管理神器 **Zotero** 配合 **Better BibTeX** 插件：

1.  在浏览物理论文（arXiv、APS、IEEE 等）时，点击浏览器插件一键抓取文献；
2.  在 Zotero 中右键文献库或特定分类，选择 **导出分类 $\to$ Better BibLaTeX / Better BibTeX**；
3.  勾选「Keep updated（自动保持同步更新）」并保存到你的 LaTeX 工程目录下；
4.  每次在 Zotero 中添加新文献，本地的 `.bib` 文件会自动更新，在 VS Code 中直接 `\cite{...}` 即可自动补全！

## 多文件长文档项目工程化规范

当物理讲义或毕业论文达到数十页时，把所有公式和文字堆在同一个 `main.tex` 里会导致代码滚不到头、定位困难、团队协作频繁冲突．必须采用模块化工程结构：

### 1. `\input` 与 `\include` 的区别与选型

-   **`\input{filename}`**：纯粹的「文本包含」．将目标文件的全部内容原封不动插入当前位置，不会产生任何强制分页．适合引入独立的导言区宏定义、单张复杂图形代码或短小节．
-   **`\include{filename}`**：会隐式调用 `\clearpage`，强制使该部分从一个新页面开始排版．适合作为长书、专著或大作业的独立「章」（Chapter）．支持配合 `\includeonly{...}` 仅编译某一个特定章节以大幅缩短编译等待时间．

### 2. 标准物理长篇工程目录规范

```text
my-physics-thesis/
│
├── main.tex              # 主工程入口 (包含 documentclass 与大体结构)
├── preamble.tex          # 导言区配置文件 (包含宏包引用与自定义宏)
├── references.bib        # BibTeX 文献数据库
│
├── chapters/             # 正文各章节分文件
│   ├── 01-intro.tex      # 引言与背景
│   ├── 02-theory.tex     # 理论力学与微分方程推导
│   ├── 03-experiment.tex # 实验装置与测量步骤
│   ├── 04-analysis.tex   # 数据处理与误差分析
│   └── 05-conclusion.tex # 总结与展望
│
└── figures/              # 所有插图集中存放 (避免散落)
    ├── optics-setup.pdf  # 实验光路图
    ├── hall-curve.pdf    # 霍尔曲线拟合图
    └── oscilloscope.png  # 示波器抓图 (位图)
```

在 `main.tex` 中只需简洁明了地装配：

```tex
\documentclass[UTF8]{ctexart}

% 载入外部配置
\input{preamble.tex}

\title{大学物理实验综合研讨专题报告}
\author{物理学人}
\date{\today}

\begin{document}
  \maketitle
  \tableofcontents % 自动生成目录

  \input{chapters/01-intro.tex}
  \input{chapters/02-theory.tex}
  \input{chapters/03-experiment.tex}
  \input{chapters/04-analysis.tex}
  \input{chapters/05-conclusion.tex}

  \bibliographystyle{unsrt}
  \bibliography{references}
\end{document}
```

这种工程化结构不仅让整个物理写作过程条理清晰，也极大方便了多人协同与长期归档．
