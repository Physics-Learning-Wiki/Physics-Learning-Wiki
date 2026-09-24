---
status: stable
author: Physics Learning Wiki Team
description: 讨论二阶常系数线性常微分方程、特征方程法、朗斯基行列式、简谐振子、阻尼振动的三种状态（过阻尼、临界阻尼、欠阻尼）以及受迫共振现象．
---

## 二阶常系数线性微分方程

## 物理问题引入：为什么物理学到处都是二阶微分方程？

在经典力学中，牛顿第二定律 $\boldsymbol{F} = m \dfrac{\mathrm{d}^2\boldsymbol{r}}{\mathrm{d}t^2}$ 是一个关于时间的 **二阶常微分方程**．
在胡克定律回复力 $F = -kx$ 下，它直接导出简谐振动：

$$
m \dfrac{\mathrm{d}^2 x}{\mathrm{d}t^2} + k x = 0 \iff \ddot{x} + \omega_0^2 x = 0
$$

若考虑介质黏滞阻力 $-b\dot{x}$ 和周期性驱动外力 $F_0 \cos(\omega t)$，方程变为：

$$
\ddot{x} + 2\gamma \dot{x} + \omega_0^2 x = \dfrac{F_0}{m}\cos(\omega t)
$$

从机械振动、声学乐器、交流 RLC 电路到桥梁共振，大自然中最关键的动力学模型都可以归结为此类方程．

***

## 1. 齐次线性方程与解的结构理论

标准二阶线性微分方程形式为：

$$
y'' + P(x) y' + Q(x) y = f(x)
$$

### 1.1 叠加原理

若 $y_1(x)$ 和 $y_2(x)$ 是齐次方程（$f(x)=0$）的两个线性无关的解，则其任意线性组合：

$$
y_h(x) = C_1 y_1(x) + C_2 y_2(x)
$$

都是齐次方程的通解．

### 1.2 朗斯基行列式 (Wronskian)

两解 $y_1, y_2$ 线性无关的充要条件是它们的朗斯基行列式不为零：

$$
W(y_1, y_2)(x) = \begin{vmatrix} y_1 & y_2 \\ y_1' & y_2' \end{vmatrix} = y_1 y_2' - y_1' y_2 \neq 0
$$

***

## 2. 二阶常系数齐次微分方程与特征方程法

考虑常系数齐次方程：

$$
y'' + 2\gamma y' + \omega_0^2 y = 0
$$

尝试设指数型解 $y = e^{r t}$，代入得代数 **特征方程**：

$$
r^2 + 2\gamma r + \omega_0^2 = 0 \implies r_{1,2} = -\gamma \pm \sqrt{\gamma^2 - \omega_0^2}
$$

根的性质完全由判别式 $\Delta = \gamma^2 - \omega_0^2$ 决定，精准对应阻尼振动的三种物理形态：

### 2.1 欠阻尼 (Underdamping,$\gamma < \omega_0$)

特征根为一对共轭虚根：$r_{1,2} = -\gamma \pm i \omega_d$，其中准振动角频率 $\omega_d = \sqrt{\omega_0^2 - \gamma^2}$．
利用欧拉公式，通解为 **按指数包络衰减的简谐振荡**：

$$
x(t) = A e^{-\gamma t} \cos(\omega_d t + \phi)
$$

### 2.2 过阻尼 (Overdamping,$\gamma > \omega_0$)

特征根为两个互不相等的负实根：$r_{1,2} = -\gamma \pm \beta$($\beta = \sqrt{\gamma^2 - \omega_0^2} < \gamma$)．
通解为双指数衰减：

$$
x(t) = C_1 e^{-(\gamma - \beta)t} + C_2 e^{-(\gamma + \beta)t}
$$

阻尼过大，质点无法往复振荡，直接缓慢单调滑回平衡位置．

### 2.3 临界阻尼 (Critical Damping,$\gamma = \omega_0$)

特征根为二重实根：$r_1 = r_2 = -\gamma$．
利用常数变易法可得通解包含线性时间乘子：

$$
x(t) = (C_1 + C_2 t) e^{-\gamma t}
$$

???+ tip "临界阻尼的物理工程意义"
    临界阻尼是 **在系统不发生反复振荡的前提下，返回平衡位置最快** 的阻尼状态！因此，车辆减震器、灵敏电流计指针、高精阻尼门弓均严格调谐在临界阻尼附近设计．

***

## 3. 非齐次受迫振动与共振现象

当引入周期性外力时：

$$
\ddot{x} + 2\gamma \dot{x} + \omega_0^2 x = \dfrac{F_0}{m}\cos(\omega t)
$$

非齐次通解由「齐次通解（瞬态项）+ 特解（稳态响应）」构成：$x(t) = x_{\text{transient}}(t) + x_{\text{steady}}(t)$．
随着时间流逝，由于衰减因子 $e^{-\gamma t}$，瞬态项衰减消失，系统完全被外力驱动频率锁频：

$$
x_{\text{steady}}(t) = A(\omega) \cos(\omega t - \delta)
$$

利用复指数法设 $\tilde{x}(t) = \tilde{A} e^{i\omega t}$，代入即可直接求得 **幅频响应曲线**：

$$
A(\omega) = \dfrac{F_0/m}{\sqrt{(\omega_0^2 - \omega^2)^2 + 4\gamma^2\omega^2}}
$$

### 位移共振 (Amplitude Resonance)

令根号内函数取极小值，求导可得发生位移振幅最大的 **共振角频率**：

$$
\omega_r = \sqrt{\omega_0^2 - 2\gamma^2}
$$

当阻尼极小（$\gamma \ll \omega_0$）时，$\omega_r \approx \omega_0$；外力频率与固有频率共振时，振幅急剧放大到峰值 $A_{\max} \approx \dfrac{F_0}{2m\gamma\omega_0}$．

***

## 4. 学习衔接

-   **下一节**：当方程系数不再是常数时，引入级数展开求解特殊函数方程，进入 [常微分方程幂级数解法](./series-solution.md)；
-   **物理应用**：在 [经典力学：线性振动](../../mechanics/oscillation-wave/linear-oscillation.md) 中结合相图分析深入理解阻尼振子．
