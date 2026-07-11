---
author: Leafuke
page_id: mechanics.kinematics.linear-motion
learning_objectives:
  - id: mech.kin.linear.sign-convention
    title: 区分位置、位移和路程，并在给定正方向后正确处理符号
    anchor: linear-sign-convention
  - id: mech.kin.linear.velocity-acceleration
    title: 计算并解释平均与瞬时速度、平均与瞬时加速度
    anchor: linear-velocity-acceleration
  - id: mech.kin.linear.graph-slope-area
    title: 利用运动图像的斜率与面积分析运动
    anchor: linear-motion-graphs
  - id: mech.kin.linear.uniform-motion
    title: 使用匀速直线运动模型建立位置与时间关系
    anchor: linear-uniform-motion
  - id: mech.kin.linear.piecewise-motion
    title: 建立分段运动方程并使用连接条件
    anchor: linear-piecewise-motion
  - id: mech.kin.linear.relative-motion
    title: 使用相对位置和相对速度处理追及与相遇问题
    anchor: linear-relative-motion
quiz:
  enabled: true
  blueprint: mechanics.kinematics.linear-motion
  common_assessments:
    - 概念辨析
    - 图像斜率与面积
    - 分段建模
    - 追及与相遇
---

## 直线运动（Linear Motion）

直线运动是一维运动学的核心：所有位置都可以用一个坐标 $x$ 描述．
本章会把「位移—速度—加速度」这条链条讲清楚，并给出图像法与分段运动的通用套路．

<a id="linear-sign-convention"></a>

## 0. 一维描述与符号约定

选取一条直线作为 $x$ 轴，并规定正方向．

-   位置：$x(t)$
-   位移：$\Delta x=x_2-x_1$（带正负）
-   路程：$s\ge 0$（只计走过的长度）

??? note "先定正方向再写方程"
    一维题中最常见的错误是「把向左/向下当成负号但没声明」．  
    正确做法是：画出数轴，写清楚正方向，然后所有量都带符号地算．

例如，规定向东为正，一名学生从 $x_1=3\,\mathrm m$ 走到 $x_2=-2\,\mathrm m$，则位移为 $-5\,\mathrm m$．负号只表示位移指向西方；若学生沿直线没有折返，路程为 $5\,\mathrm m$．

<a id="linear-velocity-acceleration"></a>

## 1. 速度与加速度（定义与直观）

### 1.1 平均速度与瞬时速度

平均速度：

$$
\bar v=\dfrac{\Delta x}{\Delta t}.
$$

瞬时速度：

$$
v(t)=\dfrac{dx}{dt}.
$$

### 1.2 平均加速度与瞬时加速度

平均加速度：

$$
\bar a=\dfrac{\Delta v}{\Delta t}.
$$

瞬时加速度：

$$
a(t)=\dfrac{dv}{dt}=\dfrac{d^2x}{dt^2}.
$$

??? note "加速度不等于「速度的大小变化率」"
    在一维中 $a$ 是带符号的．若 $v>0$ 且 $a<0$，物体依然可能在「向正方向运动」，只是逐渐减速．

判断物体加速还是减速，应比较 $v$ 与 $a$ 的符号：二者同号时速率增大，异号时速率减小．某一瞬间 $v=0$ 也不能推出 $a=0$，例如竖直上抛物体在最高点的速度为零，但加速度仍为重力加速度．

<a id="linear-motion-graphs"></a>

## 2. 三大图像法：$x-t$、$v-t$、$a-t$

图像法既是直观工具，也是计算工具．

### 2.1 $x-t$ 图像

-   斜率：$\frac{dx}{dt}=v$
-   斜率随时间变化：反映加速度的存在

### 2.2 $v-t$ 图像

-   斜率：$\frac{dv}{dt}=a$
-   面积：

$$
\Delta x=\int_{t_1}^{t_2}v(t)\,dt
$$

即 $v-t$ 图下 **有符号面积** 就是位移．

### 2.3 $a-t$ 图像

-   面积：

$$
\Delta v=\int_{t_1}^{t_2}a(t)\,dt.
$$

??? note "面积的正负"
    若 $v$ 或 $a$ 在某段为负，则对应图像在时间轴下方，面积带负号．

读图时应先确认纵轴物理量，不能把图线的高低直接当成运动快慢．在 $x-t$ 图中应看斜率；在 $v-t$ 图中，图线高度才表示速度，图线与时间轴围成的有符号面积表示位移．

<a id="linear-uniform-motion"></a>

## 3. 匀速直线运动

### 3.1 定义

匀速直线运动：速度恒定（大小与方向都不变），因此

$$
a=0,\qquad v=\text{常数}.
$$

### 3.2 位移公式

若取 $t_0=0$，初位置为 $x_0$，则

$$
x(t)=x_0+vt,\qquad \Delta x=vt.
$$

### 3.3 图像特征

-   $x-t$：直线，斜率为 $v$
-   $v-t$：水平直线
-   $a-t$：$0$

### 3.4 例题

??? note "例题：匀速运动的位移"
    一辆汽车以 $20\,\mathrm{m/s}$ 的速度匀速行驶，求 $10\,\mathrm{s}$ 内的位移．
    
    **解：**
    
    $$
    \Delta x=vt=20\times 10=200\,\mathrm{m}.  
    $$

若同一汽车在 $t=0$ 时位于 $x_0=-50\,\mathrm m$，则 $10\,\mathrm s$ 后的位置是 $x=150\,\mathrm m$．位置依赖坐标原点，位移 $200\,\mathrm m$ 不依赖原点选择．

## 4. 匀变速直线运动（概览）

匀变速直线运动指 **加速度为常量** 的直线运动．其系统推导与常用结论详见 [匀变速直线运动](uniformly-accelerated-motion.md)．

这里先记住两个最重要的直观：

-   $v-t$ 图像为直线（斜率为 $a$）．
-   位移等于 $v-t$ 图像下面积．

<a id="linear-piecewise-motion"></a>

## 5. 分段运动与连接条件

很多题目不是单一运动，而是分成若干时间段，每段有不同 $a$ 或不同约束．
做题建议固定一个流程：

1.  画数轴，规定正方向．
2.  列出每段的 $x(t)$、$v(t)$ 或段末关系．
3.  用「连接条件」把各段串起来（段末速度 = 下一段初速度，段末位置 = 下一段初位置）．

例如，物体先以 $2\,\mathrm{m/s}$ 匀速运动 $3\,\mathrm s$，再以 $-1\,\mathrm{m/s}$ 运动 $2\,\mathrm s$．若初位置为零，则第一段末位置为 $6\,\mathrm m$，它也是第二段的初位置；最终位置为 $6-2=4\,\mathrm m$．不能把第二段仍从 $x=0$ 开始计算．

若速度在分段点发生突变，位置通常仍连续；若加速度改变但没有冲量，速度和位置都连续．题目给出的物理过程决定需要使用哪些连接条件．

<a id="linear-relative-motion"></a>

## 6. 相对运动与追及/相遇

追及或相遇问题通常要抓住一句话：

$$
x_A(t)=x_B(t)\quad (\text{相遇/追上条件}).
$$

若题目问「追上时的速度/时间/距离」，先解 $t$，再回代求所需量．

若两物体都在同一直线上运动，定义相对量：

$$
\Delta x_{A/B}=x_A-x_B,\qquad v_{A/B}=v_A-v_B,\qquad a_{A/B}=a_A-a_B.
$$

那么「追及/相遇」就变成相对位移为 0．

??? note "相对速度的直观"
    若 $v_{A/B}>0$，意味着 A 相对于 B 朝正方向「拉开」；  
    若 $v_{A/B}<0$，意味着 A 相对于 B 在「靠近」（但仍需结合相对位置判断是否会相遇）．

例如，A 位于 $x_A(0)=0$ 并以 $6\,\mathrm{m/s}$ 向正方向运动，B 位于 $x_B(0)=20\,\mathrm m$ 并以 $4\,\mathrm{m/s}$ 同向运动．相对速度为 $2\,\mathrm{m/s}$，初始间距为 $20\,\mathrm m$，因此 A 在 $10\,\mathrm s$ 后追上 B．若相对速度不指向缩小初始间距的方向，则即使其绝对值非零也不会在未来相遇．
