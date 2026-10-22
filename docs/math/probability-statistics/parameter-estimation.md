---
assessments:
- placement: footer
  set: math.probability-statistics.parameter-estimation
author: Physics Learning Wiki Team
description: 从似然与方差最小推导算术及加权估计，区分估计偏差、方差和均方误差，解释区间的重复抽样含义．
learning_objectives:
- anchor: course-concepts
  id: math.probability-statistics.parameter-estimation.concepts
  title: 参数估计：辨认概念与适用条件
- anchor: course-calculation
  id: math.probability-statistics.parameter-estimation.calculation
  title: 参数估计：完成定量计算并检查单位
- anchor: course-analysis
  id: math.probability-statistics.parameter-estimation.analysis
  title: 参数估计：说明方法、结果与限制
page_id: math.probability-statistics.parameter-estimation
status: review
title: 参数估计
---

## 本页学习目标

<span id="course-concepts"></span>

参数估计：辨认概念与适用条件．

<span id="course-calculation"></span>

参数估计：完成定量计算并检查单位．

<span id="course-analysis"></span>

参数估计：说明方法、结果与限制．

## 用样本估计什么

学习目标：区分参数、估计量和估计值，构造似然，并说明无偏性和分散性各自表示什么．先读 [抽样分布](sample-and-sampling-distribution.md)．

## 点估计及其性质

参数 $\theta$ 是模型中固定但未知的量，估计量 $\hat\theta$ 是样本函数，代入数据才得到估计值．偏差为 $b=E(\hat\theta)-\theta$，有

$$
E[(\hat\theta-\theta)^2]=\operatorname{Var}(\hat\theta)+b^2.
$$

无偏不保证方差最小或单次结果接近真值．一致性指样本增大时估计收敛到参数．正态均值未知时，方差的最大似然估计除以 $n$，无偏样本方差除以 $n-1$；两种准则不同．

## 正态似然与逆方差权

独立 $X_i\sim N(\mu,u_i^2)$，$u_i$ 已知：

$$
L(\mu)=\prod_i\frac1{\sqrt{2\pi}u_i}
\exp\left[-\frac{(x_i-\mu)^2}{2u_i^2}\right].
$$

似然将数据固定后看作参数的函数，不是参数概率密度．对数似然求导给 $\sum_i(x_i-\hat\mu)/u_i^2=0$．因此 $\hat\mu=\sum_i x_i/u_i^2\,/\,\sum_i1/u_i^2$，方差为 $1/\sum_i1/u_i^2$．方差相等时为算术平均．在约束 $\sum_i a_i=1$ 下最小化线性估计方差 $\sum_i a_i^2u_i^2$，也得到逆方差权；这一线性无偏最小方差结论不依赖正态性．

## 例题：不能凭偏好改权重

独立的两个结果 2.00、2.30 V，标准不确定度 0.10、0.20 V．权比 4:1，估计为 2.06 V，标准不确定度 $1/\sqrt{125}=0.0894427\,\mathrm V$．若两次还有共同校准影响，其标准不确定度 0.05 V，且独立于各自噪声，则最终方差增加 $0.05^2\,\mathrm{V^2}$，不能把共同项也平均掉．

## 区间估计与覆盖

正态标准差已知时，均值区间为 $\bar x\pm z_{1-\alpha/2}\sigma/\sqrt n$．独立同一正态总体、方差未知时，改用 $\bar x\pm t_{1-\alpha/2,n-1}s/\sqrt n$．重复抽样得到的区间程序有 $1-\alpha$ 的覆盖率；不应把已得到的频率学区间解释成固定参数的后验概率范围．

例：$n=9$、$\bar x=4.20$、$s=0.30$，95% t 区间为 $4.20\pm2.306004\times0.10$，约 \[3.9694,4.4306]．它只对应给定抽样模型，不包含未纳入的共同偏差．计量扩展不确定度必须另外综合全部信息来源．

## 自检与连接

交代估计对象、准则、条件和区间含义．应用见 [结果合并](../../experiment/error-analysis/weighted-measurements.md)；推广见 [一般线性参数估计](../../experiment/error-analysis/linear-parameters.md)．依据：[NIST 最大似然](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3652.htm)、[均值区间](https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm)．
