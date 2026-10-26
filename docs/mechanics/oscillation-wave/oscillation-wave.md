---
title: 振动与波导读
author: ChatGPT, Physics Learning Wiki Team
status: review
description: 按单自由度振动、叠加、多自由度模态、非线性与波动组织阅读，连接普通力学与分析力学的应用路线．
---

## 振动与波导读

振动研究系统如何随时间偏离并返回平衡附近；波动进一步研究这种变化怎样通过相邻部分的相互作用传播．先学会求一个振子的运动，再讨论叠加、耦合与传播，可以区分「一个坐标如何变化」和「整个系统如何一起运动」．

## 按当前任务选择页面

| 你要完成的任务 | 阅读入口 | 需要的基础 |
| --- | --- | --- |
| 从初始位置和速度求自由振动，区分阻尼与共振条件 | [线性振动](linear-oscillation.md) | 牛顿定律、能量、二阶微分方程 |
| 分析同频叠加、拍与相位关系 | [振动的合成与分解](superposition.md) | 单个简谐振动与复数表示 |
| 用能量构造耦合系统的线性近似 | [平衡附近的小振动](../analytical/small-oscillations.md) | 拉格朗日建模、泰勒展开 |
| 求振型、简正坐标和初态分解 | [简正模](../analytical/normal-modes.md) · [双摆模态](../analytical/double-pendulum-modes.md) | 小振动矩阵方程、特征值与内积 |
| 判断振幅增大后线性模型何时失效 | [非线性振动](nonlinear.md) | 线性振动、微分方程 |
| 从时间振荡进入空间传播 | [简谐波](harmonic-wave.md) · [连续介质中的波](wave-in-continuous-medium.md) | 振动相位、空间与时间导数 |
| 区分传播与观测频率变化 | [多普勒效应](doppler-effect.md) | 波速、频率与参考系 |

## 从单个振子到耦合系统

线性齐次方程的解可作线性叠加；固定外驱动时，任意叠加两个完整解却通常不再满足原来的驱动力，需同时叠加驱动或保留一个特解．线性叠加有明确的方程条件．

多自由度系统中，一个物体的位移一般含多个频率．简正坐标把各个集体运动分开，不等于每个物体各自独立振动．这套推导统一放在分析力学模块，普通振动页保留入口；跟课学习可使用 [理论力学课程路线](../../courses/theoretical-mechanics.md)．

连续介质可看作空间上连续耦合的系统，但从离散振子进入波动方程还需建立局部受力、材料关系与连续近似，详见 [连续介质中的波](wave-in-continuous-medium.md)．

## 原有单自由度内容的阅读入口

以下原小节入口对应已合并到线性振动页的内容．

<span id="线性振动linear-oscillations"></span><span id="0-建模单自由度线性振子"></span><span id="1-无阻尼自由振动简谐振动的推导"></span><span id="11-解的形式"></span><span id="12线性为什么重要"></span><span id="6-典型模型单摆的小角近似"></span>

[继续阅读：简谐振动](linear-oscillation.md#简谐振动)．

<span id="2-能量观点等分与守恒"></span>

[继续阅读：能量分析](linear-oscillation.md#能量分析)．

<span id="3-阻尼自由振动damped-free-oscillation"></span><span id="31-欠阻尼gammaomega_0"></span><span id="32-临界阻尼gammaomega_0"></span><span id="33-过阻尼gammaomega_0"></span><span id="34-阻尼下的能量衰减"></span>

[继续阅读：阻尼振动](linear-oscillation.md#阻尼振动)．

<span id="4-简谐受迫振动driven-oscillation"></span><span id="41-复数法求稳态特解"></span><span id="42-共振与共振频率"></span><span id="5-暂态--稳态为什么久了只剩稳态"></span>

[继续阅读：受迫振动](linear-oscillation.md#受迫振动)．

<span id="43-功率与带宽品质因数"></span>

[继续阅读：功率共振与品质因数](linear-oscillation.md#功率共振与品质因数)．

<span id="7-常见易错点清单"></span><span id="8-与波的衔接"></span>

[继续阅读：应用](linear-oscillation.md#应用)．

