---
status: review
author: Physics Learning Wiki Team
description: 掌握留数的求法公式、留数定理、利用上半平面围道积分与约当引理计算物理实反常积分，以及在因果响应与格林函数极点规约中的应用．
---

## 留数定理与实积分计算

## 物理问题引入：如何用复数「绕道」解决算不出来的实积分？

在理论物理中，从量子散射截面、介电常数色散关系到傅里叶逆变换，读者经常会遇到形如下式的实数反常积分：

$$
I = \int_{-\infty}^{\infty} \dfrac{\cos(k x)}{x^2 + a^2} \mathrm{d}x
$$

若使用初等微积分，无法找到初等原函数进行牛顿 - 莱布尼茨公式计算．
然而，复分析提供了一种「降维打击」式的策略：

1.  将实数轴上的被积函数延拓到复平面 $z = x + iy$；
2.  将实轴积分补上一条无穷大复数半圆弧，构成闭合积分围道；
3.  利用 **留数定理**，只需找出被积函数在上半平面的 **孤立极点**，求出对应的代数系数（留数），即可直接得出该无穷积分的精确解析解！

***

## 1. 留数的定义与快速计算法则

### 1.1 留数定义

设 $z_0$ 为 $f(z)$ 的孤立奇点，$f(z)$ 在 $z_0$ 去心邻域内的洛朗级数展开中，负一次方项 $(z-z_0)^{-1}$ 的系数 $a_{-1}$ 称为 $f(z)$ 在 $z_0$ 处的 **留数 (Residue)**，记为 $\text{Res}[f, z_0]$．

### 1.2 极点留数的常用计算法则

#### 法则 1：一阶单极点

若 $z_0$ 为单极点，则：

$$
\text{Res}[f, z_0] = \lim_{z \to z_0} (z - z_0) f(z)
$$

特别地，若 $f(z) = \dfrac{P(z)}{Q(z)}$，其中 $P(z_0) \neq 0$ 且 $Q(z_0) = 0, Q'(z_0) \neq 0$，则：

$$
\text{Res}[f, z_0] = \dfrac{P(z_0)}{Q'(z_0)}
$$

#### 法则 2：$m$ 阶高阶极点

若 $z_0$ 为 $m$ 阶极点，则：

$$
\text{Res}[f, z_0] = \dfrac{1}{(m-1)!} \lim_{z \to z_0} \dfrac{\mathrm{d}^{m-1}}{\mathrm{d}z^{m-1}} \left[(z - z_0)^m f(z)\right]
$$

***

## 2. 留数定理 (Residue Theorem)

### 定理陈述

设闭合曲线 $C$ 为正向（逆时针）简单闭曲线，$f(z)$ 在 $C$ 上解析，在 $C$ 内部除有限个孤立奇点 $z_1, z_2, \dots, z_n$ 外处处解析，则：

$$
\oint_C f(z) \mathrm{d}z = 2\pi i \sum_{k=1}^n \text{Res}[f, z_k]
$$

留数定理将繁琐的曲线积分直接简化为奇点处的 **局部代数极限运算**．

***

## 3. 典型物理实积分计算范式

### 例题：求解狄拉克滤波与色散积分

$$
I = \int_{-\infty}^{\infty} \dfrac{\cos(k x)}{x^2 + a^2} \mathrm{d}x \quad (k > 0, a > 0)
$$

#### 步骤 1：复化与围道构造

因为 $\cos(kx) = \text{Re}[e^{ikx}]$，考虑辅助复变积分：

$$
\oint_C f(z)\mathrm{d}z = \oint_C \dfrac{e^{ikz}}{z^2 + a^2}\mathrm{d}z
$$

选取围道 $C$ 由实轴区间 $[-R, R]$ 和上半平面半圆弧 $C_R: z = R e^{i\theta}$($\theta \in [0, \pi]$) 组成：

$$
\oint_C = \int_{-R}^R \dfrac{e^{ikx}}{x^2 + a^2}\mathrm{d}x + \int_{C_R} \dfrac{e^{ikz}}{z^2 + a^2}\mathrm{d}z
$$

#### 步骤 2：奇点判别与留数求解

被积函数分母 $z^2 + a^2 = (z + ia)(z - ia) = 0$，奇点为 $z = \pm ia$．
当 $R > a$ 时，只有极点 $z = ia$ 位于上半平面闭合围道内部．该点为单极点：

$$
\text{Res}[f, ia] = \lim_{z \to ia} (z - ia)\dfrac{e^{ikz}}{(z - ia)(z + ia)} = \dfrac{e^{ik(ia)}}{ia + ia} = \dfrac{e^{-ka}}{2ia}
$$

由留数定理：

$$
\oint_C f(z)\mathrm{d}z = 2\pi i \cdot \text{Res}[f, ia] = 2\pi i \cdot \dfrac{e^{-ka}}{2ia} = \dfrac{\pi}{a} e^{-ka}
$$

#### 步骤 3：大圆弧积分估计（约当引理）

当 $z \in C_R$ 时，$z = x + iy$($y \ge 0$)，因为 $k > 0$，所以 $|e^{ikz}| = |e^{ikx} e^{-ky}| = e^{-ky} \le 1$．
由约当引理 (Jordan's Lemma)，当 $R \to \infty$ 时：

$$
\lim_{R \to \infty} \int_{C_R} \dfrac{e^{ikz}}{z^2 + a^2}\mathrm{d}z = 0
$$

#### 步骤 4：提取结果

令 $R \to \infty$：

$$
\int_{-\infty}^{\infty} \dfrac{e^{ikx}}{x^2 + a^2}\mathrm{d}x = \dfrac{\pi}{a} e^{-ka}
$$

取其实部，最终得到物理结果：

$$
\int_{-\infty}^{\infty} \dfrac{\cos(kx)}{x^2 + a^2}\mathrm{d}x = \dfrac{\pi}{a} e^{-ka}
$$

???+ tip "物理意义：高频振荡的指数衰减"
    结果随频率 $k$ 按指数 $e^{-ka}$ 衰减．这解释了为什么波长远小于介质微观特征尺度（$1/k \ll a$）的高频电磁波会在吸收介质中迅速衰减．

***

## 4. 理论物理中的深度连接：因果律与极点规约

在理论物理与量子场论中，物理量必须满足 **因果律**（响应不能发生在刺激之前）．

-   **推迟势与 Feynman 处方**：在求解波动方程格林函数或粒子传播子时，奇点恰好落在实数轴上．为了保持因果律，物理学家将极点人为平移微小虚量 $z \to x \pm i\epsilon$，利用留数定理选择上半平面或下半平面的闭合围道；
-   **Kramers–Kronig 色散关系**：复介电常数 $\epsilon(\omega) = \epsilon_1(\omega) + i\epsilon_2(\omega)$ 在上半复平面解析，利用柯西公式与留数定理可直接证明其实部（色散折射率）与虚部（介质吸收率）互为希尔伯特变换．

***

## 5. 学习衔接

-   **上一节**：洛朗级数展开与极点分类，参见 [级数展开与奇点](./series-expansion.md)；
-   **课程路线**：复分析部分已完备，可进入数理方法下一大阶段——[傅里叶级数与傅里叶变换](../transforms/fourier-transform.md)．
