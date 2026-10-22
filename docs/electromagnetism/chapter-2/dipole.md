---
title: 电偶极子的完整远场
page_id: electromagnetism.electrostatics.chapter-2.dipole
status: draft
author: Physics Learning Wiki Team
description: 由有限偶极子的精确电势推导完整远场，核对球坐标分量、特殊方向和近似误差．
prerequisites:
  - gradient
  - electric-potential
---

本页属于 [第 2 章：电势与静电场方程](./index.md)，是本章第 7 个专题．

## 从两条特殊线推广到整个空间

第一章直接计算了有限偶极子的轴线和中垂面场．现在用标量势，先作远场展开，再一次求出所有方向．本页要求你能分清有限尺寸偶极子的精确解与理想偶极近似．先修是电势叠加、梯度与一阶 Taylor 展开．

## 精确电势与领先项

两电荷 $\pm q$ 位于 $\pm\boldsymbol l/2$，偶极矩 $\boldsymbol p=q\boldsymbol l$ 从负端指向正端．无穷远零势时：

$$
\varphi(\boldsymbol r)=kq\left(\dfrac1{|\boldsymbol r-\boldsymbol l/2|}
-\dfrac1{|\boldsymbol r+\boldsymbol l/2|}\right)
$$

当 $r\gg l$，分别将倒数距离展开为 $r^{-1}\pm(\hat{\boldsymbol r}\cdot\boldsymbol l)/(2r^2)+\cdots$，单极项抵消，留下：

$$
\varphi_{\mathrm{dip}}=k\dfrac{\boldsymbol p\cdot\hat{\boldsymbol r}}{r^2}
=\dfrac{kp\cos\theta}{r^2}
$$

以中点为原点的这对反号等量电荷，偶数阶矩消失，下个非零项为三阶，势的绝对修正为 $O(kql^3/r^4)$．在领先项恰好为零的方向，不宜用除以领先项的相对误差作统一估计．

## 由势求完整矢量场

取 $\boldsymbol p=p\boldsymbol e_z$，由球坐标负梯度：

$$
E_r=\dfrac{2kp\cos\theta}{r^3},\qquad
E_\theta=\dfrac{kp\sin\theta}{r^3},\qquad E_\phi=0
$$

再用 $\boldsymbol p=p\cos\theta\boldsymbol e_r-p\sin\theta\boldsymbol e_\theta$，得到与坐标选择无关的表达：

$$
\boldsymbol E_{\mathrm{dip}}=\dfrac{k}{r^3}
\left[3(\boldsymbol p\cdot\hat{\boldsymbol r})\hat{\boldsymbol r}-\boldsymbol p\right],
\qquad E=\dfrac{kp}{r^3}\sqrt{1+3\cos^2\theta}
$$

这些表达在偶极源之外使用．它们描述有限偶极子的远场，或在 $l\to0,q\to\infty$ 且 $p$ 固定的理想化中描述点偶极源外的场．

## 完整例题：与直接积分结果交叉检验

正轴 $z>a$、$l=2a$ 的精确场为 $4kqaz/(z^2-a^2)^2$．整理为：

$$
E_z=\dfrac{2kp}{z^3}\left(1-\dfrac{a^2}{z^2}\right)^{-2}
\simeq\dfrac{2kp}{z^3}\left(1+\dfrac{2a^2}{z^2}+\cdots\right)
$$

远场领先项与上式在 $\theta=0$ 的结果一致．中垂面 $\theta=\pi/2$ 则场反向于 $\boldsymbol p$，大小 $kp/r^3$，与第一章精确结果的远场一致．在负轴，矢量仍沿 $\boldsymbol p$，不能用带符号的 $z^{-3}$ 代替径向距离的 $r^{-3}$．

## 即时辨析与迁移练习

水分子等体系可具有偶极矩，但宏观介质加热涉及随时间变化的外场和损耗；静态偶极公式本身不能解释加热速率．

取轴线上 $z=10a$，估计用偶极领先项代替精确有限偶极场的误差量级，并说明怎样提高精度．

??? note "参考解答"
    修正相对领先项约为 $2a^2/z^2=0.02$，即百分之二量级．可保留下一项，或直接使用有限偶极精确式．检验的关键是尺寸与距离比值，而不是电荷本身大小．

## 学习衔接

前一页：[调和电势与静电平衡稳定性](./harmonic-stability.md)；下一页：[电四极子与多极展开](./multipoles.md)．
