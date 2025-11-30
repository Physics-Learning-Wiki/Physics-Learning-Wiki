author: Physics-Learning-Wiki

## 运动学 (Kinematics)

运动学主要描述物体在空间中随时间变化的位置，而不涉及引起这些变化的原因（力）。它是力学的基础。

## 1. 参考系与坐标系

### 1.1 参考系 (Reference Frame)
为了描述一个物体的运动，必须选择另一个物体作为参照，这个被选作参照的物体称为 **参考系**。
*   运动是相对的，静止是相对的。
*   选择不同的参考系，对同一运动的描述可能完全不同（例如：在地面参考系看行驶的火车是运动的，在火车参考系看则是静止的）。

### 1.2 坐标系 (Coordinate System)
为了定量地描述物体在参考系中的位置，需要在参考系上建立 **坐标系**。

#### 直角坐标系 (Cartesian Coordinates)
最常用的坐标系。
-   **位置矢量**: $\boldsymbol{r} = x\hat{\boldsymbol{i}} + y\hat{\boldsymbol{j}} + z\hat{\boldsymbol{k}}$
-   **速度**: $\boldsymbol{v} = \frac{d\boldsymbol{r}}{dt} = \dot{x}\hat{\boldsymbol{i}} + \dot{y}\hat{\boldsymbol{j}} + \dot{z}\hat{\boldsymbol{k}}$
-   **加速度**: $\boldsymbol{a} = \frac{d\boldsymbol{v}}{dt} = \ddot{x}\hat{\boldsymbol{i}} + \ddot{y}\hat{\boldsymbol{j}} + \ddot{z}\hat{\boldsymbol{k}}$

![空间直角坐标系](docs/images/Cartesian-Coordinates.svg)

#### 平面极坐标系 (Polar Coordinates)
适用于平面内的圆周运动或中心力场问题。
定义径向单位矢量 $\hat{\boldsymbol{e}}_r$ 和横向（切向）单位矢量 $\hat{\boldsymbol{e}}_\theta$。注意这两个基矢量随位置变化，即随时间变化。
**位置**: $\boldsymbol{r} = r\hat{\boldsymbol{e}}_r$
**速度**:

$$
\boldsymbol{v} = \frac{d}{dt}(r\hat{\boldsymbol{e}}_r) = \dot{r}\hat{\boldsymbol{e}}_r + r\dot{\hat{\boldsymbol{e}}}_r = \dot{r}\hat{\boldsymbol{e}}_r + r\dot{\theta}\hat{\boldsymbol{e}}_\theta
$$

其中 $\dot{r}$ 为径向速度，$r\dot{\theta}$ 为横向速度。
**加速度**:

$$
\boldsymbol{a} = (\ddot{r} - r\dot{\theta}^2)\hat{\boldsymbol{e}}_r + (r\ddot{\theta} + 2\dot{r}\dot{\theta})\hat{\boldsymbol{e}}_\theta
$$

$\ddot{r}\hat{\boldsymbol{e}}_r$: 径向加速度分量。
$-r\dot{\theta}^2\hat{\boldsymbol{e}}_r$: **向心加速度**。
$r\ddot{\theta}\hat{\boldsymbol{e}}_\theta$: 切向加速度分量。
$2\dot{r}\dot{\theta}\hat{\boldsymbol{e}}_\theta$: **科里奥利加速度** (Coriolis acceleration) 的一部分形式。

#### 自然坐标系 (Intrinsic Coordinates)
以质点运动轨迹上的点为原点，沿切向 $\hat{\boldsymbol{\tau}}$ 和法向 $\hat{\boldsymbol{n}}$ 分解。
*   **速度**: $\boldsymbol{v} = v\hat{\boldsymbol{\tau}}$
*   **加速度**:

$$
\boldsymbol{a} = \frac{dv}{dt}\hat{\boldsymbol{\tau}} + \frac{v^2}{\rho}\hat{\boldsymbol{n}}
$$

$a_\tau = \frac{dv}{dt}$: 切向加速度，改变速度大小。
$a_n = \frac{v^2}{\rho}$: 法向加速度（向心加速度），改变速度方向，$\rho$ 为曲率半径。

## 2. 质点运动的描述

### 2.1 速度与速率
*   **平均速度**: $\bar{\boldsymbol{v}} = \frac{\Delta \boldsymbol{r}}{\Delta t}$
*   **瞬时速度**: $\boldsymbol{v} = \lim_{\Delta t \to 0} \frac{\Delta \boldsymbol{r}}{\Delta t} = \frac{d\boldsymbol{r}}{dt}$
*   **速率**: $v = |\boldsymbol{v}| = \frac{ds}{dt}$，其中 $s$ 为路程。

### 2.2 加速度
*   **瞬时加速度**: $\boldsymbol{a} = \frac{d\boldsymbol{v}}{dt} = \frac{d^2\boldsymbol{r}}{dt^2}$

### 2.3 典型运动模型

#### 匀变速直线运动
加速度 $a$ 为常数。

$$
v(t) = v_0 + at
$$

$$
x(t) = x_0 + v_0 t + \frac{1}{2}at^2
$$

推论：$v^2 - v_0^2 = 2a(x - x_0)$

#### 抛体运动 (Projectile Motion)
水平方向匀速，竖直方向匀加速（重力）。

$$
\begin{cases}
x = v_0 \cos\theta \cdot t \\
y = v_0 \sin\theta \cdot t - \frac{1}{2}gt^2
\end{cases}
$$

轨迹方程为抛物线：

$$
y = x \tan\theta - \frac{g}{2v_0^2 \cos^2\theta}x^2
$$

#### 圆周运动 (Circular Motion)
*   **角坐标**: $\theta(t)$
*   **角速度**: $\omega = \frac{d\theta}{dt}$
*   **角加速度**: $\alpha = \frac{d\omega}{dt}$
*   线量与角量的关系（半径 $R$）：
    *   弧长 $s = R\theta$
    *   线速度 $v = R\omega$
    *   切向加速度 $a_\tau = R\alpha$
    *   法向加速度 $a_n = R\omega^2 = \frac{v^2}{R}$

## 3. 相对运动 (Relative Motion)

当存在两个参考系：静止系 $S$ 和运动系 $S'$（$S'$ 相对于 $S$ 以速度 $\boldsymbol{v}_{S'S}$ 平动）。

### 3.1 伽利略变换 (Galilean Transformation)
对于位置矢量：

$$
\boldsymbol{r}_{PS} = \boldsymbol{r}_{PS'} + \boldsymbol{r}_{S'S}
$$

即：**绝对位置 = 相对位置 + 牵连位置**。

对时间求导，得到 **速度变换公式**：

$$
\boldsymbol{v}_{PS} = \boldsymbol{v}_{PS'} + \boldsymbol{v}_{S'S}
$$

即：**绝对速度 = 相对速度 + 牵连速度**。

再对时间求导，得到 **加速度变换公式**：

$$
\boldsymbol{a}_{PS} = \boldsymbol{a}_{PS'} + \boldsymbol{a}_{S'S}
$$

若 $S'$ 相对于 $S$ 做 **匀速直线运动**（$\boldsymbol{a}_{S'S} = 0$），则：

$$
\boldsymbol{a}_{PS} = \boldsymbol{a}_{PS'}
$$

这表明在所有相互作匀速直线运动的参考系中，物体的加速度是相同的。这是 **伽利略相对性原理** 的基础。

### 3.2 刚体平面运动的基点法
对于刚体上任意两点 $A$ 和 $B$：

$$
\boldsymbol{v}_B = \boldsymbol{v}_A + \boldsymbol{v}_{BA}
$$

由于 $A, B$ 距离不变，$\boldsymbol{v}_{BA}$ 只能是 $B$ 绕 $A$ 的转动速度：

$$
\boldsymbol{v}_B = \boldsymbol{v}_A + \boldsymbol{\omega} \times \boldsymbol{r}_{AB}
$$

这被称为 **基点法**，是解决刚体运动学问题的重要工具。
