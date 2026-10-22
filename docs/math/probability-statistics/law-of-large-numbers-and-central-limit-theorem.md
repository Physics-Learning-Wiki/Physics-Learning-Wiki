---
assessments:
- placement: footer
  set: math.probability-statistics.law-of-large-numbers-and-central-limit-theorem
author: Physics Learning Wiki Team
description: 区分均值收敛与标准化分布收敛，推导平均的稳定性，并分析共同偏差、相关采样和重尾的限制．
learning_objectives:
- anchor: course-concepts
  id: math.probability-statistics.law-of-large-numbers-and-central-limit-theorem.concepts
  title: 大数定律及中心极限定理：辨认概念与适用条件
- anchor: course-calculation
  id: math.probability-statistics.law-of-large-numbers-and-central-limit-theorem.calculation
  title: 大数定律及中心极限定理：完成定量计算并检查单位
- anchor: course-analysis
  id: math.probability-statistics.law-of-large-numbers-and-central-limit-theorem.analysis
  title: 大数定律及中心极限定理：说明方法、结果与限制
page_id: math.probability-statistics.law-of-large-numbers-and-central-limit-theorem
status: review
title: 大数定律及中心极限定理
---

## 本页学习目标

<span id="course-concepts"></span>

大数定律及中心极限定理：辨认概念与适用条件．

<span id="course-calculation"></span>

大数定律及中心极限定理：完成定量计算并检查单位．

<span id="course-analysis"></span>

大数定律及中心极限定理：说明方法、结果与限制．

## 平均能解决什么问题

学习目标：区别大数定律与中心极限定理，写出标准化均值，并判断平均为何不能消除共同偏差．先读 [期望与方差](characteristic-values-of-random-variables.md)．

## 大数定律：平均趋向期望

设独立同分布的 $X_i$ 均值为 $\mu$，有限方差为 $\sigma^2$．则 $E(\bar X)=\mu$、$\operatorname{Var}(\bar X)=\sigma^2/n$．用 Chebyshev 不等式得

$$
P(|\bar X-\mu|\geq\epsilon)\leq\frac{\sigma^2}{n\epsilon^2}\longrightarrow0.
$$

这证明上述条件下均值依概率收敛到期望．它不是说每增加一个点误差一定减小，也不是有限次数后等于真值．期望包含共同偏移时，平均趋向偏移后的中心．更一般大数定律有更弱条件，本页只使用上述充分条件．

## 中心极限定理：标准化均值的形状

对独立同分布且 $0<\sigma^2<\infty$ 的变量，

$$
Z_n=\frac{\sqrt n(\bar X-\mu)}\sigma\xrightarrow{d}N(0,1).
$$

原始量不必正态；原始量本来正态时，均值对任何样本量都正态．偏斜、重尾总体的近似可能很慢，没有对所有分布都可靠的「超过 30 次即可」规则．方差未知时以样本标准差替代，需要区分大样本近似和正态总体下的精确小样本 t 分布．

## 例题：由方差估计次数

独立计时误差均值为零、标准差为 0.4 s．要求均值偏差至少 0.1 s 的概率上界不超过 0.05．Chebyshev 给出 $0.4^2/(n\times0.1^2)\leq0.05$，故 $n\geq320$．若有可靠正态信息，双侧 95% 半宽 0.1 s 要求 $n\geq(1.96\times0.4/0.1)^2$，上取整为 62．两个结果使用的信息不同，不是算法互相矛盾．

## 不能机械平均的情形

共同影响 $X_i=\mu+B+E_i$ 中，若 $B$ 与各独立项独立，$\operatorname{Var}(\bar X)=u^2(B)+\sigma_E^2/n$．只有独立项降低．相关观测需加协方差；漂移时总体可能不再同分布．柯西分布没有有限期望与方差，独立样本均值仍可与单个观测同样分散，上述证明和经典中心极限定理不适用．

## 自检与连接

区别依概率收敛和依分布收敛，交代独立、同分布及矩存在条件．实践见 [重复测量](../../experiment/error-analysis/repeated-measurements.md)，推断见 [抽样分布](sample-and-sampling-distribution.md)．依据：[MIT 概率统计课程材料](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/pages/classes-reading-and-in-class-materials/)．
