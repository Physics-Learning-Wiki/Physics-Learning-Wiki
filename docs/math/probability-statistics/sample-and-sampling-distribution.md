---
assessments:
- placement: footer
  set: math.probability-statistics.sample-and-sampling-distribution
author: Physics Learning Wiki Team
description: 构造卡方、t 和 F 统计量，解释样本方差、均值区间、自由度与矩的存在条件．
learning_objectives:
- anchor: course-concepts
  id: math.probability-statistics.sample-and-sampling-distribution.concepts
  title: 样本及抽样分布：辨认概念与适用条件
- anchor: course-calculation
  id: math.probability-statistics.sample-and-sampling-distribution.calculation
  title: 样本及抽样分布：完成定量计算并检查单位
- anchor: course-analysis
  id: math.probability-statistics.sample-and-sampling-distribution.analysis
  title: 样本及抽样分布：说明方法、结果与限制
page_id: math.probability-statistics.sample-and-sampling-distribution
status: review
title: 样本及抽样分布
---

## 本页学习目标

<span id="course-concepts"></span>

样本及抽样分布：辨认概念与适用条件．

<span id="course-calculation"></span>

样本及抽样分布：完成定量计算并检查单位．

<span id="course-analysis"></span>

样本及抽样分布：说明方法、结果与限制．

## 统计量为什么也有分布

学习目标：从独立正态量构造三个常用抽样分布，并选择适当自由度和分位数．先读 [一维分布](one-dimensional-random-variables-and-distributions.md)．统计量是不含未知参数的样本函数，实际数据给出的数值是其一次实现．

## 卡方分布与残差约束

独立标准正态量的平方和 $Q=\sum_{i=1}^{\nu}Z_i^2$ 服从 $\chi_\nu^2$：

$$
f(q)=\frac{q^{\nu/2-1}e^{-q/2}}{2^{\nu/2}\Gamma(\nu/2)},\quad q>0.
$$

密度在负半轴为零，$E(Q)=\nu$、$\operatorname{Var}(Q)=2\nu$．独立同一正态总体样本的方差 $S^2=\sum_i(X_i-\bar X)^2/(n-1)$ 满足 $(n-1)S^2/\sigma^2\sim\chi_{n-1}^2$．估计均值施加一个残差和约束，故自由度为 $n-1$；正态条件下 $\bar X$ 与 $S^2$ 独立．

## Student t 分布

若 $Z\sim N(0,1)$ 与 $Q\sim\chi_\nu^2$ 独立，$T=Z/\sqrt{Q/\nu}$ 的密度为

$$
f(t)=\frac{\Gamma((\nu+1)/2)}{\sqrt{\nu\pi}\Gamma(\nu/2)}
\left(1+\frac{t^2}{\nu}\right)^{-(\nu+1)/2}.
$$

它关于零对称，但期望仅在 $\nu>1$ 时存在且为零；方差在 $\nu>2$ 时为 $\nu/(\nu-2)$．自由度增大时趋于标准正态．正态独立同分布、方差未知时，$(\bar X-\mu)/(S/\sqrt n)\sim t_{n-1}$．数据少并不自动保证这一模型．

## F 分布与两个自由度

独立 $Q_1\sim\chi_{\nu_1}^2$、$Q_2\sim\chi_{\nu_2}^2$ 给出 $F=(Q_1/\nu_1)/(Q_2/\nu_2)$：

$$
f(x)=\frac{(\nu_1/\nu_2)^{\nu_1/2}x^{\nu_1/2-1}}
{B(\nu_1/2,\nu_2/2)(1+\nu_1x/\nu_2)^{(\nu_1+\nu_2)/2}},\quad x>0.
$$

其中 $B(a,b)=\Gamma(a)\Gamma(b)/\Gamma(a+b)$．均值在 $\nu_2>2$ 时为 $\nu_2/(\nu_2-2)$，方差在 $\nu_2>4$ 时为

$$
\operatorname{Var}(F)=\frac{2\nu_2^2(\nu_1+\nu_2-2)}
{\nu_1(\nu_2-2)^2(\nu_2-4)}.
$$

分子分母互换后自由度也要交换．两独立正态总体方差相等时，样本方差比服从相应 F 分布．非正态情况下这不是一般精确结论．

## 例题：均值区间和方差区间不同

独立正态测量为 8.0、8.2、7.9、8.1、8.0、7.8 mm．均值 8.0 mm，残差平方和 0.10 mm²，$s^2=0.020\,\mathrm{mm^2}$，均值标准误 0.0577350 mm．双侧 95% 均值区间为 $8.0\pm2.570582\times0.0577350\,\mathrm{mm}$，半宽 0.148413 mm．总体方差 95% 区间为

$$
\left[\frac{5s^2}{\chi^2_{0.975,5}},\frac{5s^2}{\chi^2_{0.025,5}}\right]
\approx[0.00779,0.1203]\,\mathrm{mm^2}.
$$

分位数在分母中次序反转，区间不对称．这两个区间估计不同参数，均不能替代包括全部校准输入的测量不确定度．

## 常见错误与连接

不要把自由度写成总次数，不要忘记构造式中的独立性，不要把对称 t 分布的性质套给卡方．继续 [参数估计](parameter-estimation.md)、[假设检验](hypothesis-testing.md)；查询见 [附表](appendix-tables.md)．依据：[NIST 卡方](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3666.htm)、[t](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3664.htm)、[F](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3665.htm)．
