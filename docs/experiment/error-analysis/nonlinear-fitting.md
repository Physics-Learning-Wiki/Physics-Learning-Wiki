---
assessments:
- placement: footer
  set: experiment.error-analysis.nonlinear-fitting
author: Physics Learning Wiki Team
description: 用指数衰减模型推导 Gauss–Newton 参数修正，检查初值、尺度、收敛和协方差近似，并辨别拟合与误差传播．
learning_objectives:
- anchor: course-concepts
  id: experiment.error-analysis.nonlinear-fitting.concepts
  title: 非线性拟合与线性化：辨认概念与适用条件
- anchor: course-calculation
  id: experiment.error-analysis.nonlinear-fitting.calculation
  title: 非线性拟合与线性化：完成定量计算并检查单位
- anchor: course-analysis
  id: experiment.error-analysis.nonlinear-fitting.analysis
  title: 非线性拟合与线性化：说明方法、结果与限制
page_id: experiment.error-analysis.nonlinear-fitting
prerequisites:
- linear-parameter-estimation
- derivative
status: review
title: 非线性拟合与线性化
---

本页为进阶专题；首次学习可先完成导读中的基础路线，再回到这里补齐推导与应用．

## 本页学习目标

<span id="course-concepts"></span>

非线性拟合与线性化：辨认概念与适用条件．

<span id="course-calculation"></span>

非线性拟合与线性化：完成定量计算并检查单位．

<span id="course-analysis"></span>

非线性拟合与线性化：说明方法、结果与限制．

## 参数不能直接解出来时

学习目标：亲手完成一次参数修正，检查迭代是否可信，并解释局部协方差的限制．先读 [一般线性参数估计](linear-parameters.md)．这里的线性化用于求拟合参数，不等于对已知模型作不确定度传播．

## 在初值处展开

设 $y_i=f(t_i,\boldsymbol\theta)+\epsilon_i$，当前参数为 $\boldsymbol\theta_0$，令 $r_i=y_i-f(t_i,\boldsymbol\theta_0)$．对小修正 $\boldsymbol\delta$ 作一阶展开，$f(t_i,\boldsymbol\theta_0+\boldsymbol\delta)\approx f_i+J_i\boldsymbol\delta$，雅可比矩阵 $J_{ij}=\partial f_i/\partial\theta_j$ 在当前参数处计算．

最小化 $\|W^{1/2}(\boldsymbol r-J\boldsymbol\delta)\|^2$，得到

$$
J^TWJ\boldsymbol\delta=J^TW\boldsymbol r,\qquad
\boldsymbol\theta_{\rm new}=\boldsymbol\theta_0+\boldsymbol\delta.
$$

每次更新后重算残差和雅可比．Gauss–Newton 方法使用全部修正；若目标反而上升，缩短步长或改用信赖域方法．不能只迭代固定次数就宣称收敛．检查目标变化、按参数尺度归一的修正及梯度，记录停止原因．

## 完整例题：指数衰减

自编数据为 $t=(0,1,2,3,4)\,\mathrm s$，$y=(5.02,3.70,2.76,2.03,1.52)\,\mathrm V$，模型为 $f=a e^{-kt}$．假设时间输入可视为已知，独立电压误差具有相同未知方差．取初值 $a_0=4.8\,\mathrm V$、$k_0=0.25\,\mathrm{s^{-1}}$，则

$$
J_{i,a}=e^{-kt_i},\qquad J_{i,k}=-at_i e^{-kt_i}.
$$

| 更新次数 | 幅度/伏     | 衰减率/每秒   |
| ---- | -------- | -------- |
| 0    | 4.800000 | 0.250000 |
| 1    | 5.007779 | 0.298052 |
| 2    | 5.013500 | 0.299963 |
| 3    | 5.013523 | 0.299970 |

收敛后残差平方和约为 $0.000482288\,\mathrm{V^2}$．在局部线性、模型充分的假设下，以 $s^2={\rm SSE}/(5-2)$ 估计共同尺度，参数协方差近似为 $s^2(J^TJ)^{-1}$，给出 $u(a)\approx0.011363\,\mathrm V$、$u(k)\approx0.0015182\,\mathrm{s^{-1}}$．这只是局部近似，不是一般非线性估计精确无偏或精确服从卡方的保证．原始 CSV、逐步迭代和独立软件复算见 [示例说明](examples/readme.md)．

## 初值与失败诊断

初值可来自直接物理测量、子方程、粗网格或作图．正的指数数据可用对数图猜斜率，但直接对数拟合会改变噪声模型：电压等方差不等于对数电压等方差，所以本例仍拟合原量．

尝试多组物理合理初值，比较最终目标与参数．参数尺度相差很大时缩放；雅可比缺秩或参数高度相关时，扩大采样范围或固定有独立信息的参数．例如全在 $t=0$ 观测不能识别 $k$．目标平坦、触及边界、不同初值落入不同极小点时，应报告不稳定性，而不是只打印优化器「成功」．

已知各点绝对 $u_i$ 时，局部协方差为 $(J^TWJ)^{-1}$，不乘残差估计．强非线性、约束或非对称参数范围下，可检查轮廓目标、模拟传播等方法，不能把局部标准差机械解释为对称的精确置信区间．

## 自检与连接

检查初值、残差结构、参数尺度、雅可比秩、停止原因与模型适用范围．下一步到 [组合测量](combined-measurements.md) 和 [综合报告](case-studies.md)．依据：[NIST 非线性最小二乘](https://www.itl.nist.gov/div898/handbook/pmd/section1/pmd142.htm)、[SciPy least\_squares](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.least_squares.html)．

## 阅读连接

上一页：[一般线性参数估计](linear-parameters.md)．下一页：[组合测量的数据处理](combined-measurements.md)．
