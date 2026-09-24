---
status: review
author: Physics Learning Wiki Team
description: 探讨伽马函数、贝塔函数、阶乘推广、复解析延拓、余元公式、高斯积分高阶矩计算以及在超球体积与统计力学微态数中的物理应用．
---

## 伽马与贝塔函数

## 物理问题引入：当阶乘推广到连续与非整数维度

在初等排列组合中，阶乘 $n! = n \times (n-1) \times \dots \times 1$ 只对非负整数有定义．
然而，在统计物理、高维空间与现代量子场论中，物理学家不可避免地遇到以下问题：

1.  **$n$ 维空间超球体积**：统计力学中由 $N$ 个质点组成的理想气体，其动量相空间是 $3N$ 维欧氏空间！计算系统微态数需要求解 $D$ 维超球体的体积，而当 $D$ 为奇数时，公式中自然出现了「半整数阶乘」$(D/2)!$；
2.  **高斯积分高阶矩**：高斯分布的偶数矩与奇数矩平均值计算；
3.  **量子场论维度正则化**：在消除费曼图紫外发散时，物理学家将时空维度解析延拓为连续变量 $D = 4 - \epsilon$．

莱昂哈德·欧拉 (Leonhard Euler) 发现的 **伽马函数 (Gamma Function)**，正是阶乘在全复平面上的唯美延拓．

***

## 1. 伽马函数 $\Gamma(z)$ 的定义与基本性质

### 1.1 欧拉第二类积分定义

对于实部为正的复数（$\text{Re}(z) > 0$），伽马函数定义为收敛的反常积分：

$$
\Gamma(z) = \int_0^\infty t^{z-1} e^{-t} \mathrm{d}t
$$

### 1.2 基本递推性质（分部积分）

利用分部积分法：

$$
\Gamma(z+1) = \int_0^\infty t^z e^{-t}\mathrm{d}t = \left. -t^z e^{-t} \right|_0^\infty + z \int_0^\infty t^{z-1} e^{-t}\mathrm{d}t = z \Gamma(z)
$$

由于 $\Gamma(1) = \int_0^\infty e^{-t}\mathrm{d}t = 1$，对任意正整数 $n$：

$$
\Gamma(n+1) = n! \quad \iff \quad \Gamma(n) = (n-1)!
$$

伽马函数完美复刻了自然数的阶乘规律！

### 1.3 半整数特殊值与高斯积分

令 $z = 1/2$，做变量代换 $t = u^2$($\mathrm{d}t = 2u\mathrm{d}u$)：

$$
\Gamma(1/2) = \int_0^\infty t^{-1/2} e^{-t}\mathrm{d}t = 2\int_0^\infty e^{-u^2}\mathrm{d}u = \sqrt{\pi}
$$

借助递推公式 $\Gamma(z+1) = z\Gamma(z)$，所有半整数的伽马值均可直接算出：

$$
\Gamma(3/2) = \dfrac{1}{2}\sqrt{\pi}, \quad \Gamma(5/2) = \dfrac{3}{4}\sqrt{\pi}, \quad \Gamma(n + 1/2) = \dfrac{(2n-1)!!}{2^n}\sqrt{\pi}
$$

***

## 2. 解析延拓与欧拉余元公式

通过递推关系 $\Gamma(z) = \dfrac{\Gamma(z+1)}{z}$，伽马函数可以一步步解析延拓到全复平面，唯一的奇异点是 **非正整数点**  $z = 0, -1, -2, \dots$（全为一阶单极点）．

### 欧拉余元公式 (Reflection Formula)

利用复围道积分可证明著名的反射公式：

$$
\Gamma(z) \Gamma(1 - z) = \dfrac{\pi}{\sin(\pi z)}
$$

令 $z = 1/2$ 时立刻自洽验证了 $\Gamma(1/2)^2 = \pi$．

***

## 3. 贝塔函数 $B(p, q)$

### 3.1 欧拉第一类积分定义

对于 $\text{Re}(p) > 0, \text{Re}(q) > 0$：

$$
B(p, q) = \int_0^1 t^{p-1} (1 - t)^{q-1} \mathrm{d}t
$$

通过变量代换 $t = \sin^2\theta$，得到极具物理实用价值的三角函数形式：

$$
B(p, q) = 2 \int_0^{\pi/2} \sin^{2p-1}\theta \cos^{2q-1}\theta \, \mathrm{d}\theta
$$

### 3.2 贝塔与伽马函数的统一转换公式

将两个伽马积分相乘并转换为二维极坐标计算，可直接导出著名的联立公式：

$$
B(p, q) = \dfrac{\Gamma(p)\Gamma(q)}{\Gamma(p + q)}
$$

???+ tip "计算三角积分的终极捷径"
    在电动力学和量子力学中计算诸如 $\int_0^{\pi/2}\sin^4\theta \cos^2\theta\mathrm{d}\theta$ 时，无需反复调用降幂和差化积公式，只需认出：$2p-1 = 4 \implies p = 5/2$，$2q-1 = 2 \implies q = 3/2$．
    该积分值直接为 $\dfrac{1}{2}B(5/2, 3/2) = \dfrac{\Gamma(5/2)\Gamma(3/2)}{2\Gamma(4)} = \dfrac{\pi}{32}$！

***

## 4. 经典物理建模：$D$ 维相空间超球体积

在统计物理中，单原子理想气体系统的微观能量由动量给出：$\sum_{i=1}^{3N} \frac{p_i^2}{2m} \le E$．
这是一个半径为 $R = \sqrt{2mE}$ 的 $D = 3N$ 维超球体．

### 超球体积推导

$D$ 维球体体积可表示为：$V_D(R) = C_D R^D$．利用高斯多重积分技巧：

$$
\int_{-\infty}^\infty \dots \int_{-\infty}^\infty e^{-(x_1^2 + \dots + x_D^2)} \mathrm{d}x_1 \dots \mathrm{d}x_D = (\sqrt{\pi})^D = \pi^{D/2}
$$

转换为高维球极坐标积分：$\int_0^\infty e^{-r^2} \cdot (D C_D r^{D-1}) \mathrm{d}r = D C_D \cdot \dfrac{1}{2}\Gamma(D/2) = C_D \Gamma(D/2 + 1)$．
对比两边，直接得出任意 $D$ 维超球体的精确体积公式：

$$
V_D(R) = \dfrac{\pi^{D/2}}{\Gamma\left(\dfrac{D}{2} + 1\right)} R^D
$$

将 $D=3$ 代入：$\Gamma(5/2) = \frac{3}{4}\sqrt{\pi} \implies V_3(R) = \frac{\pi^{3/2}}{\frac{3}{4}\sqrt{\pi}} R^3 = \dfrac{4}{3}\pi R^3$；
将 $D=2$ 代入：$\Gamma(2) = 1 \implies V_2(R) = \pi R^2$．完全精确吻合初等几何！

***

## 5. 学习衔接

-   **下一节**：球对称静态边值与多极展开，进入 [勒让德多项式](./legendre.md)；
-   **柱对称前置**：在 [贝塞尔函数](./bessel.md) 中，半整数阶贝塞尔函数将频繁使用伽马函数表达．
