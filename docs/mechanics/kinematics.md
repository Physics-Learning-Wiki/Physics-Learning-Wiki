author: Physics-Learning-Wiki, Leafuke

## 运动学（Kinematics）

运动学主要描述物体在空间中随时间变化的位置，而不涉及引起这些变化的原因（力）。它是力学的基础。

---

## 1. 参考系与坐标系

### 1.1 参考系（Reference Frame）

为了描述一个物体的运动，必须选择另一个物体作为参照，这个被选作参照的物体称为 **参考系**。

1. 运动是相对的，静止是相对的。  
2. 选择不同的参考系，对同一运动的描述可能完全不同（例如：在地面参考系看行驶的火车是运动的，在火车参考系看则是静止的）。

### 1.2 坐标系（Coordinate System）

为了定量地描述物体在参考系中的位置，需要在参考系上建立 **坐标系**。

#### （1）直角坐标系（Cartesian Coordinates）

最常用的坐标系。

- 位置矢量：  
  $$
  \vec{r}(t) = x(t)\,\hat{i} + y(t)\,\hat{j} + z(t)\,\hat{k}
  $$

- 速度：  
  $$
  \vec{v}(t) = \frac{d\vec{r}}{dt} = \dot{x}\,\hat{i} + \dot{y}\,\hat{j} + \dot{z}\,\hat{k}
  $$

- 加速度：  
  $$
  \vec{a}(t) = \frac{d\vec{v}}{dt} = \ddot{x}\,\hat{i} + \ddot{y}\,\hat{j} + \ddot{z}\,\hat{k}
  $$

#### （2）平面极坐标系（Polar Coordinates）

适用于平面内的圆周运动或中心力场问题。  
定义径向单位矢量 $\hat{e}_r$ 和横向（切向）单位矢量 $\hat{e}_\theta$。  
注意：这两个基矢量 **随位置变化**，即随时间变化（$\frac{d\hat{e}_r}{dt} = \dot{\theta}\,\hat{e}_\theta$, $\frac{d\hat{e}_\theta}{dt} = -\dot{\theta}\,\hat{e}_r$）。

- 位置：  
  $$
  \vec{r} = r\,\hat{e}_r
  $$

- 速度：  
  $$
  \vec{v} = \dot{r}\,\hat{e}_r + r\dot{\theta}\,\hat{e}_\theta
  $$
  其中 $\dot{r}$ 为径向速度，$r\dot{\theta}$ 为横向速度。

- 加速度：  
  $$
  \vec{a} = \left( \ddot{r} - r\dot{\theta}^2 \right) \hat{e}_r + \left( r\ddot{\theta} + 2\dot{r}\dot{\theta} \right) \hat{e}_\theta
  $$
  分量含义：
  1. $\ddot{r} - r\dot{\theta}^2$：径向加速度分量  
  2. $-r\dot{\theta}^2$：向心加速度  
  3. $r\ddot{\theta}$：切向加速度分量  
  4. $2\dot{r}\dot{\theta}$：科里奥利加速度（Coriolis acceleration）的一种表现形式

#### （3）自然坐标系（Intrinsic Coordinates）

以质点运动轨迹上的点为原点，沿切向 $\hat{\tau}$ 和法向 $\hat{n}$ 分解。

- 速度：  
  $$
  \vec{v} = v\,\hat{\tau}, \quad \text{其中 } v = \frac{ds}{dt}
  $$

- 加速度：  
  $$
  \vec{a} = a_\tau\,\hat{\tau} + a_n\,\hat{n} = \frac{dv}{dt}\,\hat{\tau} + \frac{v^2}{\rho}\,\hat{n}
  $$
  其中：
  1. $a_\tau = \frac{dv}{dt}$：切向加速度，改变速度大小  
  2. $a_n = \frac{v^2}{\rho}$：法向加速度（向心加速度），改变速度方向；$\rho$ 为曲率半径

---

## 2. 质点运动的描述

### 2.1 速度与速率

1. 平均速度：  
   $$
   \vec{v}_{\text{avg}} = \frac{\Delta \vec{r}}{\Delta t}
   $$

2. 瞬时速度：  
   $$
   \vec{v} = \lim_{\Delta t \to 0} \frac{\Delta \vec{r}}{\Delta t} = \frac{d\vec{r}}{dt}
   $$

3. 速率：  
   $$
   v = \frac{ds}{dt}, \quad \text{其中 } s \text{ 为路程}
   $$

### 2.2 加速度

- 瞬时加速度：  
  $$
  \vec{a} = \frac{d\vec{v}}{dt} = \frac{d^2\vec{r}}{dt^2}
  $$

### 2.3 典型运动模型

#### （1）匀变速直线运动

加速度 $\vec{a} = \text{const}$。

运动学公式（初速 $v_0$，位移 $x_0$）：
$$
\begin{aligned}
v &= v_0 + at \\
x &= x_0 + v_0 t + \frac{1}{2} a t^2 \\
v^2 &= v_0^2 + 2a(x - x_0)
\end{aligned}
$$

#### （2）抛体运动（Projectile Motion）

- 水平方向：匀速（$a_x = 0$）  
- 竖直方向：匀加速（$a_y = -g$）

设初速度大小为 $v_0$，与水平夹角为 $\theta$：

$$
\begin{aligned}
x(t) &= v_0 \cos\theta \cdot t \\
y(t) &= v_0 \sin\theta \cdot t - \frac{1}{2} g t^2
\end{aligned}
$$

消去 $t$ 得轨迹方程（抛物线）：

$$
y = x \tan\theta - \frac{g}{2 v_0^2 \cos^2\theta} x^2
$$

#### （3）圆周运动（Circular Motion）

- 角坐标：$\theta(t)$  
- 角速度：$\omega = \dot{\theta} = \frac{d\theta}{dt}$  
- 角加速度：$\alpha = \dot{\omega} = \ddot{\theta} = \frac{d^2\theta}{dt^2}$

**线量与角量关系**（半径 $R$）：

$$
\begin{aligned}
\text{(a) 弧长：} &\quad s = R\theta \\
\text{(b) 线速度：} &\quad v = R\omega \\
\text{(c) 切向加速度：} &\quad a_\tau = R\alpha \\
\text{(d) 法向加速度：} &\quad a_n = \frac{v^2}{R} = R\omega^2
\end{aligned}
$$

---

## 3. 相对运动（Relative Motion）

设存在两个参考系：静止系 $S$ 和运动系 $S'$（$S'$ 相对于 $S$ 以速度 $\vec{V}$ 平动）。

### 3.1 伽利略变换（Galilean Transformation）

- 位置矢量：  
  $$
  \vec{r} = \vec{r}' + \vec{R}(t)
  $$
  其中 $\vec{R}(t)$ 是 $S'$ 原点在 $S$ 中的位置（牵连位矢）。

- 速度变换（对时间求导）：  
  $$
  \vec{v} = \vec{v}' + \vec{V}, \quad \text{其中 } \vec{V} = \frac{d\vec{R}}{dt}
  $$
  即：**绝对速度 = 相对速度 + 牵连速度**

- 加速度变换（再求导）：  
  $$
  \vec{a} = \vec{a}' + \vec{A}, \quad \text{其中 } \vec{A} = \frac{d\vec{V}}{dt}
  $$

若 $S'$ 相对于 $S$ 做 **匀速直线运动**（$\vec{A} = 0$），则：
$$
\vec{a} = \vec{a}'
$$
这表明在所有相互作匀速直线运动的参考系中，物体的加速度是相同的。这是 **伽利略相对性原理** 的基础。

### 3.2 刚体平面运动的基点法

对刚体上任意两点 $A$ 和 $B$：

$$
\vec{v}_B = \vec{v}_A + \vec{v}_{B/A}
$$

由于 $AB$ 距离不变，$\vec{v}_{B/A}$ 只能是 $B$ 绕 $A$ 的转动速度：

$$
\vec{v}_{B/A} = \vec{\omega} \times \vec{r}_{B/A}
$$

因此：
$$
\boxed{\vec{v}_B = \vec{v}_A + \vec{\omega} \times \vec{r}_{B/A}}
$$

这被称为 **基点法**，是解决刚体运动学问题的重要工具。

