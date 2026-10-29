---
title: 平衡附近的小振动
status: review
author: Physics Learning Wiki Team
description: 从单摆的势能展开建立小振动近似，说明质量矩阵、刚度矩阵与线性耦合方程的来源及适用条件．
prerequisites:
  - lagrangian
  - generalized-coordinate
page_id: mechanics.analytical.small-oscillations
learning_objectives:
  - id: mechanics.analytical.small-oscillations.equilibrium-curvature
    title: 区分平衡、非退化稳定与零二阶曲率
    anchor: analytical-equilibrium-curvature
  - id: mechanics.analytical.small-oscillations.energy-matrices
    title: 按阶数构造二次能量及质量和刚度矩阵
    anchor: analytical-energy-matrices
  - id: mechanics.analytical.small-oscillations.linear-system
    title: 从二次能量建立线性方程并检查正定性
    anchor: analytical-linear-system
assessments:
  - set: mechanics.analytical.small-oscillations.selftest
    placement: inline
    anchor: analytical-selftest
  - set: mechanics.analytical.small-oscillations.exercises
    placement: footer
---

## 从建立方程到求出运动

[双摆建模](lagrangian-modeling.md#例题二平面双摆) 已经给出了两条运动方程，但其中的三角函数和速度乘积使求解不再像单摆的小角度方程那样简单．若只研究双摆在下垂位置附近的轻微摆动，哪些项可以略去，又有哪些耦合必须留下？

本页先用单摆说明近似的依据，再推广到多自由度系统．目标是从给定的动能、势能构造两个常数矩阵，得到可求解的线性方程．需要会求偏导和二阶泰勒展开；矩阵乘法可回看 [矩阵](../../math/linear-algebra/matrix.md)．[线性振动](../oscillation-wave/linear-oscillation.md) 中的单自由度解将在下一页被反复使用．

<span id="analytical-equilibrium-curvature"></span>

## 平衡不一定意味着简谐振动

考虑固定约束下、只有位置势能的单自由度系统．以广义坐标 $q$ 描述位形，静止平衡位置 $q_0$ 满足

$$
V'(q_0)=0.
$$

这是 [虚功原理](virtual-work.md) 的平衡条件．令偏离平衡的量为 $\eta=q-q_0$，则

$$
V(q_0+\eta)=V(q_0)+\dfrac12V''(q_0)\eta^2+O(\eta^3).
$$

常数 $V(q_0)$ 只决定能量零点，一阶项因平衡条件消失．若 $V''(q_0)>0$，势能在附近向两侧升高，回复广义力的一阶近似为 $-V''(q_0)\eta$．线性回复作用因此来自势能的局部曲率，不要求原系统本来就是弹簧．

若 $V''(q_0)<0$，微小偏离受到的是远离平衡的作用，不能解释为稳定振动．若 $V''(q_0)=0$，二阶近似不足以判断：例如 $V=a\eta^4$ 与 $V=-a\eta^4$（$a>0$）有相同的零二阶项，前者有稳定极小值，后者没有．本组主线首先研究二阶曲率严格为正的非退化稳定平衡．

### 单摆：同一个近似如何出现在能量和方程中

沿用固定悬点、质量 $m$、长度 $l$ 的轻杆单摆，角度 $\theta$ 从竖直向下量起．原势能为 $-mgl\cos\theta$；现在加上常数 $mgl$，使下垂位置势能为零：

$$
T=\dfrac12ml^2\dot\theta^2,\qquad
V=mgl(1-\cos\theta)
=\dfrac12mgl\theta^2+O(\theta^4).
$$

在小角度和相应小角速度下，二次拉格朗日量为

$$
L^{(2)}=\dfrac12ml^2\dot\theta^2-\dfrac12mgl\theta^2.
$$

代入拉格朗日方程，得到 $ml^2\ddot\theta+mgl\theta=0$．这与先建立完整方程再用 $\sin\theta\approx\theta$ 的结果一致：对势能求一次坐标导数，二次势能就成为一次回复项．

这里的惯性系数是 $ml^2$，回复系数是 $mgl$，不能把两者直接读成「质量」与「弹簧劲度系数」．对于一般的

$$
T=\dfrac12a(q)\dot q^2,\qquad a(q_0)>0,
$$

二次近似给出

$$
a(q_0)\ddot\eta+V''(q_0)\eta=0,\qquad
\omega_0^2=\dfrac{V''(q_0)}{a(q_0)}.
$$

单摆代入后便是 $\omega_0^2=g/l$．比值的量纲为时间的负二次方，即使 $q$ 是角度而不是长度，这个检查仍然成立．

<span id="analytical-energy-matrices"></span>

## 多自由度系统的适用条件

以下考虑惯性参考系中的恒定质量质点系，约束定常、完整且理想．用 $s$ 个独立、局部正则的广义坐标表示位置：

$$
\boldsymbol r_i=\boldsymbol r_i(q_1,\ldots,q_s).
$$

主动力由不显含时间、也不含速度的势能 $V(q)$ 给出；研究的是静止平衡 $q_0$ 附近的自由运动．没有阻尼、外驱动或速度相关力．这比一般拉格朗日方程的适用范围更窄：移动约束、旋转中的相对平衡等问题不能直接套用下面的矩阵形式．

令 $\eta_\alpha=q_\alpha-q_{0\alpha}$．「小」是相对于模型的几何尺度而言，不要求不同量纲的坐标数值直接比较．可以设 $\eta_\alpha=\varepsilon u_\alpha(t)$，在固定时间尺度上让 $u_\alpha$ 及其导数保持有界，按共同的小参数 $\varepsilon$ 计数．因此 $\eta_\alpha$ 与 $\dot\eta_\alpha$ 都是一阶量．仅初始位移很小、初速度很大，并不满足这个假设．

### 势能的二次型与刚度矩阵

每个方向的平衡条件都是 $\partial V/\partial q_\alpha=0$．泰勒展开为

$$
V(q_0+\boldsymbol\eta)-V(q_0)
=\dfrac12\sum_{\alpha,\beta=1}^{s}
K_{\alpha\beta}\eta_\alpha\eta_\beta+O(\varepsilon^3),
\qquad
K_{\alpha\beta}=
\left.\dfrac{\partial^2V}{\partial q_\alpha\partial q_\beta}\right|_{q_0}.
$$

矩阵 $K$ 称为 **刚度矩阵**，即势能在平衡处的 Hessian 矩阵．足够光滑时混合偏导可交换，所以 $K$ 是实对称矩阵．它记录各坐标方向的曲率以及交叉回复作用：

$$
V^{(2)}=\dfrac12\boldsymbol\eta^{\mathsf T}K\boldsymbol\eta.
$$

上标 $\mathsf T$ 表示转置，$\boldsymbol\eta$ 是列向量．以两个坐标为例，展开后为

$$
V^{(2)}=\dfrac12K_{11}\eta_1^2+K_{12}\eta_1\eta_2
+\dfrac12K_{22}\eta_2^2.
$$

交叉项的系数是 $K_{12}$，因为求和中的两个相等项抵消了前面的 $1/2$．从能量「读矩阵」时，这是很容易多乘或漏乘二的地方．

### 动能为什么只需在平衡处取系数

定常坐标映射给出

$$
\boldsymbol v_i=\sum_\alpha
\dfrac{\partial\boldsymbol r_i}{\partial q_\alpha}\dot q_\alpha,
\qquad
T=\dfrac12\sum_{\alpha,\beta}a_{\alpha\beta}(q)
\dot q_\alpha\dot q_\beta,
$$

$$
a_{\alpha\beta}(q)=\sum_i m_i
\dfrac{\partial\boldsymbol r_i}{\partial q_\alpha}\cdot
\dfrac{\partial\boldsymbol r_i}{\partial q_\beta}.
$$

速度乘积已经是二阶量．若把系数展开成 $a_{\alpha\beta}(q_0)+O(\varepsilon)$，后面的修正乘上速度乘积至少为三阶，因此在二次动能中舍去．定义 **质量矩阵**

$$
M_{\alpha\beta}=a_{\alpha\beta}(q_0),\qquad
T^{(2)}=\dfrac12\dot{\boldsymbol\eta}^{\mathsf T}
M\dot{\boldsymbol\eta}.
$$

$M$ 是常数实对称矩阵．对于独立、正则坐标，非零广义速度必使至少一个有质量的质点运动，故 $T^{(2)}>0$，即 $M$ 正定．如果坐标冗余或处于坐标奇点，不能预先作出这个判断．

「质量矩阵」是惯性系数矩阵的名称，不表示每个元素都有千克单位．角坐标的对角元可以有转动惯量单位；长度与角度混合时，不同元素还可能有不同单位，但每一项动能必须具有能量单位．

<span id="analytical-linear-system"></span>

## 从二次能量得到线性耦合方程

将上面两式组合：

$$
L^{(2)}
=\dfrac12\dot{\boldsymbol\eta}^{\mathsf T}M\dot{\boldsymbol\eta}
-\dfrac12\boldsymbol\eta^{\mathsf T}K\boldsymbol\eta.
$$

由于矩阵对称且与时间无关，

$$
\dfrac{\partial L^{(2)}}{\partial\dot\eta_\alpha}
=\sum_\beta M_{\alpha\beta}\dot\eta_\beta,\qquad
\dfrac{\partial L^{(2)}}{\partial\eta_\alpha}
=-\sum_\beta K_{\alpha\beta}\eta_\beta.
$$

拉格朗日方程于是化为

$$
\boxed{M\ddot{\boldsymbol\eta}+K\boldsymbol\eta=0}.
$$

每一行是一条坐标方向上的方程．非对角元表示该坐标的方程还涉及其他坐标的位移或加速度；即使势能已没有交叉项，动能仍可能耦合，双摆就是这样的例子．

在本主线中还要求 $K$ 正定，即对任意非零实向量 $\boldsymbol z$ 都有 $\boldsymbol z^{\mathsf T}K\boldsymbol z>0$．不能只检查对角元：对于实对称二阶矩阵，正定要求 $K_{11}>0$ 且 $\det K>0$；更高阶可检查全部顺序主子式．这保证所有方向都有二阶回复作用．有零方向时，可能是整体平移，也可能需要高阶势能，下一页会区分．

### 一个读矩阵的小练习

若两个长度坐标的二次能量为

$$
T^{(2)}=\dfrac12m(\dot x_1^2+\dot x_2^2),\qquad
V^{(2)}=\dfrac12k x_1^2+\dfrac12k(x_2-x_1)^2+\dfrac12k x_2^2,
$$

先展开弹簧伸长的平方，再读出

$$
M=m\begin{pmatrix}1&0\\0&1\end{pmatrix},\qquad
K=k\begin{pmatrix}2&-1\\-1&2\end{pmatrix}.
$$

第一行方程是 $m\ddot x_1+2kx_1-kx_2=0$．当两个质点同向移动相同距离时，中间弹簧不伸长，回复力只来自两端弹簧；这个物理检查与矩阵方程一致．

## 文内自测

1. 某系统 $T=\tfrac12(m+a\eta)\dot\eta^2$，$V=\tfrac12k\eta^2+b\eta^3$，其中 $m,k>0$．二次近似保留哪些项？

??? note "核对：按总阶数计数"
    保留 $m\dot\eta^2/2$ 和 $k\eta^2/2$．$a\eta\dot\eta^2/2$ 与 $b\eta^3$ 均为三阶，线性方程为 $m\ddot\eta+k\eta=0$．需在足够小的区域内保证原惯性系数仍为正．
    
2. 已知 $K=\begin{pmatrix}1&2\\2&1\end{pmatrix}$（取一致单位），对角元都正，能否判为非退化稳定平衡？

??? note "核对：检查所有方向"
    不能．$\det K=-3<0$；沿 $\boldsymbol z=(1,-1)^{\mathsf T}$ 有 $\boldsymbol z^{\mathsf T}K\boldsymbol z=-2$，势能沿这一方向下降．

<span id="analytical-selftest"></span>

## 继续学习与参考资料

上一页：[非保守广义力与耗散](nonconservative-forces.md)．下一页：[简正模与简正坐标](normal-modes.md)，把耦合方程化成独立振子．返回 [分析力学导读](index.md)．

- [David Tong，Classical Dynamics，§2.6 Small Oscillations and Stability](https://www.damtp.cam.ac.uk/user/tong/dynamics/dynhtml/S2.html#S2.SS6)．
