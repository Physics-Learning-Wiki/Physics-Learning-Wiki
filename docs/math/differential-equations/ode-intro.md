---
status: review
author: Physics Learning Wiki Team
description: 探讨常微分方程的物理起源、一阶方程分类、分离变量法、一阶线性微分方程积分因子与常数变易法，以及在带阻力落体与衰变中的物理应用．
---

## 常微分方程基础与一阶方程

## 物理问题引入：自然定律为什么总是写成微分方程？

在物理学中，绝大多数基本物理定律（牛顿定律、麦克斯韦方程、热力学传导、薛定谔方程）并不是直接给出物理量本身（如位置 $x$ 或电荷 $q$），而是给出物理量的 **变化率**：

-   牛顿第二定律指出：加速度（位置随时间的二阶导数 $\frac{\mathrm{d}^2 x}{\mathrm{d}t^2}$）正比于合外力；
-   放射性原子核衰变指出：单位时间衰变的原子数（数量的一阶导数 $\frac{\mathrm{d}N}{\mathrm{d}t}$）正比于当前存在的原子核总数；
-   欧姆与法拉第定律指出：感应电动势正比于磁通量的变化率．

将物理量及其各阶导数联系起来的方程，就是 **微分方程 (Differential Equations)**．当未知函数仅依赖于 **单一自变量**（如仅依赖时间 $t$ 或空间单坐标 $x$）时，称为 **常微分方程 (ODE)**．

***

## 1. 常微分方程的基本概念与分类

### 1.1 阶数与线性

一般 $n$ 阶常微分方程形式为：

$$
F\left(x, y, y', y'', \dots, y^{(n)}\right) = 0
$$

-   **阶数 (Order)**：方程中出现的最高阶导数次数 $n$；
-   **线性 (Linear)**：未知函数 $y$ 及其所有导数 $y', y'', \dots$ 均以一次幂出现，且彼此没有交叉相乘项．线性方程的一般形式为：

    $$
    a_n(x) y^{(n)} + \dots + a_1(x) y' + a_0(x) y = f(x)
    $$

    若非齐次项 $f(x) = 0$，称为 **齐次方程**；反之称为 **非齐次方程**．

### 1.2 通解与特解

-   **通解**：包含与方程阶数相同数目的独立任意常数（$C_1, \dots, C_n$）的解族；
-   **特解**：通过实验给定的 **初始条件**（如 $t=0$ 时的位置与速度）唯一确定常数后的解．

***

## 2. 常见一阶常微分方程的求解范式

一阶方程的标准形式为 $\dfrac{\mathrm{d}y}{\mathrm{d}x} = f(x, y)$．

### 2.1 分离变量法 (Separation of Variables)

若方程右端可分解为 $x$ 与 $y$ 函数的乘积：

$$
\dfrac{\mathrm{d}y}{\mathrm{d}x} = g(x) h(y) \implies \dfrac{\mathrm{d}y}{h(y)} = g(x) \mathrm{d}x
$$

两边直接积分即得通解：$\int \dfrac{\mathrm{d}y}{h(y)} = \int g(x)\mathrm{d}x + C$．

### 2.2 一阶线性微分方程与积分因子法

标准一阶线性方程形式为：

$$
\dfrac{\mathrm{d}y}{\mathrm{d}x} + P(x)y = Q(x)
$$

引入积分因子 $\mu(x) = \exp\left(\int P(x)\mathrm{d}x\right)$，方程左边可重写为全导数：

$$
\dfrac{\mathrm{d}}{\mathrm{d}x}\left[ y e^{\int P(x)\mathrm{d}x} \right] = Q(x) e^{\int P(x)\mathrm{d}x}
$$

两边积分直接得到通解公式（常数变易法结果）：

$$
y(x) = \exp\left(-\int P(x)\mathrm{d}x\right) \left[ \int Q(x) \exp\left(\int P(x)\mathrm{d}x\right) \mathrm{d}x + C \right]
$$

***

## 3. 物理建模例题：带黏性阻力的雨滴下落与收尾速度

**物理问题**：质量为 $m$ 的雨滴在重力场中自静止下落，空气阻力与瞬时速度成正比：$f_{\text{drag}} = -b v$．求雨滴速度随时间演化的规律及收尾速度．

### 建模与求解

选取向下为正方向，根据牛顿第二定律：

$$
m \dfrac{\mathrm{d}v}{\mathrm{d}t} = mg - bv \implies \dfrac{\mathrm{d}v}{\mathrm{d}t} + \dfrac{b}{m}v = g
$$

这是一阶线性常系数微分方程，满足 $P(t) = \frac{b}{m}, Q(t) = g$．
分离变量或利用通解公式：

$$
\dfrac{\mathrm{d}v}{g - \dfrac{b}{m}v} = \mathrm{d}t \implies -\dfrac{m}{b} \ln\left|g - \dfrac{b}{m}v\right| = t + C_0
$$

取指数并利用初值条件 $v(0) = 0$：

$$
v(t) = \dfrac{mg}{b}\left( 1 - \exp\left(-\dfrac{b}{m}t\right) \right)
$$

### 结果物理分析

-   **特征弛豫时间**：$\tau = \dfrac{m}{b}$，系统在该时间内完成主要加速；
-   **收尾速度 (Terminal Velocity)**：当 $t \gg \tau$ 时，指数衰减项趋近于零，重力与空气阻力达成动力学平衡，速度趋向稳定极限：

    $$
    v_{\text{terminal}} = \lim_{t \to \infty} v(t) = \dfrac{mg}{b}
    $$

***

## 4. 学习衔接

-   **下一节**：研究力学谐振子、阻尼受迫振动与共振，进入 [二阶常系数线性微分方程](./second-order-ode.md)；
-   **更优求解工具**：对于带有初始条件的初值问题，亦可直接使用 [拉普拉斯变换](../transforms/laplace-transform.md) 快速求解．
