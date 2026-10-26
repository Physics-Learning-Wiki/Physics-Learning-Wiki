---
status: review
author: Physics Learning Wiki Team
description: 从达朗贝尔原理和两个运动学恒等式完整推导拉格朗日方程，说明独立坐标、位置势能和非保守力的适用条件．
prerequisites:
  - generalized-force
  - ideal-constraint
---

<a id="拉格朗日力学"></a>

## 拉格朗日方程

达朗贝尔原理把动力学投影到容许方向，但如果每道题都重新计算所有质点的加速度，步骤仍然繁琐．动能能否把这些惯性项统一组织起来？拉格朗日方程就是这一重写的结果．

本页保留从 [达朗贝尔原理](dalembert-principle.md) 到方程的完整推导．需要会求偏导和复合函数的时间导数；不要求先学变分法．读完应能解释方程的条件，并从给定的动能、势能建立运动方程．

## 推导的模型与条件

考虑惯性参考系中的 $N$ 个恒定质量质点，位置为 $\boldsymbol r_i$，质量为 $m_i$．约束完整且理想，在坐标有效区域内选取 $n$ 个独立坐标 $q_\alpha$：

$$
\boldsymbol r_i=\boldsymbol r_i(q,t),\qquad
T(q,\dot q,t)=\dfrac12\sum_i m_i\boldsymbol v_i^2
$$

$T$ 为总动能，$q$、$\dot q$ 分别表示全部坐标和广义速度．坐标映射可以显含时间，因此包括已知运动的完整约束．本页假定映射足够光滑，能交换所用偏导次序．

???+ warning "先修不是把公式背下来"
    必须先确认所选坐标独立、约束理想、模型仍处于该约束有效区域．未知的非理想反力、非完整速度限制和接触切换，不能在普通独立坐标方程里无说明地略去．

## 两个运动学恒等式

对位置求全时间导数：

$$
\boldsymbol v_i
=\sum_\beta\dfrac{\partial\boldsymbol r_i}{\partial q_\beta}\dot q_\beta
+\dfrac{\partial\boldsymbol r_i}{\partial t}
$$

把 $\boldsymbol v_i$ 看成 $q,\dot q,t$ 的函数，对 $\dot q_\alpha$ 求偏导时，固定所有 $q$、$t$ 和其他速度，得到第一个恒等式：

$$
\dfrac{\partial\boldsymbol v_i}{\partial\dot q_\alpha}
=\dfrac{\partial\boldsymbol r_i}{\partial q_\alpha}
$$

第二个恒等式来自对同一速度表达式求 $q_\alpha$ 偏导：

$$
\dfrac{\partial\boldsymbol v_i}{\partial q_\alpha}
=\sum_\beta\dfrac{\partial^2\boldsymbol r_i}{\partial q_\alpha\partial q_\beta}\dot q_\beta
+\dfrac{\partial^2\boldsymbol r_i}{\partial q_\alpha\partial t}
=\dfrac{\mathrm d}{\mathrm dt}\left(\dfrac{\partial\boldsymbol r_i}{\partial q_\alpha}\right)
$$

最后一个等号是对 $\partial\boldsymbol r_i/\partial q_\alpha$ 沿真实运动求全导数，包含坐标变化和显式时间变化．它并不是任意函数上全导数与偏导都可随意交换的声明．

### 为什么偏导时能固定广义速度

真实运动上 $\dot q$ 是 $q(t)$ 的导数，但写 $T(q,\dot q,t)$ 时，考虑的是不同位形、不同速度的可能状态．在这一状态变量表达中，可分别改变某个坐标或某个速度来求偏导．沿一条真实轨迹求全导数时，才要同时追踪它们的时间变化．

例如单摆 $T=ml^2\dot\theta^2/2$，求 $\partial T/\partial\theta$ 时固定 $\dot\theta$，结果为零．不能先把某个特定解的 $\dot\theta(\theta)$ 代入，再把那条轨迹上的导数当成这个偏导．

若惯性系数依赖位置，例如 $T=a(q)\dot q^2/2$，两个操作的区别就更加明显：

$$
\dfrac{\partial T}{\partial q}=\dfrac12a'(q)\dot q^2,\qquad
\dfrac{\mathrm d}{\mathrm dt}\dfrac{\partial T}{\partial\dot q}
=a(q)\ddot q+a'(q)\dot q^2.
$$

相减后惯性项为 $a(q)\ddot q+a'(q)\dot q^2/2$，并非总是「常数乘广义加速度」．后面研究平衡附近的小振动时，才会在明确的阶数近似下把惯性系数取为常数．

## 从惯性投影重写为动能导数

达朗贝尔原理已经给出每个独立坐标方向上的关系

$$
\sum_i m_i\ddot{\boldsymbol r}_i\cdot
\dfrac{\partial\boldsymbol r_i}{\partial q_\alpha}=Q_\alpha,
$$

其中 $Q_\alpha$ 是主动力的广义力．对左侧使用乘积求导，并代入刚才两个恒等式：

$$
\begin{aligned}
\sum_i m_i\ddot{\boldsymbol r}_i\cdot\dfrac{\partial\boldsymbol r_i}{\partial q_\alpha}
&=\dfrac{\mathrm d}{\mathrm dt}\sum_i m_i\boldsymbol v_i\cdot\dfrac{\partial\boldsymbol r_i}{\partial q_\alpha}
-\sum_i m_i\boldsymbol v_i\cdot\dfrac{\mathrm d}{\mathrm dt}\dfrac{\partial\boldsymbol r_i}{\partial q_\alpha}\\
&=\dfrac{\mathrm d}{\mathrm dt}\sum_i m_i\boldsymbol v_i\cdot\dfrac{\partial\boldsymbol v_i}{\partial\dot q_\alpha}
-\sum_i m_i\boldsymbol v_i\cdot\dfrac{\partial\boldsymbol v_i}{\partial q_\alpha}
\end{aligned}
$$

由动能的定义，分别求偏导有

$$
\dfrac{\partial T}{\partial\dot q_\alpha}
=\sum_i m_i\boldsymbol v_i\cdot\dfrac{\partial\boldsymbol v_i}{\partial\dot q_\alpha},
\qquad
\dfrac{\partial T}{\partial q_\alpha}
=\sum_i m_i\boldsymbol v_i\cdot\dfrac{\partial\boldsymbol v_i}{\partial q_\alpha}
$$

于是惯性项全部被动能组织起来，得到动能形式的 **第二类拉格朗日方程**：

$$
\boxed{\dfrac{\mathrm d}{\mathrm dt}\dfrac{\partial T}{\partial\dot q_\alpha}
-\dfrac{\partial T}{\partial q_\alpha}=Q_\alpha},\qquad \alpha=1,\ldots,n
$$

共有 $n$ 个方程，正好对应 $n$ 个独立坐标．这一形式仍能容纳没有写成势能的主动力．

## 把位置势能并入拉格朗日量

若主动力的保守部分有势能 $V(q,t)$，且不含速度，则 $Q_\alpha^{\rm cons}=-\partial V/\partial q_\alpha$．定义 **拉格朗日量（Lagrangian）**

$$
L(q,\dot q,t)=T(q,\dot q,t)-V(q,t)
$$

由于 $\partial V/\partial\dot q_\alpha=0$，把势能项移到左侧，即得

$$
\boxed{\dfrac{\mathrm d}{\mathrm dt}\dfrac{\partial L}{\partial\dot q_\alpha}
-\dfrac{\partial L}{\partial q_\alpha}=0}
$$

这就是本模型的 **欧拉—拉格朗日方程（Euler–Lagrange equation）**．若还有额外主动力，其广义力记作 $Q_\alpha^{\rm extra}$，则右侧改为 $Q_\alpha^{\rm extra}$．不能一面把某个力计入势能，一面又在右边重复加入它．

???+ note "例题：用角度直接建立单摆方程"
    固定悬点、不可伸长轻杆、质量 $m$、杆长 $l$、均匀重力，无阻力．坐标与前页一致，$\theta=0$ 指向下方．由位置映射可得速度平方 $v^2=l^2\dot\theta^2$．取悬点高度为势能零点：
    
    $$
    T=\dfrac12ml^2\dot\theta^2,\qquad
    V=-mgl\cos\theta,\qquad
    L=\dfrac12ml^2\dot\theta^2+mgl\cos\theta
    $$
    
    分别计算 $\partial L/\partial\dot\theta=ml^2\dot\theta$、$\partial L/\partial\theta=-mgl\sin\theta$，得到
    
    $$
    ml^2\ddot\theta+mgl\sin\theta=0
    $$
    
    两项都是力矩，正摆角对应负角加速度．除以 $ml^2$ 后，与达朗贝尔投影法完全一致．杆力没有进入 $L$，原因是它属于已通过坐标与理想约束消去的反力．

## 方程与作用量的后续连接

本页的推导是「牛顿方程 → 理想约束的投影 → 动能导数」，没有先假设作用量原理．下一阶段会研究 $S[q]=\int L\,\mathrm dt$ 的驻值条件如何给出同一方程，并讨论对称性和守恒量．通用数学推导见 [变分法](../../math/variational-methods/calculus-of-variations.md)．「平稳」是一阶变分为零，不保证作用量一定最小．

牛顿力学也能使用曲线坐标；分析力学的优势在于用统一程序处理独立参数与约束，而不是牛顿方程只能用直角坐标．另一方面，任意写下一个函数并称它为 $L$，并不能保证它描述了所研究的物理系统．

## 文内自测

1. 在极坐标中 $T=m(\dot r^2+r^2\dot\theta^2)/2$，为什么 $\partial T/\partial r$ 不是零？写出径向惯性项．

??? note "自测一解答"
    固定 $\dot r,\dot\theta$ 后，动能仍通过 $r^2\dot\theta^2$ 依赖 $r$．因此 $\partial T/\partial r=mr\dot\theta^2$，$\partial T/\partial\dot r=m\dot r$，径向方程左侧为 $m\ddot r-mr\dot\theta^2$，正好包含向心项．

2. 将单摆势能改为 $V'=mgl(1-\cos\theta)$，运动方程会改变吗？

??? note "自测二解答"
    不会．$V'=V+mgl$ 只改变零点，$L'=L-mgl$ 与原来相差常量，相关偏导不变．但额外驱动力必须单独处理，不能通过改变势能零点消除．

## 继续学习与参考资料

上一页：[达朗贝尔原理与广义力](dalembert-principle.md)．下一页：[拉格朗日建模实例](lagrangian-modeling.md)，学习从模型构造 $L$ 的全过程．

- 高显，《经典力学》，科学出版社，2023 年．
- [David Tong，Classical Dynamics：The Lagrangian Formalism](https://www.damtp.cam.ac.uk/user/tong/dynamics/dynhtml/S2.html)．
