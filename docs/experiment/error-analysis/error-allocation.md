---
assessments:
- placement: footer
  set: experiment.error-analysis.error-allocation
author: Physics Learning Wiki Team
description: 从总目标反推输入要求，按等贡献与实现成本分配预算，定量判断微小分量，并比较模型与工作点．
learning_objectives:
- anchor: course-concepts
  id: experiment.error-analysis.error-allocation.concepts
  title: 误差分配与测量方案优化：辨认概念与适用条件
- anchor: course-calculation
  id: experiment.error-analysis.error-allocation.calculation
  title: 误差分配与测量方案优化：完成定量计算并检查单位
- anchor: course-analysis
  id: experiment.error-analysis.error-allocation.analysis
  title: 误差分配与测量方案优化：说明方法、结果与限制
page_id: experiment.error-analysis.error-allocation
prerequisites:
- uncertainty-propagation
status: review
title: 误差分配与测量方案优化
---

本页为进阶专题；首次学习可先完成导读中的基础路线，再回到这里补齐推导与应用．

## 本页学习目标

<span id="course-concepts"></span>

误差分配与测量方案优化：辨认概念与适用条件．

<span id="course-calculation"></span>

误差分配与测量方案优化：完成定量计算并检查单位．

<span id="course-analysis"></span>

误差分配与测量方案优化：说明方法、结果与限制．

## 达到目标需要怎样的仪器

学习目标：把正向传播反过来用于设计，并说明什么条件下能舍去某一项．先读 [传播篇](uncertainty-propagation.md)．本页假设分量不相关且一阶近似适用；相关项显著时须使用完整预算．

## 从总预算反推分项

令 $q_i=|c_i|u_i$ 为各输入传到输出的标准不确定度贡献．目标 $u_c\leq u_*$ 要求 $\sum_i q_i^2\leq u_*^2$．已分配其他输入后，第 $j$ 项必须满足

$$
u_j\leq\frac{\sqrt{u_*^2-\sum_{i\ne j}q_i^2}}{|c_j|}.
$$

根号内为负表示目标已被其他项用尽，不能给该项填零来掩盖不可行性．若目标用扩展不确定度表达，应先明确包含因子，不能混用标准量和范围限值．

## 等作用原则与成本调整

对 $m$ 个可调整独立分量，先给每项相同输出贡献 $q_i=u_*/\sqrt m$，得到 $u_i=u_*/(\sqrt m|c_i|)$．相等的是输出贡献，不是各输入的原始不确定度；各输入可能单位不同．

例：测面积 $A=lw$，$l=100\,\mathrm{mm}$、$w=50\,\mathrm{mm}$，目标 $u_*(A)=1\,\mathrm{mm^2}$．灵敏系数为 50 mm 和 100 mm，等贡献分配给出 $u(l)\leq0.0141421\,\mathrm{mm}$、$u(w)\leq0.00707107\,\mathrm{mm}$．若宽度只能做到 0.008 mm，其贡献为 0.8 mm²，则长度贡献最多为 0.6 mm²，要求 $u(l)\leq0.012\,\mathrm{mm}$．调完后重新合成，仍恰为 1 mm²．

实际可按仪器成本、重复次数和环境控制代价重新分配．若有成本函数 $C_i(u_i)$，可在总方差约束下最小化 $\sum_i C_i$；没有成本信息时不声称等贡献方案就是经济最优．共同校准分量不能用增加次数降低．

## 微小分量的定量取舍

舍去一项贡献 $q$ 后，$u_c'=\sqrt{u_c^2-q^2}$．若允许合成量相对降低不超过 $\epsilon$，则

$$
\frac{u_c-u_c'}{u_c}\leq\epsilon
\quad\Longleftrightarrow\quad
\frac q{u_c}\leq\sqrt{2\epsilon-\epsilon^2}.
$$

允许降低 5% 时阈值约 0.31225，允许 1% 时约 0.14107．这是给定独立合成模型和容忍度下的结论，不能无条件套「小于三分之一就忽略」．例如十个各占 0.1 倍总量的分量，合起来占总方差 10%，不可逐个判断后全部删掉．相关项必须连同变化重新计算．

## 比较模型与选择工作点

测两轴中心距，可选 $L=L_1-(d_1+d_2)/2$ 或 $L=(L_1+L_2)/2$．若 $u(L_1)=0.008$、$u(L_2)=0.010$、$u(d_1)=0.005$、$u(d_2)=0.007\,\mathrm{mm}$ 且独立，两个方案分别给出 0.00908295 和 0.00640312 mm．本例后者较好；输入数目少并不是普遍保证，换不确定度或相关性后必须重算．

弓高弦长模型 $D=s^2/(4h)+h$ 的灵敏系数为

$$
c_s=\frac{s}{2h},\qquad c_h=1-\frac{s^2}{4h^2}.
$$

选 $s=2h$ 可使一阶高度贡献为零．但圆形几何约束、可实现的弦位置、测量协方差和二阶项都要检查；例如 $Y=X^2$ 在估计值零处导数为零，输出仍有分散．不能凭零导数宣布测量完全精确．

## 自检与连接

设计应交代目标、输入范围、可调变量、预算、实际可行性与剩余模型效应．继续 [直线拟合](least-squares.md) 或 [综合报告](case-studies.md)．等贡献分配是本地讲义 04 的传统设计方法；方差预算依据 [GUM 第 5 节](https://doi.org/10.59161/JCGM100-2008E)，取舍式由本页独立推导．

## 阅读连接

上一页：[不确定度传播与合成](uncertainty-propagation.md)．下一页：[直线拟合与结果检验](least-squares.md)．
