---
assessments:
  - placement: footer
    set: math.complex-analysis.foundations
status: review
author: Physics Learning Wiki Team
description: 探讨复数的代数结构、阿根图几何表示、欧拉公式、多值方根与辐角主值、棣莫弗公式、复指数求和技巧以及在交流电路、波动与量子力学中的物理应用．
page_id: math.complex-analysis.complex-numbers
---

# 复数与几何表示

## 物理问题引入：为什么实数物理世界需要虚数 $i$？

在日常经验中，长度、速度、温度、电荷、质量等所有可以直接测量的宏观物理量都是实数．既然如此，为什么理论物理学家在经典力学振动、电磁波动理论、流体力学以及量子力学中无处不在地使用虚数单位 $i = \sqrt{-1}$？

> “The shortest path between two truths in the real domain passes through the complex domain.” —— Jacques Hadamard  
> （联系两个实数领域中真理的最短路径往往穿过复数领域．）

两个决定性的原因回答了这个问题：

1. **将多变量初等三角振动降维为单变量代数运算**：  
   一个简谐振动的质点同时具有振幅 $A$ 和初始相位 $\phi$．在实数三角函数框架下，两个不同相位简谐振动的合成与叠加需要调用繁杂的和差化积公式；而一旦引入复指数 $e^{i\omega t}$，时间和相位的演化直接转化为复数的乘除代数，微分方程被彻底化为代数方程；
2. **量子力学的本质内在要求**：  
   正如诺贝尔物理学奖得主杨振宁先生在《虚数与量子力学》中所指出的，量子力学中的状态函数 $\psi(\boldsymbol{r}, t)$ 是本质性的复数场，单粒子薛定谔方程显式包含虚数单位 $i\hbar \frac{\partial\psi}{\partial t} = \hat{H}\psi$．复概率幅的干涉使得微观粒子的空间几率密度必须通过双线性的模长平方 $\rho = |\psi|^2 = \psi^* \psi$ 来描述．

---

## 1. 复数的数系扩充历史与代数结构

### 1.1 从一元三次方程到阿根图复平面

历史上，虚数并不是为了解一元二次方程 $x^2 + 1 = 0$ 凭空发明的，而是在 16 世纪意大利数学家卡尔达诺（Cardano）与塔塔利亚（Tartaglia）求解一元三次方程 $x^3 = px + q$ 的争论中不得不正视的存在．即使一个三次方程的三个根全部是实数，使用卡尔达诺公式时依然必须通过中间含有负数平方根的表达式（称为“不可约情形”）．1572 年，邦贝利（Bombelli）在其著作《代数学》中首次系统制定了虚数单位的运算法则．

随后，欧拉（Euler）引入了符号 $i = \sqrt{-1}$，高斯（Gauss）与阿根（Argand）正式建立了复平面（Complex Plane / 阿根图），彻底赋予了虚数严谨的直角坐标几何含义．

### 1.2 复数定义与基本四则运算

**定义**：一个复数 $z$ 由一对有序实数 $(x, y)$ 与虚数单位 $i$ 线性组合而成：

$$
z = x + iy \quad (x, y \in \mathbb{R})
$$

其中：

- $x = \operatorname{Re}(z)$ 称为复数 $z$ 的 **实部 (Real Part)**；
- $y = \operatorname{Im}(z)$ 称为复数 $z$ 的 **虚部 (Imaginary Part)**．注意虚部本身是实数．

实数的所有运算法则在复数域中保持完全有效，唯一的新增公理是虚数单位满足：

$$
i^2 = -1, \quad i^3 = -i, \quad i^4 = 1, \quad i^{4k+n} = i^n \quad (k \in \mathbb{Z})
$$

设有两个复数 $z_1 = x_1 + i y_1$，$z_2 = x_2 + i y_2$：

- **加减法**：实部虚部分别相加减：
  
  $$
  z_1 \pm z_2 = (x_1 \pm x_2) + i(y_1 \pm y_2)
  $$

- **乘法**：按多项式乘法展开并利用 $i^2 = -1$：
  
  $$
  z_1 z_2 = (x_1 x_2 - y_1 y_2) + i(x_1 y_2 + x_2 y_1)
  $$

- **除法**（分子分母同乘分母的共轭复数实现“分母实数化”）：
  
  $$
  \dfrac{z_1}{z_2} = \dfrac{(x_1 + i y_1)(x_2 - i y_2)}{(x_2 + i y_2)(x_2 - i y_2)} = \dfrac{x_1 x_2 + y_1 y_2}{x_2^2 + y_2^2} + i\dfrac{x_2 y_1 - x_1 y_2}{x_2^2 + y_2^2} \quad (z_2 \neq 0)
  $$

---

## 2. 复共轭与模长几何性质

### 2.1 复共轭 (Complex Conjugation)

复数 $z = x + iy$ 的 **共轭复数** 记作 $z^*$ 或 $\bar{z}$，几何上对应于复平面内关于实轴（$X$ 轴）的镜像对称反射：

$$
z^* \equiv x - iy, \quad i^* = -i
$$

核心代数性质：

1. **提取实部与虚部**：
   
   $$
   x = \operatorname{Re}(z) = \dfrac{z + z^*}{2}, \quad y = \operatorname{Im}(z) = \dfrac{z - z^*}{2i}
   $$

2. **模长平方**：
   
   $$
   z z^* = (x + iy)(x - iy) = x^2 + y^2 = |z|^2 \ge 0
   $$

3. **共轭运算的分配律**：
   
   $$
   (z_1 \pm z_2)^* = z_1^* \pm z_2^*, \quad (z_1 z_2)^* = z_1^* z_2^*, \quad \left(\dfrac{z_1}{z_2}\right)^* = \dfrac{z_1^*}{z_2^*}
   $$

### 2.2 复平面阿根图与几何不等式

复数 $z = x + iy$ 与平面直角坐标系中的点 $(x, y)$ 或以原点为起点的二维矢量 $\boldsymbol{r} = (x, y)$ 存在严格的一一对应映射．

**三角形不等式**：对任意两复数 $z_1, z_2$，有：

$$
||z_1| - |z_2|| \le |z_1 + z_2| \le |z_1| + |z_2|
$$

> **几何与代数证明**：  
> 在复平面阿根图上，矢量 $z_1, z_2$ 与其和 $z_1 + z_2$ 构成平面三角形．几何上三角形任意两边之和大于第三边，两边之差小于第三边．  
> 代数推导：$|z_1 + z_2|^2 = (z_1 + z_2)(z_1^* + z_2^*) = |z_1|^2 + |z_2|^2 + (z_1 z_2^* + z_1^* z_2) = |z_1|^2 + |z_2|^2 + 2\operatorname{Re}(z_1 z_2^*)$．  
> 因为 $\operatorname{Re}(w) \le |w|$，所以 $2\operatorname{Re}(z_1 z_2^*) \le 2|z_1 z_2^*| = 2|z_1||z_2|$，从而 $|z_1 + z_2|^2 \le (|z_1| + |z_2|)^2$，开方即证．

### 2.3 复平面常见轨迹曲线

利用复数模长方程可极简描述平面解析几何曲线：

1. **圆周**：$|z - z_0| = R$ 表示以 $z_0$ 为圆心、半径为 $R$ 的圆周；
2. **椭圆**：$|z - z_1| + |z - z_2| = 2a$（$2a > |z_1 - z_2|$）表示以 $z_1, z_2$ 为焦点的椭圆；例如 $|z - 3| + |z + 3| = 10$，焦点在 $(\pm 3, 0)$，$c = 3, a = 5 \implies b = \sqrt{5^2 - 3^2} = 4$，标准方程为 $\frac{x^2}{25} + \frac{y^2}{16} = 1$；
3. **直线/垂直平分线**：$|z - z_1| = |z - z_2|$ 表示连接 $z_1, z_2$ 两点线段的中垂线．

---

## 3. 欧拉公式、极坐标与多值辐角

### 3.1 欧拉公式 (Euler's Formula)

数学上最深刻的桥梁——**欧拉公式** 给出了复指数函数与三角函数的统一：

$$
e^{i\theta} = \cos\theta + i\sin\theta \quad (\theta \in \mathbb{R})
$$

当取 $\theta = \pi$ 时，得到被誉为“最卓越的数学公式”的 **欧拉恒等式**：

$$
e^{i\pi} + 1 = 0
$$

它在极简的代数形式中凝聚了数学分析的五大基石常数：

- $0$：加法单位元与一切测度的基准；
- $1$：乘法单位元与丈量的尺度；
- $\pi$：空间几何对称与周期振动的周期常数；
- $e$：连续增长与自然演化的特征尺度；
- $i$：将实数维度拓宽至复平面的转动因子．

反之，正弦与余弦函数可用复指数线性表示：

$$
\cos\theta = \dfrac{e^{i\theta} + e^{-i\theta}}{2}, \quad \sin\theta = \dfrac{e^{i\theta} - e^{-i\theta}}{2i}
$$

### 3.2 极坐标形式与辐角主值

引入平面极坐标 $(r, \theta)$，任意非零复数可写为：

$$
z = r\cos\theta + i r\sin\theta = r e^{i\theta}
$$

其中：

- **模长**：$r = |z| = \sqrt{x^2 + y^2} \ge 0$；
- **辐角 (Argument)**：$\theta = \arg(z)$．

由于三角函数具有 $2\pi$ 周期性，$e^{i(\theta + 2k\pi)} = e^{i\theta}$，复数的辐角具有天然的 **多值性**．为了避免歧义，引入 **辐角主值 (Principal Value of Argument)**：

$$
\operatorname{Arg}(z) \in (-\pi, \pi]
$$

通值辐角与主值的关系为：

$$
\arg(z) = \operatorname{Arg}(z) + 2k\pi \quad (k \in \mathbb{Z})
$$

???+ tip "乘除法的几何图像：模相乘除，辐角相加减"
    设 $z_1 = r_1 e^{i\theta_1}, z_2 = r_2 e^{i\theta_2}$：
    
    $$
    z_1 z_2 = (r_1 r_2) e^{i(\theta_1 + \theta_2)}, \quad \dfrac{z_1}{z_2} = \left(\dfrac{r_1}{r_2}\right) e^{i(\theta_1 - \theta_2)}
    $$
    
    乘以因子 $e^{i\phi}$ 的物理本质是：在复平面上将向量以原点为轴**逆时针纯旋转 $\phi$ 弧度**，模长保持恒定．

---

## 4. 棣莫弗公式、方根与分圆方程

### 4.1 棣莫弗公式 (de Moivre's Formula)

对于任意实数（特别是整数）$n$：

$$
(\cos\theta + i\sin\theta)^n = \left(e^{i\theta}\right)^n = e^{i n\theta} = \cos(n\theta) + i\sin(n\theta)
$$

棣莫弗公式是三角恒等式极其高效的“代数生成器”．

???+ example "例题：推导三倍角公式"
    令 $n = 3$：
    
    $$
    \cos 3\theta + i\sin 3\theta = (\cos\theta + i\sin\theta)^3 = \cos^3\theta + 3i\cos^2\theta\sin\theta - 3\cos\theta\sin^2\theta - i\sin^3\theta
    $$
    
    两端分别对比实部与虚部（记 $C \equiv \cos\theta, S \equiv \sin\theta$）：
    
    - **实部**：$\cos 3\theta = C^3 - 3C S^2 = C^3 - 3C(1 - C^2) = 4C^3 - 3C$；
    - **虚部**：$\sin 3\theta = 3C^2 S - S^3 = 3(1 - S^2)S - S^3 = 3S - 4S^3$．

### 4.2 复数方根的多值性

对于正整数 $n$，求解方程 $w^n = z = r e^{i(\operatorname{Arg}z + 2k\pi)}$：

$$
w = z^{1/n} = r^{1/n} \exp\left[i\left(\dfrac{\operatorname{Arg}z + 2k\pi}{n}\right)\right] \quad (k = 0, 1, 2, \dots, n-1)
$$

一个非零复数的 $n$ 次方根在复平面上恰好均匀分布在以原点为中心、半径为 $r^{1/n}$ 的圆周上，构成一个正 $n$ 边形的各个顶点．

???+ example "例题：计算 $(1 + i\sqrt{3})^{1/2}$ 的全部值"
    将 $1 + i\sqrt{3}$ 化为极坐标：$r = \sqrt{1^2 + 3} = 2$，主值 $\operatorname{Arg} = \arctan\sqrt{3} = \frac{\pi}{3}$．
    
    $$
    1 + i\sqrt{3} = 2 e^{i\left(\frac{\pi}{3} + 2k\pi\right)}
    $$
    
    取二次方根：
    
    $$
    (1 + i\sqrt{3})^{1/2} = \sqrt{2} e^{i\left(\frac{\pi}{6} + k\pi\right)} = (-1)^k \sqrt{2} e^{i\frac{\pi}{6}} \quad (k = 0, 1)
    $$
    
    - 当 $k = 0$ 时，主根为 $\sqrt{2}\left(\frac{\sqrt{3}}{2} + \frac{1}{2}i\right) = \frac{\sqrt{6} + \sqrt{2}i}{2}$；
    - 当 $k = 1$ 时，次根为 $-\frac{\sqrt{6} + \sqrt{2}i}{2}$．

### 4.3 割圆方程与单位根分解

方程 $x^n - 1 = 0$ 的根称为 **$n$ 次单位根**：$\omega_k = e^{i\frac{2k\pi}{n}}$（$k = 0, 1, \dots, n-1$）．因式分解得：

$$
x^n - 1 = (x - 1)(x^{n-1} + x^{n-2} + \dots + x + 1) = 0
$$

去除显然实根 $x = 1$ 后，留下的多项式称为 **割圆多项式 (Cyclotomic Polynomial)**：

$$
x^{n-1} + x^{n-2} + \dots + x + 1 = 0
$$

其 $n-1$ 个根为 $x_k = e^{i\frac{2k\pi}{n}}$（$k = 1, 2, \dots, n-1$）．

???+ example "例题：利用割圆方程求 $\cos\frac{2\pi}{5}$ 与分圆乘积"
    **问题 1**：求 $\cos\frac{2\pi}{5}$ 的精确根式解．  
    由五倍角展开：
    
    $$
    \sin 5x = 16\sin^5 x - 20\sin^3 x + 5\sin x
    $$
    
    取 $x = \frac{2\pi}{5}$ 时，$\sin 5x = \sin 2\pi = 0$．由于 $\sin\frac{2\pi}{5} \neq 0$，除以 $\sin x$ 得到关于 $\sin^2 x$ 的二次方程：
    
    $$
    16(\sin^2 x)^2 - 20\sin^2 x + 5 = 0 \implies \sin^2\frac{2\pi}{5} = \frac{20 + \sqrt{400 - 320}}{32} = \frac{5 + \sqrt{5}}{8}
    $$
    
    进而：
    
    $$
    \cos^2\frac{2\pi}{5} = 1 - \frac{5+\sqrt{5}}{8} = \frac{3-\sqrt{5}}{8} = \frac{6-2\sqrt{5}}{16} = \left(\frac{\sqrt{5}-1}{4}\right)^2
    $$
    
    由于 $\frac{2\pi}{5}$ 位于第一象限，$\cos\frac{2\pi}{5} > 0$，故得：
    
    $$
    \cos\frac{2\pi}{5} = \frac{\sqrt{5}-1}{4}
    $$
    
    **问题 2**：求乘积 $\cos\frac{2\pi}{7}\cos\frac{4\pi}{7}\cos\frac{6\pi}{7} = -\frac{1}{8}$．  
    利用半角技巧，分子分母同乘 $8\sin\frac{2\pi}{7}$，连续应用二倍角公式即可直接验证．

---

## 5. 理论物理中的实战代数计算工具

### 5.1 物理三角级数复指数求和法

在量子光学干涉光栅、声学阵列以及统计力学配分函数求和中，经常需要计算有限项振动三角级数：

$$
S = \sum_{n=1}^M \sin n\theta, \quad C = \sum_{n=1}^M \cos n\theta
$$

**求解方法**：利用欧拉公式将实三角函数构造为复等比级数的虚部与实部：

$$
P = \sum_{n=1}^M e^{in\theta} = e^{i\theta} + e^{i2\theta} + \dots + e^{iM\theta}
$$

由等比级数求和公式（公比 $q = e^{i\theta}$）：

$$
P = e^{i\theta} \dfrac{e^{iM\theta} - 1}{e^{i\theta} - 1}
$$

**核心提因子技巧（半角提取）**：分子分母同除以或提出半角因子 $e^{i\theta/2}$：

$$
P = \dfrac{e^{i\theta/2}(e^{iM\theta} - 1)}{e^{i\theta/2} - e^{-i\theta/2}} = \dfrac{e^{i\frac{2M+1}{2}\theta} - e^{i\frac{\theta}{2}}}{2i\sin\frac{\theta}{2}} = -i\dfrac{\left[\cos\left(\frac{2M+1}{2}\theta\right) + i\sin\left(\frac{2M+1}{2}\theta\right)\right] - \left[\cos\frac{\theta}{2} + i\sin\frac{\theta}{2}\right]}{2\sin\frac{\theta}{2}}
$$

分别提取虚部与实部，得到通用物理结论：

$$
\sum_{n=1}^M \sin n\theta = \operatorname{Im}(P) = \dfrac{\cos\frac{\theta}{2} - \cos\left(\frac{2M+1}{2}\theta\right)}{2\sin\frac{\theta}{2}}
$$

$$
\sum_{n=1}^M \cos n\theta = \operatorname{Re}(P) = \dfrac{-\sin\frac{\theta}{2} + \sin\left(\frac{2M+1}{2}\theta\right)}{2\sin\frac{\theta}{2}}
$$

### 5.2 多值初等函数：复对数与复幂

复对数函数定义为指数映射的反函数：若 $e^w = z$，则 $w = \ln z$．
设 $z = |z|e^{i(\operatorname{Arg}z + 2k\pi)}$：

$$
\ln z = \ln|z| + i\arg(z) = \ln|z| + i(\operatorname{Arg}z + 2k\pi) \quad (k \in \mathbb{Z})
$$

其主值为 $\operatorname{Ln} z = \ln|z| + i\operatorname{Arg}z$．

???+ example "典型例题：$\ln i$ 与纯虚数幂 $i^i$"
    1. **计算 $\ln i$**：$|i| = 1, \operatorname{Arg}(i) = \frac{\pi}{2}$：
       
       $$
       \ln i = \ln 1 + i\left(\frac{\pi}{2} + 2k\pi\right) = i\left(\frac{\pi}{2} + 2k\pi\right) \quad (k \in \mathbb{Z})
       $$
       
       其主值为 $i\frac{\pi}{2}$．
    2. **计算 $i^i$ 的所有可能值**：利用一般复数幂定义 $a^b = \exp(b\ln a)$：
       
       $$
       i^i = \exp(i\ln i) = \exp\left[i \cdot i\left(\frac{\pi}{2} + 2k\pi\right)\right] = e^{-\frac{\pi}{2} - 2k\pi} \quad (k \in \mathbb{Z})
       $$
       
       **重要发现**：虚数的虚数次方 **所有取值全部为纯实数**！其中主值（$k = 0$）为 $e^{-\pi/2} \approx 0.20788$．

???+ example "例题：在复平面上解方程 $\sin z = 2$"
    在实数范围内正弦函数的值域严格限制在 $[-1, 1]$ 内，但在复平面上正弦可取任意复数值！  
    由欧拉公式：
    
    $$
    \sin z = \dfrac{e^{iz} - e^{-iz}}{2i} = 2 \implies e^{2iz} - 4i e^{iz} - 1 = 0
    $$
    
    解一元二次方程：
    
    $$
    e^{iz} = \dfrac{4i \pm \sqrt{-16 + 4}}{2} = (2 \pm \sqrt{3})i
    $$
    
    两边取复对数（注意 $(2 \pm \sqrt{3})i$ 的模为 $2 \pm \sqrt{3}$，辐角为 $\frac{\pi}{2} + 2k\pi$）：
    
    $$
    iz = \ln(2 \pm \sqrt{3}) + i\left(\frac{\pi}{2} + 2k\pi\right)
    $$
    
    由于 $\ln(2 - \sqrt{3}) = \ln\left(\frac{1}{2+\sqrt{3}}\right) = -\ln(2+\sqrt{3})$，除以 $i$ 整理得：
    
    $$
    z = \frac{\pi}{2} + 2k\pi \pm i\ln(2 + \sqrt{3}) \quad (k \in \mathbb{Z})
    $$

### 5.3 利用复指数求实数定积分

???+ example "例题：计算定积分 $\int_0^\pi \cos^n\theta\cos n\theta\,\mathrm{d}\theta$"
    将实三角函数化为复指数：
    
    $$
    \cos\theta = \dfrac{e^{i\theta} + e^{-i\theta}}{2}, \quad \cos n\theta = \dfrac{e^{in\theta} + e^{-in\theta}}{2}
    $$
    
    由二项式定理：
    
    $$
    (e^{i\theta} + e^{-i\theta})^n = \sum_{m=0}^n \binom{n}{m} e^{i(2m-n)\theta}
    $$
    
    因此被积函数展开为：
    
    $$
    \cos^n\theta \cos n\theta = \dfrac{1}{2^{n+1}} \sum_{m=0}^n \binom{n}{m} \left[e^{i 2m\theta} + e^{i 2(m-n)\theta}\right]
    $$
    
    利用复正交积分性质：$\int_0^\pi e^{i 2k\theta}\mathrm{d}\theta = \pi \delta_{k, 0}$（仅在 $k=0$ 时积分为 $\pi$，其余非零整数积分为 $0$）．  
    在求和项中：
    
    - $e^{i 2m\theta}$ 仅在 $m = 0$ 时产生贡献 $\binom{n}{0}\pi = \pi$；
    - $e^{i 2(m-n)\theta}$ 仅在 $m = n$ 时产生贡献 $\binom{n}{n}\pi = \pi$．
    
    两项相加即得：
    
    $$
    \int_0^\pi \cos^n\theta\cos n\theta\,\mathrm{d}\theta = \dfrac{1}{2^{n+1}}(\pi + \pi) = \dfrac{\pi}{2^n}
    $$

---

## 6. 物理前沿与后续课程出口

1. **交流电路复阻抗相量法**：  
   在 [电磁学：交流电路](../../electromagnetism/ac-circuit.md) 中，利用微分算子向复代数的映射 $\frac{\mathrm{d}}{\mathrm{d}t} \to i\omega$，将电感 $Z_L = i\omega L$ 与电容 $Z_C = \frac{1}{i\omega C}$ 与电阻 $R$ 统一为复数阻抗，通过基尔霍夫定律直接代数求解；
2. **电动力学与光学复振幅**：  
   在 [电磁学：麦克斯韦方程组与电磁波](../../electromagnetism/maxwell.md) 中，三维单色平面波写为 $\boldsymbol{E}(\boldsymbol{r}, t) = \operatorname{Re}[\boldsymbol{E}_0 e^{i(\boldsymbol{k}\cdot\boldsymbol{r}-\omega t)}]$，空间散度旋度算子自然转化为代数交叉乘积 $\nabla \to i\boldsymbol{k}$；
3. **量子力学规范变换与几率守恒**：  
   在 [近代物理：量子力学基础](../../modern/quantum/wave-particle.md) 中，波函数局域相位的规范变换 $\psi \to \psi e^{i\alpha(x)}$ 直接催生了 $U(1)$ 电磁规范相互作用．

---

## 7. 学习衔接

- **下一节**：将复微积分进一步深化，进入复可微与全纯解析理论：[解析函数与柯西-黎曼条件](./analytic-functions.md)；
- **总览回顾**：参考 [复数与复变函数模块导览](../complex.md) 与 [数学物理方法课程路线](../../courses/mathematical-methods-for-physics.md)．

---

## 知识小测与巩固练习 {#practice}

> [!TIP] 课后核心技能自测点
>
> 1. 能否在 30 秒内通过极坐标快速计算类似 $((1+i)/\sqrt{2})^{100}$ 的高次复幂？
> 2. 是否能熟练利用欧拉公式展开 $\cos 4\theta$ 与 $\sin 4\theta$？
> 3. 能否独立写出 $\ln(-1)$ 与 $i^{-2i}$ 的全部多值解？
