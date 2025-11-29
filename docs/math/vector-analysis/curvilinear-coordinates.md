
在物理学中，虽然笛卡尔坐标系（Cartesian coordinates）是最基础和最直接的坐标系，但在处理具有特定对称性（如圆形、球形或柱形对称）的问题时，使用**曲线坐标系**（Curvilinear coordinates）会大大简化计算。最常见的曲线坐标系包括极坐标系、柱坐标系和球坐标系。

## 正交曲线坐标系

一个坐标系被称为**正交**的，如果它的坐标曲面在任何一点都相互垂直。这意味着在任何一点，基向量都是相互正交的。我们这里主要讨论正交曲线坐标系。

设一个点在笛卡尔坐标系中的坐标为 $(x, y, z)$，在曲线坐标系中的坐标为 $(q_1, q_2, q_3)$。它们之间的关系可以表示为：

$$
x = x(q_1, q_2, q_3)
$$

$$
y = y(q_1, q_2, q_3)
$$

$$
z = z(q_1, q_2, q_3)
$$

### 标度因子 (Scale Factors)

在曲线坐标系中，基向量的大小通常不是 1，并且会随着位置的变化而变化。我们定义**标度因子** $h_i$ 来描述这种变化。

位移矢量 $d\vec{r}$ 在笛卡尔坐标系中为 $d\vec{r} = dx\hat{i} + dy\hat{j} + dz\hat{k}$。通过全微分，我们可以得到：

$$
d\vec{r} = \frac{\partial \vec{r}}{\partial q_1}dq_1 + \frac{\partial \vec{r}}{\partial q_2}dq_2 + \frac{\partial \vec{r}}{\partial q_3}dq_3
$$

我们定义曲线坐标系的基向量为 $\vec{e}_i = \frac{\partial \vec{r}}{\partial q_i}$。这些基向量通常不是单位向量。
标准化的单位基向量为 $\hat{e}_i = \frac{1}{|\frac{\partial \vec{r}}{\partial q_i}|} \frac{\partial \vec{r}}{\partial q_i}$。

标度因子 $h_i$ 定义为：

$$
h_i = \left| \frac{\partial \vec{r}}{\partial q_i} \right|
$$

因此，位移矢量可以写成：

$$
d\vec{r} = h_1 dq_1 \hat{e}_1 + h_2 dq_2 \hat{e}_2 + h_3 dq_3 \hat{e}_3
$$

线元、面元和体元可以表示为：
- **线元**：$ds^2 = |d\vec{r}|^2 = h_1^2 dq_1^2 + h_2^2 dq_2^2 + h_3^2 dq_3^2$
- **面元**：$dA_1 = h_2 h_3 dq_2 dq_3$ (在 $q_1$ 方向)
- **体元**：$dV = h_1 h_2 h_3 dq_1 dq_2 dq_3$

### 梯度、散度、旋度和拉普拉斯算子

在正交曲线坐标系 $(q_1, q_2, q_3)$ 中，矢量算子可以推广为：

- **梯度 (Gradient)**：

$$
\nabla f = \frac{1}{h_1}\frac{\partial f}{\partial q_1}\hat{e}_1 + \frac{1}{h_2}\frac{\partial f}{\partial q_2}\hat{e}_2 + \frac{1}{h_3}\frac{\partial f}{\partial q_3}\hat{e}_3
$$

- **散度 (Divergence)**：对于矢量场 $\vec{F} = F_1\hat{e}_1 + F_2\hat{e}_2 + F_3\hat{e}_3$

$$
\nabla \cdot \vec{F} = \frac{1}{h_1 h_2 h_3} \left[ \frac{\partial}{\partial q_1}(h_2 h_3 F_1) + \frac{\partial}{\partial q_2}(h_1 h_3 F_2) + \frac{\partial}{\partial q_3}(h_1 h_2 F_3) \right]
$$

- **旋度 (Curl)**：

$$
\nabla \times \vec{F} = \frac{1}{h_1 h_2 h_3}
\begin{vmatrix}
h_1\hat{e}_1 & h_2\hat{e}_2 & h_3\hat{e}_3 \\
\frac{\partial}{\partial q_1} & \frac{\partial}{\partial q_2} & \frac{\partial}{\partial q_3} \\
h_1 F_1 & h_2 F_2 & h_3 F_3
\end{vmatrix}
$$

- **拉普拉斯算子 (Laplacian)**：

$$
\nabla^2 f = \frac{1}{h_1 h_2 h_3} \left[ \frac{\partial}{\partial q_1}\left(\frac{h_2 h_3}{h_1}\frac{\partial f}{\partial q_1}\right) + \frac{\partial}{\partial q_2}\left(\frac{h_1 h_3}{h_2}\frac{\partial f}{\partial q_2}\right) + \frac{\partial}{\partial q_3}\left(\frac{h_1 h_2}{h_3}\frac{\partial f}{\partial q_3}\right) \right]
$$

## 柱坐标系 (Cylindrical Coordinates)

柱坐标系 $(r, \theta, z)$ 用于描述具有轴对称性的系统。
- $r$：点到 $z$ 轴的径向距离 ($r \ge 0$)
- $\theta$：径向矢量在 $xy$ 平面上的方位角 ($0 \le \theta < 2\pi$)
- $z$：点的竖直高度

**与笛卡尔坐标的关系**：

$$
x = r \cos\theta
$$

$$
y = r \sin\theta
$$

$$
z = z
$$

**标度因子**：
$q_1=r, q_2=\theta, q_3=z$

$$
h_r = 1, \quad h_\theta = r, \quad h_z = 1
$$

**基向量**：$\hat{r}, \hat{\theta}, \hat{z}$

**体元**：$dV = r \, dr \, d\theta \, dz$

**拉普拉斯算子**：

$$
\nabla^2 f = \frac{1}{r}\frac{\partial}{\partial r}\left(r\frac{\partial f}{\partial r}\right) + \frac{1}{r^2}\frac{\partial^2 f}{\partial \theta^2} + \frac{\partial^2 f}{\partial z^2}
$$

**例题：** 无限长均匀带电直线的电场。
假设电荷线密度为 $\lambda$，直线与 $z$ 轴重合。由于对称性，电场 $\vec{E}$ 必定只沿径向 $r$ 分布，且大小只与 $r$ 有关，即 $\vec{E} = E(r)\hat{r}$。
我们使用高斯定律的积分形式。取一个半径为 $r$，高度为 $L$ 的圆柱形高斯面。

$$
\oint \vec{E} \cdot d\vec{A} = \frac{Q_{enc}}{\epsilon_0}
$$

电通量只通过圆柱的侧面，上下底面的通量为零。

$$
E(r) \cdot (2\pi r L) = \frac{\lambda L}{\epsilon_0}
$$

解得：

$$
E(r) = \frac{\lambda}{2\pi\epsilon_0 r}
$$

所以电场为 $\vec{E} = \frac{\lambda}{2\pi\epsilon_0 r}\hat{r}$。

## 球坐标系 (Spherical Coordinates)

球坐标系 $(\rho, \theta, \phi)$ 用于描述具有球对称性的系统。
- $\rho$：点到原点的径向距离 ($\rho \ge 0$)
- $\theta$：径向矢量与正 $z$ 轴的夹角，称为**极角** ($0 \le \theta \le \pi$)
- $\phi$：径向矢量在 $xy$ 平面上的投影与正 $x$ 轴的夹角，称为**方位角** ($0 \le \phi < 2\pi$)
*(注意：物理学中常用 $(\rho, \theta, \phi)$，而数学中常用 $(r, \phi, \theta)$，这里的 $\theta, \phi$ 含义相反，需注意区分。)*

**与笛卡尔坐标的关系**：

$$
x = \rho \sin\theta \cos\phi
$$

$$
y = \rho \sin\theta \sin\phi
$$

$$
z = \rho \cos\theta
$$

**标度因子**：
$q_1=\rho, q_2=\theta, q_3=\phi$

$$
h_\rho = 1, \quad h_\theta = \rho, \quad h_\phi = \rho \sin\theta
$$

**基向量**：$\hat{\rho}, \hat{\theta}, \hat{\phi}$

**体元**：$dV = \rho^2 \sin\theta \, d\rho \, d\theta \, d\phi$

**拉普拉斯算子**：

$$
\nabla^2 f = \frac{1}{\rho^2}\frac{\partial}{\partial \rho}\left(\rho^2\frac{\partial f}{\partial \rho}\right) + \frac{1}{\rho^2\sin\theta}\frac{\partial}{\partial \theta}\left(\sin\theta\frac{\partial f}{\partial \theta}\right) + \frac{1}{\rho^2\sin^2\theta}\frac{\partial^2 f}{\partial \phi^2}
$$

这个算子在求解氢原子薛定谔方程时至关重要。

**例题：** 点电荷的电场。
一个电量为 $Q$ 的点电荷位于原点。由于球对称性，电场必定只沿径向 $\rho$ 分布，且大小只与 $\rho$ 有关，即 $\vec{E} = E(\rho)\hat{\rho}$。
使用高斯定律，取一个半径为 $\rho$ 的球面作为高斯面。

$$
\oint \vec{E} \cdot d\vec{A} = \frac{Q_{enc}}{\epsilon_0}
$$

$$
E(\rho) \cdot (4\pi \rho^2) = \frac{Q}{\epsilon_0}
$$

解得：

$$
E(\rho) = \frac{Q}{4\pi\epsilon_0 \rho^2}
$$

所以电场为 $\vec{E} = \frac{1}{4\pi\epsilon_0}\frac{Q}{\rho^2}\hat{\rho}$，这正是库仑定律。使用球坐标系使推导变得异常简单。
