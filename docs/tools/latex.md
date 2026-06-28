---
author: Physics Learning Wiki
---

## LaTeX 物理写作简介

LaTeX 是物理学习中最重要的工具之一。它最核心的价值不是「排版漂亮」，而是让公式、符号、图表、交叉引用和参考文献变得统一、稳定、可复用。只要你开始写课程笔记、实验报告、讲义草稿或学习总结，LaTeX 几乎都会比直接在富文本编辑器里手工排版更可靠。

对物理学习者来说，LaTeX 尤其适合下面几类任务：

-   写含有大量公式的课程笔记和推导整理。
-   写实验报告、课程论文和作业解答。
-   管理图表、编号、参考文献和交叉引用。
-   把不同时间写下的内容逐步沉淀成长期可维护的讲义。

## 为什么要尽早学 LaTeX

1.  物理表达本身就高度依赖公式、编号和符号一致性。
2.  一旦内容变长，手工排版的维护成本会迅速上升。
3.  LaTeX 更适合「先想清楚结构，再表达内容」的写作方式。
4.  它和 [绘图工具](./plotting.md)、参考文献管理、版本控制都能自然配合。

## 什么时候最值得优先使用

如果你符合下面任意一种情况，就已经很适合开始用 LaTeX 了：

-   你要写超过一页、并且包含多条公式的内容。
-   你经常需要重复写类似的公式、表格和定理环境。
-   你想把图、表、公式、引用组织成一篇完整文档。
-   你希望笔记、作业和讲义的符号风格保持统一。

如果你只是临时记两三行计算草稿，纯文本或纸笔仍然更快。LaTeX 不是要替代纸笔，而是要接管「需要长期保存和清晰交流」的部分。

## 三种常见入门方案

| 方案                             | 适合谁                  | 优点                  | 注意                    |
| ------------------------------ | -------------------- | ------------------- | --------------------- |
| Overleaf                       | 想立刻开始写、不想先配置环境的人。    | 打开浏览器即可写作，模板多，协作方便。 | 离线能力弱一些；大型项目可能不如本地灵活。 |
| TeX Live + VS Code 或 TeXstudio | 想长期本地写作、配合 Git 管理的人。 | 最稳定、最通用，适合长期维护。     | 首次安装体积较大。             |
| MiKTeX + 本地编辑器                 | Windows 用户中常见的轻量方案。  | 按需安装宏包，上手较快。        | 宏包版本和自动安装行为有时需要额外注意。  |

如果你是第一次接触，最简单的顺序通常是：先用 Overleaf 跑通第一份文档，再决定是否迁移到本地工具链。

## 推荐的最小工具链

一个足够实用、也足够稳定的组合是：

-   LaTeX 引擎：XeLaTeX。
-   中文文档类：ctex。
-   编辑器：Overleaf、VS Code 或 TeXstudio。
-   常用宏包：amsmath、amssymb、bm、siunitx、graphicx、booktabs、hyperref。

???+ warning "中文物理文档不要硬套英文模板"
        如果文档里会出现中文，最稳妥的起点通常不是 `article`，而是 `ctexart`。对中文用户来说，这会显著减少字体、编码和编译引擎相关的问题。

## 一个最小可用模板

下面是一个适合中文物理笔记的最小模板。它不追求花哨，只追求「能稳定写下去」。

```tex
\documentclass[UTF8]{ctexart}

\usepackage{amsmath, amssymb, bm}
\usepackage{siunitx}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{hyperref}

itle{单摆小角振动笔记}
\author{Your Name}
\date{\today}

\begin{document}
  \maketitle

  \section*{问题}
  考虑长度为 $l$、摆球质量为 $m$ 的单摆，在小角度近似下求其运动方程与周期。

  \section*{模型}
  当 $\theta \ll 1$ 时，$\sin\theta \approx \theta$，于是有

  \[
    \ddot{\theta}+ \frac{g}{l}\theta = 0.
  \]

  因此角频率为

  \[
    \omega = \sqrt{\frac{g}{l}},
  \]

  周期为

  \[
    T = 2\pi\sqrt{\frac{l}{g}}.
  \]
\end{document}
```

如果你能成功编译这份模板，并且清楚每个部分分别负责什么，就已经跨过了 LaTeX 入门最难的一步。

## 物理写作里最常用的公式环境

### 行内公式与行间公式

行内公式适合短表达式，例如 $F=ma$。行间公式适合需要单独强调、编号或对齐的公式，例如：

```tex
\[
  E = mc^{2}.
\]
```

如果你要写多步推导，优先考虑 `align` 环境，而不是手工插空格对齐。

### 多行推导与对齐

```tex
\begin{align}
  F & = m a,                               \\
    & = m \frac{\mathrm{d}v}{\mathrm{d}t}.
\end{align}
```

它适合做下面这些事：

-   分多步展示同一个推导。
-   让等号、近似号等符号垂直对齐。
-   让读者更容易看出每一步是怎么来的。

### 分段表达式

```tex
f(x) =
\begin{cases}
  x^{2}, & x \ge 0, \\
  -x,    & x < 0.
\end{cases}
```

### 矩阵与线性代数对象

```tex
\mathbf{A} =
\begin{pmatrix}
  1 & 2 \\
  3 & 4
\end{pmatrix}.
```

## 物理写作中最常用的几个宏包

| 宏包       | 用途        | 为什么常用                           |
| -------- | --------- | ------------------------------- |
| amsmath  | 公式环境。     | `align`、`cases`、`gather` 等都来自它。 |
| amssymb  | 数学符号。     | 常用额外符号基本都离不开它。                  |
| bm       | 粗体数学符号。   | 写矢量、张量时比简单的 `\mathbf` 更稳。       |
| siunitx  | 单位和数值。    | 统一书写单位，减少手工空格和格式错误。             |
| graphicx | 插图。       | 几乎所有文档都会用。                      |
| booktabs | 更规范的表格横线。 | 比默认表格线更适合正式文档。                  |
| hyperref | 超链接和交叉引用。 | 文档一长就非常重要。                      |

`physics` 宏包在物理社区里也很常见，因为它提供了很多方便的导数、括号和狄拉克符号命令；但对初学者来说，先把 `amsmath` 和基本原生命令学稳通常更重要，因为这样更容易理解你到底在写什么。

## 单位、符号和物理表达习惯

### 单位尽量交给 siunitx

手工输入单位常常会出现字体、空格和指数不统一的问题。更稳妥的写法是：

```tex
\qty{9.81}{\meter\per\second\squared}
```

或者：

```tex
\SI{1.60e-19}{\coulomb}
```

### 矢量、单位矢量和粗体

写矢量时，建议尽早统一规范。例如：

```tex
\bm{F}, \bm{r}, \bm{E}
```

不要一会儿用黑体、一会儿加箭头、一会儿用斜体，除非你有明确的约定并且整篇文档保持一致。可以同时参考 [数学符号表](../intro/symbol.md) 来约束全站表达风格。

### 导数与微分

建议尽量显式写出微分符号，例如：

```tex
\frac{\mathrm{d}x}{\mathrm{d}t}, \qquad \frac{\partial L}{\partial q}
```

这比把 `d` 当普通斜体变量更清楚。

## 插图、表格与交叉引用

一篇能长期维护的物理文档，通常离不开编号和引用。你应该尽量避免写出「见上图」「见下面那个表」这样的模糊说法，而是使用 `\label` 和 `\ref`。

```tex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.6\textwidth]{pendulum.png}
  \caption{单摆示意图}
  \label{fig:pendulum}
\end{figure}

如图~\ref{fig:pendulum} 所示，摆球受到重力与拉力的作用。
```

表格也类似：

```tex
\begin{table}[htbp]
  \centering
  \begin{tabular}{ccc}
    oprule $l$ / m & $g$ / m s$^{-2}$ & $T$ / s \\
    \midrule 0.50  & 9.80             & 1.42    \\
    1.00           & 9.80             & 2.01    \\
    \bottomrule
  \end{tabular}
  \caption{单摆周期示例数据}
  \label{tab:pendulum-data}
\end{table}
```

## 参考文献与 BibTeX

如果你开始写课程论文、综述或长期笔记，就应该尽早把参考文献管理也纳入工作流。最基本的思路是：

1.  用 `.bib` 文件保存文献信息。
2.  在正文里用 `\cite{...}` 引用。
3.  让 LaTeX 自动生成参考文献列表。

一个最小示例是：

```bibtex
@book{griffiths_em,
	author    = {David J. Griffiths},
	title     = {Introduction to Electrodynamics},
	publisher = {Cambridge University Press},
	year      = {2017}
}
```

正文中写：

```tex
如 Griffiths 所述，电势差与电场线积分密切相关 \cite{griffiths_em}。
```

哪怕你暂时只需要少量引用，也建议尽早形成「不用手动改编号」的习惯。

## 物理学习者最容易犯的几个错误

1.  直接截图公式或把公式当图片插入文档。
2.  所有公式都能编出来，但没有解释符号、条件和结论的物理意义。
3.  中文文档还在用不合适的模板，结果反复遇到编码和字体问题。
4.  手动写单位和编号，导致格式不统一。
5.  公式很多，但结构混乱，没有用小节、交叉引用和图表组织内容。
6.  把 LaTeX 当纯排版工具，而不是当成整理思路的写作工具。

## 一套适合初学者的进阶顺序

你不需要一开始就学会所有宏包和所有技巧。更合理的顺序通常是：

1.  先学会最小模板、编译和公式环境。
2.  再学会图表、标签与交叉引用。
3.  再学会参考文献。
4.  最后再考虑更复杂的模板、自定义命令、TikZ 或出版级排版细节。

## 与本站其他规范的关系

-   页面内容与书写层面的格式规范，见 [格式手册](../intro/format.md)。
-   物理符号的一致性问题，可对照 [数学符号表](../intro/symbol.md)。
-   如果你要把计算结果配成正式图像，请继续阅读 [绘图工具](./plotting.md)。

## 官方文档与常用入口

| 名称             | 作用            | 官方文档或主页                                                                                                  |
| -------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| LaTeX Project  | LaTeX 官方入口。   | <https://www.latex-project.org/>                                                                         |
| Overleaf Learn | 在线写作与教程。      | <https://www.overleaf.com/learn>                                                                         |
| TeX Live       | 本地发行版。        | <https://www.tug.org/texlive/>                                                                           |
| MiKTeX         | 另一套常见发行版。     | <https://miktex.org/>                                                                                    |
| CTAN           | 宏包与文档总入口。     | <https://ctan.org/>                                                                                      |
| TeXstudio      | 常见本地编辑器。      | <https://www.texstudio.org/>                                                                             |
| LaTeX Workshop | VS Code 常用扩展。 | [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) |

## 建议的入门练习

1.  用最小模板写一页「单摆小角振动」或「RC 放电」笔记。
2.  至少使用一次 `align`、一次图像插入和一次表格。
3.  加入 1 到 2 条参考文献，并用 `\cite` 正确引用。

当你完成这三步之后，LaTeX 对你来说就不再只是一个陌生排版系统，而会开始变成真正有用的物理写作工具。
