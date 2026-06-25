---
author: Physics Learning Wiki
---

## 一维随机变量及其分布

在上一节中，我们用集合和事件来描述随机现象。但在物理学中，我们关心的往往是具体的数值——分子的速率是多少？测量误差有多大？为了用微积分等数学工具来分析这些问题，我们需要将随机事件"映射"为实数。这就是随机变量的概念。

## 学习目标

读完本页后，你应该能够：

- 理解随机变量的概念，区分离散随机变量和连续随机变量
- 掌握分布函数和概率密度函数的定义与性质
- 熟悉均匀分布、指数分布和正态分布（高斯分布）
- 计算高斯积分，理解其在物理推导中的重要性

## 随机变量

???+ warning "随机变量"
    **随机变量**（Random Variable）是一个函数 $X: \Omega \to \mathbb{R}$，它将样本空间中的每个结果映射到一个实数。

    - **离散随机变量**：只能取有限个或可数个值。例如掷骰子的点数 $X \in \{1,2,3,4,5,6\}$。
    - **连续随机变量**：可以取某个区间内的任意值。例如分子的速率 $X \in [0, +\infty)$。

引入随机变量后，概率问题就转化为对实数（或实数区间）的概率计算，从而可以使用微积分工具。

## 分布函数

???+ warning "分布函数"
    随机变量 $X$ 的**分布函数**（Cumulative Distribution Function, CDF）定义为：

    $$
    F(x) = P(X \leq x)
    $$

    即 $X$ 取值不超过 $x$ 的概率。

分布函数具有以下基本性质：

1. **单调不减**：若 $x_1 < x_2$，则 $F(x_1) \leq F(x_2)$
2. **右连续**：$\lim_{\varepsilon \to 0^+} F(x + \varepsilon) = F(x)$
3. **边界值**：$F(-\infty) = 0$，$F(+\infty) = 1$

用分布函数计算概率：

$$
P(a < X \leq b) = F(b) - F(a)
$$

## 概率密度函数

对于连续随机变量，分布函数 $F(x)$ 通常是连续可导的。我们定义其导数为**概率密度函数**（Probability Density Function, PDF）：

???+ warning "概率密度函数"
    $$
    f(x) = \dfrac{\mathrm{d}F(x)}{\mathrm{d}x} = F'(x)
    $$

    反过来，分布函数是概率密度函数的积分：

    $$
    F(x) = \int_{-\infty}^{x} f(t)\,\mathrm{d}t
    $$

概率密度函数的两条基本性质：

1. **非负性**：$f(x) \geq 0$（因为 $F(x)$ 单调不减）
2. **归一化**：

$$
\int_{-\infty}^{+\infty} f(x)\,\mathrm{d}x = F(+\infty) - F(-\infty) = 1
$$

用概率密度函数计算概率：

$$
P(a \leq X \leq b) = \int_a^b f(x)\,\mathrm{d}x
$$

???+ warning "概率密度不是概率"
    $f(x)$ 本身**不是概率**——它可以大于 1。$f(x)$ 表示的是概率在 $x$ 轴上的分布**密度**。概率是密度在某个区间上的积分（即曲线下面积）。类比：线密度 $\rho(x)$ 不是质量，$\int \rho(x)\,\mathrm{d}x$ 才是质量。

## 常见一维分布

### 均匀分布

在区间 $[a, b]$ 内，取任何值的概率密度都相等。

$$
f(x) = \begin{cases} \dfrac{1}{b-a}, & a \leq x \leq b \\ 0, & \text{其他} \end{cases}
$$

记作 $X \sim U(a, b)$。均匀分布是最简单的连续分布，常用于描述"无偏好"的随机取值。

### 指数分布

描述独立随机事件发生的时间间隔的概率。若事件以恒定速率 $\lambda$ 发生，则等待时间 $T$ 服从指数分布：

$$
f(t) = \begin{cases} \lambda e^{-\lambda t}, & t \geq 0 \\ 0, & t < 0 \end{cases}
$$

指数分布有一个重要性质——**无记忆性**：已知等待了时间 $s$ 后，还需再等待时间 $t$ 的条件概率与 $s$ 无关：

$$
P(T > s + t\,|\,T > s) = P(T > t)
$$

在物理学中，放射性衰变的等待时间服从指数分布。

### 正态分布（高斯分布）

正态分布是自然界和科学研究中最重要的连续分布。

???+ warning "正态分布（高斯分布）"
    若连续随机变量 $X$ 的概率密度函数为：

    $$
    f(x) = \dfrac{1}{\sigma\sqrt{2\pi}}\,\exp\!\left(-\dfrac{(x-\mu)^2}{2\sigma^2}\right)
    $$

    则称 $X$ 服从参数为 $\mu$（均值）和 $\sigma^2$（方差）的**正态分布**（Normal Distribution），记作 $X \sim N(\mu, \sigma^2)$。

正态分布的特征：

- 曲线关于 $x = \mu$ 对称，呈钟形
- 在 $x = \mu \pm \sigma$ 处有拐点
- $\mu$ 决定分布的中心位置，$\sigma$ 决定分布的宽度
- 当 $\mu = 0$，$\sigma = 1$ 时，称为**标准正态分布** $N(0, 1)$

正态分布之所以在物理学中极为重要，是因为**中心极限定理**：大量独立随机变量之和（或均值）近似服从正态分布，无论每个变量本身服从什么分布。

## 高斯积分

在推导麦克斯韦速率分布律等物理问题中，我们需要反复计算以下形式的积分，统称为**高斯积分**：

???+ warning "高斯积分公式"
    设 $\alpha > 0$，定义：

    $$
    I_n(\alpha) = \int_0^{+\infty} x^n\,e^{-\alpha x^2}\,\mathrm{d}x
    $$

    常用结果：

    $$
    I_0(\alpha) = \int_0^{+\infty} e^{-\alpha x^2}\,\mathrm{d}x = \dfrac{1}{2}\sqrt{\dfrac{\pi}{\alpha}}
    $$

    $$
    I_2(\alpha) = \int_0^{+\infty} x^2\,e^{-\alpha x^2}\,\mathrm{d}x = \dfrac{1}{4}\sqrt{\dfrac{\pi}{\alpha^3}}
    $$

    $$
    I_4(\alpha) = \int_0^{+\infty} x^4\,e^{-\alpha x^2}\,\mathrm{d}x = \dfrac{3}{8}\sqrt{\dfrac{\pi}{\alpha^5}}
    $$

    一般地，对于偶数 $n = 2k$：

    $$
    I_{2k}(\alpha) = \dfrac{(2k-1)!!}{2^{k+1}}\sqrt{\dfrac{\pi}{\alpha^{2k+1}}}
    $$

    对于奇数 $n = 2k+1$：

    $$
    I_{2k+1}(\alpha) = \dfrac{k!}{2\alpha^{k+1}}
    $$

    其中 $(2k-1)!! = 1 \cdot 3 \cdot 5 \cdots (2k-1)$ 为双阶乘。

### $I_0$ 的推导

$I_0$ 是最基本的高斯积分，其推导利用了一个巧妙的技巧——将一维积分转化为二维极坐标积分：

$$
I_0^2 = \left(\int_{-\infty}^{+\infty} e^{-\alpha x^2}\,\mathrm{d}x\right)\!\left(\int_{-\infty}^{+\infty} e^{-\alpha y^2}\,\mathrm{d}y\right) = \int_{-\infty}^{+\infty}\!\!\int_{-\infty}^{+\infty} e^{-\alpha(x^2+y^2)}\,\mathrm{d}x\,\mathrm{d}y
$$

转化为极坐标 $(r, \theta)$：

$$
I_0^2 = \int_0^{2\pi}\!\mathrm{d}\theta\int_0^{+\infty} e^{-\alpha r^2}\,r\,\mathrm{d}r = 2\pi \cdot \dfrac{1}{2\alpha} = \dfrac{\pi}{\alpha}
$$

因此：

$$
I_0 = \int_{-\infty}^{+\infty} e^{-\alpha x^2}\,\mathrm{d}x = \sqrt{\dfrac{\pi}{\alpha}}
$$

### 递推关系

其他高斯积分可以通过对 $\alpha$ 求导得到：

$$
I_n(\alpha) = -\dfrac{\mathrm{d}}{\mathrm{d}\alpha}\,I_{n-2}(\alpha)
$$

这使得所有高斯积分都可以从 $I_0$ 出发递推得到。

??? note "例题：验证正态分布的归一化"
    **题目**：验证 $f(x) = \dfrac{1}{\sigma\sqrt{2\pi}}\,\exp\!\left(-\dfrac{(x-\mu)^2}{2\sigma^2}\right)$ 满足归一化条件 $\int_{-\infty}^{+\infty} f(x)\,\mathrm{d}x = 1$。

    **解答**：令 $t = \dfrac{x - \mu}{\sigma\sqrt{2}}$，则 $\mathrm{d}x = \sigma\sqrt{2}\,\mathrm{d}t$，代入得：

    $$
    \int_{-\infty}^{+\infty} f(x)\,\mathrm{d}x = \dfrac{1}{\sigma\sqrt{2\pi}} \int_{-\infty}^{+\infty} e^{-t^2}\,\sigma\sqrt{2}\,\mathrm{d}t = \dfrac{\sqrt{2}}{\sqrt{2\pi}} \int_{-\infty}^{+\infty} e^{-t^2}\,\mathrm{d}t = \dfrac{1}{\sqrt{\pi}} \cdot \sqrt{\pi} = 1
    $$

    归一化条件得到验证。这里用到了高斯积分 $\int_{-\infty}^{+\infty} e^{-t^2}\,\mathrm{d}t = \sqrt{\pi}$（即 $I_0(1)$ 的全实数轴形式）。

???+ tip "高斯积分在物理学中的重要性"
    高斯积分是统计物理和量子力学中最常用的数学工具之一。在麦克斯韦速率分布律的推导中，我们需要计算形如 $\int_0^{+\infty} v^n e^{-mv^2/2kT}\,\mathrm{d}v$ 的积分，这正是高斯积分 $I_n(m/2kT)$。熟练掌握高斯积分的公式和递推方法，是理解统计物理推导的关键。

## 常见分布的参数汇总

| 分布 | 记号 | PDF | 定义域 |
|:---:|:---:|:---|:---:|
| 均匀分布 | $U(a,b)$ | $\dfrac{1}{b-a}$ | $[a,b]$ |
| 指数分布 | $\text{Exp}(\lambda)$ | $\lambda e^{-\lambda x}$ | $[0,+\infty)$ |
| 正态分布 | $N(\mu,\sigma^2)$ | $\dfrac{1}{\sigma\sqrt{2\pi}}e^{-(x-\mu)^2/2\sigma^2}$ | $(-\infty,+\infty)$ |

各分布的期望和方差将在 [随机变量的数字特征](./characteristic-values-of-random-variables.md) 页面中汇总。

## 学习衔接

- 上一节：[概率论的基本概念](./basic-concepts.md)
- 下一节：[随机变量的数字特征](./characteristic-values-of-random-variables.md)
- 物理应用：[麦克斯韦速率分布律](../../thermodynamics/chapter-2/maxwell-velocity-distribution.md) 中的速率分布函数就是一种概率密度函数，其分量分布是高斯分布
