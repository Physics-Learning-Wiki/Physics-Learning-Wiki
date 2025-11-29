author: Physics-Learning-Wiki

# 牛顿运动定律 (Newton's Laws of Motion)

1687年，艾萨克·牛顿在《自然哲学的数学原理》中提出了三条运动定律，奠定了经典力学的基础。

## 1. 牛顿第一定律 (Newton's First Law)

### 表述
> **任何物体都保持静止或匀速直线运动的状态，直到受到其它物体的作用力迫使它改变这种状态为止。**

### 物理意义
1.  **惯性 (Inertia)**：揭示了物体具有保持原有运动状态不变的性质，称为惯性。质量是物体惯性大小的量度。
2.  **力的定义**：力不是维持运动的原因，而是 **改变** 运动状态（即产生加速度）的原因。
3.  **惯性系 (Inertial Frame)**：定义了一类特殊的参考系——惯性系。在惯性系中，不受外力的物体加速度为零。
    *   地球参考系通常可近似看作惯性系。
    *   太阳参考系比地球参考系更接近惯性系。

## 2. 牛顿第二定律 (Newton's Second Law)

### 表述
> **物体动量的变化率与作用在物体上的力成正比，且方向相同。**

### 数学表达

$$
\boldsymbol{F} = \frac{d\boldsymbol{p}}{dt}
$$

其中 $\boldsymbol{p} = m\boldsymbol{v}$ 是动量。

当物体质量 $m$ 为常数时，公式简化为我们最熟悉的形式：
$$
\boldsymbol{F} = m\frac{d\boldsymbol{v}}{dt} = m\boldsymbol{a}
$$

### 物理意义
1.  **因果关系**：力 $\boldsymbol{F}$ 是因，加速度 $\boldsymbol{a}$ 是果。
2.  **矢量性**：方程在三个坐标轴方向上独立成立。
$$
\begin{cases}
F_x = ma_x \\
F_y = ma_y \\
F_z = ma_z
\end{cases}
$$
3.  **瞬时性**：力和加速度同时产生、同时变化、同时消失。
4.  **叠加性**：若物体受到多个力作用，$\boldsymbol{F}$ 指的是 **合外力**。

$$
\sum \boldsymbol{F}_i = m\boldsymbol{a}
$$

## 3. 牛顿第三定律 (Newton's Third Law)

### 表述
> **两个物体之间的作用力和反作用力总是大小相等，方向相反，作用在同一条直线上。**

### 数学表达

$$
\boldsymbol{F}_{12} = -\boldsymbol{F}_{21}
$$

其中 $\boldsymbol{F}_{12}$ 是物体 2 施加给物体 1 的力，$\boldsymbol{F}_{21}$ 是物体 1 施加给物体 2 的力。

### 物理意义
1.  **成对出现**：力是物体间的相互作用，不可能单独存在。
2.  **同性质**：作用力与反作用力性质相同（例如都是万有引力，或都是弹力）。
3.  **异体作用**：分别作用在两个不同的物体上，因此不能求和抵消（除非研究包含这两个物体的系统整体）。

## 4. 常见的几种力

在经典力学中，我们经常处理以下几种力：

### 4.1 万有引力 (Gravitational Force)

$$
\boldsymbol{F} = -G\frac{Mm}{r^2}\hat{\boldsymbol{r}}
$$

$G \approx 6.67 \times 10^{-11} \text{N}\cdot\text{m}^2/\text{kg}^2$。
在地球表面附近，重力近似为 $\boldsymbol{G} = m\boldsymbol{g}$，其中 $g \approx 9.8 \text{m/s}^2$。

### 4.2 弹性力 (Elastic Force)
遵循 **胡克定律 (Hooke's Law)**：

$$
\boldsymbol{F} = -k\boldsymbol{x}
$$

*   $k$ 为劲度系数 (Stiffness constant)。
*   方向总是指向平衡位置（恢复力）。

### 4.3 摩擦力 (Friction)
**静摩擦力 (Static Friction)**: $0 \le f_s \le f_{s, \max} = \mu_s N$。方向与相对运动趋势相反。
**动摩擦力 (Kinetic Friction)**: $f_k = \mu_k N$。方向与相对运动方向相反。
- 通常 $\mu_k < \mu_s$。

### 4.4 流体阻力 (Fluid Resistance)
低速时（层流）：$f \propto v$ (Stokes' Law)。
高速时（湍流）：$f \propto v^2$。

## 5. 牛顿定律的应用方法

解决动力学问题的标准步骤：

1.  **确定研究对象**：可以是单个物体，也可以是多个物体组成的系统（隔离法或整体法）。
2.  **受力分析**：画出 **受力图 (Free Body Diagram, FBD)**。只画受到的外力，不画物体施加给别人的力，也不画内力。
3.  **建立坐标系**：通常选取沿加速度方向和垂直加速度方向建立轴，以简化计算。
4.  **列方程**：根据 $\sum F_x = ma_x$ 和 $\sum F_y = ma_y$ 列出方程组。
5.  **求解与讨论**：解方程求出未知量，并检查结果的物理合理性。

## 6. 非惯性系与惯性力 (Non-inertial Frames)

当参考系本身具有加速度 $\boldsymbol{a}_0$ 时，牛顿第二定律不再直接成立。为了在非惯性系中继续使用牛顿定律的形式，我们需要引入虚拟的 **惯性力 (Inertial Force)**。

$$
\boldsymbol{F}_{\text{real}} + \boldsymbol{F}_{\text{inertial}} = m\boldsymbol{a}_{\text{rel}}
$$

其中惯性力定义为：
$$
\boldsymbol{F}_{\text{inertial}} = -m\boldsymbol{a}_0
$$

### 常见的惯性力
1.  **平动惯性力**：参考系做平动加速时引入，$\boldsymbol{F} = -m\boldsymbol{a}$.
2.  **离心力 (Centrifugal Force)**：在匀速转动参考系中，$\boldsymbol{F} = m\omega^2 r \hat{\boldsymbol{e}}_r$。
3.  **科里奥利力 (Coriolis Force)**：当物体在转动参考系中有相对速度时产生，$\boldsymbol{F}_{cor} = -2m(\boldsymbol{\omega} \times \boldsymbol{v}_{\text{rel}})$。
- 科里奥利力是导致地球上季风偏转、河流冲刷右岸（北半球）的主要原因。
