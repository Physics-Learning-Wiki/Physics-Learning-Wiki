---
author: Physics Learning Wiki
---

## Python 科学计算简介

对大多数物理学习者来说，Python 是最值得优先掌握的计算工具．它的优势不是在某一个点上「绝对最强」，而是在数值计算、数据处理、绘图、符号计算、自动化和可复现性之间取得了很好的平衡．

如果你只打算系统学一门通用计算工具，Python 往往是最合适的起点．

## 你能用 Python 做什么

在物理学习中，Python 最常见的用途包括：

-   解常微分方程，做数值实验．
-   处理实验数据，做拟合、误差分析和批量计算．
-   生成函数图、相图、热图、误差棒图等科学图像．
-   做基础符号运算，例如求导、积分、级数展开和矩阵运算．
-   把重复性很强的计算写成脚本，减少手工抄写和重复操作．

## 为什么 Python 特别适合物理学习

1.  语法相对容易上手，学习门槛低于很多传统工程语言．
2.  科学计算生态成熟，NumPy、SciPy、Matplotlib、SymPy、Jupyter 等工具之间衔接自然．
3.  既适合做快速验证，也适合做较严肃的小型项目．
4.  与 [绘图工具](./plotting.md) 和 [LaTeX 物理写作](./latex.md) 很容易拼成一条完整工作流．
5.  免费、跨平台、文档丰富、社区大．

## 推荐的安装思路

### 方案一：Python 官网安装包 + venv

这是最通用、最容易理解的一种方案．你会直接使用官方 Python，并且用 `venv` 给每个项目单独建环境．

适合你如果：

-   你想真正理解 Python 环境是怎么工作的．
-   你不想一开始就接触太多额外概念．
-   你的需求主要是课程作业、实验脚本和小型项目．

### 方案二：Miniforge 或 conda 生态

这类方案在科学计算社区也很常见，特别适合需要装较多科学库、或者希望环境隔离更明显的情况．

适合你如果：

-   你会频繁切换不同项目环境．
-   你会使用较多预编译科学库．
-   你的课程或实验室已经普遍使用 conda．

### 方案三：Jupyter 作为交互入口

Jupyter 不是 Python 发行版，而是一种交互式工作方式．它非常适合：

-   边改参数边看结果．
-   做教学展示和探索性计算．
-   把文字、公式、代码和图放在同一份笔记里．

但如果项目逐渐变大，仍然建议把核心逻辑整理回普通 `.py` 文件，而不是让笔记本无限膨胀．

## 一套足够稳的最小环境

如果你想尽快开始，可以先装官方 Python，然后在一个新目录里执行下面的步骤．

```bash
python -m venv .venv
```

Windows 下激活环境：

```powershell
.\.venv\Scripts\Activate.ps1
```

安装常用科学计算库：

```bash
python -m pip install numpy scipy matplotlib sympy pandas jupyterlab uncertainties pint
```

如果你想打开 JupyterLab：

```bash
jupyter lab
```

这已经足够覆盖大部分本科物理学习场景．

## 初学者最值得先认识的库

| 库             | 主要用途       | 在物理学习中的典型任务          |
| ------------- | ---------- | -------------------- |
| NumPy         | 数组和基础数值计算． | 向量化运算、矩阵、采样、数据存储．    |
| SciPy         | 科学计算算法．    | ODE、积分、优化、拟合、信号处理．   |
| Matplotlib    | 绘图．        | 函数图、数据图、误差棒图、热图．     |
| SymPy         | 符号计算．      | 求导、积分、代数化简、矩阵和解析表达式． |
| pandas        | 表格数据处理．    | CSV 数据清洗、实验记录表处理．    |
| JupyterLab    | 交互式笔记本．    | 教学展示、探索性实验、逐步推导．     |
| uncertainties | 不确定度传播．    | 实验误差传播、结果表示．         |
| Pint          | 单位管理．      | 防止单位混用，增强脚本可靠性．      |

## 一个最小完整示例：阻尼振子数值解

下面这个例子展示的是：给出模型，数值求解，再画出位移随时间的变化．这几乎就是很多物理学习场景的标准套路．

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp

gamma = 0.15
omega0 = 2.0


def damped_oscillator(t, state):
    x, v = state
    dx_dt = v
    dv_dt = -2 * gamma * v - omega0**2 * x
    return [dx_dt, dv_dt]


t_eval = np.linspace(0.0, 20.0, 800)
solution = solve_ivp(
    damped_oscillator,
    t_span=(0.0, 20.0),
    y0=[1.0, 0.0],
    t_eval=t_eval,
)

plt.figure(figsize=(8, 4.5))
plt.plot(solution.t, solution.y[0], label="x(t)")
plt.xlabel("t / s")
plt.ylabel("x / m")
plt.title("Damped Harmonic Oscillator")
plt.grid(True, alpha=0.3)
plt.legend()
plt.tight_layout()
plt.show()
```

这个例子背后的物理步骤其实很清楚：

1.  先把二阶微分方程改写成一阶方程组．
2.  再设定初始条件和积分区间．
3.  最后用图像检查响应是否符合阻尼振子的直觉．

如果图像看起来完全不对，先不要怀疑库本身，而要先检查：方程符号、初值、单位、时间范围和参数量级是否合理．

## 常见任务模板

### 用 SciPy 做拟合

实验数据处理中最常见的问题之一是：有一组测量点，想拟合出参数．一个典型例子是指数衰减拟合．

```python
import numpy as np
from scipy.optimize import curve_fit


def model(t, a, tau):
    return a * np.exp(-t / tau)


t_data = np.array([0.0, 1.0, 2.0, 3.0, 4.0])
y_data = np.array([5.1, 3.3, 2.4, 1.6, 1.1])

params, covariance = curve_fit(model, t_data, y_data, p0=[5.0, 2.0])
a_fit, tau_fit = params
```

在实际实验里，你通常还应该进一步做下面几件事：

-   画出原始数据点和拟合曲线．
-   查看参数不确定度．
-   判断模型假设是否真的合理，而不是机械追求拟合优度．

### 用 SymPy 做符号计算

```python
import sympy as sp

t, omega, phi = sp.symbols("t omega phi", real=True)
x = sp.cos(omega * t + phi)

velocity = sp.diff(x, t)
acceleration = sp.diff(x, t, 2)
sp.simplify(acceleration + omega**2 * x)
```

这类工具很适合检查推导、做代数化简或生成课堂讲义中的中间表达式，但它不能代替你理解模型本身．

### 用 uncertainties 做误差传播

```python
from uncertainties import ufloat

length = ufloat(1.000, 0.005)
time = ufloat(2.010, 0.020)
g = 4 * 3.1415926**2 * length / time**2

print(g)
```

当你已经知道误差传播的物理意义时，这个库会非常方便；但如果你还没有学过误差分析，建议同时阅读 [误差分析与数据处理](../experiment/error-analysis.md)．

### 如果你需要处理单位

数值脚本里最危险的一类错误之一就是单位混乱．Pint 可以帮助你在程序中显式保存单位信息．例如：

```python
from pint import UnitRegistry

ureg = UnitRegistry()
g = 9.81 * ureg.meter / ureg.second**2
length = 0.5 * ureg.meter
period = 2 * 3.1415926 * (length / g) ** 0.5
print(period.to(ureg.second))
```

## Jupyter、脚本和 IDE 怎么选

| 形式                    | 适合做什么         | 局限是什么      |
| --------------------- | ------------- | ---------- |
| Jupyter Notebook/Lab  | 探索、教学、逐步展示．   | 项目一大就容易凌乱． |
| 普通 Python 脚本          | 稳定、可复用、易版本控制． | 交互性不如笔记本强． |
| VS Code/PyCharm 等 IDE | 长期项目、调试和重构．   | 初学时界面可能略重． |

一个很实用的做法是：先在 Jupyter 里试模型，确认思路后，把成熟代码整理成 `.py` 文件，再把结果放入 LaTeX 笔记或实验报告中．

## 物理计算中的好习惯

1.  每次写脚本前先写清楚模型、变量和单位．
2.  先做数量级、极限和特殊情形检查，再相信程序输出．
3.  图像一定标坐标轴名称和单位．
4.  参数和输入数据尽量集中放在文件开头，便于修改和复现．
5.  结果不仅要保存图片，也要保存关键参数和原始数据．
6.  不要把 notebook 当成无限堆积的草稿箱．

## 初学者最常见的错误

1.  把 Python 当计算器用，却不保留脚本和环境信息．
2.  混淆角度制和弧度制．
3.  拟合时不提供初值，也不检查模型是否符合物理背景．
4.  只盯着代码报错，不检查物理量是否定义正确．
5.  把数组运算和标量运算混在一起，导致结果悄悄出错．
6.  没有保存图像、数据和参数，几天后无法复现结果．

## 如果你暂时不想写代码

有些场景下，你只是想先把实验不确定度算出来，而不想马上搭建完整 Python 工作流．这时可以先使用现成工具，但仍然建议理解它背后的公式．

### 不确定度计算器

开源仓库：[GitHub](https://github.com/Leafuke/Physics-Lab-Uncertainty-Calculator)．

下载地址：[GitHub Releases](https://github.com/Leafuke/Physics-Lab-Uncertainty-Calculator/releases)．

下载地址（加速）：[GH Proxy - v0.2.0](https://gh-proxy.org/https://github.com/Leafuke/Physics-Lab-Uncertainty-Calculator/releases/download/v0.2.0/-v0.2.0-windows-x64.zip)．

这是一个专门为物理实验设计的工具，能够帮助你计算测量数据的不确定度，并生成较规范的输出结果．它适合你在刚开始做实验数据处理时先建立流程感，但不要把它当成误差分析知识本身的替代品．

![不确定度计算器界面](../images/uncertainty-tool.png)

## 官方文档与主页入口

| 名称            | 作用            | 官方文档或主页                                    |
| ------------- | ------------- | ------------------------------------------ |
| Python        | 语言本体与标准库．     | <https://docs.python.org/3/>               |
| NumPy         | 数组和基础数值计算．    | <https://numpy.org/doc/>                   |
| SciPy         | 科学计算算法库．      | <https://docs.scipy.org/doc/scipy/>        |
| Matplotlib    | 科学绘图．         | <https://matplotlib.org/stable/>           |
| SymPy         | 符号计算．         | <https://docs.sympy.org/>                  |
| pandas        | 表格数据处理．       | <https://pandas.pydata.org/docs/>          |
| Jupyter       | 交互式笔记本．       | <https://jupyter.org/>                     |
| uncertainties | 不确定度传播．       | <https://uncertainties.readthedocs.io/>    |
| Pint          | 单位管理．         | <https://pint.readthedocs.io/>             |
| Miniforge     | conda 生态轻量入口． | <https://github.com/conda-forge/miniforge> |

## 建议的入门练习

1.  用 Python 画出简谐振动和阻尼振动的位移曲线，并比较二者差异．
2.  用实验数据做一次直线拟合或指数拟合，并写出参数与不确定度．
3.  用 SymPy 检查一个课堂推导，例如简谐振子的速度和加速度关系．

当你能独立完成这三类练习时，Python 就已经开始真正成为你的物理学习工具，而不是只停留在「听说很有用」的阶段．
