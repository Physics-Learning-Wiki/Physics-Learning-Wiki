---
assessments:
- placement: footer
  set: math.probability-statistics.hypothesis-testing
author: Physics Learning Wiki Team
description: 按预先指定的假设和显著性水平比较测量列，学习 t、F、正态性和秩和检验及其物理解释边界．
learning_objectives:
- anchor: course-concepts
  id: math.probability-statistics.hypothesis-testing.concepts
  title: 假设检验：辨认概念与适用条件
- anchor: course-calculation
  id: math.probability-statistics.hypothesis-testing.calculation
  title: 假设检验：完成定量计算并检查单位
- anchor: course-analysis
  id: math.probability-statistics.hypothesis-testing.analysis
  title: 假设检验：说明方法、结果与限制
page_id: math.probability-statistics.hypothesis-testing
status: review
title: 假设检验
---

## 本页学习目标

<span id="course-concepts"></span>

假设检验：辨认概念与适用条件．

<span id="course-calculation"></span>

假设检验：完成定量计算并检查单位．

<span id="course-analysis"></span>

假设检验：说明方法、结果与限制．

## 差异来自哪里

学习目标：写出假设、统计量、拒绝域与 p 值，并区分不拒绝和证明相同．先读 [抽样分布](sample-and-sampling-distribution.md)．

## 假设与错误概率

先指定 $H_0$、备择 $H_1$、水平 $\alpha$ 及抽样方式，再计算．p 值是在 $H_0$ 下当前或更极端统计量的概率，不是原假设为真的概率．$p<\alpha$ 拒绝；不拒绝是证据不足，不证明没有系统效应．第一类错误是原假设成立却拒绝，第二类错误是指定差异存在却未拒绝．

探索许多指标或追加数据直到显著会改变错误概率．预定 $m$ 项比较可用每项 $\alpha/m$ 的 Bonferroni 方法控制总第一类错误上界；仍需报告实际效应和区间，而非只给显著标签．

## 单组均值与参考值

参考均值 $\mu_0$ 视为精确，独立正态观测、未知方差时，$T=(\bar x-\mu_0)/(s/\sqrt n)\sim t_{n-1}$．例：$n=9$、$\bar x=10.20$、$s=0.30$、$\mu_0=10.00$，$T=2$，双侧 5% 临界值 2.306，故不拒绝．参考本身有不确定度或与观测相关时，比较分母必须重新建模．

## 两组均值的 Welch 比较

对两独立正态测量列，不强加方差相等时，

$$
T=\frac{\bar x_1-\bar x_2}{\sqrt{s_1^2/n_1+s_2^2/n_2}},\qquad
\nu\approx\frac{(s_1^2/n_1+s_2^2/n_2)^2}
{(s_1^2/n_1)^2/(n_1-1)+(s_2^2/n_2)^2/(n_2-1)}.
$$

例：两组各五次，均值 10.0 和 10.3，标准差均为 0.1，得到 $T=-4.74342$、$\nu=8$，双侧 5% 下拒绝相等．配对测量应分析差值；不能把有相关的两列当独立样本．在独立同方差条件另有依据时才采用合并方差 t 检验．显著差异也可能来自真实条件变化．

## 两组方差的 F 比较

独立正态总体方差相等时，$F=s_1^2/s_2^2\sim F_{n_1-1,n_2-1}$．双侧检验比较下、上 $\alpha/2$ 分位数．例：两组各六次，标准差 0.20 和 0.10，$F=4$，95% 接受范围约 \[0.13993,7.14638]，不拒绝．重新把较大方差放分子时须同步处理尾部和自由度；该精确检验对非正态性敏感．

## 正态性和秩和检验

先看时间顺序和正态 Q–Q 图．Shapiro–Wilk 检验考查正态总体模型；小样本不拒绝可能因检验能力不足，大样本会对细小偏离敏感．可用 SciPy 的 shapiro 对 \[9.9,10.0,10.1,10.0,10.0] 计算统计量与 p 值，但显示量化造成并列时需谨慎解释．不能用一次不拒绝证明总体正态．

两独立组可采用 Mann–Whitney 秩和方法．合并排序，第一组秩和为 $R_1$，则 $U_1=R_1-n_1(n_1+1)/2$．无并列的小样本可用精确排列分布；有并列使用适当校正或置换方法．一般检验的是分布关系，只有形状相同等附加条件下才可解释为位置差异．

例：A 为 1、2、3，B 为 4、5、6，$R_A=6$、$U_A=0$．20 种等可能分组中，双侧最极端的两种给 $p=0.10$；完全分开也未必在 5% 下显著．

## 报告与连接

报告样本、假设、统计量、自由度、阈值或 p 值、效应和物理解释．应用见 [系统效应](../../experiment/error-analysis/systematic-errors-outliers.md) 与 [异常值检验](../../experiment/error-analysis/outlier-tests.md)．依据：[NIST 两样本 t](https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm)、[F](https://www.itl.nist.gov/div898/handbook/eda/section3/eda359.htm)、[SciPy Shapiro](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.shapiro.html)、[Mann–Whitney](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html)．
