---
status: stable
author: Physics Learning Wiki Team
description: 讨论复变函数的解析性、柯西-黎曼条件、调和函数及其在二维静电场复势与流体力学保角映射中的物理意义。
---

## 解析函数与柯西-黎曼条件

## 物理问题引入：为什么复可微会自动导出拉普拉斯方程？

在实数多元微积分中，一个二元函数 $f(x, y)$ 在某点偏导数存在，甚至方向导数存在，都不足以保证该函数处处性质良好．
然而，在复变函数中，只要我们要求一个函数 $f(z) = u(x,y) + iv(x,y)$ 是**复可微**的，一个近乎奇迹的数学事实就会发生：
- 它的实部 $u(x,y)$ 和虚部 $v(x,y)$ **自动满足二维拉普拉斯方程**：$\nabla^2 u = 0$ 且 $\nabla^2 v = 0$！
- 曲线族 $u(x,y) = C_1$ 与 $v(x,y) = C_2$ 在复平面上**处处正交**！

这正是二维静电场（等势线与电力线正交且满足 $\nabla^2 \phi = 0$）以及二维无旋理想流体（等势线与流线正交）的完美数学模型．

---

## 1. 复变函数与复导数定义

设区域 $D \subset \mathbb{C}$，若对每个 $z = x + iy \in D$，均有唯一确定的 $w = u + iv$ 与之对应，则称 $w = f(z)$ 为复变函数．

### 复导数的严苛性
复变函数在点 $z_0$ 处的导数定义为极限：

$$
f'(z_0) = \lim_{\Delta z \to 0} \dfrac{f(z_0 + \Delta z) - f(z_0)}{\Delta z}
$$

???+ warning "注意：极限方向的任意性"
    在实数轴上一元极限只有从左侧和从右侧两个方向（$\Delta x \to 0^{\pm}$）．而在复平面上，$\Delta z = \Delta x + i\Delta y$ 可以沿着**复平面内的任意曲线方向**逼近原点！
    要求上述极限存在且与趋近路径无关，是一个极度苛刻的数学约束．

若 $f(z)$ 在点 $z_0$ 及其某个邻域内处处可导，则称 $f(z)$ 在 $z_0$ 处 **解析 (Analytic)** 或 **全纯 (Holomorphic)**．

---

## 2. 柯西-黎曼条件 (Cauchy-Riemann Conditions)

### 推导过程
考察 $\Delta z$ 沿两个正交方向逼近：
1. **沿实轴方向逼近**（令 $\Delta y = 0, \Delta z = \Delta x$）：

   $$
   f'(z) = \lim_{\Delta x \to 0} \dfrac{[u(x+\Delta x, y) - u(x,y)] + i[v(x+\Delta x, y) - v(x,y)]}{\Delta x} = \dfrac{\partial u}{\partial x} + i\dfrac{\partial v}{\partial x}
   $$

2. **沿虚轴方向逼近**（令 $\Delta x = 0, \Delta z = i\Delta y$）：

   $$
   f'(z) = \lim_{\Delta y \to 0} \dfrac{[u(x, y+\Delta y) - u(x,y)] + i[v(x, y+\Delta y) - v(x,y)]}{i\Delta y} = -i\dfrac{\partial u}{\partial y} + \dfrac{\partial v}{\partial y}
   $$

令两式实部与虚部分别相等，即得到著名的 **柯西-黎曼方程 (C-R 条件)**：

$$
\begin{cases}
\dfrac{\partial u}{\partial x} = \dfrac{\partial v}{\partial y} \\
\dfrac{\partial u}{\partial y} = -\dfrac{\partial v}{\partial x}
\end{cases}
$$

**定理**：$f(z) = u + iv$ 在区域内解析的充要条件是：偏导数 $\frac{\partial u}{\partial x}, \frac{\partial u}{\partial y}, \frac{\partial v}{\partial x}, \frac{\partial v}{\partial y}$ 连续，且满足柯西-黎曼方程．

---

## 3. 调和函数与共轭调和函数

对 C-R 条件分别求偏导：
- 对第一个式子求 $x$ 偏导：$\dfrac{\partial^2 u}{\partial x^2} = \dfrac{\partial^2 v}{\partial x \partial y}$
- 对第二个式子求 $y$ 偏导：$\dfrac{\partial^2 u}{\partial y^2} = -\dfrac{\partial^2 v}{\partial y \partial x}$

两式相加（利用偏导次序对换）：

$$
\dfrac{\partial^2 u}{\partial x^2} + \dfrac{\partial^2 u}{\partial y^2} = \nabla^2 u = 0
$$

同理可证：

$$
\nabla^2 v = 0
$$

满足二维拉普拉斯方程的函数称为 **调和函数 (Harmonic Function)**．若 $u$ 和 $v$ 满足 C-R 条件，则称 $v$ 是 $u$ 的 **共轭调和函数**．

---

## 4. 物理应用：复势与场线正交性

### 4.1 二维静电场复势
在无自由电荷的二维静电场中，电势 $\phi(x,y)$ 满足 $\nabla^2 \phi = 0$．
设 $\phi(x,y)$ 为某个解析函数的实部：

$$
W(z) = \phi(x, y) + i \psi(x, y)
$$

称 $W(z)$ 为 **复势 (Complex Potential)**．
- 实部曲线族 $\phi(x,y) = C_1$ 是 **等势线**；
- 虚部曲线族 $\psi(x,y) = C_2$ 是 **电力线**（场强线）；
- 梯度内积计算表明：

$$
\nabla\phi \cdot \nabla\psi = \dfrac{\partial\phi}{\partial x}\dfrac{\partial\psi}{\partial x} + \dfrac{\partial\phi}{\partial y}\dfrac{\partial\psi}{\partial y} = \left(\dfrac{\partial\psi}{\partial y}\right)\left(\dfrac{\partial\psi}{\partial x}\right) + \left(-\dfrac{\partial\psi}{\partial x}\right)\left(\dfrac{\partial\psi}{\partial y}\right) = 0
$$

等势线与电力线在任意点严格正交！

### 4.2 典型物理实例：点电荷与线电荷
解析函数 $W(z) = \ln z = \ln(r e^{i\theta}) = \ln r + i\theta$：
- 等势线 $\phi = \ln r = \text{const} \implies r = \text{const}$（以原点为中心的同心圆，对应无限长均匀带电直导线的等势面）；
- 电力线 $\psi = \theta = \text{const}$（从原点辐射出的射线，对应径向发散的电场）．
解析函数直接给出了理想线电荷场的完整解析几何结构．

---

## 5. 学习衔接

- **上一节**：复数基础与欧拉公式，参见 [复数与几何表示](./complex-numbers.md)；
- **下一节**：研究解析函数在闭合路径上的积分性质，进入 [复变积分与柯西定理](./contour-integrals.md)．
