---
status: review
author: Physics Learning Wiki Team
description: 探讨泛函极值、变分概念、欧拉-拉格朗日微分方程推导、约束泛函变分以及在分析力学最小作用量原理与几何光学中的核心应用．
---

## 变分法基础与欧拉 - 拉格朗日方程

## 物理问题引入：大自然为什么要追求「极值」？

在经典牛顿力学中，我们习惯于「因果推论」：因为质点在此时此地受力 $\boldsymbol{F}$，所以它产生了即时加速度 $\boldsymbol{a} = \boldsymbol{F}/m$．
然而，17 世纪以来，物理学家们发现了一个更令人震撼的自然图景——**极值原理 (Variational Principles)**：

-   **费马原理**：光在两点之间传播时，总是选择所需 **时间最短** 的光程路径；
-   **最速降线问题**：在重力场中从 $A$ 点滑到非下方的 $B$ 点，最省时的轨道不是直线，而是旋轮线（摆线）；
-   **哈密顿最小作用量原理**：一个物理系统从初态到终态演化时，在所有可能发生的虚拟路径中，大自然唯独挑选使 **作用量泛函 $S$ 取平稳极值** 的那一条真实路径！

为了在「所有可能的函数（路径）」中寻找使某个指标达到极大或极小的最优函数，数学家开创了 **变分法 (Calculus of Variations)**．

***

## 1. 泛函与变分概念

### 1.1 泛函 (Functional)

-   **普通函数**：输入一个实数 $x$，输出一个实数 $f(x)$；
-   **泛函**：输入一个 **整条函数曲线**  $y(x)$，输出一个实数值 $J[y]$．

在物理中最常见的泛函是由积分给出的：

$$
J[y] = \int_{x_1}^{x_2} L\left(x, y(x), y'(x)\right) \mathrm{d}x
$$

其中被积函数 $L$ 称为 **拉格朗日被积式**，$y'(x) = \dfrac{\mathrm{d}y}{\mathrm{d}x}$，固定两端点边界条件 $y(x_1) = y_1, y(x_2) = y_2$．

### 1.2 泛函的变分 $\delta y$

设真实极值路径为 $y(x)$，考虑其邻近的任意微扰测试路径：

$$
Y(x) = y(x) + \epsilon \eta(x)
$$

其中 $\epsilon$ 为微小实参数，$\eta(x)$ 为任意光滑变分方向函数，且在固定端点处扰动为零：$\eta(x_1) = \eta(x_2) = 0$．
定义路径的 **变分** 为固定自变量 $x$ 时的虚位移变化：

$$
\delta y = Y(x) - y(x) = \epsilon \eta(x)
$$

***

## 2. 欧拉 - 拉格朗日方程的经典推导

泛函 $J$ 沿微扰路径取值为参数 $\epsilon$ 的函数：

$$
J(\epsilon) = \int_{x_1}^{x_2} L(x, y + \epsilon\eta, y' + \epsilon\eta') \mathrm{d}x
$$

泛函取平稳极值的必要条件是：对任意变分方向 $\eta(x)$，一阶导数均严格为零：$\left.\dfrac{\mathrm{d}J}{\mathrm{d}\epsilon}\right|_{\epsilon=0} = 0$．
在积分号下求导并利用链式法则：

$$
\left.\dfrac{\mathrm{d}J}{\mathrm{d}\epsilon}\right|_{\epsilon=0} = \int_{x_1}^{x_2} \left[ \dfrac{\partial L}{\partial y} \eta(x) + \dfrac{\partial L}{\partial y'} \eta'(x) \right] \mathrm{d}x = 0
$$

对第二项进行 **分部积分**：

$$
\int_{x_1}^{x_2} \dfrac{\partial L}{\partial y'} \eta'(x) \mathrm{d}x = \left. \dfrac{\partial L}{\partial y'} \eta(x) \right|_{x_1}^{x_2} - \int_{x_1}^{x_2} \dfrac{\mathrm{d}}{\mathrm{d}x}\left( \dfrac{\partial L}{\partial y'} \right) \eta(x) \mathrm{d}x
$$

利用两端固定条件 $\eta(x_1) = \eta(x_2) = 0$，边界项自动消失！合并得：

$$
\int_{x_1}^{x_2} \left[ \dfrac{\partial L}{\partial y} - \dfrac{\mathrm{d}}{\mathrm{d}x}\left( \dfrac{\partial L}{\partial y'} \right) \right] \eta(x) \mathrm{d}x = 0
$$

根据变分引理，由于测试函数 $\eta(x)$ 具有任意性，中括号内的表达式必须处处为零！
由此推导出变分法的核心方程——**欧拉 - 拉格朗日方程 (Euler-Lagrange Equation)**：

$$
\dfrac{\partial L}{\partial y} - \dfrac{\mathrm{d}}{\mathrm{d}x}\left( \dfrac{\partial L}{\partial y'} \right) = 0
$$

***

## 3. 多变量推广与高阶体系

若物理系统包含 $N$ 个独立的广义坐标 $q_1(t), \dots, q_N(t)$，泛函为时间作用量：

$$
S[q_1, \dots, q_N] = \int_{t_1}^{t_2} L(q_k, \dot{q}_k, t) \mathrm{d}t
$$

独立变分 $\delta q_k(t)$ 直接给出 $N$ 个联立的二阶微分方程组：

$$
\dfrac{\partial L}{\partial q_k} - \dfrac{\mathrm{d}}{\mathrm{d}t}\left( \dfrac{\partial L}{\partial \dot{q}_k} \right) = 0 \quad (k = 1, 2, \dots, N)
$$

这就是理论力学中著名的 **第二类拉格朗日方程**！

***

## 4. 物理皇冠应用：哈密顿原理与诺特定理

### 4.1 哈密顿原理 (Hamilton's Principle)

在力学中，定义拉格朗日量为动能减势能：$L = T - V$．
哈密顿原理指出：**力学系统在真实运动中所走的路径，必使作用量泛函 $\delta S = 0$**．

-   整个牛顿力学定律被浓缩为一个单一行标量积分的平稳条件；
-   选取任意广义坐标（笛卡尔、极坐标、球坐标、广义连杆角度），拉格朗日方程的形式保持严格协变，完全不需要分析繁重的内向约束反力！

### 4.2 诺特定理 (Noether's Theorem)

艾米·诺特 (Emmy Noether) 证明了变分原理最深刻的现代推论：**作用量在某种连续变换下的每一种对称性，都严格对应着物理系统的一个守恒量！**

-   时间平移不变性 $\implies$ 机械能守恒；
-   空间平移不变性 $\implies$ 动量守恒；
-   空间各向同性（旋转不变性）$\implies$ 角动量守恒．

***

## 5. 学习衔接

-   **理论力学主干**：在 [理论力学：拉格朗日力学](../../mechanics/analytical/lagrangian.md) 中掌握广义坐标动力学实战；
-   **微分方程接口**：由欧拉 - 拉格朗日方程导出的常微分方程求解，参见 [二阶常微分方程](../differential-equations/second-order-ode.md)．
