---
assessments:
  - placement: footer
    set: math.complex-analysis.integrals-series
status: review
author: Physics Learning Wiki Team
description: 探讨复数项级数绝对收敛、泰勒定理严密证明、初等函数逐项微积分、圆环域洛朗定理、同心三圆环域（Fibonacci 生成函数）展开实战、贝塞尔函数母函数、孤立奇点严格三分类及无穷远点黎曼球面图像．
page_id: math.complex-analysis.series-expansion
---

# 级数展开与奇点

## 物理问题引入：当函数遭遇奇点时会发生什么？

在理论物理建模中，“奇点（Singularity）”绝不是数学家凭空捏造的抽象病态，而是常常标志着极其关键的物理临界状态或极端相互作用：

- **点源发散**：点电荷所在位置的经典库仑势发散（$V \propto 1/r$），质点引力场在原点具有奇点；
- **共振发散**：无阻尼受迫谐振子在外加驱动频率 $\omega$ 等于固有频率 $\omega_0$ 时产生振幅发散（物理共振极点）；
- **微观量子态的拓扑印记**：在量子力学与粒子物理的散射理论中，散射矩阵 $S(E)$ 在复能量平面上的极点直接对应了**物理稳定束缚态（负能量实轴极点）与有限寿命的共振态粒子（下半平面复数极点）**！

普通泰勒级数（Taylor Series）只能在完全解析的开圆盘内收敛展开，它无法穿透哪怕一个奇点．为了研究包含奇点的区域以及深刻刻画函数在奇点邻域内的渐近行为，物理学家和数学家必须将幂级数向包含**负整数幂次**的宏大领域推进——这就是 **洛朗级数 (Laurent Series)**．

---

## 1. 复数项级数与等比级数基石

### 1.1 复数列极限与级数绝对收敛

设复数列 $z_n = x_n + i y_n$．$z_n$ 收敛于极限 $z_0 = x_0 + i y_0$ 的充分必要条件是其实部与虚部实数列同时收敛：

$$
\lim_{n \to \infty} x_n = x_0 \quad \text{且} \quad \lim_{n \to \infty} y_n = y_0
$$

对于无穷复数项级数 $\sum_{n=1}^\infty z_n$：
- 若正项实级数 $\sum_{n=1}^\infty |z_n|$ 收敛，则称复级数 $\sum_{n=1}^\infty z_n$ **绝对收敛**；
- 绝对收敛保证了级数可以任意调换求和项的次序，且在收敛域内可以逐项微分与逐项积分．

### 1.2 几何级数（等比级数）：一切级数展开的母体

考察无穷复等比级数 $\sum_{k=0}^\infty z^k$．其前 $n$ 项部分和为：

$$
S_n = 1 + z + z^2 + \dots + z^n = \dfrac{1 - z^{n+1}}{1 - z} \quad (z \neq 1)
$$

当 $|z| < 1$ 时，$|z^{n+1}| = |z|^{n+1} \to 0$；当 $|z| \ge 1$ 时通项不趋于 0 发散．因此：

$$
\sum_{k=0}^\infty z^k = \dfrac{1}{1 - z} \quad (|z| < 1)
$$

此公式是后续推导泰勒定理、洛朗定理与部分分式展开不可替代的代数核．

---

## 2. 泰勒展开定理 (Taylor's Theorem)

### 2.1 定理陈述与柯西核展开证明

**定理**：设函数 $f(z)$ 在以 $z_0$ 为中心、半径为 $R$ 的圆域 $D: |z - z_0| < R$ 内全纯解析，则在此圆域内 $f(z)$ 可以唯一地展开为收敛的幂级数：

$$
f(z) = \sum_{n=0}^\infty c_n (z - z_0)^n
$$

其中展开系数由高阶柯西积分公式唯一确定：

$$
c_n = \dfrac{f^{(n)}(z_0)}{n!} = \dfrac{1}{2\pi i} \oint_C \dfrac{f(\zeta)}{(\zeta - z_0)^{n+1}}\mathrm{d}\zeta \quad (n = 0, 1, 2, \dots)
$$

其中围道 $C$ 为圆域内围绕 $z_0$ 逆时针一周的任意简单闭曲线．

**严密证明**：  
在圆盘内任取一点 $z = z_0 + \xi$（满足 $|\xi| < R$）．作同心圆周围道 $C: |\zeta - z_0| = r$（使得 $|\xi| < r < R$）．由柯西积分公式：

$$
f(z_0 + \xi) = \dfrac{1}{2\pi i} \oint_C \dfrac{f(\zeta)}{\zeta - (z_0 + \xi)}\mathrm{d}\zeta = \dfrac{1}{2\pi i} \oint_C \dfrac{f(\zeta)}{(\zeta - z_0)\left[1 - \dfrac{\xi}{\zeta - z_0}\right]}\mathrm{d}\zeta
$$

在围道 $C$ 上，$\left|\dfrac{\xi}{\zeta - z_0}\right| = \dfrac{|\xi|}{r} < 1$，利用几何级数核公式展开：

$$
\dfrac{1}{1 - \dfrac{\xi}{\zeta - z_0}} = \sum_{n=0}^\infty \left(\dfrac{\xi}{\zeta - z_0}\right)^n = \sum_{n=0}^\infty \dfrac{\xi^n}{(\zeta - z_0)^n}
$$

代入积分号并由于一致收敛性交换求和与积分次序：

$$
f(z_0 + \xi) = \sum_{n=0}^\infty \xi^n \left[\dfrac{1}{2\pi i} \oint_C \dfrac{f(\zeta)}{(\zeta - z_0)^{n+1}}\mathrm{d}\zeta\right]
$$

方括号内的积分正是高阶导数推广公式定义的 $\frac{f^{(n)}(z_0)}{n!}$，即证得：

$$
f(z_0 + \xi) = \sum_{n=0}^\infty \dfrac{f^{(n)}(z_0)}{n!} \xi^n
$$

### 2.2 收敛半径的几何意义

泰勒级数的收敛半径 $R$ 严格等于：**展开中心 $z_0$ 到距离它最近的函数奇点之间的欧几里得距离**：

$$
R = \operatorname{dist}(z_0, \text{Singularities})
$$

例如函数 $f(z) = \frac{1}{1 + z^2}$：
- 奇点位于分母零点 $1 + z^2 = 0 \implies z = \pm i$；
- 以原点 $z_0 = 0$ 为中心展开，距离最近奇点的距离为 $R = |i - 0| = 1$；
- 当 $|z| < 1$ 时：$\frac{1}{1 + z^2} = \sum_{n=0}^\infty (-z^2)^n = 1 - z^2 + z^4 - z^6 + \dots$．这完美解释了为什么在实数微积分中实函数 $1/(1+x^2)$ 在全实轴平滑无损，但在 $x = 1$ 处级数却发散——因为**在复数虚轴上存在距离原点为 1 的隐藏奇点 $\pm i$ 阻断了收敛圆盘**！

---

## 3. 初等超越函数的泰勒展开技巧

在物理实战中，极少通过直接计算 $n$ 阶微商来求泰勒级数，通常采用**逐项求导、逐项积分与间接代换**．

???+ example "经典初等函数展开精选"
    1. **对数函数核 $\ln\frac{1+z}{1-z}$ 逐项积分**：
       
       $$
       \dfrac{\mathrm{d}}{\mathrm{d}z}\left[\ln\dfrac{1+z}{1-z}\right] = \dfrac{1}{1+z} + \dfrac{1}{1-z} = \dfrac{2}{1 - z^2} = 2\sum_{n=0}^\infty z^{2n} \quad (|z| < 1)
       $$
       
       逐项从 0 到 $z$ 积分，并由 $\ln 1 = 0$ 得：
       
       $$
       \ln\dfrac{1+z}{1-z} = 2\sum_{n=0}^\infty \dfrac{z^{2n+1}}{2n+1} = 2\left(z + \dfrac{z^3}{3} + \dfrac{z^5}{5} + \dots\right) \quad (|z| < 1)
       $$
    
    2. **有理分式负二阶幂 $\frac{1}{(1-z)^2}$ 逐项微分**：
       
       $$
       \dfrac{1}{(1-z)^2} = \dfrac{\mathrm{d}}{\mathrm{d}z}\left(\dfrac{1}{1-z}\right) = \dfrac{\mathrm{d}}{\mathrm{d}z}\sum_{n=0}^\infty z^n = \sum_{n=1}^\infty n z^{n-1} = \sum_{n=0}^\infty (n+1)z^n \quad (|z| < 1)
       $$
    
    3. **双曲函数 $\sinh z, \cosh z$ 级数**：
       由 $\sinh z = -i\sin(iz)$ 与 $\cosh z = \cos(iz)$：
       
       $$
       \sinh z = \sum_{n=0}^\infty \dfrac{z^{2n+1}}{(2n+1)!} = z + \dfrac{z^3}{3!} + \dfrac{z^5}{5!} + \dots, \quad \cosh z = \sum_{n=0}^\infty \dfrac{z^{2n}}{(2n)!} = 1 + \dfrac{z^2}{2!} + \dfrac{z^4}{4!} + \dots
       $$

---

## 4. 洛朗展开定理 (Laurent's Theorem)

### 4.1 定理陈述与主部分解

**定理**：设函数 $f(z)$ 在以 $z_0$ 为中心的同心圆环域 $D: R_1 < |z - z_0| < R_2$（$0 \le R_1 < R_2 \le \infty$）内全纯解析，则在此圆环域内 $f(z)$ 可以展开为包含正、负所有整数次幂的双边幂级数：

$$
f(z) = \sum_{n=-\infty}^{+\infty} c_n (z - z_0)^n
$$

其中各项系数由如下闭路积分唯一确定：

$$
c_n = \dfrac{1}{2\pi i} \oint_C \dfrac{f(\zeta)}{(\zeta - z_0)^{n+1}}\mathrm{d}\zeta \quad (n = 0, \pm 1, \pm 2, \dots)
$$

积分围道 $C$ 为圆环域内围绕 $z_0$ 逆时针一周的任意简单闭曲线．

洛朗级数自然分裂为两大物理部分：

$$
f(z) = \underbrace{\sum_{n=0}^\infty a_n (z - z_0)^n}_{\text{解析部分（正规部 / 泰勒部）}} + \underbrace{\sum_{k=1}^\infty \dfrac{b_k}{(z - z_0)^k}}_{\text{主要部分（主部 / 奇点部）}}
$$

- **解析部分**：包含所有非负幂次，由外圆周边界上的值贡献，在全开圆盘 $|z - z_0| < R_2$ 内解析；
- **主要部分**：包含所有负幂次，由内圆周边界包围的奇点贡献，当 $z \to z_0$ 时表征了奇异性的发散强弱．

---

## 5. 同心圆环区域洛朗展开经典实战

同一个解析函数在以同一点为中心的不同同心环域内，具有**完全不同**的洛朗展开式！

### 5.1 基础范式：有理分式展开

以 $f(z) = \dfrac{1}{(z-1)(z-2)}$ 为例，奇点为 $z = 1$ 和 $z = 2$．以原点 $z_0 = 0$ 为中心，复平面被这两个奇点自然分割为三个互不相交的同心圆环区域：

```mermaid
flowchart LR
    A["区域 I: |z| < 1<br/>（中心圆盘）"] --> B["区域 II: 1 < |z| < 2<br/>（同心圆环域）"] --> C["区域 III: |z| > 2<br/>（外围包含无穷远点域）"]
```

部分分式分解：$f(z) = \dfrac{1}{z-2} - \dfrac{1}{z-1}$．
1. **在圆盘 $|z| < 1$ 内**（两项变量模长均小于 1）：
   
   $$
   f(z) = -\dfrac{1}{2}\dfrac{1}{1 - \frac{z}{2}} + \dfrac{1}{1 - z} = -\dfrac{1}{2}\sum_{n=0}^\infty \left(\dfrac{z}{2}\right)^n + \sum_{n=0}^\infty z^n = \sum_{n=0}^\infty \left(1 - \dfrac{1}{2^{n+1}}\right) z^n \quad (\text{纯正幂次泰勒级数})
   $$

2. **在圆环域 $1 < |z| < 2$ 内**（$|z| < 2 \implies |z/2| < 1$；$|z| > 1 \implies |1/z| < 1$）：
   
   $$
   f(z) = -\dfrac{1}{2}\dfrac{1}{1 - \frac{z}{2}} - \dfrac{1}{z}\dfrac{1}{1 - \frac{1}{z}} = -\sum_{n=0}^\infty \dfrac{z^n}{2^{n+1}} - \sum_{n=0}^\infty \dfrac{1}{z^{n+1}} = -\sum_{n=-\infty}^{-1} z^n - \sum_{n=0}^\infty \dfrac{z^n}{2^{n+1}} \quad (\text{双边洛朗级数})
   $$

3. **在外域 $|z| > 2$ 内**（两项均满足 $|1/z| < 1/2 < 1$）：
   
   $$
   f(z) = \dfrac{1}{z}\dfrac{1}{1 - \frac{2}{z}} - \dfrac{1}{z}\dfrac{1}{1 - \frac{1}{z}} = \sum_{n=0}^\infty \dfrac{2^n}{z^{n+1}} - \sum_{n=0}^\infty \dfrac{1}{z^{n+1}} = \sum_{n=1}^\infty \dfrac{2^{n-1} - 1}{z^n} \quad (\text{纯负幂次洛朗级数})
   $$

---

### 5.2 进阶范式：斐波那契（Fibonacci）生成函数在三个同心区域的展开

斐波那契数列定义为 $F_0 = 0, F_1 = 1, F_n = F_{n-1} + F_{n-2}$，其母函数定义为 $F(z) = \sum_{n=0}^\infty F_n z^n$．  
由递推关系易求出其解析闭合解为：

$$
F(z) = \dfrac{z}{1 - z - z^2}
$$

分母零点给出黄金分割特征根：$1 - z - z^2 = 0 \implies z_1 = \dfrac{\sqrt{5}-1}{2} \approx 0.618$，$z_2 = -\dfrac{\sqrt{5}+1}{2} \approx -1.618$．  
模长分别为 $r_1 = \frac{\sqrt{5}-1}{2}$ 和 $r_2 = \frac{\sqrt{5}+1}{2}$．以此两圆为界，复平面划分为三个区域：

1. **包含原点的圆盘区域 $|z| < \dfrac{\sqrt{5}-1}{2}$**：
   
   $$
   F(z) = \sum_{n=0}^\infty F_n z^n = z + z^2 + 2z^3 + 3z^4 + 5z^5 + \dots \quad (\text{标准泰勒展开})
   $$

2. **中间圆环域 $\dfrac{\sqrt{5}-1}{2} < |z| < \dfrac{\sqrt{5}+1}{2}$**：  
   利用部分分式分解：$F(z) = \dfrac{1}{\sqrt{5}}\left(\dfrac{1}{1 - \frac{1+\sqrt{5}}{2}z} - \dfrac{1}{1 - \frac{1-\sqrt{5}}{2}z}\right)$．  
   对第一项按 $1/z$ 展开，对第二项按 $z$ 展开：
   
   $$
   F(z) = -\dfrac{1}{\sqrt{5}}\left[\sum_{n=1}^\infty \left(\dfrac{\sqrt{5}-1}{2}\right)^n \dfrac{1}{z^n} + \sum_{n=0}^\infty \left(\dfrac{1-\sqrt{5}}{2}\right)^n z^n\right] \quad (\text{双边洛朗展开})
   $$

3. **包含无穷远点的外部区域 $|z| > \dfrac{\sqrt{5}+1}{2}$**：  
   两项全部按 $1/z$ 展开，各项重新组合后奇迹般地再次还原出斐波那契数，但变为纯负幂次：
   
   $$
   F(z) = \sum_{n=1}^\infty (-1)^n \dfrac{F_n}{z^n} = -\dfrac{1}{z} + \dfrac{1}{z^2} - \dfrac{2}{z^3} + \dfrac{3}{z^4} - \dfrac{5}{z^5} + \dots
   $$

---

## 6. 数理特殊函数母函数与洛朗级数

在电动力学与量子力学中，柱对称坐标下的波动方程解为 **第一类柱贝塞尔函数 $J_n(x)$**．贝塞尔函数族拥有极其优美的洛朗生成函数：

$$
g(x, t) = \exp\left[\dfrac{x}{2}\left(t - \dfrac{1}{t}\right)\right] = \sum_{n=-\infty}^{+\infty} J_n(x) t^n
$$

在此母函数中：
- 复变量 $t$ 在去心复平面 $0 < |t| < \infty$ 上解析；
- 它的全部正幂次与负幂次洛朗展开系数，**天然就是各阶整数阶贝塞尔函数 $J_n(x)$**！  
由洛朗展开系数公式：

$$
J_n(x) = \dfrac{1}{2\pi i} \oint_C \dfrac{\exp\left[\frac{x}{2}\left(t - \frac{1}{t}\right)\right]}{t^{n+1}}\mathrm{d}t
$$

取围绕原点的单位圆 $t = e^{i\theta}$：

$$
t - \dfrac{1}{t} = e^{i\theta} - e^{-i\theta} = 2i\sin\theta, \quad \mathrm{d}t = i e^{i\theta}\mathrm{d}\theta
$$

代入立即直接导出著名且极其难以由实微积分证明的 **贝塞尔积分表达式**：

$$
J_n(x) = \dfrac{1}{2\pi} \int_0^{2\pi} e^{i(x\sin\theta - n\theta)}\mathrm{d}\theta = \dfrac{1}{\pi} \int_0^\pi \cos(n\theta - x\sin\theta)\mathrm{d}\theta
$$

---

## 7. 奇点的严格分类体系

设 $z_0$ 为函数 $f(z)$ 的奇点．

### 7.1 非孤立奇点 (Non-isolated Singularity)

若在 $z_0$ 点的任意开邻域内，总包含除 $z_0$ 以外的其它奇点，则称 $z_0$ 为非孤立奇点．
- **典型范例**：函数 $f(z) = \dfrac{1}{\sin(1/z)}$ 的奇点为分母零点 $1/z = n\pi \implies z_n = \dfrac{1}{n\pi}$（$n \in \mathbb{Z}$）．  
  当 $n \to \infty$ 时，单极点序列 $z_n$ 无限凝聚并以原点 $z = 0$ 为极限点．因此 $z = 0$ 是极点的凝聚点，属于**非孤立奇点**．

### 7.2 三大类孤立奇点 (Isolated Singularities)

若存在 $r > 0$，使得在去心邻域 $0 < |z - z_0| < r$ 内函数处处全纯解析，则称 $z_0$ 为孤立奇点．  
根据其在去心邻域内洛朗展开的**主要部分（负幂次项）**，分为如下三类：

| 奇点类型 | 洛朗级数主部特征 | 邻域极限行为 $\lim_{z \to z_0} f(z)$ | 经典判据与物理实例 |
| :--- | :--- | :--- | :--- |
| **1. 可去奇点**<br>(Removable Singularity) | **主部恒为零**：没有负幂次项<br>$$f(z) = \sum_{n=0}^\infty a_n (z-z_0)^n$$ | 极限**存在且有限**：<br>$$\lim_{z \to z_0} f(z) = a_0$$ | **黎曼可去奇点定理**：若在去心邻域内有界，则为可去奇点．<br>例如 $f(z) = \dfrac{\sin z}{z} = 1 - \dfrac{z^2}{6} + \dots$，补充定义 $f(0)=1$ 即解析． |
| **2. $m$ 阶极点**<br>(Pole of order $m$) | **主部只有有限项**，最高负幂次为 $m$：<br>$$\dfrac{b_m}{(z-z_0)^m} + \dots + \dfrac{b_1}{z-z_0}$$ ($b_m \neq 0$) | 模长**必然发散至无穷大**：<br>$$\lim_{z \to z_0} |f(z)| = \infty$$ | **倒数零点判据**：$\varphi(z) = \dfrac{1}{f(z)}$ 在 $z_0$ 处具有 $m$ 阶零点．<br>若 $m=1$ 称为**单极点**．例如阻尼振动共振极点、库仑势 $1/r$． |
| **3. 本性奇点**<br>(Essential Singularity) | **主部包含无穷多个非零负幂次项**：<br>$$\sum_{k=1}^\infty \dfrac{b_k}{(z-z_0)^k}$$ | 极限**不存在且极度振荡** | **皮卡大定理 (Picard's Great Theorem)**：在任意小去心邻域内，函数可取遍全复平面除至多一个值外的所有可能值无穷多次！<br>例如 $f(z) = e^{1/z} = 1 + \dfrac{1}{z} + \dfrac{1}{2!z^2} + \dots$ 在原点． |

---

## 8. 扩充复平面、黎曼球面与无穷远点

### 8.1 黎曼球面与极射赤平投影

为了对复平面上“无限远”的行为进行统一数学刻画，引入一个理想元素“无穷远点”记为 $\infty$，构成 **扩充复平面** $\bar{\mathbb{C}} = \mathbb{C} \cup \{\infty\}$．

高斯与黎曼构造了著名的 **黎曼球面 (Riemann Sphere)**：
- 将一个单位球面切于复平面原点（球面南极 $S$）；
- 球面的最顶端为北极 $N$；
- 连接复平面上任意一点 $z$ 与北极 $N$，该直线与球面必定交于唯一对应点 $P$；
- 当 $|z| \to \infty$ 时，连线无限趋向于水平切线，交点 $P$ 无限逼近北极 $N$．
- **北极 $N$ 严格对应扩充复平面的无穷远点 $\infty$**！整个复平面被无缝“紧致化”为一个闭合的二维紧致黎曼曲面（二维流形 $S^2$）．

### 8.2 无穷远点奇性判别法则

在物理计算中，判别函数在无穷远点 $z = \infty$ 的性态，统一采用**坐标反演变换**：

$$
z = \dfrac{1}{t}
$$

定义变换后的辅助函数：

$$
g(t) = f\left(\dfrac{1}{t}\right)
$$

- 若 $g(t)$ 在 $t = 0$ 处解析（或可去奇点），则称 $f(z)$ 在 $z = \infty$ 处解析；
- 若 $g(t)$ 在 $t = 0$ 处有 $m$ 阶极点（或本性奇点），则称 $f(z)$ 在 $z = \infty$ 处有相应极点（或本性奇点）．

例如：多项式 $P(z) = a_m z^m + \dots + a_0$ 在 $z = \infty$ 处具有 $m$ 阶极点；超越函数 $e^z = \sum \frac{z^n}{n!}$ 在 $z = \infty$ 处具有**本性奇点**．

---

## 9. 学习衔接

- **上一节**：柯西积分定理与柯西积分公式，参见 [复变积分与柯西定理](./contour-integrals.md)；
- **下一节**：利用洛朗级数唯一的非零幸存项 $b_1$ 计算各种复杂的物理积分，进入 [留数定理与实积分计算](./residue-calculus.md)．

---

## 知识小测与巩固练习 {#practice}

> [!TIP] 课后核心技能自测点
> 1. 函数 $f(z) = \frac{1}{\cos z}$ 在复平面上有哪些奇点？它们是何种类型的奇点？
> 2. 写出 $f(z) = z^2 e^{1/z}$ 在 $0 < |z| < \infty$ 内的洛朗级数，指出其主要部分并在 $z=0$ 处的奇点类型．
> 3. 函数 $f(z) = \frac{z}{z^2-4}$ 在区域 $1 < |z-1| < 3$ 内能否展开为洛朗级数？收敛边界由什么决定？
