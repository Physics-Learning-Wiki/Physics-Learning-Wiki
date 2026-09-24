---
status: stable
author: Physics Learning Wiki Team
description: 探讨厄米微分方程、罗德里格斯公式、高斯加权正交性、生成函数以及在一维量子简谐振子定态波函数与零点能中的核心物理意义．
---

## 厄米多项式与量子谐振子

## 物理问题引入：弹簧微振动的微观量子化

在经典力学中，谐振子系统（如弹簧振子、分子双原子微振动）可以拥有任意连续的能量 $E = \frac{1}{2}kA^2 \ge 0$，静止在原点时能量为零．
然而，在量子微观世界中，定态薛定谔方程为：

$$
-\dfrac{\hbar^2}{2m}\dfrac{\mathrm{d}^2\psi}{\mathrm{d}x^2} + \dfrac{1}{2}m\omega^2 x^2 \psi = E\psi
$$

这个方程有几个极端苛刻的物理要求：

1.  **波函数全空间归一化**：粒子必须存在于某处，因此当 $x \to \pm\infty$ 时，波函数模平方必须以极快速度衰减到零，保证 $\int_{-\infty}^\infty |\psi(x)|^2\mathrm{d}x = 1$；
2.  **渐近行为分析**：当 $x \to \pm\infty$ 时，方程退化为 $\psi'' \approx \frac{m^2\omega^2}{\hbar^2}x^2\psi$，渐近解为高斯型指数衰减 $\psi(x) \propto \exp\left(-\frac{m\omega}{2\hbar}x^2\right)$．

为了在保留高斯渐近衰减的同时求解中间区域的振荡波动，物理学家设 $\psi(\xi) = H(\xi) e^{-\xi^2/2}$（引入无量纲坐标 $\xi = \sqrt{\frac{m\omega}{\hbar}}x$）．代入后，未知多项式 $H(\xi)$ 满足的方程就是著名的 **厄米方程 (Hermite Equation)**．

***

## 1. 厄米微分方程与多项式解

无量纲化的厄米方程形式为：

$$
\dfrac{\mathrm{d}^2 y}{\mathrm{d}\xi^2} - 2\xi \dfrac{\mathrm{d}y}{\mathrm{d}\xi} + 2n y = 0
$$

若使用幂级数法求解，递推关系显示：若级数不截断，远处的渐近行为将如同 $e^{\xi^2}$ 爆发增长，瞬间摧毁高斯因子的衰减，使总波函数在无穷远爆炸发散！**物理边界有限性再次强制要求**：参数 $2n$ 中的 $n$ 必须是非负整数：

$$
n = 0, 1, 2, 3, \dots
$$

此时级数在第 $n$ 项截断，所得的有限项多项式就是 **厄米多项式 $H_n(\xi)$**．

### 1.1 罗德里格斯公式 (Rodrigues' Formula)

厄米多项式由优雅的微分算式定义：

$$
H_n(\xi) = (-1)^n e^{\xi^2} \dfrac{\mathrm{d}^n}{\mathrm{d}\xi^n}\left( e^{-\xi^2} \right)
$$

前几项具体显式为：

-   $H_0(\xi) = 1$（基态，高斯分布）
-   $H_1(\xi) = 2\xi$（第一激发态，中心具有单个波节零点）
-   $H_2(\xi) = 4\xi^2 - 2$
-   $H_3(\xi) = 8\xi^3 - 12\xi$
-   $H_4(\xi) = 16\xi^4 - 48\xi^2 + 12$

奇偶性：$H_n(-\xi) = (-1)^n H_n(\xi)$，阶数 $n$ 恰好等于多项式实根（波函数节点）的个数！

***

## 2. 正交归一性与生成函数

### 2.1 高斯带权正交性

厄米多项式在全实轴 $(-\infty, \infty)$ 上以高斯因子 $w(\xi) = e^{-\xi^2}$ 为权函数构成 Sturm–Liouville 正交系：

$$
\int_{-\infty}^\infty H_n(\xi) H_m(\xi) e^{-\xi^2} \mathrm{d}\xi = \sqrt{\pi} \, 2^n n! \, \delta_{nm}
$$

### 2.2 生成函数 (Generating Function)

$$
\exp\left( 2\xi t - t^2 \right) = \sum_{n=0}^\infty H_n(\xi) \dfrac{t^n}{n!}
$$

利用生成函数对参数 $t$ 求导，可以迅速导出厄米多项式的 **三项递推关系**：

$$
H_{n+1}(\xi) = 2\xi H_n(\xi) - 2n H_{n-1}(\xi)
$$

$$
H_n'(\xi) = 2n H_{n-1}(\xi)
$$

***

## 3. 物理皇冠：量子谐振子能级与零点能

将无量纲参数还原回薛定谔方程物理量：

$$
2n = \dfrac{2E}{\hbar\omega} - 1 \implies \dfrac{2E}{\hbar\omega} = 2n + 1
$$

由此直接解出量子谐振子的分立能级公式：

$$
E_n = \left( n + \dfrac{1}{2} \right) \hbar\omega \quad (n = 0, 1, 2, \dots)
$$

归一化定态波函数为：

$$
\psi_n(x) = \left( \dfrac{m\omega}{\pi\hbar} \right)^{1/4} \dfrac{1}{\sqrt{2^n n!}} H_n\left(\sqrt{\dfrac{m\omega}{\hbar}}x\right) \exp\left( -\dfrac{m\omega}{2\hbar}x^2 \right)
$$

???+ tip "零点能 (Zero-Point Energy) 的必然性"
    即使在绝对零度、系统处于最低能量基态（$n=0$），能量也不是零，而是保留了有限的 **零点能 $E_0 = \dfrac{1}{2}\hbar\omega$**！
    这再次反映了海森堡不确定性原理：若粒子在势阱底部完全静止（$x=0, p=0$），将违反 $\Delta x \Delta p \ge \hbar/2$．基态波函数的高斯展宽正是这种内在量子涨落的直接体现．

***

## 4. 学习衔接

-   **下一节**：研究氢原子库仑束缚态与轨道量子化，进入 [连带拉盖尔多项式](./laguerre.md)；
-   **代数进阶**：在量子力学中，厄米多项式与 **产生算符 $a^\dagger$/湮灭算符 $a$** 的代数 Fock 空间严格等价．
