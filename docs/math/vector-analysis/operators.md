---
title: 梯度、散度与旋度
---

## 梯度、散度与旋度

梯度、散度和旋度是矢量分析中三个重要的微分算子，它们在物理学中，尤其是在电磁学和流体力学中，有着广泛的应用。这三个算子都与一个特殊的矢量微分算符——Nabla 算子（$\nabla$）有关。

## Nabla 算子 ($\nabla$)

在三维笛卡尔坐标系中，Nabla 算子定义为：

$$
\nabla = \hat{i} \frac{\partial}{\partial x} + \hat{j} \frac{\partial}{\partial y} + \hat{k} \frac{\partial}{\partial z}
$$

它本身不是一个向量，而是一个矢量微分算符，可以作用于标量场或矢量场。

## 梯度 (Gradient)

梯度作用于一个**标量场** $f(x, y, z)$，其结果是一个**矢量场**。这个矢量场指向标量场 $f$ 增长最快的方向，其大小为该方向上的变化率。

### 定义

$$
\text{grad}(f) = \nabla f = \frac{\partial f}{\partial x}\hat{i} + \frac{\partial f}{\partial y}\hat{j} + \frac{\partial f}{\partial z}\hat{k}
$$

### 物理意义

- **方向**：$\nabla f$ 的方向是函数 $f$ 在该点增加最快的方向。
- **大小**：$|\nabla f|$ 是函数 $f$ 在该方向上的方向导数，也是其最大的方向导数。

**例题：** 在物理学中，静电势 $V$ 是一个标量场，电场 $\vec{E}$ 是一个矢量场。它们之间的关系是电场是电势的负梯度：$\vec{E} = -\nabla V$。

假设一个电势场由 $V(x, y, z) = 2x^2y - z^3$ 给出，求在点 $(1, 1, 1)$ 处的电场强度。

**解：**
首先计算电势 $V$ 的梯度：

$$
\nabla V = \frac{\partial}{\partial x}(2x^2y - z^3)\hat{i} + \frac{\partial}{\partial y}(2x^2y - z^3)\hat{j} + \frac{\partial}{\partial z}(2x^2y - z^3)\hat{k}
$$

$$
\nabla V = (4xy)\hat{i} + (2x^2)\hat{j} + (-3z^2)\hat{k}
$$

然后计算电场 $\vec{E} = -\nabla V$：

$$
\vec{E} = -4xy\hat{i} - 2x^2\hat{j} + 3z^2\hat{k}
$$

在点 $(1, 1, 1)$ 处，电场强度为：

$$
\vec{E}(1, 1, 1) = -4(1)(1)\hat{i} - 2(1)^2\hat{j} + 3(1)^2\hat{k} = -4\hat{i} - 2\hat{j} + 3\hat{k}
$$

## 散度 (Divergence)

散度作用于一个**矢量场** $\vec{F}(x, y, z) = F_x\hat{i} + F_y\hat{j} + F_z\hat{k}$，其结果是一个**标量场**。它描述了矢量场在某一点的“源”或“汇”的强度。

### 定义

散度可以看作是 $\nabla$ 算子与矢量场 $\vec{F}$ 的点积：

$$
\text{div}(\vec{F}) = \nabla \cdot \vec{F} = \frac{\partial F_x}{\partial x} + \frac{\partial F_y}{\partial y} + \frac{\partial F_z}{\partial z}
$$

### 物理意义

- **$\nabla \cdot \vec{F} > 0$**：该点是一个**源 (source)**，矢量线从该点向外发散。
- **$\nabla \cdot \vec{F} < 0$**：该点是一个**汇 (sink)**，矢量线向该点汇聚。
- **$\nabla \cdot \vec{F} = 0$**：该点无源无汇，或者源和汇的强度相等。这样的矢量场称为**无散场**或**螺线管场**。

**高斯散度定理** 将一个矢量场穿过一个闭合曲面的通量与该矢量场在曲面所围体积内的散度联系起来：

$$
\oint_S \vec{F} \cdot d\vec{A} = \int_V (\nabla \cdot \vec{F}) dV
$$

**例题：** 在电磁学中，高斯定律的微分形式为 $\nabla \cdot \vec{E} = \frac{\rho}{\epsilon_0}$，其中 $\rho$ 是电荷密度。这表明电荷是电场的“源”。

考虑一个矢量场 $\vec{F} = x\hat{i} + y\hat{j} + z\hat{k}$。计算其散度。
**解：**

$$
\nabla \cdot \vec{F} = \frac{\partial}{\partial x}(x) + \frac{\partial}{\partial y}(y) + \frac{\partial}{\partial z}(z) = 1 + 1 + 1 = 3
$$

由于散度为正，这个场在每一点都是一个源。

## 旋度 (Curl)

旋度作用于一个**矢量场** $\vec{F}$，其结果是另一个**矢量场**。它描述了矢量场在某一点的旋转或涡旋的趋势。

### 定义

旋度可以看作是 $\nabla$ 算子与矢量场 $\vec{F}$ 的叉积：

$$
\text{curl}(\vec{F}) = \nabla \times \vec{F} = 
\begin{vmatrix}
\hat{i} & \hat{j} & \hat{k} \\
\frac{\partial}{\partial x} & \frac{\partial}{\partial y} & \frac{\partial}{\partial z} \\
F_x & F_y & F_z
\end{vmatrix}
= \left(\frac{\partial F_z}{\partial y} - \frac{\partial F_y}{\partial z}\right)\hat{i} + \left(\frac{\partial F_x}{\partial z} - \frac{\partial F_z}{\partial x}\right)\hat{j} + \left(\frac{\partial F_y}{\partial x} - \frac{\partial F_x}{\partial y}\right)\hat{k}
$$

### 物理意义

- **方向**：$\nabla \times \vec{F}$ 的方向是矢量场在该点旋转最剧烈的旋转轴的方向（遵循右手定则）。
- **大小**：$|\nabla \times \vec{F}|$ 的大小描述了旋转的快慢程度。
- **$\nabla \times \vec{F} = \vec{0}$**：该矢量场是**无旋场**。一个无旋场必定可以表示为某个标量场的梯度，即 $\vec{F} = \nabla f$。这样的场也称为**保守场**。

**斯托克斯定理** 将一个矢量场沿一个闭合回路的环量与该矢量场穿过以该回路为边界的任意曲面的旋度的通量联系起来：

$$
\oint_C \vec{F} \cdot d\vec{l} = \int_S (\nabla \times \vec{F}) \cdot d\vec{A}
$$

**例题：** 在电磁学中，法拉第电磁感应定律的微分形式为 $\nabla \times \vec{E} = -\frac{\partial \vec{B}}{\partial t}$。这表明变化的磁场会产生旋转的电场。

考虑一个流体速度场 $\vec{v} = -y\hat{i} + x\hat{j}$。计算其旋度并描述流体的运动。
**解：**

$$
\nabla \times \vec{v} = \left(\frac{\partial (0)}{\partial y} - \frac{\partial (x)}{\partial z}\right)\hat{i} + \left(\frac{\partial (-y)}{\partial z} - \frac{\partial (0)}{\partial x}\right)\hat{j} + \left(\frac{\partial (x)}{\partial x} - \frac{\partial (-y)}{\partial y}\right)\hat{k}
$$

$$
\nabla \times \vec{v} = (0 - 0)\hat{i} + (0 - 0)\hat{j} + (1 - (-1))\hat{k} = 2\hat{k}
$$

旋度是一个指向 $+z$ 方向的常矢量。这意味着流体在 هر 点都绕着 $z$ 轴作逆时针旋转，且旋转角速度处处相等。这描述了一个刚体旋转。

## 重要恒等式

以下是涉及梯度、散度和旋度的一些重要矢量恒等式：

- **任意梯度的旋度为零**：

  $$
  \nabla \times (\nabla f) = \vec{0}
  $$

  这证实了无旋场（旋度为零）可以表示为梯度的性质。

- **任意旋度的散度为零**：

  $$
  \nabla \cdot (\nabla \times \vec{F}) = 0
  $$

  这证实了无散场（散度为零）可以表示为旋度的性质。例如，磁场 $\vec{B}$ 是无散的（$\nabla \cdot \vec{B} = 0$），因此它可以表示为磁矢势 $\vec{A}$ 的旋度（$\vec{B} = \nabla \times \vec{A}$）。

- **拉普拉斯算子 (Laplacian)**：
  标量场的梯度的散度定义为拉普拉斯算子 $\nabla^2$ 或 $\Delta$：

  $$
  \nabla \cdot (\nabla f) = \nabla^2 f = \frac{\partial^2 f}{\partial x^2} + \frac{\partial^2 f}{\partial y^2} + \frac{\partial^2 f}{\partial z^2}
  $$

  拉普拉斯算子在许多物理方程中都非常重要，如拉普拉斯方程 $\nabla^2 f = 0$、泊松方程 $\nabla^2 f = \rho$ 和波动方程。
