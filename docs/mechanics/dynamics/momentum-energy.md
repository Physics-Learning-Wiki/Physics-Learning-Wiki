---
author: Physics-Learning-Wiki
---

## 动量与能量 (Momentum and Energy)

牛顿运动定律关注力的瞬时作用，而动量和能量的观点则关注力在时间或空间上的累积效果。它们提供了解决物理问题的另一套强大工具，特别是对于碰撞、变力做功等问题。

## 1. 动量 (Momentum)

### 1.1 动量定理 (Impulse-Momentum Theorem)
力在 **时间** 上的累积称为 **冲量 (Impulse)**。

$$
\boldsymbol{I} = \int_{t_1}^{t_2} \boldsymbol{F} dt
$$

根据牛顿第二定律 $\boldsymbol{F} = d\boldsymbol{p}/dt$，积分可得动量定理：

$$
\boldsymbol{I}_{\text{total}} = \Delta \boldsymbol{p} = \boldsymbol{p}_2 - \boldsymbol{p}_1
$$

> **物体所受合外力的冲量等于其动量的增量。**

??? note "例题"
    一颗质量为 $0.5\,\mathrm{kg}$ 的足球以 $10\,\mathrm{m/s}$ 的速度水平飞来，被守门员用手以 $0.2\,\mathrm{s}$ 的时间将其完全停下。求守门员手对足球施加的平均力。

    **解答：**

    $$
    \text{已知：} m = 0.5\,\mathrm{kg}, \quad v_1 = 10\,\mathrm{m/s}, \quad v_2 = 0, \quad \Delta t = 0.2\,\mathrm{s}
    $$

    $$
    \Delta \boldsymbol{p} = m(v_2 - v_1) = 0.5(0 - 10) = -5\,\mathrm{kg\cdot m/s}
    $$

    $$
    F_{\text{avg}} = \dfrac{\Delta \boldsymbol{p}}{\Delta t} = \dfrac{-5}{0.2} = -25\,\mathrm{N}
    $$

    守门员手对足球施加的平均力大小为 $25\,\mathrm{N}$，方向与足球初速度相反。

### 1.2 质点系动量定理
对于由多个质点组成的系统：

$$
\dfrac{d\boldsymbol{P}}{dt} = \sum \boldsymbol{F}_{\text{ext}}
$$

其中 $\boldsymbol{P} = \sum m_i \boldsymbol{v}_i$ 是系统的总动量。
*   **内力** (系统内部物体间的相互作用) 不改变系统的总动量，因为它们成对出现且相互抵消。

??? note "例题"
    一艘质量为 $200\,\mathrm{kg}$ 的小船静止在水面上，船上有一名质量为 $50\,\mathrm{kg}$ 的人。此人以 $5\,\mathrm{m/s}$ 的速度水平跳离小船，求小船的反向速度（假设水的阻力可忽略）

    **解答：**

    $$
    \text{已知：} m_1 = 50\,\mathrm{kg}, \quad m_2 = 200\,\mathrm{kg}, \quad v_1 = 5\,\mathrm{m/s}, \quad v_2 = ?
    $$

    根据动量守恒：

    $$
    0 = m_1v_1 + m_2v_2
    $$

    $$
    v_2 = -\dfrac{m_1v_1}{m_2} = -\dfrac{50 \times 5}{200} = -1.25\,\mathrm{m/s}
    $$

    小船的反向速度为 $1.25\,\mathrm{m/s}$。

### 1.3 动量守恒定律 (Conservation of Momentum)
> **若系统所受合外力为零（$\sum \boldsymbol{F}_{\text{ext}} = 0$），则系统的总动量保持不变。**

$$
\boldsymbol{P} = \text{const}
$$

*   这是一个矢量方程，可以在某个分量方向上单独成立（例如水平方向不受外力，则水平动量守恒）。
*   适用范围极广，从微观粒子碰撞到天体运动均适用。

??? note "例题"
    两辆小车在光滑水平面上发生碰撞。小车 A 的质量为 $2\,\mathrm{kg}$，初速度为 $3\,\mathrm{m/s}$；小车 B 的质量为 $3\,\mathrm{kg}$，初速度为 $-2\,\mathrm{m/s}$。碰撞后，小车 A 的速度变为 $1\,\mathrm{m/s}$，求小车 B 的速度。

    **解答：**

    $$
    \text{已知：} m_A = 2\,\mathrm{kg}, \quad m_B = 3\,\mathrm{kg}, \quad v_{A1} = 3\,\mathrm{m/s}, \quad v_{B1} = -2\,\mathrm{m/s}, \quad v_{A2} = 1\,\mathrm{m/s}, \quad v_{B2} = ?
    $$

    根据动量守恒：

    $$
    m_Av_{A1} + m_Bv_{B1} = m_Av_{A2} + m_Bv_{B2}
    $$

    $$
    2 \times 3 + 3 \times (-2) = 2 \times 1 + 3 \times v_{B2}
    $$

    $$
    6 - 6 = 2 + 3v_{B2}
    $$

    $$
    3v_{B2} = -2 \implies v_{B2} = -\dfrac{2}{3}\,\mathrm{m/s}
    $$
    
    碰撞后，小车 B 的速度为 $-\frac{2}{3}\,\mathrm{m/s}$。

## 2. 功与能 (Work and Energy)

### 2.1 功 (Work)
力在 **空间** 上的累积称为 **功**。

$$
W = \int_A^B \boldsymbol{F} \cdot d\boldsymbol{r}
$$

*   功是标量。
*   只有力在位移方向上的分量才做功。

??? note "例题"
    一辆小车在水平面上受到 $10\,\mathrm{N}$ 的水平拉力作用，沿拉力方向移动了 $5\,\mathrm{m}$，求拉力对小车所做的功。

    **解答：**

    $$
    W = F \cdot d = 10 \times 5 = 50\,\mathrm{J}
    $$

    拉力对小车所做的功为 $50\,\mathrm{J}$。

### 2.2 动能定理 (Work-Energy Theorem)
合外力对物体所做的功等于物体 **动能 (Kinetic Energy)** 的变化。

$$
W_{\text{total}} = \Delta E_k = \dfrac{1}{2}mv_2^2 - \dfrac{1}{2}mv_1^2
$$

其中动能定义为 $E_k = \frac{1}{2}mv^2$。

??? note "例题"
    一辆质量为 $1000\,\mathrm{kg}$ 的汽车从静止开始加速，经过 $10\,\mathrm{s}$ 达到 $20\,\mathrm{m/s}$ 的速度。求汽车的动能变化量。

    **解答：**

    $$
    \Delta E_k = \dfrac{1}{2}m(v_2^2 - v_1^2) = \dfrac{1}{2} \times 1000 \times (20^2 - 0^2) = 200,000\,\mathrm{J}
    $$

    汽车的动能变化量为 $200,000\,\mathrm{J}$。

### 2.3 保守力与势能 (Conservative Forces and Potential Energy)
如果一个力做功只与始末位置有关，而与路径无关，则称该力为 **保守力**。
对于保守力，可以定义 **势能 (Potential Energy, $E_p$)**：

$$
W_{\text{cons}} = -\Delta E_p = E_{p1} - E_{p2}
$$

> **保守力做正功，势能减少；保守力做负功，势能增加。**

常见势能公式：

*   **重力势能** (近地): $E_p = mgh$
*   **引力势能** (一般): $E_p = -G\frac{Mm}{r}$ (取无穷远处为零势能点)
*   **弹性势能**: $E_p = \frac{1}{2}kx^2$

??? note "例题"
    一物体质量为 $2\,\mathrm{kg}$，从 $10\,\mathrm{m}$ 高处自由下落到地面，求重力势能的变化量（取 $g = 10\,\mathrm{m/s^2}$）。

    **解答：**

    $$
    \Delta E_p = mgh_1 - mgh_2 = 2 \times 10 \times 10 - 2 \times 10 \times 0 = 200\,\mathrm{J}
    $$

    重力势能的变化量为 $200\,\mathrm{J}$。

### 2.4 机械能守恒定律 (Conservation of Mechanical Energy)
对于一个系统，如果只有保守力做功（或者非保守力不做功），则系统的 **机械能** (动能 + 势能) 保持不变。

$$
E_k + E_p = \text{const}
$$

或者：

$$
\Delta E_k + \Delta E_p = 0
$$

??? note "例题"
    一质量为 $1\,\mathrm{kg}$ 的小球从 $5\,\mathrm{m}$ 高处自由下落，求小球到达地面时的速度（取 $g = 10\,\mathrm{m/s^2}$）。

    **解答：**

    根据机械能守恒：

    $$
    \Delta E_k + \Delta E_p = 0
    $$

    $$
    \dfrac{1}{2}mv^2 - 0 + 0 - mgh = 0
    $$

    $$
    v = \sqrt{2gh} = \sqrt{2 \times 10 \times 5} = 10\,\mathrm{m/s}
    $$

    小球到达地面时的速度为 $10\,\mathrm{m/s}$。

### 2.5 功能原理
若存在非保守力（如摩擦力、爆炸力）做功 $W_{nc}$，则机械能不守恒，其变化量等于非保守力做的功：

$$
W_{nc} = \Delta E = \Delta E_k + \Delta E_p
$$

??? note "例题"
    一质量为 $10\,\mathrm{kg}$ 的物体沿水平面滑动，受到 $50\,\mathrm{N}$ 的摩擦力作用，滑行了 $4\,\mathrm{m}$ 后停止。求摩擦力对物体做的功。

    **解答：**

    $$
    W_{nc} = F \cdot d = -50 \times 4 = -200\,\mathrm{J}
    $$

    摩擦力对物体做的功为 $-200\,\mathrm{J}$。

## 3. 碰撞 (Collisions)

碰撞是一个相互作用时间极短、相互作用力极大的过程。通常忽略外力（如重力），认为系统动量守恒。

### 3.1 弹性碰撞 (Elastic Collision)
*   动量守恒。
*   **机械能（动能）守恒**。
*   例子：钢球碰撞、微观粒子散射。

对于一维弹性碰撞，两物体碰后速度满足：

$$
v_{1f} = \dfrac{m_1 - m_2}{m_1 + m_2}v_{1i} + \dfrac{2m_2}{m_1 + m_2}v_{2i}
$$

$$
v_{2f} = \dfrac{2m_1}{m_1 + m_2}v_{1i} + \dfrac{m_2 - m_1}{m_1 + m_2}v_{2i}
$$

特别地，若 $m_1 = m_2$，则两物体 **交换速度**。

### 3.2 非弹性碰撞 (Inelastic Collision)

*   动量守恒。
*   动能不守恒（部分动能转化为内能、热能、声能等）。
*   **恢复系数 (Coefficient of Restitution, $e$)**:

$$
e = \dfrac{|v_{2f} - v_{1f}|}{|v_{2i} - v_{1i}|} = \dfrac{\text{分离速度}}{\text{接近速度}}
$$

$e=1$: 弹性碰撞。

$0 < e < 1$: 非弹性碰撞。

$e=0$: **完全非弹性碰撞** (碰后粘在一起，动能损失最大)。

## 4. 质心系 (Center of Mass Frame)

在处理多体问题（特别是二体碰撞）时，引入 **质心参考系** (C系) 会极大简化计算。
**C系定义**：以系统质心为原点的平动参考系。
**零动量系**：在C系中，系统总动量恒为零 ($\sum \boldsymbol{p}'_i = 0$)。

### 柯尼希定理 (Koenig's Theorem)
质点系的总动能等于 **质心平动动能** 加上 **各质点相对于质心的动能**。

$$
E_k = \dfrac{1}{2}M v_C^2 + E_{k, \text{rel}}
$$

在碰撞问题中，$\frac{1}{2}M v_C^2$ 是“携带”动能，通常不变；只有 $E_{k, \text{rel}}$ 参与能量转化。
