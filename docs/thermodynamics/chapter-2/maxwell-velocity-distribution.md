---
author: Physics Learning Wiki
---

## 麦克斯韦速率分布律

在一个容器中装有大量气体分子，它们不断碰撞、改变速度。单个分子的速率是随机的、不可预测的，但当分子数目足够大时，它们的集体行为却服从一个确定的统计分布。这个分布由麦克斯韦于 1859 年首先推导出来，是统计物理中最基本的结果之一。本页将从概率论的基本概念出发，逐步建立速度空间和分布函数的概念，推导麦克斯韦速度分布和速率分布，并讨论其物理意义和应用。

## 学习目标

读完本页后，你应该能够：

- 理解统计规律与分布函数的概念
- 理解速度空间和速度分布函数的定义
- 从统计独立和各向同性两个假设出发，推导麦克斯韦速度分布
- 写出麦克斯韦速率分布函数，理解其曲线特征
- 计算最概然速率、平均速率和方均根速率，并理解三者的物理意义
- 用速率分布解释大气逃逸、泻流等现象

## §1 概率论预备知识

本页的推导需要用到概率论的基本概念。下面做一个简要回顾；如需详细学习，请参阅概率论相关页面。

??? note "前置知识：概率论速览"
    **随机变量**：将随机实验的结果映射为实数的函数。分为离散型和连续型。

    **概率密度函数 (PDF)**：对于连续随机变量 $X$，概率密度函数 $f(x)$ 满足：

    $$
    P(a \leq X \leq b) = \int_a^b f(x)\,\mathrm{d}x
    $$

    **归一化条件**：$\displaystyle\int_{-\infty}^{+\infty} f(x)\,\mathrm{d}x = 1$。概率密度函数在整个定义域上的积分必须等于 1。

    **数学期望**：$E[X] = \displaystyle\int_{-\infty}^{+\infty} x\,f(x)\,\mathrm{d}x$，度量分布的"中心"位置。

    **高斯积分**：$\displaystyle\int_0^{+\infty} x^n\,e^{-\alpha x^2}\,\mathrm{d}x$ 可通过递推公式计算，最基本的结果是 $\displaystyle\int_{-\infty}^{+\infty} e^{-\alpha x^2}\,\mathrm{d}x = \sqrt{\dfrac{\pi}{\alpha}}$。

    详细内容请参阅：[概率论的基本概念](../../math/probability-statistics/basic-concepts.md)、[一维随机变量及其分布](../../math/probability-statistics/one-dimensional-random-variables-and-distributions.md)、[随机变量的数字特征](../../math/probability-statistics/characteristic-values-of-random-variables.md)。

## §2 统计规律与分布函数

### 从伽尔顿板说起

想象一个伽尔顿板（Galton board）：大量小球从顶部下落，每经过一层钉板时随机向左或向右偏转。单个小球最终落入哪个槽位是随机的——你无法预测下一个小球的位置。但是，当大量小球落下后，它们在各个槽位中堆积形成的**直方图**却呈现出一个确定的、光滑的钟形曲线。

这就是**统计规律**的核心：单个事件是随机的，但大量事件的集体行为服从确定的规律。

两个等价的视角：

1. **一个粒子多次测量**：对同一个分子反复测量其速率，记录各次结果的分布
2. **大量粒子一次测量**：在某一时刻，对容器中所有分子的速率进行统计

在平衡态下，这两种视角给出相同的结果。

### 从直方图到分布函数

设小球落入位置 $x$ 附近宽度为 $\Delta x_i$ 的第 $i$ 个槽中的数目为 $\Delta N_i$。当槽的宽度 $\Delta x \to 0$ 且小球总数 $N \to \infty$ 时，离散的直方图过渡为连续的**分布函数**：

$$
\dfrac{\mathrm{d}N}{N} = f(x)\,\mathrm{d}x
$$

其中 $f(x)$ 称为**分布函数**（更准确地说，是概率密度函数）。它表示随机变量取值在 $x$ 附近单位区间内的**相对概率密度**。

分布函数必须满足**归一化条件**：

$$
\int_{-\infty}^{+\infty} f(x)\,\mathrm{d}x = 1
$$

这对应"所有小球最终都落入某个槽中"的确定性事实。

任意物理量 $G(x)$ 的统计平均值为：

$$
\overline{G} = \int_{-\infty}^{+\infty} G(x)\,f(x)\,\mathrm{d}x
$$

## §3 速度空间与速度分布函数

### 速度空间

在经典力学中，每个分子的速度可以用三个分量 $(v_x, v_y, v_z)$ 来描述。这三个分量构成一个三维空间，称为**速度空间**。速度空间中的每个点对应一种可能的分子速度状态。

在平衡态下，容器中 $N$ 个分子的速度分布在速度空间中形成一个"云"——某些区域分子密集（速度出现的概率大），某些区域分子稀疏。

### 速度分布函数

设 $f(v_x, v_y, v_z)$ 为速度分布函数，其物理含义是：在速度空间中，速度分量落在 $(v_x, v_y, v_z)$ 附近体积元 $\mathrm{d}v_x\,\mathrm{d}v_y\,\mathrm{d}v_z$ 内的分子数占总分子数的比例为：

$$
\dfrac{\mathrm{d}N}{N} = f(v_x, v_y, v_z)\,\mathrm{d}v_x\,\mathrm{d}v_y\,\mathrm{d}v_z
$$

归一化条件要求：

$$
\iiint_{-\infty}^{+\infty} f(v_x, v_y, v_z)\,\mathrm{d}v_x\,\mathrm{d}v_y\,\mathrm{d}v_z = 1
$$

### 球坐标形式

由于在平衡态下气体是各向同性的（没有特殊方向），速度分布只依赖于速率 $v = \sqrt{v_x^2 + v_y^2 + v_z^2}$，而不依赖于方向。将速度空间转化为球坐标 $(v, \theta, \varphi)$，体积元为 $v^2\sin\theta\,\mathrm{d}v\,\mathrm{d}\theta\,\mathrm{d}\varphi$。对角度积分后（$\int_0^{2\pi}\mathrm{d}\varphi\int_0^{\pi}\sin\theta\,\mathrm{d}\theta = 4\pi$），得到：

$$
\dfrac{\mathrm{d}N}{N} = 4\pi v^2 f(v)\,\mathrm{d}v
$$

其中 $f(v)$ 是只依赖于速率的分布函数。

### 约束条件

分布函数 $f(v)$ 必须满足两个物理约束：

1. **粒子数守恒**（归一化）：$\displaystyle\int_0^{+\infty} 4\pi v^2 f(v)\,\mathrm{d}v = 1$

2. **平均动能与温度的关系**：由能均分定理，$\displaystyle\int_0^{+\infty} \dfrac{1}{2}mv^2 \cdot 4\pi v^2 f(v)\,\mathrm{d}v = \dfrac{3}{2}kT$

这两个约束将用于确定分布函数中的待定常数。

## §4 麦克斯韦速度分布的推导

### 两个基本假设

麦克斯韦在推导速度分布时，作了以下两个假设：

???+ warning "麦克斯韦的两个假设"
    **假设 1：速度分量统计独立。** 在热平衡态下，三个速度分量 $v_x$、$v_y$、$v_z$ 的分布彼此独立。即：

    $$
    f(v_x, v_y, v_z) = f(v_x)\,f(v_y)\,f(v_z)
    $$

    **假设 2：各向同性。** 对于宏观上静止的气体，速度分布不依赖于方向，只依赖于速率 $v$。即：

    $$
    f(v_x, v_y, v_z) = \Phi(v_x^2 + v_y^2 + v_z^2)
    $$

### 推导过程

将两个假设结合：$f(v_x)\,f(v_y)\,f(v_z) = \Phi(v_x^2 + v_y^2 + v_z^2)$。

两边取对数：

$$
\ln f(v_x) + \ln f(v_y) + \ln f(v_z) = \ln\Phi(v_x^2 + v_y^2 + v_z^2)
$$

对 $v_x^2$ 求偏导（注意左边只有 $\ln f(v_x)$ 项依赖于 $v_x$）：

$$
\dfrac{\mathrm{d}\ln f(v_x)}{\mathrm{d}(v_x^2)} = \dfrac{\partial\ln\Phi}{\partial(v_x^2 + v_y^2 + v_z^2)} \equiv -B
$$

由于左边只依赖于 $v_x$，右边只依赖于 $v_x^2 + v_y^2 + v_z^2$，要使等式对任意 $(v_x, v_y, v_z)$ 成立，两边必须等于同一个常数 $-B$。同理对 $v_y$、$v_z$ 求导也得到相同的常数。

因此：

$$
\ln f(v_i) = -B\,v_i^2 + \ln C_i \quad \Longrightarrow \quad f(v_i) = C_i\,e^{-Bv_i^2}
$$

其中 $B$ 和 $C_i$ 为待定常数。将三个分量相乘：

$$
f(v_x, v_y, v_z) = C_x C_y C_z\,e^{-B(v_x^2+v_y^2+v_z^2)} = C^3\,e^{-Bv^2}
$$

### 确定常数

**常数 $B$** 由平均动能条件确定。考虑一个速度分量（如 $v_x$），其平均动能为：

$$
\overline{\dfrac{1}{2}mv_x^2} = \dfrac{1}{2}kT
$$

利用一维高斯分布的结果：$\overline{v_x^2} = \dfrac{1}{2B}$，因此：

$$
\dfrac{1}{2}m \cdot \dfrac{1}{2B} = \dfrac{1}{2}kT \quad \Longrightarrow \quad B = \dfrac{m}{2kT}
$$

**常数 $C$** 由归一化条件确定。对 $v_x$ 分量：

$$
\int_{-\infty}^{+\infty} f(v_x)\,\mathrm{d}v_x = C_x \int_{-\infty}^{+\infty} e^{-Bv_x^2}\,\mathrm{d}v_x = C_x\sqrt{\dfrac{\pi}{B}} = 1
$$

$$
C_x = \sqrt{\dfrac{B}{\pi}} = \sqrt{\dfrac{m}{2\pi kT}}
$$

由各向同性，$C_x = C_y = C_z$，因此 $C^3 = \left(\dfrac{m}{2\pi kT}\right)^{3/2}$。

### 最终结果

???+ warning "麦克斯韦速度分布函数"

    $$
    f(\boldsymbol{v}) = \left(\dfrac{m}{2\pi kT}\right)^{3/2}\,\exp\!\left(-\dfrac{m(v_x^2+v_y^2+v_z^2)}{2kT}\right)
    $$
    
    其中 $m$ 为分子质量，$k$ 为玻尔兹曼常数，$T$ 为热力学温度。

各分量的分布是一维高斯分布：

$$
f(v_i) = \sqrt{\dfrac{m}{2\pi kT}}\,\exp\!\left(-\dfrac{mv_i^2}{2kT}\right), \quad i = x, y, z
$$

## §5 麦克斯韦速率分布

### 从速度分布到速率分布

在物理实验中，我们通常更关心分子的**速率** $v = |\boldsymbol{v}|$（速度的大小），而不是速度的方向。将速度分布函数对所有方向积分，得到**速率分布函数**：

???+ warning "麦克斯韦速率分布函数"
    $$
    F(v) = 4\pi\left(\dfrac{m}{2\pi kT}\right)^{3/2} v^2\,\exp\!\left(-\dfrac{mv^2}{2kT}\right), \quad v \geq 0
    $$

    $F(v)\,\mathrm{d}v$ 表示速率在 $[v, v+\mathrm{d}v]$ 区间内的分子数占总分子数的比例。

推导：在球坐标中，速率在 $[v, v+\mathrm{d}v]$ 内的分子占据速度空间中一个球壳，其体积为 $4\pi v^2\,\mathrm{d}v$。由于 $f(\boldsymbol{v})$ 只依赖于速率，可以直接写出：

$$
F(v)\,\mathrm{d}v = f(v) \cdot 4\pi v^2\,\mathrm{d}v = 4\pi\left(\dfrac{m}{2\pi kT}\right)^{3/2} v^2\,e^{-mv^2/2kT}\,\mathrm{d}v
$$

### 速率分布曲线的特征

$F(v)$ 曲线具有以下特征：

1. **起点**：$F(0) = 0$。速率为零的分子数为零（$v^2$ 因子的贡献）。
2. **终点**：$F(\infty) = 0$。速率极大的分子数也为零（指数衰减占主导）。
3. **存在极大值**：在某一速率 $v_p$ 处，$F(v)$ 取极大值。这个速率称为**最概然速率**。
4. **归一化**：$\displaystyle\int_0^{+\infty} F(v)\,\mathrm{d}v = 1$。曲线下的总面积为 1。

### 曲线随参数的变化

**温度的影响**（$m$ 固定）：当温度 $T$ 升高时——

- 最概然速率 $v_p$ 增大（峰值右移）
- 峰值高度 $F(v_p)$ 降低（峰值变矮）
- 分布变宽（高速分子比例增大）
- 由于总面积始终为 1，曲线变得更加"矮胖"

**质量的影响**（$T$ 固定）：当分子质量 $m$ 增大时——

- 最概然速率 $v_p$ 减小（峰值左移）
- 峰值高度 $F(v_p)$ 升高（峰值变高）
- 分布变窄
- 曲线变得更加"高瘦"

### 数值例：氧气在 273 K 下的速率分布

下表给出了氧气分子（$M = 32\;\text{g/mol}$，$T = 273\;\text{K}$）在各速率区间内的分子百分比：

| 速率区间 (m/s) | 分子百分比 (%) |
|:---:|:---:|
| 0 – 100 | 1.4 |
| 100 – 200 | 8.1 |
| 200 – 300 | 16.7 |
| 300 – 400 | 21.4 |
| 400 – 500 | 20.5 |
| 500 – 600 | 15.1 |
| 600 – 700 | 9.2 |
| 700 – 800 | 4.8 |
| 800 – 900 | 2.0 |
| 900 – 1000 | 0.7 |
| > 1000 | 0.1 |

可以看到，大多数分子的速率集中在 200–600 m/s 范围内，其中 300–400 m/s 区间占比最大（对应最概然速率附近）。

## §6 特征速率

速率分布函数 $F(v)$ 描述了分子速率的完整统计信息。在实际问题中，我们常用几个有明确物理意义的**特征速率**来概括分布的主要特征。

### 最概然速率 $v_p$

最概然速率是速率分布函数 $F(v)$ 取极大值时对应的速率。通过求解 $\dfrac{\mathrm{d}F}{\mathrm{d}v} = 0$：

$$
\dfrac{\mathrm{d}}{\mathrm{d}v}\!\left[v^2\,e^{-mv^2/2kT}\right] = 0 \quad \Longrightarrow \quad 2v - \dfrac{m}{kT}\,v^3 = 0
$$

解得（舍去 $v = 0$）：

$$
v_p = \sqrt{\dfrac{2kT}{m}} = \sqrt{\dfrac{2RT}{M_{\text{mol}}}} \approx 1.41\sqrt{\dfrac{RT}{M_{\text{mol}}}}
$$

其中 $M_{\text{mol}}$ 为摩尔质量，$R$ 为普适气体常量。

物理意义：$v_p$ 是概率密度最大的速率——在 $v_p$ 附近单位速率区间内的分子比例最高。

### 平均速率 $\bar{v}$

平均速率为所有分子速率的统计平均值：

$$
\bar{v} = \langle v \rangle = \int_0^{+\infty} v\,F(v)\,\mathrm{d}v = 4\pi\left(\dfrac{m}{2\pi kT}\right)^{3/2}\int_0^{+\infty} v^3\,e^{-mv^2/2kT}\,\mathrm{d}v
$$

利用高斯积分 $I_3(m/2kT) = \dfrac{1}{2(m/2kT)^2}$，计算得：

$$
\bar{v} = \sqrt{\dfrac{8kT}{\pi m}} = \sqrt{\dfrac{8RT}{\pi M_{\text{mol}}}} \approx 1.60\sqrt{\dfrac{RT}{M_{\text{mol}}}}
$$

### 方均根速率 $v_{\text{rms}}$

方均根速率为速率平方平均值的平方根，与分子的平均动能直接相关：

$$
\overline{v^2} = \int_0^{+\infty} v^2\,F(v)\,\mathrm{d}v = \dfrac{3kT}{m}
$$

$$
v_{\text{rms}} = \sqrt{\overline{v^2}} = \sqrt{\dfrac{3kT}{m}} = \sqrt{\dfrac{3RT}{M_{\text{mol}}}} \approx 1.73\sqrt{\dfrac{RT}{M_{\text{mol}}}}
$$

验证：一个分子的平均平动动能为 $\overline{E_k} = \dfrac{1}{2}m\overline{v^2} = \dfrac{1}{2}m \cdot \dfrac{3kT}{m} = \dfrac{3}{2}kT$，与能均分定理一致。

### 速度分量的方均根

对于单个速度分量（如 $v_x$），其分布是一维高斯分布，方均根速率为：

$$
\sqrt{\overline{v_x^2}} = \sqrt{\dfrac{kT}{m}}
$$

### 特征速率汇总

???+ warning "特征速率公式"
    | 特征速率 | 公式 | 与 $\sqrt{RT/M_{\text{mol}}}$ 的关系 |
    |:---:|:---:|:---:|
    | 最概然速率 $v_p$ | $\sqrt{\dfrac{2kT}{m}}$ | $\approx 1.41\sqrt{\dfrac{RT}{M_{\text{mol}}}}$ |
    | 平均速率 $\bar{v}$ | $\sqrt{\dfrac{8kT}{\pi m}}$ | $\approx 1.60\sqrt{\dfrac{RT}{M_{\text{mol}}}}$ |
    | 方均根速率 $v_{\text{rms}}$ | $\sqrt{\dfrac{3kT}{m}}$ | $\approx 1.73\sqrt{\dfrac{RT}{M_{\text{mol}}}}$ |

    三者满足不等式：$v_p < \bar{v} < v_{\text{rms}}$

    这个不等式的直观理解：$v^2$ 对大速率赋予更大的权重，因此 $v_{\text{rms}} > \bar{v}$；而 $F(v)$ 的不对称性（右侧尾巴更长）使得 $\bar{v} > v_p$。

## §7 应用

### 大气逃逸

行星大气中的气体分子是否能逃逸到太空，取决于分子的速率是否超过**逃逸速度** $v_{\text{esc}}$。对于地球，$v_{\text{esc}} \approx 11.2\;\text{km/s}$。

虽然平均速率远小于逃逸速度，但速率分布的高速"尾巴"中总有一些分子的速率超过 $v_{\text{esc}}$。这些分子可以克服引力逃逸到太空，导致大气逐渐散失。

逃逸速率与最概然速率的比值 $v_{\text{esc}}/v_p$ 决定了大气逃逸的快慢：

- 若 $v_{\text{esc}} \gg v_p$（如地球上的氮气、氧气），逃逸极慢，大气可以长期保持
- 若 $v_{\text{esc}} \gtrsim v_p$（如地球上的氢气、月球上的所有气体），逃逸较快，大气难以保持

这就是为什么地球大气中几乎没有氢气和氦气，而月球几乎没有大气。

### 泻流（Effusion）

当容器壁上有一个小孔（孔径远小于分子平均自由程）时，分子通过小孔逸出的现象称为**泻流**。泻流速率与分子的平均速率成正比：

$$
\text{泻流速率} \propto n\bar{v} = n\sqrt{\dfrac{8kT}{\pi m}}
$$

其中 $n$ 为分子数密度。

泻流的一个重要应用是**同位素分离**。在相同温度下，轻分子的平均速率大于重分子，因此轻分子通过小孔的泻流速率更快。利用这一原理，可以通过反复泻流来富集特定同位素。

??? note "例题：铀同位素分离"
    **题目**：$\text{UF}_6$ 气体中 $^{235}\text{UF}_6$ 和 $^{238}\text{UF}_6$ 的泻流速率之比是多少？

    **解答**：泻流速率 $\propto \bar{v} \propto 1/\sqrt{M_{\text{mol}}}$。因此：

    $$
    \dfrac{\bar{v}_{235}}{\bar{v}_{238}} = \sqrt{\dfrac{M_{238}}{M_{235}}} = \sqrt{\dfrac{349}{352}} \approx 1.0043
    $$

    单次泻流的分离效果很微弱（仅约 0.43%），因此需要通过数千级的级联过程才能实现有效的同位素富集。

## §8 例题

??? note "例题1：氧气分子在 300 K 下的特征速率"
    **题目**：计算氧气分子（$M_{\text{mol}} = 32\;\text{g/mol} = 0.032\;\text{kg/mol}$）在 $T = 300\;\text{K}$ 下的最概然速率、平均速率和方均根速率。已知 $R = 8.31\;\text{J/(mol·K)}$。

    **解答**：

    $$
    v_p = \sqrt{\dfrac{2RT}{M_{\text{mol}}}} = \sqrt{\dfrac{2 \times 8.31 \times 300}{0.032}} = \sqrt{155813} \approx 395\;\text{m/s}
    $$

    $$
    \bar{v} = \sqrt{\dfrac{8RT}{\pi M_{\text{mol}}}} = \sqrt{\dfrac{8 \times 8.31 \times 300}{\pi \times 0.032}} = \sqrt{198493} \approx 446\;\text{m/s}
    $$

    $$
    v_{\text{rms}} = \sqrt{\dfrac{3RT}{M_{\text{mol}}}} = \sqrt{\dfrac{3 \times 8.31 \times 300}{0.032}} = \sqrt{233719} \approx 484\;\text{m/s}
    $$

    **讨论**：$v_p < \bar{v} < v_{\text{rms}}$（$395 < 446 < 484\;\text{m/s}$），与理论预期一致。这些速率都远小于地球逃逸速度（$11.2\;\text{km/s}$），因此氧气分子在常温下不会逃逸地球大气。

??? note "例题2：速率在某区间内的分子比例"
    **题目**：在 $T = 300\;\text{K}$ 下，氮气分子（$M_{\text{mol}} = 28\;\text{g/mol}$）中，速率在 $400$ 到 $500\;\text{m/s}$ 之间的分子约占多少？

    **解答**：最概然速率为：

    $$
    v_p = \sqrt{\dfrac{2RT}{M_{\text{mol}}}} = \sqrt{\dfrac{2 \times 8.31 \times 300}{0.028}} \approx 422\;\text{m/s}
    $$

    区间 $[400, 500]\;\text{m/s}$ 大致在 $v_p$ 附近。可以用以下近似方法估计：由于 $\Delta v = 100\;\text{m/s}$ 较小，且区间在峰值附近，$F(v)$ 变化不太剧烈，因此：

    $$
    \int_{400}^{500} F(v)\,\mathrm{d}v \approx F(v_p) \times \Delta v \times (\text{修正因子})
    $$

    更精确的计算需要数值积分或查速率分布表。根据氧气在 273 K 的数值表类推，此区间的分子比例约为 **15–20%**。

## 常见误区

???+ warning "常见误区"

    **1. (✗) "最概然速率是分子出现最多的速率"**

    这个说法不够准确。$F(v_p)$ 是概率**密度**的最大值，不是概率本身。$F(v)\,\mathrm{d}v$ 才是概率。在 $v_p$ 附近的一个微小区间 $[v_p, v_p+\mathrm{d}v]$ 内的分子比例最高，但"速率为 $v_p$ 的分子"这种说法在连续分布下没有意义（单点概率为零）。

    **2. (✗) "温度升高意味着所有分子都运动得更快"**

    温度升高使分布变宽，高速分子的比例增大，但同时也有一些分子的速率很低。温度是统计平均量，不能用来描述单个分子。

    **3. (✗) "$F(v)$ 就是概率"**

    $F(v)$ 是概率**密度**，不是概率。概率是 $F(v)\,\mathrm{d}v$（密度乘以区间宽度）。$F(v)$ 本身的值可以大于 1（当 $v$ 接近 $v_p$ 且温度较低时）。

    **4. (✗) "麦克斯韦分布只适用于理想气体"**

    麦克斯韦分布描述的是速度（或速率）的统计分布，它依赖的假设是分子间相互作用可以忽略（使得速度分量统计独立）。对于实际气体，在密度不太高时，麦克斯韦分布仍然是很好的近似。

## 学习衔接

- 前置知识：[概率论的基本概念](../../math/probability-statistics/basic-concepts.md)、[一维随机变量及其分布](../../math/probability-statistics/one-dimensional-random-variables-and-distributions.md)、[随机变量的数字特征](../../math/probability-statistics/characteristic-values-of-random-variables.md)
- 本章导读：[第二章 热平衡态的统计分布律](./index.md)
- 下一节：[玻尔兹曼密度分布](./boltzmann-density-distribution.md) — 将麦克斯韦分布推广到存在外场（如重力场）的情形
- 相关内容：[能均分定理与热容量](./equipartition-theorem-and-heat-capacity.md) — 用特征速率的结果理解能量均分
