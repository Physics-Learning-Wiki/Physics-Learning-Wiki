author: Physics Learning Wiki

## 模拟软件简介

本页讨论的「模拟软件」主要指 Mathematica、MATLAB，以及与 MATLAB 生态紧密相关的 Simulink。它们并不一定比 Python「更高级」，而是针对某些任务提供了更成熟、更集成或更课程化的工作方式。

如果你面对的是符号计算较重、矩阵计算较多、课程明确要求使用某款软件，或者希望快速做交互式演示与可视化，那么这些软件往往会非常省力。

## 什么时候应该考虑专业软件

下面这些情况尤其适合考虑 Mathematica 或 MATLAB：

- 课程、实验课或导师明确要求某个软件环境。
- 你需要大量做符号化简、解析解探索和表达式操作。
- 你希望快速搭建交互式界面或参数滑块，观察系统行为变化。
- 你需要成熟的数值求解、线性代数和工具箱生态。
- 你所在的学校已经提供校园授权，不需要额外承担软件成本。

反过来说，如果你主要想做可复现的脚本、小型数值实验和通用数据处理，[Python 科学计算](./python-scicomp.md) 往往仍然是更通用的第一选择。

## Mathematica、MATLAB、Simulink 和 Octave 的分工

| 工具 | 优势 | 典型物理场景 | 需要注意 |
| --- | --- | --- | --- |
| Mathematica | 符号计算、表达式化简、交互式笔记本、可视化强。 | 解析推导检查、参数探索、展示型 notebook。 | 学习语言风格需要适应；商业授权。 |
| MATLAB | 矩阵计算、数值算法、工程课程和工具箱生态成熟。 | 数值分析、线性代数、控制、信号处理、实验数据处理。 | 商业授权；部分功能依赖工具箱。 |
| Simulink | 模块化方块图建模。 | 控制系统、信号链路、系统级仿真。 | 更偏工程与系统建模，不是所有基础物理课都需要。 |
| GNU Octave | 类 MATLAB 语法的自由软件替代。 | 预算有限但想练 MATLAB 风格语法。 | 与 MATLAB 有兼容性差异，工具箱生态较弱。 |

???+ warning "先确认授权和课程要求"
		Mathematica 和 MATLAB 都是商业软件。开始学习之前，最好先确认学校是否提供校园授权，或者课程是否已经给出统一安装说明。如果没有授权，又不需要课程硬性要求，优先使用 Python 或 GNU Octave 通常更现实。

## Mathematica 快速上手

Mathematica 的核心优势在于：符号计算、数值计算、图形和交互都在同一个环境里。很多课堂上需要几页推导的步骤，在 Mathematica 里可以很快检查和试探。

### 你会经常用到的能力

- `Solve`、`Reduce`：代数方程求解。
- `Integrate`、`D`：积分和求导。
- `DSolve`、`NDSolve`：解析解和数值解。
- `Plot`、`ContourPlot`、`DensityPlot`：各种图形。
- `Manipulate`：参数滑块和交互演示。

### 一个阻尼振子的例子

```wolfram
eq = x''[t] + 0.2 x'[t] + 4 x[t] == 0;
sol = NDSolveValue[
	{eq, x[0] == 1, x'[0] == 0},
	x,
	{t, 0, 20}
];

Plot[
	sol[t],
	{t, 0, 20},
	AxesLabel -> {"t", "x"},
	PlotLabel -> "Damped Oscillator"
]
```

这个例子做的事情和 Python 中的 ODE 示例本质上是一样的：建立方程，给初始条件，数值求解，然后画图。不同之处在于 Mathematica 更强调「交互式 notebook + 内建符号能力」这一路径。

### Mathematica 特别适合哪些事

1. 先做解析尝试，再决定是否数值求解。
2. 快速化简复杂表达式，检查手算推导。
3. 通过 `Manipulate` 看参数变化如何改变系统行为。
4. 做教学演示和图像探索。

## MATLAB 快速上手

MATLAB 的思路更偏向数值计算、矩阵运算和工程计算。很多理工科课程、实验课和工程课题都会直接给出 MATLAB 环境，因此它在大学阶段依然非常常见。

### MATLAB 中最值得尽早记住的几件事

1. 绝大多数对象都和矩阵、向量、数组运算有关。
2. `*` 是矩阵乘法，`.*` 是逐元素乘法。
3. `/` 和 `./`、`^` 和 `.^` 也要区分矩阵运算与逐元素运算。
4. 脚本、函数文件和 Live Script 分别适合不同任务。

### 一个用 `ode45` 的例子

```matlab
gamma = 0.15;
omega0 = 2.0;

f = @(t, y) [y(2); -2 * gamma * y(2) - omega0^2 * y(1)];

[t, y] = ode45(f, [0 20], [1; 0]);

plot(t, y(:, 1), 'LineWidth', 1.5)
xlabel('t / s')
ylabel('x / m')
title('Damped Oscillator')
grid on
```

如果你已经学过 [Python 科学计算](./python-scicomp.md)，你会发现二者的思想几乎一样：写出状态方程，交给数值求解器，再做图像检查。真正不同的是语言细节、内建函数接口和工具链生态。

### MATLAB 典型适用场景

- 课程指定使用 MATLAB 做数值作业。
- 需要大量矩阵和线性代数操作。
- 需要工程工具箱，例如控制、信号处理、系统识别等。
- 需要用 Live Script 进行带公式和图像的交互展示。

## Simulink 什么时候值得学

Simulink 更像是「系统方块图建模平台」，而不是传统意义上的脚本语言。它特别适合：

- 控制系统框图建模。
- 多模块耦合系统的信号流分析。
- 工程系统和反馈系统的可视化仿真。

如果你还处在基础大学物理阶段，通常不需要一开始就学 Simulink；但如果你正在接触控制、电子、自动化或系统工程，它会非常常见。

## 什么时候专业软件不一定是最佳选择

1. 你只是想做一两个简单数值实验。
2. 你需要跨平台、开源、便于分享的脚本。
3. 你希望与 Git、文本编辑器和自动化流程更紧密结合。
4. 你的同学或合作者并不都拥有相同的商业软件授权。

这时，Python 往往更稳，也更适合长期积累。

## 选择建议

| 你的需求 | 更推荐的工具 |
| --- | --- |
| 想先做解析推导检查，再做图。 | Mathematica。 |
| 课程要求 MATLAB，或者你在做矩阵和工程计算。 | MATLAB。 |
| 需要系统框图和反馈建模。 | Simulink。 |
| 没有商业授权，但想练 MATLAB 风格。 | GNU Octave。 |
| 想做开源、通用、脚本化工作流。 | Python。 |

## 使用这些软件时最容易犯的错误

1. 看到图像“长得像对的”，就停止做物理检查。
2. 不区分符号计算和数值计算，导致表达式和数值类型混乱。
3. 只保存 notebook 或图形界面操作结果，不保存可复现脚本。
4. 在 MATLAB 里混淆矩阵运算和逐元素运算。
5. 过度依赖黑箱函数，却不清楚模型假设和默认参数是什么。

## 一个建议的学习顺序

如果你需要同时接触 Python 和专业软件，可以按下面的顺序学：

1. 先用 Python 建立最基本的数值实验思维。
2. 再根据课程或研究需求切入 Mathematica 或 MATLAB。
3. 遇到需要更强符号能力时，优先尝试 Mathematica。
4. 遇到课程、实验室或工程项目已经固定使用 MATLAB 时，直接把 MATLAB 用熟。

这样更容易理解「工具选择」而不是陷入「工具崇拜」。

## 官方文档与主页入口

| 名称 | 作用 | 官方文档或主页 |
| --- | --- | --- |
| Wolfram Mathematica | Mathematica 产品主页。 | [https://www.wolfram.com/mathematica/](https://www.wolfram.com/mathematica/) |
| Wolfram Language Documentation | Mathematica / Wolfram Language 文档中心。 | [https://reference.wolfram.com/language/](https://reference.wolfram.com/language/) |
| MATLAB Documentation | MATLAB 官方文档。 | [https://www.mathworks.com/help/matlab/](https://www.mathworks.com/help/matlab/) |
| Simulink Documentation | Simulink 官方文档。 | [https://www.mathworks.com/help/simulink/](https://www.mathworks.com/help/simulink/) |
| GNU Octave Documentation | Octave 官方文档。 | [https://docs.octave.org/](https://docs.octave.org/) |

## 建议的入门练习

1. 在 Mathematica 或 MATLAB 中实现一个阻尼振子或 RC 放电的数值求解。
2. 改动 2 到 3 个参数，观察响应曲线如何变化。
3. 再把同一个问题用 Python 重做一次，比较不同工具的工作流差别。

如果你能把「同一个物理问题」在不同工具里分别做通，就会更清楚每种软件的真正定位。