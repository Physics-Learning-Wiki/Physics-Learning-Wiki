---
assessments:
- placement: footer
  set: experiment.error-analysis.outlier-tests
author: Physics Learning Wiki Team
description: 区分固定候选预测检验、Grubbs 与 Dixon 检验，明确样本选择、分布和显著性水平，保留复查与敏感性分析记录．
learning_objectives:
- anchor: course-concepts
  id: experiment.error-analysis.outlier-tests.concepts
  title: 异常值检验与处理：辨认概念与适用条件
- anchor: course-calculation
  id: experiment.error-analysis.outlier-tests.calculation
  title: 异常值检验与处理：完成定量计算并检查单位
- anchor: course-analysis
  id: experiment.error-analysis.outlier-tests.analysis
  title: 异常值检验与处理：说明方法、结果与限制
page_id: experiment.error-analysis.outlier-tests
prerequisites:
- sampling-distribution
status: review
title: 异常值检验与处理
---

本页为进阶专题；首次学习可先完成导读中的基础路线，再回到这里补齐推导与应用．

## 本页学习目标

<span id="course-concepts"></span>

异常值检验与处理：辨认概念与适用条件．

<span id="course-calculation"></span>

异常值检验与处理：完成定量计算并检查单位．

<span id="course-analysis"></span>

异常值检验与处理：说明方法、结果与限制．

## 远离平均值就应删除吗

学习目标：选择与候选产生方式一致的检验，计算统计量并解释证据．先读 [系统效应与异常数据](systematic-errors-outliers.md)．以下检验依赖同一稳定总体、独立观测等条件，统计拒绝不说明异常的物理原因．

## 三倍标准差的角色

已知正态总体均值与标准差时，单个观测落到均值正负三个标准差以外的概率约为 0.0027．独立的 $n$ 个点至少一次超出的概率为 $1-(1-0.0027)^n$．若均值和标准差也由同组小样本估计，这一概率不再直接适用．例如读数 10.8 相对已知均值 10.0、标准差 0.2 的标准化偏差为 4，只能标记为可疑并调查．

## Romanovsky 思路与固定候选预测检验

传统讲义先暂移可疑点，再用其余点估计中心和分散．必须分清候选是否在看到全体数据前由独立日志指定．对于这样的固定候选 $x_j$，其余 $m=n-1$ 个独立正态观测给出 $\bar x_{-j}$ 和 $s_{-j}$，则

$$
T=\frac{x_j-\bar x_{-j}}{s_{-j}\sqrt{1+1/m}}\sim t_{m-1}.
$$

双侧水平 $\alpha$ 下比较 $|T|$ 与 $t_{1-\alpha/2,n-2}$．若写成 $|x_j-\bar x_{-j}|>Ks_{-j}$，则 $K=t_{1-\alpha/2,n-2}\sqrt{n/(n-1)}$．这里采用明确的固定候选预测检验，不宣称所有同名传统系数表都等价．

例：预先由日志指定候选 10.8，其余五次为 9.9、10.0、10.1、10.0、10.0．其均值为 10，$s_{-j}=0.0707107$，$|T|=10.32796$，自由度 4，双侧 5% 临界值 2.77645，拒绝同一正态总体模型．若候选是看完全体后挑出的最远点，发生了选择，应采用相应阈值，不能沿用本节 5% 解释．

## Grubbs 单异常检验

对 $n\geq3$ 个独立近似正态观测，备择为一个异常点，

$$
G=\frac{\max_i|x_i-\bar x|}{s},\qquad
G_{\rm crit}=\frac{n-1}{\sqrt n}\sqrt{\frac{t^2}{n-2+t^2}},\quad
t=t_{1-\alpha/(2n),n-2}.
$$

阈值考虑了从全体挑最远点的选择．上述六个数的 $G$ 约为 2.00401，5% 临界值为 1.88715，提示单异常．多个异常可互相遮蔽，不应反复单点删除直到通过；应预先选择适合的多异常方法，例如 generalized ESD，并报告假设与次数．

## Dixon 相邻间隔比

对有序数据 $x_{(1)}\leq\cdots\leq x_{(n)}$，最简单的 $r_{10}$ 比为

$$
Q_{\rm high}=\frac{x_{(n)}-x_{(n-1)}}{x_{(n)}-x_{(1)}},\qquad
Q_{\rm low}=\frac{x_{(2)}-x_{(1)}}{x_{(n)}-x_{(1)}}.
$$

近似正态、单个端点异常、极差非零时才使用相应表．NBS Handbook 91 推荐 $r_{10}$ 用于 3–7 个观测，较大样本采用其他间隔比；这不是所有 Dixon 变体的共同表．对于 $n=5$ 双端搜索、5% 的 $r_{10}$ 教学检验，临界值约 0.710．数据 1.00、1.02、1.03、1.04、1.30 给 $Q_{\rm high}=0.26/0.30=0.866667$，超过该阈值．不得换样本数或尾部约定后沿用 0.710．

## 决策与记录

总体漂移、分段或重尾时先改模型．记录原始值、候选来源、统计量、分布假设、阈值、显著性水平、处理理由，以及包含/不包含候选时的敏感性比较．确认失效可标记排除但保留原始数据；一个 p 值不能证明误操作．下一步到 [不确定度评定](uncertainty-evaluation.md)．

依据：[NIST 单点预测](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/predlimi.htm)、[Grubbs](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h1.htm)、[多异常 ESD](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h3.htm)；Dixon 表见 [NBS Handbook 91](https://nvlpubs.nist.gov/nistpubs/Legacy/hb/nbshandbook91.pdf)，第 391–392 个 PDF 页面．Romanovsky 名称对照本地讲义 03，本页明确说明所用预测分布．

## 阅读连接

上一页：[系统效应与异常数据](systematic-errors-outliers.md)．下一页：[标准不确定度的评定](uncertainty-evaluation.md)．
