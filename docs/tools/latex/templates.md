---
author: Physics Learning Wiki Team
---

## 物理实战模板与期刊排版

工欲善其事，必先利其器．在掌握了 LaTeX 的基础语法与宏包后，直接从一份设计优良、结构清晰的模板起步，能让你节省大量从零折腾页面边距、字体与宏包冲突的时间．

本页面提供三套经过严格验证、注释详尽的物理场景标准实战模板：
1.  **大学物理实验报告 / 课程大作业标准模板**（中文 `ctexart` 完整结构）；
2.  **物理理论推导笔记模板**（结合 `amsthm` 定理、推导与物理注记框）；
3.  **美国物理学会（APS REVTeX 4-2）期刊投稿模板**（国际标准双栏排版）．

## 模板一：大学物理实验报告 / 课程大作业标准模板

本模板专为理工科大学物理实验报告与期末大作业量身打造，涵盖实验信息头、摘要、仪器表、原理推导、标准三线实验数据、合成不确定度分析、误差来源探讨与参考文献．

新建文件 `experiment-report.tex`，粘贴以下代码，使用 **XeLaTeX** 引擎编译：

```tex
\documentclass[UTF8, a4paper, 11pt]{ctexart}

% 页面边距设置
\usepackage[top=2.5cm, bottom=2.5cm, left=2.5cm, right=2.5cm]{geometry}

% 常用数学与物理宏包
\usepackage{amsmath, amssymb, bm, mathtools}
\usepackage{siunitx}
\sisetup{
  separate-uncertainty = true,
  inter-unit-product = \cdot
}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{float}
\usepackage{cite}
\usepackage{hyperref}
\hypersetup{
  colorlinks = true,
  linkcolor = blue,
  citecolor = forestgreen,
  urlcolor = cyan
}

% 页眉页脚设置
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small 大学物理实验报告}
\fancyhead[R]{\small 单摆测量重力加速度与误差分析}
\fancyfoot[C]{\thepage}

\begin{document}

% 标题与学生信息
\begin{center}
  {\LARGE \textbf{实验报告：单摆测量重力加速度与不确定度评定}} \\[1.5em]
  \begin{tabular}{rlrl}
    \textbf{学生姓名：} & 张三 & \textbf{学\qquad 号：} & 20240101001 \\
    \textbf{专业班级：} & 物理系 2401 班 & \textbf{实验日期：} & 2026 年 9 月 22 日 \\
    \textbf{指导教师：} & 李教授 & \textbf{环境条件：} & 室温 \qty{22.5}{\degreeCelsius}，湿度 \qty{55}{\percent} \\
  \end{tabular}
\end{center}

\vspace{1em}
\hrule
\vspace{1.5em}

\begin{abstract}
  本实验基于单摆小角度摆动近似，利用米尺、游标卡尺与数字毫秒计分别测量了单摆摆长与 50 次全振动周期．通过逐差法与最小二乘拟合求得当地重力加速度实验值为 $g = \qty{9.794 \pm 0.018}{\meter\per\second\squared}$，与当地标准理论参考值相对偏差为 \qty{0.06}{\percent}．文末对悬线伸长、空气浮力及空气阻尼引入的系统误差进行了定量分析．
\end{abstract}

\section{实验目的}
1. 掌握游标卡尺、米尺与数字毫秒计的正确测量与读数方法；
2. 验证单摆小角摆动的简谐运动规律，测定当地重力加速度 $g$；
3. 学习间接测量量的合成不确定度传递与有效数字保留规则．

\section{主要仪器设备与技术指标}
\begin{table}[H]
  \centering
  \caption{实验主要仪器规格参数表}
  \label{tab:instruments}
  \begin{tabular}{cccc}
    \toprule
    仪器名称 & 型号规格 & 测量范围 & 仪器极限误差 $\varDelta_{\mathrm{inst}}$ \\
    \midrule
    钢卷尺 & 2m 标准卷尺 & $0 \sim \qty{200}{\centi\meter}$ & \qty{\pm 0.5}{\milli\meter} \\
    游标卡尺 & 50 分度 & $0 \sim \qty{150}{\milli\meter}$ & \qty{\pm 0.02}{\milli\meter} \\
    数字毫秒计 & DS-3 型 & $0 \sim \qty{999.999}{\second}$ & \qty{\pm 0.001}{\second} \\
    \bottomrule
  \end{tabular}
\end{table}

\section{实验原理与推导}
考虑不可伸长的轻细线悬挂一均质金属小球，摆线长为 $L$，摆球直径为 $d$，有效摆长为：
\begin{equation}
  l = L + \frac{d}{2}.
  \label{eq:length}
\end{equation}

在忽略空气阻力且摆角 $\theta \le \ang{5}$ 的小角近似下，切向恢复力正比于角位移：
\begin{equation}
  m l \ddot{\theta} = - m g \sin\theta \approx - m g \theta.
\end{equation}

解此微分方程可得简谐摆动固有周期为：
\begin{equation}
  T = 2\pi \sqrt{\frac{l}{g}}.
  \label{eq:period}
\end{equation}

由式~\eqref{eq:period} 解出重力加速度表达式：
\begin{equation}
  g = 4\pi^2 \frac{l}{T^2}.
  \label{eq:g-formula}
\end{equation}

\section{实验原始测量数据}
固定悬线长度，改变摆长共进行 4 组测量，每组测量 50 次全振动累计时间 $t_{50}$ 并计算单次周期 $T = t_{50} / 50$：

\begin{table}[H]
  \centering
  \caption{单摆实验测量数据记录表}
  \label{tab:data}
  \begin{tabular}{ccccc}
    \toprule
    组号 & 悬线长 $L$ / \unit{\centi\meter} & 摆球直径 $d$ / \unit{\milli\meter} & 50 次振动时间 $t_{50}$ / \unit{\second} & 周期 $T$ / \unit{\second} \\
    \midrule
    1 & 70.02 & 20.04 & 84.62 & 1.6924 \\
    2 & 80.05 & 20.04 & 90.41 & 1.8082 \\
    3 & 90.01 & 20.04 & 95.83 & 1.9166 \\
    4 & 100.04 & 20.04 & 100.95 & 2.0190 \\
    \bottomrule
  \end{tabular}
\end{table}

\section{数据处理与不确定度评定}

\subsection{重力加速度计算}
取第 4 组典型数据代入式~\eqref{eq:g-formula}：
有效摆长 $l = \qty{100.04}{\centi\meter} + \qty{1.002}{\centi\meter} = \qty{1.0104}{\meter}$，周期 $T = \qty{2.0190}{\second}$．
计算得重力加速度为：
\begin{equation}
  g = 4 \pi^2 \cdot \frac{\qty{1.0104}{\meter}}{(\qty{2.0190}{\second})^2} = \qty{9.794}{\meter\per\second\squared}.
\end{equation}

\subsection{不确定度传递公式分析}
对式~\eqref{eq:g-formula} 两边取对数后全微分，得到相对不确定度传递关系：
\begin{equation}
  \ln g = \ln(4\pi^2) + \ln l - 2\ln T \implies \frac{\mathrm{d}g}{g} = \frac{\mathrm{d}l}{l} - 2\frac{\mathrm{d}T}{T}.
\end{equation}

因摆长 $l$ 与周期 $T$ 为独立观测参量，相对合成标准不确定度为：
\begin{equation}
  \frac{u_{\mathrm{c}}(g)}{g} = \sqrt{\left( \frac{u(l)}{l} \right)^2 + 4 \left( \frac{u(T)}{T} \right)^2}.
  \label{eq:uncertainty-transfer}
\end{equation}

经仪器误差与统计评定，摆长不确定度 $u(l) = \qty{0.6}{\milli\meter}$，周期不确定度 $u(T) = \qty{0.0015}{\second}$．代入式~\eqref{eq:uncertainty-transfer}：
\begin{equation}
  \frac{u_{\mathrm{c}}(g)}{g} = \sqrt{\left( \frac{0.6\times 10^{-3}}{1.0104} \right)^2 + 4 \left( \frac{0.0015}{2.0190} \right)^2} \approx \qty{0.18}{\percent}.
\end{equation}

绝对合成不确定度为：
\begin{equation}
  u_{\mathrm{c}}(g) = \qty{9.794}{\meter\per\second\squared} \times 0.0018 = \qty{0.018}{\meter\per\second\squared}.
\end{equation}

最终测量结果表述为：
\begin{equation}
  g = \qty{9.794 \pm 0.018}{\meter\per\second\squared} \quad (k = 1).
\end{equation}

\section{误差来源分析与结论}
1. \textbf{大角度误差}：当摆角超过 \ang{5} 时，$\sin\theta \approx \theta - \frac{1}{6}\theta^3$，将使实测周期偏大，进而导致反推的重力加速度 $g$ 偏小；
2. \textbf{空气阻尼与悬点松动}：悬点非完全刚性约束会导致微小的有效摆长变化，建议使用固定夹头减少晃动．

\end{document}
```

---

## 模板二：物理学术笔记与系统推导笔记本模板

在进行量子力学、统计物理或电动力学的系统性自学与推导时，普通的排版无法凸显出物理定律、定理、推导演算和关键直觉注记的层次．本模板利用 `amsthm` 与轻量边框宏包构建了视觉层次极佳的笔记模板：

```tex
\documentclass[UTF8, a4paper, 11pt]{ctexart}
\usepackage[top=2.2cm, bottom=2.2cm, left=2.3cm, right=2.3cm]{geometry}
\usepackage{amsmath, amssymb, bm, amsthm, mathtools}
\usepackage{siunitx}
\usepackage{hyperref}

% 引入彩色警告与注记框宏包
\usepackage[most]{tcolorbox}

% 定义物理定律/定理环境
\newtcbtheorem[number within=section]{law}{物理定律}{
  colback=blue!5!white,
  colframe=blue!75!black,
  fonttitle=\bfseries,
  separator sign={: }
}{law}

% 定义推导演算框
\newtcbtheorem[number within=section]{derivation}{推导过程}{
  colback=gray!5!white,
  colframe=gray!70!black,
  fonttitle=\bfseries,
  separator sign={: }
}{der}

% 定义关键物理直觉/思考题
\newtcolorbox{intuition}[1][]{
  colback=orange!5!white,
  colframe=orange!80!black,
  fonttitle=\bfseries,
  title=物理直觉与注记: #1
}

\begin{document}

\section{量子力学算符与狄拉克符号体系}

\subsection{算符的自共轭性（Hermiticity）}

在量子力学中，凡是原则上可观测的物理量（如坐标、动量、能量），都对应着希尔伯特空间中的一个线性厄米算符（自共轭算符）．

\begin{law}{厄米算符实本征值定理}{hermitian-eigen}
  设 $\hat{A}$ 为作用在希尔伯特空间 $\mathcal{H}$ 中的线性厄米算符，即对任意态矢量 $\vert \psi \rangle, \vert \phi \rangle$，均满足：
  \begin{equation}
    \langle \psi \vert \hat{A} \vert \phi \rangle = \langle \hat{A} \psi \vert \phi \rangle = \langle \phi \vert \hat{A} \vert \psi \rangle^*.
  \end{equation}
  则算符 $\hat{A}$ 的所有本征值必为实数，且不同本征值对应的本征态彼此正交．
\end{law}

\begin{derivation}{本征值为实数的严格证明}{proof-real}
  设 $\vert \lambda \rangle$ 是 $\hat{A}$ 的本征态，对应本征值为 $\lambda$：
  \begin{equation}
    \hat{A} \vert \lambda \rangle = \lambda \vert \lambda \rangle.
  \end{equation}
  两边左乘左矢 $\langle \lambda \vert$：
  \begin{equation}
    \langle \lambda \vert \hat{A} \vert \lambda \rangle = \lambda \langle \lambda \vert \lambda \rangle. \label{eq:step1}
  \end{equation}
  对式~\eqref{eq:step1} 取复共轭，并利用厄米算符的定义：
  \begin{equation}
    \langle \lambda \vert \hat{A} \vert \lambda \rangle^* = \langle \lambda \vert \hat{A}^\dagger \vert \lambda \rangle = \langle \lambda \vert \hat{A} \vert \lambda \rangle = \lambda^* \langle \lambda \vert \lambda \rangle.
  \end{equation}
  因此有：
  \begin{equation}
    (\lambda - \lambda^*) \langle \lambda \vert \lambda \rangle = 0.
  \end{equation}
  因为本征态 $\vert \lambda \rangle \neq 0$，其自内积 $\langle \lambda \vert \lambda \rangle > 0$，故必有：
  \begin{equation}
    \lambda = \lambda^* \implies \lambda \in \mathbb{R}.
  \end{equation}
  证毕．
\end{derivation}

\begin{intuition}[为什么经典物理量对应厄米算符？]
  物理测量得到的结果必然是一个纯实数（仪器读数不可能指向虚数刻度）．厄米算符在数学上完美保障了可观测量的测量值永远落在实数轴上，这是量子力学波恩诠释自洽性的基石．
\end{intuition}

\end{document}
```

---

## 模板三：国际主流物理期刊（REVTeX 4-2）官方模板解析

**REVTeX** 是美国物理学会（APS）专门为其旗下的 Physical Review 系列期刊（PRL、PRA、PRB、PRC、PRD、PRE、PRX 等）以及美国物理联合会（AIP）期刊定制的高性能官方宏包．它内置了出版级的双栏排版引擎与自动跨栏机制．

### 1. 核心编译与文档类声明

```tex
\documentclass[
  aps,               % 美国物理学会 APS 格式
  prl,               % Physical Review Letters 样式
  reprint,           % reprint 生成双栏出版级高仿真排版 (投稿评审通常用 preprint 单栏双倍行距)
  superscriptaddress,% 多作者多单位使用上标角标自动关联
  amsmath,amssymb,   % 内置加载数学宏包
  showpacs           % 显示物理与天文分类代码 (PACS)
]{revtex4-2}

\usepackage{graphicx}
\usepackage{bm}
\usepackage{hyperref}

\begin{document}

\title{Observation of Topological Phase Transitions in Non-Hermitian Quantum Systems}

\author{San Zhang}
\email{zhangsan@physics.edu}
\affiliation{Department of Physics, Tsinghua University, Beijing 100084, China}
\affiliation{State Key Laboratory of Low-Dimensional Quantum Physics, Beijing 100084, China}

\author{Si Li}
\affiliation{Institute for Advanced Study, Tsinghua University, Beijing 100084, China}

\date{\today}

\begin{abstract}
  We report the experimental observation of exceptional points and non-Hermitian topological invariants in an engineered photonic lattice. By introducing controlled on-site gain and loss, we map the complex eigenspectrum and observe the non-Hermitian skin effect. Our results demonstrate the existence of edge states protected by dynamic winding numbers, paving the way for robust quantum state manipulation.
\end{abstract}

\maketitle

\section{Introduction}
Topological phases of matter have revolutionized our understanding of condensed matter physics~\cite{einstein1905}. Recently, the extension of topological band theory to non-Hermitian Hamiltonians has unveiled extraordinary phenomena without Hermitian counterparts.

\section{Model and Derivation}
The effective non-Hermitian Hamiltonian describing the subwavelength lattice is:
\begin{equation}
  \hat{H} = \sum_{j} \left( J_{\mathrm{L}} \hat{c}_j^\dagger \hat{c}_{j+1} + J_{\mathrm{R}} \hat{c}_{j+1}^\dagger \hat{c}_j \right) + \mathrm{i}\gamma \sum_j (-1)^j \hat{c}_j^\dagger \hat{c}_j,
\end{equation}
where $J_{\mathrm{L}}$ and $J_{\mathrm{R}}$ denote asymmetric hopping amplitudes, and $\gamma$ represents the balanced gain/loss coefficient.

% 当双栏排版遇到极宽公式时, 使用 widetext 环境实现无缝单栏横跨
\begin{widetext}
\begin{equation}
  \det\left[ \hat{H}(k) - E \cdot \mathbb{I} \right] = E^2 - \left( J_{\mathrm{L}}^2 + J_{\mathrm{R}}^2 + 2 J_{\mathrm{L}} J_{\mathrm{R}} \cos k \right) + \gamma^2 - 2\mathrm{i}\gamma (J_{\mathrm{L}} - J_{\mathrm{R}}) \sin k = 0.
\end{equation}
\end{widetext}

\section{Conclusion}
In summary, we have synthesized a dynamic non-Hermitian topological lattice. The observed topological transitions provide insight into open quantum systems.

\begin{acknowledgments}
  This work was supported by the National Natural Science Foundation of China.
\end{acknowledgments}

% REVTeX 推荐使用预置的 apsrev4-2 样式
\bibliography{references}

\end{document}
```

???+ note "REVTeX 双栏排版实用绝技：`widetext`"
    在双栏排版的物理论文中，最令人头疼的是某一条理论推导公式特别长，如果挤在单栏里会严重溢出或换行很难看．REVTeX 提供了专属的 `\begin{widetext} ... \end{widetext}` 环境：它能自动打断左右双栏，将长公式横跨整个页面单栏居中展示，随后又优雅恢复左右双栏排版，是撰写专业物理论文的神器．
