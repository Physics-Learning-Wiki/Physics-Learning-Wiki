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

基础路线依次阅读测量、数据记录、重复测量、系统效应、评定、传播、直线拟合与综合报告；仪器与合并专题按需要插入．进阶路线继续异常检验、预算优化、矩阵估计、非线性和组合测量．数学支撑集中在概率统计栏目，避免重复建设．

每篇专题配置一套交互习题，客观题自动反馈，推导题按参考解析自评．题目完成独立人工审核前仅在草稿预览模式开放；正式页面按既有规则隐藏草稿入口．

主线概念和关键推导在正文．标为「进阶补充」的折叠内容可以在第一遍跳过．Python 用来复算和绘图；读懂物理方法不以会编程为前提．

## 推荐阅读顺序

| 顺序 | 专题                                                        | 练习题数 |
| -- | --------------------------------------------------------- | ---- |
| 1  | [测量、误差与不确定度](error-analysis/measurement-basics.md)        | 8    |
| 2  | [测量仪器与计量溯源](error-analysis/metrology.md)                  | 10   |
| 3  | [数据记录与有效数字](error-analysis/data-recording.md)             | 10   |
| 4  | [重复测量与统计描述](error-analysis/repeated-measurements.md)      | 12   |
| 5  | [不等精度测量与结果合并](error-analysis/weighted-measurements.md)    | 12   |
| 6  | [系统效应与异常数据](error-analysis/systematic-errors-outliers.md) | 12   |
| 7  | [异常值检验与处理](error-analysis/outlier-tests.md)               | 12   |
| 8  | [标准不确定度的评定](error-analysis/uncertainty-evaluation.md)     | 12   |
| 9  | [不确定度传播与合成](error-analysis/uncertainty-propagation.md)    | 12   |
| 10 | [误差分配与测量方案优化](error-analysis/error-allocation.md)         | 12   |
| 11 | [直线拟合与结果检验](error-analysis/least-squares.md)              | 12   |
| 12 | [一般线性参数估计](error-analysis/linear-parameters.md)           | 12   |
| 13 | [非线性拟合与线性化](error-analysis/nonlinear-fitting.md)          | 10   |
| 14 | [组合测量的数据处理](error-analysis/combined-measurements.md)      | 10   |
| 15 | [综合数据处理与实验报告](error-analysis/case-studies.md)             | 12   |

正在写实验报告的读者可以先浏览最后一篇的完整流程，再沿链接补齐不熟悉的步骤．不要仅复制其中的数值或不确定度假设到自己的实验．

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
