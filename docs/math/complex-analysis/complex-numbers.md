---
status: stable
author: Physics Learning Wiki Team
description: 探讨复数的代数结构、复平面几何表示、欧拉公式以及在交流电路相量法、波动振幅与量子力学波函数中的物理应用．
---

## 复数与几何表示

## 物理问题引入：为什么实数物理世界需要虚数 $i$？

在日常直觉中，速度、温度、质量、电荷等所有实际可测量的物理量都是实数．既然如此，物理学家为什么在经典波动、电磁学、量子力学中无处不在地使用虚数单位 $i = \sqrt{-1}$？

两个决定性的原因回答了这个问题：

1.  **将简谐振动的双变量问题简化为单变量代数**：一个做简谐振动的质点同时具有振幅 $A$ 和相位 $\phi$．在实数三角函数中，处理两个振动的叠加需要调用繁琐的和差化积公式；而在复平面上，旋转与振动自然表现为指数函数 $e^{i\omega t}$ 的乘除运算；
2.  **量子力学的内在要求**：在微观世界中，波函数 $\psi(x,t)$ 的本质就是复数场，薛定谔方程显式包含 $i\hbar \frac{\partial\psi}{\partial t}$，使得概率幅的干涉能够用模长平方 $|\psi|^2 = \psi^* \psi$ 唯象描述．

***

## 1. 复数定义与代数运算

一个复数 $z$ 由实部 $x$ 和虚部 $y$ 构成：

$$
z = x + iy \quad (x, y \in \mathbb{R})
$$

其中 $x = \text{Re}(z)$ 称为 **实部**，$y = \text{Im}(z)$ 称为 **虚部**．

### 基本四则运算

设 $z_1 = x_1 + i y_1$，$z_2 = x_2 + i y_2$：

-   **加减法**：$(x_1 \pm x_2) + i(y_1 \pm y_2)$；
-   **乘法**：$(x_1 x_2 - y_1 y_2) + i(x_1 y_2 + x_2 y_1)$；
-   **除法**（分子分母同乘分母共轭）：

$$
\dfrac{z_1}{z_2} = \dfrac{(x_1 + i y_1)(x_2 - i y_2)}{x_2^2 + y_2^2} = \dfrac{x_1 x_2 + y_1 y_2}{x_2^2 + y_2^2} + i\dfrac{x_2 y_1 - x_1 y_2}{x_2^2 + y_2^2}
$$

***

## 2. 复平面与欧拉公式

复数 $z = x+iy$ 与平面二维笛卡尔坐标点 $(x, y)$ 存在一一映射，该平面称为 **复平面（Complex Plane，又称阿根图）**．

### 极坐标与模长 - 辐角

引入极坐标 $(r, \theta)$，其中：

-   模长（绝对值）：$r = |z| = \sqrt{x^2 + y^2} \ge 0$
-   辐角：$\theta = \arg(z) = \arctan\left(\dfrac{y}{x}\right)$

根据三角投影：$x = r\cos\theta, y = r\sin\theta$．

### 欧拉公式与指数形式

数学中最著名的 **欧拉公式 (Euler's Formula)** 给出了复指数与三角函数的统一：

$$
e^{i\theta} = \cos\theta + i\sin\theta
$$

因此，任意复数都可以简洁地表示为：

$$
z = r e^{i\theta}
$$

???+ tip "欧拉公式的几何图像：单位圆上的匀速旋转"
    乘以因子 $e^{i\phi}$ 相当于在复平面上将向量逆时针旋转 $\phi$ 弧度，而模长保持不变．这正是为什么旋转参考系、交流相量和简谐振动如此偏爱复指数形式的原因．

***

## 3. 共轭复数与模长

复数 $z = x + iy$ 的 **共轭复数 (Complex Conjugate)** 记作 $z^*$ 或 $\bar{z}$，几何上关于实轴对称：

$$
z^* = x - iy = r e^{-i\theta}
$$

核心性质：

-   $z + z^* = 2\text{Re}(z) = 2x$
-   $z - z^* = 2i\text{Im}(z) = 2iy$
-   $z z^* = x^2 + y^2 = |z|^2$（模的平方，必定是非负实数）

***

## 4. 物理应用范式

### 4.1 交流电路与阻抗相量

在交流电路中，交变电压 $V(t) = V_0 \cos(\omega t)$ 可视为复电压 $\tilde{V}(t) = V_0 e^{i\omega t}$ 的实部．
由于电感和电容的电压 - 电流关系满足微分/积分：

-   电感：$v_L = L \dfrac{\mathrm{d}i}{\mathrm{d}t} \implies \tilde{V}_L = i\omega L \tilde{I} \implies Z_L = i\omega L$；
-   电容：$i_C = C \dfrac{\mathrm{d}v_C}{\mathrm{d}t} \implies \tilde{V}_C = \dfrac{1}{i\omega C} \tilde{I} \implies Z_C = \dfrac{1}{i\omega C} = -i\dfrac{1}{\omega C}$．

微分方程因此被转化为代数除法 $I = V / Z_{\text{total}}$，计算完毕后取其实部即可恢复实际物理电流．

### 4.2 平面单色电磁波复数振幅

在电动力学与光学中，三维平面波表示为：

$$
\boldsymbol{E}(\boldsymbol{r}, t) = \text{Re}\left[\boldsymbol{E}_0 e^{i(\boldsymbol{k}\cdot\boldsymbol{r} - \omega t)}\right]
$$

空间导数 $\nabla$ 直接等价于乘以 $i\boldsymbol{k}$，时间导数 $\frac{\partial}{\partial t}$ 等价于乘以 $-i\omega$，将偏微分麦克斯韦方程组转化为代数矢量代数．

### 4.3 量子力学概率密度

在量子力学中，体系处于态 $|\psi\rangle$ 时的空间概率密度不是线性的，而是双线性的：

$$
\rho(\boldsymbol{r}, t) = |\psi(\boldsymbol{r}, t)|^2 = \psi^*(\boldsymbol{r}, t) \psi(\boldsymbol{r}, t)
$$

全局相位的改变 $\psi \to \psi e^{i\alpha}$ 不改变任何可观测量，这种相位的规范对称性正是电磁规范场论的物理源头．

***

## 5. 学习衔接

-   **下一节**：学习复变函数的可导性与微积分特征，进入 [解析函数与柯西 - 黎曼条件](./analytic-functions.md)；
-   **应用出口**：在 [电磁学：交流电路](../../electromagnetism/ac-circuit.md) 中掌握复阻抗的实战计算．
