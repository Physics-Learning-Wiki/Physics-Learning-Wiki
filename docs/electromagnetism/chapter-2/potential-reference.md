---
title: 电势、电势差与参考零点
page_id: electromagnetism.electrostatics.chapter-2.potential-reference
status: draft
author: Physics Learning Wiki Team
description: 由保守场定义电势差与电势能，说明参考零点、无限模型和电子伏特的含义．
prerequisites:
  - electric-field
---

本页属于 [第 2 章：电势与静电场方程](./index.md)，是本章第 2 个专题．

## 把路径积分压缩成两个数的差

环路定理使场的路径积分只与端点有关，因此可以给每个位置赋一个标量[电势](concept:electric-potential)．先修是静电场做功和势能；本页应让你能在电势差、场力功和势能变化之间正确转换．

## 定义与符号

选定参考点 $O$ 的电势 $\varphi(O)$，定义：

$$
\varphi(B)-\varphi(A)=-\int_A^B\boldsymbol E\cdot\mathrm{d}\boldsymbol l,
\qquad U_{AB}=\varphi_A-\varphi_B
$$

对处于给定外场中的试验电荷 $q$，势能变化为 $\Delta W=q(\varphi_B-\varphi_A)$，场力功为 $A_{A\to B}=qU_{AB}=-\Delta W$．电势是场的标量描述，势能还与被放入的电荷有关．$1\,\mathrm V=1\,\mathrm{J/C}$；电子伏特是能量单位，$1\,\mathrm{eV}=e\times1\,\mathrm V$，不是电势单位．

## 零点选择改变什么

整体变换 $\varphi\mapsto\varphi+C$ 不改变电势差与电场．有限局域电荷系通常可令无穷远零势，得到点电荷势 $\varphi=kQ/r$．但无限直线场按 $1/s$ 衰减，积分到无穷远对数发散：

$$
\varphi(s)-\varphi(s_0)=-\dfrac{\lambda}{2\pi\varepsilon_0}\ln\dfrac{s}{s_0}
$$

必须选有限参考半径 $s_0$．无限平面的势随距离线性变化，同样不能要求无穷远为零．「接地」在导体问题中意味着允许交换电荷并将电势固定到选定基准，不能仅理解为给一个孤立体系随意换零点．

## 完整例题：场为零与势为零

均匀薄球壳半径 $R$，总电荷 $Q$，无穷远零势．内部场为零，故内部势为常数；由外侧点电荷形式及连续性得 $\varphi_{\mathrm{in}}=kQ/R$．内部势不为零却没有电场．

相反，异号电荷偶极子的中垂面上电势为零，两电荷的势相消；但场的垂直分量同向叠加，所以电场非零．数值等于零与空间变化率等于零是两件不同的事．

## 即时辨析与迁移练习

正电荷自发沿电场运动时势能减小；负电荷受力方向反向，不能把「沿电场势减小」直接改写为「所有电荷的势能都沿电场减小」．

已知 $\varphi_A=5\,\mathrm V$，$\varphi_B=-2\,\mathrm V$．将电荷 $-3\,\mathrm{nC}$ 从 $A$ 移到 $B$，求场力功及势能变化，再把所有电势加 $10\,\mathrm V$ 比较．

??? note "参考解答"
    $U_{AB}=7\,\mathrm V$，场力功为 $-21\,\mathrm{nJ}$，势能增加 $21\,\mathrm{nJ}$．整体加常数后这两个结果均不变．若写单个电荷势能的绝对数值，则也须同步说明其能量零点．

## 学习衔接

前一页：[静电场的功与环路定理](./work-circulation.md)；下一页：[电势的计算](./potential-calculation.md)．
