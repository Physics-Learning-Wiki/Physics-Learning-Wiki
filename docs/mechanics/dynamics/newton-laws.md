---
author: Physics-Learning-Wiki
page_id: mechanics.dynamics.newton-laws
learning_objectives:
  - id: mech.dyn.newton.first-law
    title: 解释惯性并判断惯性参考系中的运动状态
    anchor: newton-first-law
  - id: mech.dyn.newton.second-law
    title: 使用合外力与牛顿第二定律分析加速度
    anchor: newton-second-law
  - id: mech.dyn.newton.third-law
    title: 区分作用力与反作用力和平衡力
    anchor: newton-third-law
  - id: mech.dyn.newton.free-body-diagram
    title: 为选定研究对象绘制正确的受力图
    anchor: newton-free-body-diagram
  - id: mech.dyn.newton.coordinate-equations
    title: 选择坐标轴并列出分量形式的动力学方程
    anchor: newton-coordinate-equations
  - id: mech.dyn.newton.object-system-choice
    title: 根据问题选择单体或系统并区分内力与外力
    anchor: newton-object-system-choice
quiz:
  enabled: true
  blueprint: mechanics.dynamics.newton-laws
  common_assessments:
    - 定律概念辨析
    - 受力图
    - 分量方程
    - 单体法与整体法
---

## 牛顿运动定律 (Newton's Laws of Motion)

1687 年，艾萨克·牛顿在《自然哲学的数学原理》中提出了三条运动定律，奠定了经典力学的基础．

<a id="newton-first-law"></a>

## 1. 牛顿第一定律 (Newton's First Law)

### 表述

> **任何物体都保持静止或匀速直线运动的状态，直到受到其它物体的作用力迫使它改变这种状态为止．**

### 物理意义

1.  **惯性 (Inertia)**：揭示了物体具有保持原有运动状态不变的性质，称为惯性．质量是物体惯性大小的量度．
2.  **力的定义**：力不是维持运动的原因，而是 **改变** 运动状态（即产生加速度）的原因．
3.  **惯性系 (Inertial Frame)**：定义了一类特殊的参考系——惯性系．在惯性系中，不受外力的物体加速度为零．
    -   地球参考系通常可近似看作惯性系．
    -   太阳参考系比地球参考系更接近惯性系．

惯性不是一种力，也不随速度增大而增大．同一物体无论静止还是运动，质量不变时惯性大小不变．在加速列车等非惯性系中，直接使用牛顿定律需要引入惯性力；阶段一的小测默认题目明确给出或可近似采用惯性系．

<a id="newton-second-law"></a>

## 2. 牛顿第二定律 (Newton's Second Law)

### 表述

> **物体动量的变化率与作用在物体上的力成正比，且方向相同．**

### 数学表达

$$
\boldsymbol{F} = \dfrac{d\boldsymbol{p}}{dt}
$$

其中 $\boldsymbol{p} = m\boldsymbol{v}$ 是动量．

当物体质量 $m$ 为常数时，公式简化为我们最熟悉的形式：

$$
\boldsymbol{F} = m\dfrac{d\boldsymbol{v}}{dt} = m\boldsymbol{a}
$$

### 物理意义

1.  **因果关系**：力 $\boldsymbol{F}$ 是因，加速度 $\boldsymbol{a}$ 是果．
2.  **矢量性**：方程在三个坐标轴方向上独立成立．

$$
\begin{cases}
F_x = ma_x \\
F_y = ma_y \\
F_z = ma_z
\end{cases}
$$

3.  **瞬时性**：力和加速度同时产生、同时变化、同时消失．
4.  **叠加性**：若物体受到多个力作用，$\boldsymbol{F}$ 指的是 **合外力**．

$$
\sum \boldsymbol{F}_i = m\boldsymbol{a}
$$

例如，质量为 $2\,\mathrm{kg}$ 的物体受到向右 $10\,\mathrm N$ 和向左 $4\,\mathrm N$ 的水平力，合外力为向右 $6\,\mathrm N$，加速度为向右 $3\,\mathrm{m/s^2}$．不能把任意一个单独的力写成 $m\boldsymbol a$．

<a id="newton-third-law"></a>

## 3. 牛顿第三定律 (Newton's Third Law)

### 表述

> **两个物体之间的作用力和反作用力总是大小相等，方向相反，作用在同一条直线上．**

### 数学表达

$$
\boldsymbol{F}_{12} = -\boldsymbol{F}_{21}
$$

其中 $\boldsymbol{F}_{12}$ 是物体 2 施加给物体 1 的力，$\boldsymbol{F}_{21}$ 是物体 1 施加给物体 2 的力．

### 物理意义

1.  **成对出现**：力是物体间的相互作用，不可能单独存在．
2.  **同性质**：作用力与反作用力性质相同（例如都是万有引力，或都是弹力）．
3.  **异体作用**：分别作用在两个不同的物体上，因此不能求和抵消（除非研究包含这两个物体的系统整体）．

桌面对书的支持力与书对桌面的压力互为作用力与反作用力；书受到的重力与桌面对书的支持力作用在同一物体上，在书静止时构成平衡力，但不是第三定律力对．判断时应分别写出两个力的施力物体和受力物体．

## 4. 牛顿定律的应用方法

解决动力学问题的标准步骤：

1.  **确定研究对象**：可以是单个物体，也可以是多个物体组成的系统（隔离法或整体法）．
2.  **受力分析**：画出 **受力图 (Free Body Diagram, FBD)**．只画受到的外力，不画物体施加给别人的力，也不画内力．
3.  **建立坐标系**：通常选取沿加速度方向和垂直加速度方向建立轴，以简化计算．
4.  **列方程**：根据 $\sum F_x = ma_x$ 和 $\sum F_y = ma_y$ 列出方程组．
5.  **求解与讨论**：解方程求出未知量，并检查结果的物理合理性．

<a id="newton-free-body-diagram"></a>

### 4.1 受力图

受力图只画作用在选定研究对象上的真实力．以斜面上的滑块为研究对象时，可以画重力、支持力和可能存在的摩擦力，但不能画滑块对斜面的压力，也不能因为滑块沿斜面运动就额外画一个“运动力”．“向心力”通常是若干真实力沿径向的合力，不应重复画成新力．

画图前可逐一询问：研究对象与哪些物体发生相互作用？每个相互作用给研究对象什么力？这样能减少漏力和多画力．

<a id="newton-coordinate-equations"></a>

### 4.2 坐标轴与分量方程

坐标轴可以根据约束选择，不必总是水平和竖直．斜面问题常取沿斜面和垂直斜面的方向，此时重力需要分解，而支持力通常只出现在垂直方向．确定正方向后，每个力分量和加速度分量必须遵循同一套符号约定．

若物体没有离开斜面，垂直斜面方向的加速度为零，可列 $\sum F_\perp=0$；沿斜面方向则列 $\sum F_\parallel=ma_\parallel$．约束方向合力为零并不意味着物体受到的总合力为零．

<a id="newton-object-system-choice"></a>

### 4.3 单体法、整体法与系统边界

研究两个相互接触的物体时，把二者作为整体可消去它们之间的内力，适合先求整体加速度；若要求接触力，则必须再选其中一个物体单独列方程．“内力”或“外力”不是力的固定属性，而取决于当前选择的系统边界．

例如，水平面上质量分别为 $m_1$ 和 $m_2$ 的两物体一起在外力 $F$ 作用下运动，忽略摩擦时整体加速度为 $a=F/(m_1+m_2)$．求两物体之间的作用力时，再隔离其中一个物体并使用同一个加速度列式．
