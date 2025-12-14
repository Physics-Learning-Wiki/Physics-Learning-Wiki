# 惯性力 (Inertial Forces)

惯性力是一类虚拟力，它们出现在非惯性参考系中，用于解释物体在该参考系中的运动。由于非惯性参考系本身是加速的，因此需要引入惯性力来补偿加速度的影响，使牛顿运动定律在非惯性系中仍然适用。

## 1. 惯性力的定义
在非惯性参考系中，惯性力的大小和方向由参考系的加速度决定。惯性力的表达式为：

$$
\boldsymbol{F}_\text{inertial} = -m\boldsymbol{a}_\text{ref}
$$

其中：

- $m$ 是物体的质量；
- $\boldsymbol{a}_\text{ref}$ 是非惯性参考系相对于惯性参考系的加速度；
- $\boldsymbol{F}_\text{inertial}$ 是惯性力，方向与参考系加速度的方向相反。

惯性力并不是一种真实的力，而是一种数学上的修正项，用于在非惯性系中应用牛顿定律。

??? note "例题"
    一辆汽车以 $2\,\mathrm{m/s^2}$ 的加速度向前行驶，车内有一质量为 $10\,\mathrm{kg}$ 的物体。求物体在汽车参考系中受到的惯性力。

    **解答：**

    $$
    \boldsymbol{F}_\text{inertial} = -m\boldsymbol{a}_\text{ref} = -10 \times 2 = -20\,\mathrm{N}
    $$

    惯性力的大小为 $20\,\mathrm{N}$，方向与汽车加速度方向相反。

## 2. 常见的惯性力

### 2.1 离心力 (Centrifugal Force)
离心力是由于旋转参考系的角速度而产生的惯性力。它的大小与物体的质量、旋转角速度和到旋转轴的距离有关。

#### 公式：

$$
\boldsymbol{F}_\text{centrifugal} = m\omega^2\boldsymbol{r}
$$

其中：

- $m$ 是物体的质量；
- $\omega$ 是旋转参考系的角速度；
- $\boldsymbol{r}$ 是物体到旋转轴的距离。

#### 特点：

- 离心力的方向总是指向远离旋转轴的方向。
- 离心力的大小与距离 $r$ 成正比。

??? note "例题"
    一物体质量为 $5\,\mathrm{kg}$，位于距离旋转轴 $2\,\mathrm{m}$ 的位置，旋转角速度为 $3\,\mathrm{rad/s}$。求物体受到的离心力。

    **解答：**

    $$
    \boldsymbol{F}_\text{centrifugal} = m\omega^2r = 5 \times 3^2 \times 2 = 90\,\mathrm{N}
    $$

    物体受到的离心力为 $90\,\mathrm{N}$，方向远离旋转轴。

### 2.2 科里奥利力 (Coriolis Force)
科里奥利力是由于物体在旋转参考系中运动而产生的惯性力。它的存在是非惯性参考系中一个重要的现象，尤其在地球自转的背景下，科里奥利力对天气系统、海洋流动等有重要影响。

#### 引入：
假设有一个矢量 $\boldsymbol{P}$，它表示某物体的位置、速度或其他物理量。我们希望研究 $\boldsymbol{P}$ 的变化率（即导数）在惯性参考系和旋转参考系中的关系。

1. **惯性参考系中的变化率**：
   在惯性参考系中，矢量 $\boldsymbol{P}$ 的变化率为：

$$
\left(\frac{d\boldsymbol{P}}{dt}\right)_\text{inertial}
$$

2. **旋转参考系中的变化率**：
   在旋转参考系中，矢量 $\boldsymbol{P}$ 的变化率不仅包括惯性参考系中的变化，还需要考虑参考系本身的旋转。设旋转参考系的角速度为 $\boldsymbol{\omega}$，则有：

$$
\left(\frac{d\boldsymbol{P}}{dt}\right)_\text{inertial} = \left(\frac{d\boldsymbol{P}}{dt}\right)_\text{rotating} + \boldsymbol{\omega} \times \boldsymbol{P}
$$

   其中：

   - $\left(\frac{d\boldsymbol{P}}{dt}\right)_\text{rotating}$ 是矢量 $\boldsymbol{P}$ 在旋转参考系中的变化率；
   - $\boldsymbol{\omega} \times \boldsymbol{P}$ 是由于参考系旋转引入的附加项。

#### 推导：
我们现在具体推导科里奥利力的表达式。假设物体的质量为 $m$，在旋转参考系中的速度为 $\boldsymbol{v}$，旋转参考系的角速度为 $\boldsymbol{\omega}$。

1. **惯性参考系中的加速度**：
   惯性参考系中的加速度可以写为：

$$
\boldsymbol{a}_\text{inertial} = \frac{d\boldsymbol{v}_\text{inertial}}{dt}
$$

2. **旋转参考系中的加速度**：
   使用矢量变化率的关系式：

$$
\boldsymbol{a}_\text{inertial} = \boldsymbol{a}_\text{rotating} + 2(\boldsymbol{v} \times \boldsymbol{\omega}) + \boldsymbol{\omega} \times (\boldsymbol{\omega} \times \boldsymbol{r}) + \frac{d\boldsymbol{\omega}}{dt} \times \boldsymbol{r}
$$

   其中：

   - $\boldsymbol{a}_\text{rotating}$ 是物体在旋转参考系中的加速度；
   - $2(\boldsymbol{v} \times \boldsymbol{\omega})$ 是科里奥利加速度；
   - $\boldsymbol{\omega} \times (\boldsymbol{\omega} \times \boldsymbol{r})$ 是离心加速度；
   - $\frac{d\boldsymbol{\omega}}{dt} \times \boldsymbol{r}$ 是欧拉加速度。

3. **科里奥利力的表达式**：
   在旋转参考系中，科里奥利力由科里奥利加速度产生，其表达式为：
   
$$
\boldsymbol{F}_\text{Coriolis} = 2m(\boldsymbol{v} \times \boldsymbol{\omega})
$$

   其中：
   - $m$ 是物体的质量；
   - $\boldsymbol{v}$ 是物体相对于旋转参考系的速度；
   - $\boldsymbol{\omega}$ 是旋转参考系的角速度；
   - $\times$ 表示向量叉乘。

#### 特点：
- **方向**：科里奥利力的方向由右手法则确定。右手四指指向 $\boldsymbol{v}$ 的方向，弯向 $\boldsymbol{\omega}$ 的方向，大拇指指向科里奥利力的方向。
- **大小**：科里奥利力的大小与物体的速度和旋转角速度成正比。
- **性质**：科里奥利力是一种惯性力，仅在旋转参考系中存在。

??? note "例题"
    一质量为 $2\,\mathrm{kg}$ 的物体以 $5\,\mathrm{m/s}$ 的速度沿东向运动，所在参考系的角速度为 $0.1\,\mathrm{rad/s}$，方向指向北。求物体受到的科里奥利力。

    **解答：**

    $$
    \boldsymbol{F}_\text{Coriolis} = 2m(\boldsymbol{v} \times \boldsymbol{\omega})
    $$

    设 $\boldsymbol{v} = 5\hat{i}$，$\boldsymbol{\omega} = 0.1\hat{j}$，则：

    $$
    \boldsymbol{v} \times \boldsymbol{\omega} = \begin{vmatrix}
    \hat{i} & \hat{j} & \hat{k} \\
    5 & 0 & 0 \\
    0 & 0.1 & 0
    \end{vmatrix} = \hat{k} \cdot (5 \times 0.1) = 0.5\hat{k}
    $$

    $$
    \boldsymbol{F}_\text{Coriolis} = 2 \times 2 \times 0.5\hat{k} = 2\hat{k}\,\mathrm{N}
    $$

    科里奥利力的大小为 $2\,\mathrm{N}$，方向竖直向上。

### 2.3 欧拉力 (Euler Force)
欧拉力是由于旋转参考系的角速度变化而产生的惯性力。它的大小与物体的质量和角速度的变化率有关。

#### 公式：

$$
\boldsymbol{F}_\text{Euler} = -m\frac{d\boldsymbol{\omega}}{dt} \times \boldsymbol{r}
$$

其中：
- $m$ 是物体的质量；
- $\frac{d\boldsymbol{\omega}}{dt}$ 是角速度的变化率；
- $\boldsymbol{r}$ 是物体到旋转轴的距离。

#### 特点：
- 欧拉力的方向由右手法则确定。
- 欧拉力仅在角速度变化时存在。

??? note "例题"
    一物体质量为 $1\,\mathrm{kg}$，位于距离旋转轴 $3\,\mathrm{m}$ 的位置，旋转参考系的角速度变化率为 $0.2\,\mathrm{rad/s^2}$。求物体受到的欧拉力。

    **解答：**

    $$
    \boldsymbol{F}_\text{Euler} = -m\frac{d\boldsymbol{\omega}}{dt} \times \boldsymbol{r} = -1 \times 0.2 \times 3 = -0.6\,\mathrm{N}
    $$

    欧拉力的大小为 $0.6\,\mathrm{N}$，方向由右手法则确定。