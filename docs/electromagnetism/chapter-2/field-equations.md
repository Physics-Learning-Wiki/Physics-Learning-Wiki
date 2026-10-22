---
title: 静电场的局域方程
page_id: electromagnetism.electrostatics.chapter-2.field-equations
status: draft
author: Physics Learning Wiki Team
description: 以微小体积和回路引入散度旋度，转换静电积分规律并得到泊松方程及简单边值解．
prerequisites:
  - gauss-law
  - gradient
---

本页属于 [第 2 章：电势与静电场方程](./index.md)，是本章第 5 个专题．

## 整体规律如何约束每一点

高斯定理约束闭合面通量，环路定理约束闭合路径积分．把它们缩小到局部，就得到场的微分方程．本页要求你理解局域方程提供的信息，并用一维泊松方程求解，而不是把数学算子当成新物理定律．先修为偏导、体积分和梯度．

## 散度：单位体积的净通量

对边长很小的直角盒子，$x$ 方向两面的净通量为 $[E_x(x+\Delta x)-E_x(x)]\Delta y\Delta z$．三个方向相加再除以体积，取极限得：

$$
\nabla\cdot\boldsymbol E=\partial_xE_x+\partial_yE_y+\partial_zE_z
=\lim_{\Delta V\to0}\dfrac1{\Delta V}\oint_{\partial\Delta V}\boldsymbol E\cdot\mathrm{d}\boldsymbol S
$$

在足够光滑区域，[散度定理](../../math/vector-analysis/integral-theorems.md)把有限体积的通量变为散度积分．再结合经验高斯定理及体积任意性，得到 $\nabla\cdot\boldsymbol E=\rho/\varepsilon_0$．数学定理只负责两种表达之间的转换，不给出右侧的物理源项．

## 旋度：单位面积的定向环流

对 $xy$ 平面内的小矩形，按右手规则取正向，四边积分的一阶差为 $(\partial_xE_y-\partial_yE_x)\Delta x\Delta y$．这定义了旋度的 $z$ 分量；循环置换得到其余分量．Stokes 定理为：

$$
\oint_{\partial S}\boldsymbol E\cdot\mathrm{d}\boldsymbol l
=\int_S(\nabla\times\boldsymbol E)\cdot\mathrm{d}\boldsymbol S
$$

静电环路积分为零，所以光滑处 $\nabla\times\boldsymbol E=\boldsymbol0$．反向从旋度零推出全局单值势，通常还要求区域单连通或所有不可收缩环路的环流为零．点电荷处经典微分场不光滑；可用挖去奇点的区域、积分形式，或进一步用分布处理，不能直接把奇点代进普通导数公式．

## 电势方程与边界

将 $\boldsymbol E=-\nabla\varphi$ 代入散度方程：

$$
\nabla^2\varphi=-\dfrac\rho{\varepsilon_0},\qquad
\nabla^2=\partial_x^2+\partial_y^2+\partial_z^2
$$

这就是[泊松方程](concept:poisson-equation)；无体电荷处为拉普拉斯方程 $\nabla^2\varphi=0$．已知散度、旋度通常还不足以确定区域内的场，例如零场与任意匀强场都有零散度、零旋度．边界及远处条件补足信息．相关 Helmholtz 分解也依赖区域、光滑性和边界或衰减条件，不能理解为无条件的局部唯一性．

## 完整例题：均匀空间电荷的两板间隙

取无限横向平移不变模型，$0<z<d$ 内体密度为常数 $\rho$，板电势为 $0,V$．两次积分 $\varphi''=-\rho/\varepsilon_0$，再施加边界条件：

$$
\varphi(z)=\dfrac{Vz}{d}+\dfrac{\rho}{2\varepsilon_0}z(d-z),\qquad
E_z=-\dfrac Vd-\dfrac{\rho}{2\varepsilon_0}(d-2z)
$$

检验两端势正确，$\mathrm{d}E_z/\mathrm{d}z=\rho/\varepsilon_0$；$\rho\to0$ 时恢复匀强场．解的线性项来自边界，曲率来自体电荷．

## 即时辨析与迁移练习

无电荷处场一定为零吗？不一定，右端为零只要求场的散度为零．

验证均匀带电实心球内部 $\varphi=kQ(3-r^2/R^2)/(2R)$ 满足泊松方程．

??? note "参考解答"
    球对称函数的拉普拉斯为 $r^{-2}\mathrm{d}(r^2\mathrm{d}\varphi/\mathrm{d}r)/\mathrm{d}r$，得 $-3kQ/R^3=-\rho/\varepsilon_0$．球外对 $kQ/r$ 得零，但原点点电荷势若作为全空间模型，不能把原点奇性也当作零源．

## 学习衔接

前一页：[等势面与电势梯度](./potential-gradient.md)；下一页：[调和电势与静电平衡稳定性](./harmonic-stability.md)．
