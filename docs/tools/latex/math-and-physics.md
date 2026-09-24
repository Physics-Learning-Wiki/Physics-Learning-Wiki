---
author: Physics Learning Wiki Team
---

## 物理公式与专业宏包进阶

物理学是一门由严密数学推导与实验数据交织构成的学科．在 LaTeX 中撰写物理文档，远不止「把公式敲出来」这么简单，更关乎符号的正斜体规范、量纲单位的标准表达、推导过程的对齐美感以及宏包的稳健选型．

本页面将深入讲解物理推导中必不可少的公式环境、国际通用的物理量规范、现代 `siunitx` 单位宏包以及物理专业宏包的最佳实践．

## 基础公式环境与物理推导对齐

LaTeX 的数学排版核心主要由 `amsmath` 与 `mathtools` 宏包提供．在文档导言区请务必载入：

```tex
\usepackage{amsmath, mathtools, amssymb}
```

### 1. 行内公式与行间独立公式

-   **行内公式**：嵌入在段落文字中，使用单个美元符号 `$ ... $`．例如：光子能量为 $E = \hbar \omega$．
-   **无编号独立公式**：独占一行并居中，使用 `\[ ... \]`（不要使用过时的 `$$ ... $$`）．
-   **自动编号公式**：使用 `equation` 环境，便于后续在正文中交叉引用：

```tex
\begin{equation}
  E^{2}= (p c)^{2}+ (m_{0}c^{2})^{2}. \label{eq:relativistic-energy}
\end{equation}
```

若某条公式无需编号，可使用 `equation*` 环境．

### 2. 多步推导对齐：`align` 环境

物理推导最常见的情形是从一个原始物理定律出发，经过多步代数变换得到最终结论．此时必须使用 `align` 环境，通过 `&` 标记对齐基准（通常放在等号 `=`、约等号 `\approx` 或箭头前），使用 `\\` 换行：

```tex
\begin{align}
  \nabla \cdot \bm{D}  & = \rho_{\mathrm{f}}, \label{eq:maxwell-1}                                       \\
  \nabla \cdot \bm{B}  & = 0, \label{eq:maxwell-2}                                                       \\
  \nabla \times \bm{E} & = - \frac{\partial \bm{B}}{\partial t}, \label{eq:maxwell-3}                    \\
  \nabla \times \bm{H} & = \bm{J}_{\mathrm{f}}+ \frac{\partial \bm{D}}{\partial t}. \label{eq:maxwell-4}
\end{align}
```

???+ tip "关于推导过程的部分编号"
    如果你只希望在推导的最终结果那一行出现编号，中间步骤不编号，可以在中间行的末尾加上 `\nonumber`，或者直接在不需要编号时整体使用 `align*`．

### 3. 长公式断行折排：`multline` 与 `split`

物理推导中经常出现跨越整行宽度的超长表达式，直接排版会导致公式溢出页面右边界．

-   **`multline` 环境**：适合无对齐关系的单条超长公式．第一行靠左对齐，最后一行靠右对齐，中间行居中：

```tex
\begin{multline}
  \langle x' | \mathrm{e}^{-\frac{\mathrm{i}}{\hbar}\hat{H}t}| x \rangle = \sqrt{\frac{m}{2\pi
  \mathrm{i} \hbar t}}\exp\left[ \frac{\mathrm{i}m}{2\hbar t}(x' - x)^{2}\right]
  \\
  \times \left\{ 1 - \frac{\mathrm{i}t}{2\hbar}\left[ V(x') + V(x) \right] + \mathcal{O}
  (t^{2}) \right\}.
\end{multline}
```

-   **`split` 环境**：嵌套在 `equation` 内部，在保持单一公式编号的同时，利用 `&` 在长公式换行处实现精确对齐：

```tex
\begin{equation}
  \begin{split}
    \frac{\mathrm{d}\sigma}{\mathrm{d}\Omega}&= \left( \frac{e^{2}}{4\pi \varepsilon_{0}\cdot
    4 E_{\mathrm{k}}}\right)^{2}\frac{1}{\sin^{4}(\theta / 2)}\\
    &= \left( \frac{z Z e^{2}}{4 E_{\mathrm{k}}}\right)^{2}\csc^{4}\left( \frac{\theta}{2}
    \right).
  \end{split}
\end{equation}
```

### 4. 分段函数与边界条件：`cases` 与 `dcases`

在表达势阱、分段折射率或边界条件时，可以使用 `cases` 环境．如果表达式内包含复杂分式，推荐使用 `mathtools` 提供的 `dcases`（它会保持分子分母为正常行间尺寸，避免被压扁）：

```tex
V(x) =
\begin{dcases}
  0,     & 0 \le x \le a \quad \text{（阱内自由粒子）},        \\
  V_{0}, & x < 0 \text{ 或 }x > a \quad \text{（有限深势垒）}.
\end{dcases}
```

### 5. 矩阵、行列式与量子算符状态

```tex
% 常用矩阵环境
\begin{pmatrix}
  a & b \\
  c & d
\end{pmatrix}
\qquad % 圆括号 (矩阵常用)
\begin{bmatrix}
  a & b \\
  c & d
\end{bmatrix}
\qquad % 方括号
\begin{vmatrix}
  a & b \\
  c & d
\end{vmatrix} % 行列式 (Determinant)
```

例如泡利自旋矩阵 $\sigma_y$ 的标准排版：

```tex
\sigma_y =
\begin{pmatrix}
  0          & -\mathrm{i} \\
  \mathrm{i} & 0
\end{pmatrix}.
```

## 物理量与符号排版规范

国际纯粹与应用物理学联合会（IUPAP）以及国家标准对科学文献中的正斜体使用有极严格的规定．很多物理初学者容易忽视这些细节：

### 1. 变量斜体，常量与算子正体

| 类别          | 规范法则              | 正确写法示例                                          | 错误写法（严禁）                 |
| :---------- | :---------------- | :---------------------------------------------- | :----------------------- |
| **物理量变量**   | 必须使用 **斜体**       | 质量 $m$、时间 $t$、能量 $E$、速度 $v$                     | $\mathrm{m}, \mathrm{t}$ |
| **微积分微分符号** | 必须使用 **正体**       | $\mathrm{d}x, \mathrm{d}t, \mathrm{d}^3 r$      | $dx, dt$（$d$ 变成斜体变量）     |
| **偏微分符号**   | 使用专用符号 `\partial` | $\frac{\partial \psi}{\partial t}$              | $d \psi / dt$            |
| **自然常数与底**  | 必须使用 **正体**       | 自然底 $\mathrm{e}^{x}$、虚数单位 $\mathrm{i}$          | $e^x, i$（误写为斜体变量）        |
| **物理常数变量**  | 遵循物理约定斜体          | 普朗克常数 $\hbar, h$、光速 $c$、玻尔兹曼常数 $k_{\mathrm{B}}$ | $\mathrm{c}, \mathrm{h}$ |

???+ example "微积分算子标准写法示例"
    ```tex
    % 正确: 正体 d 且积分号与被积微元间保留薄空格 \,
    \int_0^\infty f(x) \, \mathrm{d}x
    
    % 导数表达
    \frac{\mathrm{d}y}{\mathrm{d}x} = \frac{\mathrm{d}^{2}s}{\mathrm{d}t^{2}}
    ```

### 2. 下标的正斜体辨析（极高频错误）

物理公式中的下标是否使用正体，取决于该下标的 **物理属性**：

-   **下标代表变量或指标（Index）时，用斜体**：例如分量 $v_x, v_y, v_i$；多粒子求和 $\sum_k E_k$．
-   **下标代表特定属性、对象名称或英文缩写时，用正体**：
    -   动能 $E_{\mathrm{k}}$（kinetic 缩写）
    -   电势能 $E_{\mathrm{p}}$（potential 缩写）
    -   最大值 $v_{\mathrm{max}}$（maximum 缩写）
    -   电子质量 $m_{\mathrm{e}}$（electron 缩写）
    -   室温 $T_{\mathrm{room}}$（文字说明）

```tex
% 正确示例
E_{\mathrm{total}} = E_{\mathrm{k}} + E_{\mathrm{p}} = \frac{1}{2} m v_x^2 + m g
h
```

### 3. 矢量与张量符号（`bm` 宏包优于 `\mathbf` 与 `\vec`）

在早期排版中，物理学常使用箭头 `\vec{v}` 或粗体 `\mathbf{v}`．但在现代学术论文中：

-   `\vec{v}` 在包含上下标或长符号时显得十分凌乱；
-   `\mathbf{...}` 只能处理英文字符，**对希腊字母完全失效**（例如输入 `\mathbf{\omega}` 不会变粗，仍然是细斜体）；
-   最佳解决方案是载入 `\usepackage{bm}`，使用 **`\bm{...}`** 命令：它能完美将英文、希腊字母、乃至算符加粗并保持优雅的数学倾斜：

```tex
% 力学与电磁学矢量
\bm{F} = m \bm{a} \bm{B} = \nabla \times \bm{A} \bm{L} = \bm{r} \times \bm{p}

% 希腊字母角速度与电极化率矢量
\bm{v} = \bm{\omega} \times \bm{r} \bm{P} = \varepsilon_0 \chi_{\mathrm{e}} \bm{E}
```

### 4. 量子力学狄拉克符号与算符

在量子物理中，推荐统一态矢量、算符与内积的记号：

```tex
% 算符顶部加帽标
\hat{H} \vert \psi_n \rangle = E_n \vert \psi_n \rangle

% 动量算符定义
\hat{p} = - \mathrm{i} \hbar \nabla

% 产生湮灭算符与厄米共轭
[\hat{a}, \hat{a}^\dagger] = 1

% 矩阵元与内积
\langle \phi \vert \hat{A} \vert \psi \rangle = \int \phi^*(\bm{r}) \hat{A} \psi(\bm{r})
\, \mathrm{d}^3 r
```

## 单位与数值排版神器：`siunitx` 宏包

在物理实验与工程计算中，绝不能手动敲击空格输入单位（例如 `$9.8 m/s^2$` 是严重不规范的）．`siunitx` 是 LaTeX 官方最权威的物理量与单位排版宏包（当前为 v3 版本）．

在导言区引入：

```tex
\usepackage{siunitx}
\sisetup{ separate-uncertainty = true, % 误差显示为 +/- 形式
inter-unit-product = \cdot % 单位相乘时使用居中点相连
}
```

### 1. 核心命令矩阵

| 命令               | 功能用途    | 代码示例                                    | 渲染效果说明                                       |
| :--------------- | :------ | :-------------------------------------- | :------------------------------------------- |
| `\num{...}`      | 格式化纯数值  | `\num{1.602176634e-19}`                 | 自动排版为科学计数法 $1.602\,176\,634 \times 10^{-19}$ |
| `\unit{...}`     | 独立物理单位  | `\unit{\kilo\meter\per\second}`         | 自动输出标准正体、正确负指数与间距 $\mathrm{km\cdot s^{-1}}$  |
| `\qty{...}{...}` | 数值 + 单位 | `\qty{9.80}{\meter\per\second\squared}` | 数值与单位之间保留符合国家标准的标准细空格                        |
| `\ang{...}`      | 角度与度分秒  | `\ang{45;30;15}`                        | 输出 $45^\circ 30' 15''$                       |

### 2. 测量不确定度与误差表示

在大学物理实验中，实验数据必须附带不确定度：

```tex
% 简记法 (括号内数字为末位不确定度)
\qty{1.234(5)}{\meter}
% 渲染效果为: 1.234(5) m

% 显式 +/- 形式 (配合 separate-uncertainty = true)
\qty{10.5(3)}{\volt}
% 渲染效果为: (10.5 ± 0.3) V

% 相对不确定度 / 范围
\qtyrange{10}{20}{\degreeCelsius}
% 渲染效果为: 10 °C to 20 °C
```

### 3. 常用物理单位宏定义对照速查

```tex
% 基础力学与热学单位
\unit{\kilogram} % kg
\unit{\newton} % N
\unit{\joule} % J
\unit{\pascal} % Pa
\unit{\kelvin} % K
\unit{\watt} % W

% 电磁学单位
\unit{\coulomb} % C
\unit{\volt} % V
\unit{\ampere} % A
\unit{\ohm} % Ω (欧姆自动匹配大写欧米伽)
\unit{\tesla} % T
\unit{\henry} % H
\unit{\farad} % F

% 词头 (Prefix)
\milli % m (毫 10^-3)
\micro % µ (微 10^-6, 自动使用正体微米符号)
\nano % n (纳 10^-9)
\pico % p (皮 10^-12)
\kilo % k (千 10^3)
\mega % M (兆 10^6)
\giga % G (吉 10^9)
```

## 物理宏包选型深度辨析：`physics` 宏包能用吗？

在各大网络论坛或旧教程中，你可能会频繁看到推荐使用 `\usepackage{physics}`．它提供了形如 `\dd{x}`、`\dv{y}{x}`、`\bra{\psi}` 等看似非常方便的缩写．

???+ warning "CTAN 与 LaTeX 官方对 `physics` 宏包的警示"
    虽然 `physics` 宏包上手极其爽快，但 **现代严谨学术排版通常不推荐直接引入它**，原因如下：
    
    1.  **宏包年久失修**：该宏包自 2012 年以后就已停止维护更新．
    2.  **暴力篡改底层命令**：它在内部暴力重写了许多基础数学内核命令（如 `\div`,`\sin` 等），可能与其他现代数学宏包（如 `mathtools`、`siunitx`）产生诡异的间距 bug 或冲突．
    3.  **自动定界符过度伸展**：其默认的括号大小自适应算法经常把普通括号撑得过大，破坏行内排版的美感．

### 现代稳健替代方案

如果你喜欢简洁的物理导数与狄拉克符号，有两种推荐的稳健现代方案：

#### 方案一：使用现代重写的 `physics2` 宏包

由国内学者维护并收录于 TeX Live 的 `physics2` 宏包，采用模块化设计，无任何侵入性，仅在需要时开启对应模块：

```tex
\usepackage{physics2}
\usephysicsmodule{ab, doubleprod, braket}
```

#### 方案二：自行在导言区定义极简宏（最受期刊青睐）

在导言区添加以下 5 行简洁定义，既清晰透明，又绝不会与任何期刊模板冲突：

```tex
% 1. 正体微分算子
\newcommand{\diff}{\mathrm{d}}

% 2. 导数与偏导数
\newcommand{\deriv}[2]{\frac{\mathrm{d}#1}{\mathrm{d}#2}}
\newcommand{\pderiv}[2]{\frac{\partial #1}{\partial #2}}

% 3. 量子力学狄拉克符号
\newcommand{\bra}[1]{\langle #1 \vert}
\newcommand{\ket}[1]{\vert #1 \rangle}
\newcommand{\braket}[2]{\langle #1 \vert #2 \rangle}
\newcommand{\expval}[1]{\langle #1 \rangle}
```

使用时直接输入 `\deriv{y}{x}` 或 `\ket{\psi}`，输出结果规范优雅，且源文件高度可控．

## 高级专业绘图宏包指引

在处理复杂的物理图示时，除了外部生成图片外，LaTeX 内部还支持强大的代码绘图工具：

-   **费曼图排版**：使用 `tikz-feynman` 宏包，可通过声明式的粒子线段与顶点直接在 LaTeX 内编译出出版级的微扰理论费曼图．
-   **电路与模拟电路**：使用 `circuitikz` 宏包，能直接用代码绘制包含电阻、电容、电感、运放及逻辑门的标准电路图．
-   关于外部绘图工具生成矢量图并嵌入文档的详细规范，请参阅本专栏后续页面：[图表、文献与长文档管理](./figures-tables-bib.md) 以及站内的 [绘图工具](../plotting.md)．
