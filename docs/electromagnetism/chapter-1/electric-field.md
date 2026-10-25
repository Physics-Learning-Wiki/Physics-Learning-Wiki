---
title: 电场、叠加与电场线
page_id: electromagnetism.electrostatics.chapter-1.electric-field
status: draft
author: Physics Learning Wiki Team
description: 用试验电荷定义电场，建立叠加与场线图像，并精确计算有限电偶极子的轴线和中垂线场．
prerequisites:
  - coulombs-law
---

本页属于 [第 1 章：电荷与静电场](./index.md)，是本章第 2 个专题．

## 把空间的性质与探针的性质分开

上一页用库仑定律计算两个点电荷之间的力．现在固定源电荷的位置和电荷量，在同一场点 $P$ 先后放入不同的静止小试验电荷；这里的「小」指它对源分布的扰动可以忽略．

若正试验电荷 $q$ 在 $P$ 受到向右的电力，大小为 $F$，换成 $2q$，力变为同向的 $2F$；换成 $-q$，力反向，大小仍为 $F$．取向右为正，比较的是同一静电模型中的预测，不是一组实测数据：

| 试验电荷量 | 电力分量 | 力与电荷量的比值 |
| ----- | ---- | -------- |
| $q$   | $F$  | $F/q$    |
| $2q$  | $2F$ | $F/q$    |
| $-q$  | $-F$ | $F/q$    |

受力随探针改变，比值却描述了固定源在这个位置的共同影响．我们把这一矢量定义为 [电场强度](concept:electric-field)：

$$
\boldsymbol E(\boldsymbol r)=\lim_{q_0\to0}\dfrac{\boldsymbol F_{\mathrm{source}}(\boldsymbol r)}{q_0}.
$$

$\boldsymbol r$ 是场点，$\boldsymbol F_{\mathrm{source}}$ 是源对探针的电力，不包含探针自身的场力．极限表示忽略探针扰动的经典理想化，不是断言真实孤立电荷可以连续小于元电荷．电场单位为 $\mathrm{N/C}$，方向定义为正试验电荷受力的方向．

知道场以后，足够弱的静止探针所受电力为

$$
\boldsymbol F_{\mathrm{source}}=q_0\boldsymbol E.
$$

负探针的受力与场反向，不意味着场方向随它翻转．若探针明显改变了导体上的源电荷分布，就应重新确定源分布，不能继续使用原场．这样我们分开了「给定源在空间各处产生什么场」与「具体电荷放在那里受到什么力」两个问题．

## 叠加原理与场线

对给定的静态点电荷系，源点 $\boldsymbol r_i$ 不随探针改变：

$$
\boldsymbol E(\boldsymbol r)=k\sum_iq_i
\dfrac{\boldsymbol r-\boldsymbol r_i}{|\boldsymbol r-\boldsymbol r_i|^3}
$$

必须叠加矢量而非大小．若导体中的源电荷会移动，应先确定新的平衡分布，再叠加各部分的场．场线切向给出场方向，约定单位垂直面积的线数反映大小；这是一种绘图约定．静电场线在普通非零场点不能交叉，不表示粒子的运动轨迹，也不直接表示传播过程．从力的描述改用场，使每个空间位置都有可讨论的物理量；场能及有限传播速度将在后续理论中进一步说明．

[![按有限偶极子的精确库仑场积分得到的场线](./images/dipole-lines.svg)](./images/dipole-lines.svg)

## 完整例题：有限电偶极子的两条特殊线

电荷量为 $-q$ 的点源在 $z=-a$，电荷量为 $+q$ 的点源在 $z=a$，其中 $q>0$、$a>0$，定义 $\boldsymbol p=2qa\boldsymbol e_z$．先求轴线正侧 $z>a$，再求中垂面上距中心 $s$ 的位置．轴线上：

$$
\boldsymbol E(z)=kq\left[\dfrac{1}{(z-a)^2}-\dfrac{1}{(z+a)^2}\right]\boldsymbol e_z
=\dfrac{4kqaz}{(z^2-a^2)^2}\boldsymbol e_z
$$

在中垂面上任选场点 $P$，令它距中心为 $s$，并取 $q>0$、$a>0$．在包含 $P$ 与 $z$ 轴的平面中，两源到场点的距离相同：

$$
b=\sqrt{s^2+a^2}.
$$

正源在上，它的场背离正源；负源在下，它的场指向负源．所以横向分量相消，轴向分量都沿 $-\boldsymbol e_z$．每个源的场强大小为 $kq/b^2$，轴向投影还要乘几何因子 $a/b$，一个源贡献的分量是

$$
E_{z,1}=-\dfrac{kq}{b^2}\dfrac{a}{b}.
$$

两源相加，得到

$$
\boldsymbol E(s)=-\dfrac{2kqa}{(s^2+a^2)^{3/2}}\boldsymbol e_z.
$$

分母的三次方中，两次反比来自单源库仑场，另一次来自投影．中心 $s=0$ 时，场为 $-2kq\boldsymbol e_z/a^2$；总电荷为零仍不意味着中心场为零．在 $s\gg a$ 时，结果趋于 $-kp\boldsymbol e_z/s^3$，其中 $p=2qa$．

轴线公式仅写了 $z>a$ 分支，不可把带符号的负轴坐标直接代入这个受限表达式．在 $z\gg a$ 时，轴线场趋于 $2kp\boldsymbol e_z/z^3$．两条特殊线的场都比单电荷的平方反比场衰减更快，因为总电荷为零，远场的单极项抵消．中垂面电势为零却存在电场，第二章将解释其原因．

## 即时辨析与迁移练习

在一个点总场为零，是否每个源的场也为零？不是．零是矢量合成的结果．电场线稀疏也不能说明那里没有电场．

在上面偶极子的中心放正试验电荷 $q_0$，求受力，并与把偶极子误当作总电荷为零的点源比较．

??? note "参考解答"
    中心到两电荷距离均为 $a$，两场均沿 $-\boldsymbol e_z$，因此 $\boldsymbol F=-2kqq_0\boldsymbol e_z/a^2$．「总电荷为零」只消除了远场单极项，不意味着处处无场，更不能把尺寸与观察距离相当的电荷系缩成一个点源．

## 学习衔接

前一页：[电荷与库仑定律](./charge-coulomb.md)；下一页：[连续电荷分布与积分建模](./continuous-charge.md)．
