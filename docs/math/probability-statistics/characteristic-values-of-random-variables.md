---
author: Physics Learning Wiki
---

## 随机变量的数字特征

概率密度函数完整描述了随机变量的统计性质，但在实际物理问题中，我们往往不需要知道分布的所有细节，只需要几个关键的数字来概括其主要特征：这个随机变量的 "中心" 在哪里？取值有多分散？这就是期望和方差的物理意义——它们分别度量了分布的 **位置** 和 **宽度**．

## 学习目标

读完本页后，你应该能够：

-   掌握数学期望的定义、性质和计算方法
-   掌握方差与标准差的定义和计算
-   记住常见分布的期望和方差
-   理解期望和方差在物理学中的应用

## 数学期望（均值）

???+ warning "数学期望"
    离散随机变量 $X$ 取值 $x_i$ 的概率为 $p_i$，则其 **数学期望**（或均值）定义为：
    
    $$
    E[X] = \mu = \sum_i x_i\,p_i
    $$
    
    连续随机变量 $X$ 的概率密度函数为 $f(x)$，则其数学期望定义为：
    
    $$
    E[X] = \mu = \int_{-\infty}^{+\infty} x\,f(x)\,\mathrm{d}x
    $$

期望的物理意义：如果把概率密度 $f(x)$ 想象成一根细棒上的质量分布，那么期望 $\mu$ 就是这根棒的 **重心** 位置．

### 期望的性质

期望具有 **线性性质**，这是它最重要的数学性质：

$$
E[aX + b] = a\,E[X] + b
$$

$$
E[X + Y] = E[X] + E[Y]
$$

其中 $a, b$ 为常数．注意：期望的线性性质 **不要求**  $X$ 和 $Y$ 独立．

### 任意函数的期望

对于随机变量 $X$ 的任意函数 $g(X)$，其期望为：

$$
E[g(X)] = \int_{-\infty}^{+\infty} g(x)\,f(x)\,\mathrm{d}x
$$

这个公式在物理学中极为常用——例如，已知分子速率的分布 $F(v)$，要计算平均动能 $\overline{E_k}$，只需取 $g(v) = \dfrac{1}{2}mv^2$：

$$
\overline{E_k} = E\!\left[\dfrac{1}{2}mv^2\right] = \int_0^{+\infty} \dfrac{1}{2}mv^2\,F(v)\,\mathrm{d}v
$$

## 方差与标准差

期望告诉我们分布的 "中心" 在哪里，但两个分布可以有相同的均值而截然不同的宽度．**方差** 度量的是随机变量围绕其均值的分散程度．

???+ warning "方差与标准差"
    随机变量 $X$ 的 **方差** 定义为：
    
    $$
    \text{Var}(X) = \sigma^2 = E\!\left[(X - \mu)^2\right] = E[X^2] - \left(E[X]\right)^2
    $$
    
    **标准差** $\sigma = \sqrt{\text{Var}(X)}$ 是方差的平方根，与随机变量本身具有相同的量纲．

方差的计算常用以下等价公式：

$$
\text{Var}(X) = E[X^2] - \mu^2
$$

这个公式将方差的计算转化为 $E[X^2]$ 和 $\mu = E[X]$ 的计算，避免了直接计算 $(X-\mu)^2$ 的期望．

### 方差的性质

$$
\text{Var}(aX + b) = a^2\,\text{Var}(X)
$$

注意常数项 $b$ 不影响方差（平移不改变分散程度），而缩放因子 $a$ 的影响是平方关系．

如果 $X$ 和 $Y$  **相互独立**，则：

$$
\text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y)
$$

## 常见分布的期望与方差

|  分布  |           记号           |       期望 $E[X]$      |   方差 $\text{Var}(X)$   |
| :--: | :--------------------: | :------------------: | :--------------------: |
| 均匀分布 |        $U(a,b)$        |   $\dfrac{a+b}{2}$   |  $\dfrac{(b-a)^2}{12}$ |
| 指数分布 |  $\text{Exp}(\lambda)$ | $\dfrac{1}{\lambda}$ | $\dfrac{1}{\lambda^2}$ |
| 正态分布 |    $N(\mu,\sigma^2)$   |         $\mu$        |       $\sigma^2$       |
| 泊松分布 | $\text{Pois}(\lambda)$ |       $\lambda$      |        $\lambda$       |

??? note "例题：正态分布的期望和方差"
    **题目**：验证正态分布 $N(\mu, \sigma^2)$ 的期望为 $\mu$、方差为 $\sigma^2$．
    
    **解答**：设 $X \sim N(\mu, \sigma^2)$，其 PDF 为 $f(x) = \dfrac{1}{\sigma\sqrt{2\pi}}\,e^{-(x-\mu)^2/2\sigma^2}$．
    
    **期望**：令 $t = \dfrac{x-\mu}{\sigma}$，则 $x = \mu + \sigma t$，$\mathrm{d}x = \sigma\,\mathrm{d}t$：
    
    $$
    E[X] = \int_{-\infty}^{+\infty} x\,f(x)\,\mathrm{d}x = \int_{-\infty}^{+\infty} (\mu + \sigma t)\cdot\dfrac{1}{\sqrt{2\pi}}\,e^{-t^2/2}\,\mathrm{d}t
    $$
    
    拆分为两项．第一项中 $\mu$ 为常数，积分等于 1（归一化）；第二项中 $t\,e^{-t^2/2}$ 是奇函数，积分为零：
    
    $$
    E[X] = \mu \cdot 1 + \sigma \cdot 0 = \mu \quad \checkmark
    $$
    
    **方差**：
    
    $$
    \text{Var}(X) = E[(X-\mu)^2] = \int_{-\infty}^{+\infty} (x-\mu)^2\,f(x)\,\mathrm{d}x = \sigma^2 \int_{-\infty}^{+\infty} t^2 \cdot \dfrac{1}{\sqrt{2\pi}}\,e^{-t^2/2}\,\mathrm{d}t
    $$
    
    利用高斯积分 $\int_{-\infty}^{+\infty} t^2 e^{-t^2/2}\,\mathrm{d}t = \sqrt{2\pi}$，得：
    
    $$
    \text{Var}(X) = \sigma^2 \cdot \dfrac{\sqrt{2\pi}}{\sqrt{2\pi}} = \sigma^2 \quad \checkmark
    $$

## 协方差与相关系数（选读）

对于两个随机变量 $X$ 和 $Y$，**协方差** 度量它们的线性关联程度：

$$
\text{Cov}(X, Y) = E[(X - \mu_X)(Y - \mu_Y)] = E[XY] - E[X]\,E[Y]
$$

**相关系数** 是标准化的协方差：

$$
\rho = \dfrac{\text{Cov}(X, Y)}{\sigma_X\,\sigma_Y}
$$

相关系数满足 $-1 \leq \rho \leq 1$．$\rho = 0$ 表示 $X$ 和 $Y$ 不相关（无线性关系）．

???+ warning "独立与不相关的区别"
    若 $X$ 和 $Y$ 独立，则 $\text{Cov}(X, Y) = 0$（即不相关）．但反过来不成立——不相关的随机变量不一定独立．独立是比不相关更强的条件．

## 学习衔接

-   上一节：[一维随机变量及其分布](./one-dimensional-random-variables-and-distributions.md)
-   物理应用：[麦克斯韦速率分布律](../../thermodynamics/chapter-2/maxwell-velocity-distribution.md) 中的最概然速率、平均速率和方均根速率分别对应分布的不同数字特征
