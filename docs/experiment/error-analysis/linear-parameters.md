---
assessments:
- placement: footer
  set: experiment.error-analysis.linear-parameters
author: Physics Learning Wiki Team
description: 从设计矩阵推导普通和加权最小二乘，解释满列秩、一般残差自由度、单位权方差和参数协方差．
learning_objectives:
- anchor: course-concepts
  id: experiment.error-analysis.linear-parameters.concepts
  title: 一般线性参数估计：辨认概念与适用条件
- anchor: course-calculation
  id: experiment.error-analysis.linear-parameters.calculation
  title: 一般线性参数估计：完成定量计算并检查单位
- anchor: course-analysis
  id: experiment.error-analysis.linear-parameters.analysis
  title: 一般线性参数估计：说明方法、结果与限制
page_id: experiment.error-analysis.linear-parameters
prerequisites:
- least-squares
status: review
title: 一般线性参数估计
---

本页为进阶专题；首次学习可先完成导读中的基础路线，再回到这里补齐推导与应用．

## 本页学习目标

<span id="course-concepts"></span>

一般线性参数估计：辨认概念与适用条件．

<span id="course-calculation"></span>

一般线性参数估计：完成定量计算并检查单位．

<span id="course-analysis"></span>

一般线性参数估计：说明方法、结果与限制．

## 直线只是两个参数的特例

学习目标：将多观测、多参数问题写成矩阵，检查可辨识性，选择正确的方差尺度，并报告参数间相关性．需会矩阵乘法与线性方程；先读 [直线拟合](least-squares.md)．「线性」指对待估参数线性，多项式的系数仍是线性参数．

## 观测方程与设计矩阵

设 $n$ 个观测、$p$ 个参数，模型为 $\boldsymbol l=A\boldsymbol\theta+\boldsymbol\epsilon$，[线性参数估计](concept:linear-parameter-estimation) 的设计矩阵 $A$ 为 $n\times p$，各行给一个观测对参数的系数．残差定义为 $\boldsymbol v=\boldsymbol l-A\hat{\boldsymbol\theta}$．直线的行是 $(1,x_i)$；二次模型的行可为 $(1,x_i,x_i^2)$．

必须区分模型已知的系数与误差显著的输入．横坐标误差显著时，普通固定设计矩阵模型需要扩展，不能仅增画误差棒．

## 正规方程和满列秩

使 $S=\boldsymbol v^T\boldsymbol v$ 最小，对参数求导得

$$
A^T\boldsymbol v=0,\qquad
A^TA\hat{\boldsymbol\theta}=A^T\boldsymbol l.
$$

若 $\operatorname{rank}(A)=p$，$A^TA$ 对称正定，解唯一，理论上写为 $(A^TA)^{-1}A^T\boldsymbol l$．实际计算用 QR、SVD 或 `lstsq`，不显式求逆以避免放大病态误差．若 $n=p$ 且满秩，能解参数但不能从残差估计噪声；要求残差自由度正时须 $n>p$．若两列重复，则某些参数不可单独辨识，多测相同方程不能修复缺秩．

在固定 $A$、$E(\boldsymbol\epsilon)=0$ 条件下，令 $H=(A^TA)^{-1}A^T$，有 $HA=I$，所以 $E(\hat{\boldsymbol\theta})=\boldsymbol\theta$．这是估计无偏，不代表某一组估计恰为真值．

## 加权与一般协方差

已知观测协方差 $\Sigma$ 正定时，最小化 $\boldsymbol v^T\Sigma^{-1}\boldsymbol v$，得

$$
\hat{\boldsymbol\theta}=(A^T\Sigma^{-1}A)^{-1}A^T\Sigma^{-1}\boldsymbol l,\qquad
\operatorname{Cov}(\hat{\boldsymbol\theta})=(A^T\Sigma^{-1}A)^{-1}.
$$

独立输入有 $\Sigma=\operatorname{diag}(u_i^2)$．把各方程乘 $1/u_i$ 后成为单位方差问题，这叫加权转换；相关输入可用协方差的 Cholesky 分解作相应转换．

若只知道相对权 $P$，而 $\Sigma=\sigma_0^2P^{-1}$ 的共同尺度未知，则

$$
s_0^2=\frac{\boldsymbol v^TP\boldsymbol v}{n-p},\qquad
\operatorname{Cov}(\hat{\boldsymbol\theta})\approx s_0^2(A^TPA)^{-1}.
$$

等权情形 $P=I$．独立正态误差时，$\boldsymbol v^TP\boldsymbol v/\sigma_0^2$ 服从自由度 $n-p$ 的卡方分布，故 $s_0^2$ 对共同方差无偏；其平方根不一般无偏．已知绝对协方差时不能再乘 $s_0^2$．

## 例题：三个读数估两个参数

取 $x=(-1,0,1)$，$y=(1.1,1.9,3.0)$，拟合 $y=a+bx$．设计矩阵三行分别为 $(1,-1)$、$(1,0)$、$(1,1)$，$A^TA=\operatorname{diag}(3,2)$．因此 $a=2$、$b=0.95$，残差为 $(0.05,-0.10,0.05)$．

残差平方和为 0.015，自由度 1，若共同方差未知，$s_0^2=0.015$，参数方差分别为 0.005 和 0.0075，协方差为零．若题目另给每点已知标准不确定度 0.1，则参数方差应为 $0.01/3$ 与 $0.01/2$，不得再拿样本残差重缩放．

逆矩阵元素 $d_{jk}$ 也可通过解 $(A^TPA)\boldsymbol d_k=\boldsymbol e_k$ 获得，传统讲义称相关系数求解中的「不定乘数」．对角项给参数方差系数，非对角项保留相关信息．派生量 $g(\boldsymbol\theta)$ 的方差用梯度和整个协方差矩阵传播．

## 常见误区与阅读连接

不要把形式上的逆矩阵当成总能存在；不要混淆观测独立和估计参数独立；不要把拟合方差当成包含全部校准和模型影响的预算．下一步做 [组合测量](combined-measurements.md)，或学习 [非线性拟合](nonlinear-fitting.md)．依据：[NIST 最小二乘](https://www.itl.nist.gov/div898/handbook/pmd/section4/pmd431.htm)、[SciPy least\_squares](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.least_squares.html)；卡方关系见 [抽样分布](../../math/probability-statistics/sample-and-sampling-distribution.md)．

## 阅读连接

上一页：[直线拟合与结果检验](least-squares.md)．下一页：[非线性拟合与线性化](nonlinear-fitting.md)．
