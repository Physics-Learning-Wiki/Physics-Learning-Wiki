---
assessments:
- placement: footer
  set: experiment.error-analysis.combined-measurements
author: Physics Learning Wiki Team
description: 将三段长度与重叠长度观测写成六行设计矩阵，估计各段、残差与协方差，并比较绝对方差和单位权方差解释．
learning_objectives:
- anchor: course-concepts
  id: experiment.error-analysis.combined-measurements.concepts
  title: 组合测量的数据处理：辨认概念与适用条件
- anchor: course-calculation
  id: experiment.error-analysis.combined-measurements.calculation
  title: 组合测量的数据处理：完成定量计算并检查单位
- anchor: course-analysis
  id: experiment.error-analysis.combined-measurements.analysis
  title: 组合测量的数据处理：说明方法、结果与限制
page_id: experiment.error-analysis.combined-measurements
prerequisites:
- linear-parameter-estimation
status: review
title: 组合测量的数据处理
---

本页为进阶专题；首次学习可先完成导读中的基础路线，再回到这里补齐推导与应用．

## 本页学习目标

<span id="course-concepts"></span>

组合测量的数据处理：辨认概念与适用条件．

<span id="course-calculation"></span>

组合测量的数据处理：完成定量计算并检查单位．

<span id="course-analysis"></span>

组合测量的数据处理：说明方法、结果与限制．

## 多量几次总长能帮到每一段吗

学习目标：从物理连接关系列矩阵，估计各分量及相关性，并检验冗余观测．先读 [一般线性参数估计](linear-parameters.md)．本例三段长度在同一温度下稳定，观测已作零点修正，先假设误差独立同方差且共同尺度未知．

## 六个观测与三个未知量

依次观测 $a,b,c,a+b,b+c,a+b+c$，自编读数为 10.02、19.99、30.01、30.04、49.98、60.03 mm．于是

$$
A=\begin{pmatrix}1&0&0\\0&1&0\\0&0&1\\1&1&0\\0&1&1\\1&1&1\end{pmatrix},\quad
\boldsymbol l=\begin{pmatrix}10.02\\19.99\\30.01\\30.04\\49.98\\60.03\end{pmatrix}\mathrm{mm},\quad
\boldsymbol\theta=\begin{pmatrix}a\\b\\c\end{pmatrix}.
$$

前面三行已保证满列秩，后三行提供冗余一致性信息．若只观测总长，无论重复多少次都不能分别确定三段．

## 求解与残差检查

正规方程的系数和右端为

$$
A^TA=\begin{pmatrix}3&2&1\\2&4&2\\1&2&3\end{pmatrix},\qquad
A^T\boldsymbol l=\begin{pmatrix}100.09\\160.04\\140.02\end{pmatrix}\mathrm{mm}.
$$

解得 $(\hat a,\hat b,\hat c)=(10.035,19.9925,30.000)\,\mathrm{mm}$．残差按观测顺序为 $(-0.015,-0.0025,0.010,0.0125,-0.0125,0.0025)\,\mathrm{mm}$．可直接验证 $A^T\boldsymbol v=0$；残差的普通总和不必为零，因为本模型没有独立的全 1 截距列．

## 各段精度与总长精度

残差平方和为 $0.000650\,\mathrm{mm^2}$，自由度 $6-3=3$，所以 $s_0=0.0147196\,\mathrm{mm}$．

$$
(A^TA)^{-1}=\begin{pmatrix}0.5&-0.25&0\\-0.25&0.5&-0.25\\0&-0.25&0.5\end{pmatrix},\qquad
\operatorname{Cov}(\hat{\boldsymbol\theta})=s_0^2(A^TA)^{-1}.
$$

三段的标准不确定度均约 0.0104083 mm，但相邻两段负相关．总长估计为 60.0275 mm，方差为 $s_0^2\boldsymbol1^T(A^TA)^{-1}\boldsymbol1=0.5s_0^2$，故其标准不确定度也是 0.0104083 mm，而非 $\sqrt3$ 倍．报告各段保留两位不确定度：$a=10.035\,\mathrm{mm}$、$u(a)=0.010\,\mathrm{mm}$，其余类似，并保留完整矩阵供后续传播．

如果各点已知独立标准不确定度均为 0.020 mm，解仍相同，但协方差应改为 $0.020^2(A^TA)^{-1}$，各段标准不确定度为 0.0141421 mm．不要让残差较小自动降低已知输入尺度．

## 模型比方程更重要

若总长读数与分段读数共享同一标尺比例或零点，需重新列协方差和修正模型．如果把同一次分段读数相加当成额外「独立」总长，则没有新增独立信息，不能按六次独立观测降低结果．温度改变会使真实长度改变，应先换算到同一条件．

数据和复算见 [示例说明](examples/readme.md)；下一步到 [综合报告](case-studies.md)．一般公式依据 [NIST 最小二乘](https://www.itl.nist.gov/div898/handbook/pmd/section4/pmd431.htm)，本例矩阵、读数与解析独立编写．

## 阅读连接

上一页：[非线性拟合与线性化](nonlinear-fitting.md)．下一页：[综合数据处理与实验报告](case-studies.md)．
