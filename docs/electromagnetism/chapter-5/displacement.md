---
title: 电位移与本构关系
page_id: electromagnetism.electrostatics.chapter-5.displacement
status: draft
author: Physics Learning Wiki Team
description: 由总电荷高斯方程定义电位移，联立线性本构关系求介质场并说明辅助场的适用边界．
prerequisites:
  - bound-charge
  - gauss-law
---

本页属于 [第 5 章：电介质](./index.md)，是本章第 4 个专题．

## 用自由电荷整理总场方程

总电场由自由与束缚电荷共同产生，但束缚电荷已经可以用 $\boldsymbol P$ 表示．将它移到方程左边，能得到方便的宏观辅助量[电位移](concept:electric-displacement)．本页要求你把它与电场、极化联立使用，而不是另造一条无条件的库仑定律．

## 定义与高斯关系

从总电荷方程 $\varepsilon_0\nabla\cdot\boldsymbol E=\rho_f+\rho_b$ 和 $\rho_b=-\nabla\cdot\boldsymbol P$，得到：

$$
\boldsymbol D=\varepsilon_0\boldsymbol E+\boldsymbol P,
\qquad \nabla\cdot\boldsymbol D=\rho_f,
\qquad \oint_S\boldsymbol D\cdot\mathrm{d}\boldsymbol S=Q_{f,\mathrm{enc}}
$$

$\boldsymbol D$ 的单位是 $\mathrm{C/m^2}$．它的散度由自由电荷决定，但旋度与边界信息并没有因此自动确定．一般 $\nabla\times\boldsymbol D=\nabla\times\boldsymbol P$，未必为零；所以不能普遍把 $\boldsymbol D$ 当作仅由自由电荷按库仑形式求出的场．

## 线性各向同性本构

在局部、线性、各向同性静态模型中，宏观响应为：

$$
\boldsymbol P=\varepsilon_0\chi_e\boldsymbol E,\qquad
\boldsymbol D=\varepsilon\boldsymbol E,\qquad
\varepsilon=\varepsilon_0(1+\chi_e)=\varepsilon_0\varepsilon_r
$$

这里 $\boldsymbol E$ 是总的宏观场．材料若分段均匀，$\varepsilon$ 在各区不同；一般空间变化时，势方程为 $\nabla\cdot(\varepsilon\nabla\varphi)=-\rho_f$，不能从散度中提出一个并非常数的 $\varepsilon$．各向异性响应需张量，非线性或有滞回时也不能继续用一个标量常数概括．

## 完整例题：介质充满的同轴电容器

半径 $a<b$ 的同轴长电容器完全填充常数 $\varepsilon$ 的线性介质，内导体自由线密度 $\lambda$，外导体相反．由完整柱对称性及电位移高斯关系：

$$
D_s=\dfrac{\lambda}{2\pi s},\qquad
E_s=\dfrac{\lambda}{2\pi\varepsilon s},\qquad
P_s=\dfrac{\varepsilon-\varepsilon_0}{\varepsilon}\dfrac{\lambda}{2\pi s}
$$

介质内部 $\nabla\cdot\boldsymbol P=0$；内界面介质外法向为 $-\boldsymbol e_s$，所以束缚面密度为负，外界面为正．电压 $U=\lambda\ln(b/a)/(2\pi\varepsilon)$，得 $C'=2\pi\varepsilon/\ln(b/a)$．令 $\varepsilon\to\varepsilon_0$，恢复真空结果．

## 均匀极化球的自洽回应

利用上一页球内场关系，并要求 $\boldsymbol P=\varepsilon_0\chi_e\boldsymbol E$：

$$
\boldsymbol E=\boldsymbol E_0-\dfrac{\chi_e}{3}\boldsymbol E
\quad\Longrightarrow\quad
\boldsymbol E=\dfrac{3}{\varepsilon_r+2}\boldsymbol E_0
$$

同一种介质在板、球等不同几何中的内部场减弱因子不同，不能一律写成外场除以 $\varepsilon_r$．

## 即时辨析与迁移练习

介质中没有自由电荷，是否 $\boldsymbol D=0$？只知其散度为零，不能推出场为零．

无穷大线性介质板夹在固定自由面密度 $\pm\sigma_f$ 的极板之间，求 $D,E,P$；若固定的是电压，哪些量需要重新确定？

??? note "参考解答"
    完全填充且忽略边缘时，$D=\sigma_f$，$E=\sigma_f/\varepsilon$，$P=(1-\varepsilon_0/\varepsilon)\sigma_f$．若固定电压和间距，$E=U/d$ 不变，自由面电荷随 $\varepsilon$ 改变．「插入介质总会减小电场」缺少电源约束．

## 学习衔接

前一页：[极化电荷产生的附加场](./polarization-field.md)；下一页：[介质界面与静电场求解](./interfaces.md)．
