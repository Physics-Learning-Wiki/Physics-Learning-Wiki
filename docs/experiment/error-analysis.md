---
title: 误差分析与数据处理
author: Physics Learning Wiki Team
status: review
description: 从原始测量记录出发，学习重复测量、系统效应、不确定度评定与传播、直线拟合和实验报告，并用两套教学数据复现完整分析流程．
---

## 为什么测出一个数还不够

两组同学用单摆测重力加速度，一组得到 $9.81\,\mathrm{m/s^2}$，另一组得到 $9.79\,\mathrm{m/s^2}$．谁测得更好？只看与课本数值的接近程度不能回答：摆长是否量到了摆球中心，计时是否稳定，模型是否适用，结果保留了多少可靠位数，都还没有交代．

本章把「测到一个数」扩展成「给出可以检查的测量结果」．主线是定义被测量、记录原始数据、识别误差来源、评定不确定度、完成传播或拟合，最后报告结果和限制．[测量不确定度](concept:measurement-uncertainty) 表达的是基于现有信息赋予被测量的量值分散程度，并不是已经知道的误差大小．[^vim]

## 从哪里开始

基础路线需要代数、单位换算和基本作图能力，不要求先通读统计学．传播篇再用到 [导数](concept:derivative) 与简单偏导；拟合篇会就地解释残差和参数不确定度．需要概率语言时，可查 [随机变量与分布](../math/probability-statistics/one-dimensional-random-variables-and-distributions.md) 和 [期望与方差](../math/probability-statistics/characteristic-values-of-random-variables.md)．

这条路线从定义测量对象和记录读数开始，先处理重复测量及不同精度结果的合并，再检查系统效应与异常值；随后评定和传播不确定度，最后处理拟合及实验报告．分布与统计量会在需要时解释，数学推导可回到上述概率页面补习．

## 推荐阅读顺序

1.  [测量、误差与不确定度](error-analysis/measurement-basics.md)、[测量仪器与计量溯源](error-analysis/metrology.md)、[数据记录与有效数字](error-analysis/data-recording.md)：确定被测量，读懂仪器并保留可复查的原始记录．
2.  [重复测量与统计描述](error-analysis/repeated-measurements.md)、[不等精度测量与结果合并](error-analysis/weighted-measurements.md)：从残差估计分散，再按信息量合并独立结果．
3.  [系统效应与异常数据](error-analysis/systematic-errors-outliers.md)、[异常值检验与处理](error-analysis/outlier-tests.md)：调查共同偏移、漂移及异常观测，决定能否修正或剔除．
4.  [标准不确定度的评定](error-analysis/uncertainty-evaluation.md)、[不确定度传播与合成](error-analysis/uncertainty-propagation.md)、[误差分配与测量方案优化](error-analysis/error-allocation.md)：建立输入模型、合成贡献，再比较改进方案．
5.  [直线拟合与结果检验](error-analysis/least-squares.md)、[一般线性参数估计](error-analysis/linear-parameters.md)、[非线性拟合与线性化](error-analysis/nonlinear-fitting.md)、[组合测量的数据处理](error-analysis/combined-measurements.md)：从拟合直线推广到参数和模型的估计．
6.  [综合数据处理与实验报告](error-analysis/case-studies.md)：沿单摆与铜棒案例复现从原始记录到报告的过程．正在写报告的读者也可先浏览此页，再回查所需步骤．

综合案例的题集已公开，可直接练习；其他专题的题集目前是草稿，仅在草稿预览中可见，等待人工审核后发布．自由作答按参考答案和评分标准自评．

## 两套贯穿案例

**单摆案例** 从十次「连续二十个周期」计时开始，说明重复测量能减少哪一类分量、共同校准分量为何不能除以测量次数的平方根，以及摆长和周期谁更值得改进．

**铜棒热膨胀案例** 从六组温度和长度出发，比较普通与加权直线拟合，再把斜率、截距及其协方差传递到线膨胀系数．两套数据均为本章自编教学数据，不代表实际实验记录．原始 CSV、脚本和运行说明见 [综合案例](error-analysis/case-studies.md#下载与复现)．

## 全章记号与报告约定

| 记号              | 含义                             |
| --------------- | ------------------------------ |
| $x_i$、$\bar x$  | 第 $i$ 个观测值与算术平均值．              |
| $s$、$s/\sqrt n$ | 观测值的样本标准差与独立重复条件下平均值的标准不确定度估计． |
| $u(x)$、$u_c(y)$ | 输入量的标准不确定度与输出量的合成标准不确定度．       |
| $U=k u_c$       | 扩展不确定度，必须同时说明包含因子 $k$．         |

本章例题的最终不确定度统一保留两位有效数字，估计值末位与其对齐；中间计算保留额外位数．这是本章的教学报告约定，不替代具体实验规程．标准不确定度、扩展不确定度和统计置信区间会分别说明条件，不把所有「正负某个数」都解释为同一种范围．[^gum]

## 学完以后

回到自己的实验，检查是否能回答：测量模型是什么？原始数据保留在哪里？显著系统效应如何处理？输入量是否相关？结论由哪些假设支撑？报告能否被另一位读者复算？

实际操作可继续阅读 [常用测量仪器](instruments.md)；编程与作图基础见 [Python 科学计算](../tools/python-scicomp.md) 和 [绘图工具](../tools/plotting.md)．仪器页目前仍待建设，本章用到的必要仪器假设均在例题中说明．

## 参考资料与注释

[^vim]: JCGM，*International Vocabulary of Metrology*，2012，条目 [2.26：measurement uncertainty](https://jcgm.bipm.org/vim/en/2.26.html)．

[^gum]: JCGM，[*Evaluation of measurement data—Guide to the expression of uncertainty in measurement*](https://doi.org/10.59161/JCGM100-2008E)，2008，第 3—7 节．本章专题分别给出具体条款．
