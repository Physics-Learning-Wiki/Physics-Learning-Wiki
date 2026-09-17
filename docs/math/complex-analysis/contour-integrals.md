---
status: stable
author: Physics Learning Wiki Team
description: 探讨复平面路径积分、柯西积分定理、柯西积分公式、解析函数的无限次可微性及其在电磁势与场论中的物理图像。
---

## 复变积分与柯西定理

## 物理问题引入：解析函数的“全息”特性

在实数微积分中，如果你知道了函数在某个区域边界上的值，你通常无法确定函数在区域内部的值——除非知道其内部的源项分布．而且，一个实函数即使一阶可导，它的二阶导数也可能根本不存在．

但在复分析中，解析函数展现出了近乎“全息摄影”的惊人特质：
1. **闭合环路积分为零**：只要区域内没有奇点，沿任意闭合曲线的复积分恒等于零；
2. **边界决定一切**：只要知道解析函数在边界上的闭环取值，通过一个围道积分就能**精确重构出内部任意点的值**（柯西积分公式）；
3. **一阶解析即无限可微**：只要复一阶导数存在，高阶导数自动存在且全部解析．

这种特性在物理学中正是无源保守场（如真空静电场）的本质体现．

---

## 1. 复变积分的定义与计算

设 $C$ 为复平面上一条光滑曲线，$z(t) = x(t) + iy(t)$ ($a \le t \le b$)．复变函数 $f(z) = u + iv$ 沿曲线 $C$ 的积分定义为：

$$
\int_C f(z) \mathrm{d}z = \int_C (u + iv)(\mathrm{d}x + i\mathrm{d}y) = \int_C (u\,\mathrm{d}x - v\,\mathrm{d}y) + i \int_C (v\,\mathrm{d}x + u\,\mathrm{d}y)
$$

这表明复积分本质上是两个实平面曲线线积分的线性组合．

---

## 2. 柯西积分定理 (Cauchy's Integral Theorem)

### 定理陈述
若函数 $f(z)$ 在**单连通区域** $D$ 内全纯（解析），且其导数连续，则对 $D$ 内任意一条简单闭合曲线 $C$，有：

$$
\oint_C f(z) \mathrm{d}z = 0
$$

### 结合格林公式的直观证明
根据二维平面的格林定理 $\oint_C (P\,\mathrm{d}x + Q\,\mathrm{d}y) = \iint_S \left(\dfrac{\partial Q}{\partial x} - \dfrac{\partial P}{\partial y}\right)\mathrm{d}x\mathrm{d}y$：
- 实部项：$P = u, Q = -v \implies \dfrac{\partial(-v)}{\partial x} - \dfrac{\partial u}{\partial y} = -\left(\dfrac{\partial v}{\partial x} + \dfrac{\partial u}{\partial y}\right)$；
- 虚部项：$P = v, Q = u \implies \dfrac{\partial u}{\partial x} - \dfrac{\partial v}{\partial y}$．

因为 $f(z)$ 满足柯西-黎曼方程 $\dfrac{\partial u}{\partial x} = \dfrac{\partial v}{\partial y}$ 且 $\dfrac{\partial u}{\partial y} = -\dfrac{\partial v}{\partial x}$，两项被积函数恒等于零！因此：

$$
\oint_C f(z) \mathrm{d}z = 0 + i0 = 0
$$

???+ tip "闭路变形原理 (Contour Deformation)"
    如果 $f(z)$ 在曲线 $C_1$ 与 $C_2$ 所围成的复连通区域内处处解析，则沿外轮廓 $C_1$ 的积分与沿内轮廓 $C_2$ 的积分严格相等：
    $$
    \oint_{C_1} f(z)\mathrm{d}z = \oint_{C_2} f(z)\mathrm{d}z
    $$
    这意味着积分围道可以自由拉伸、扭曲，只要它在变形过程中**不跨越奇点**！

---

## 3. 基础奇点积分：所有留数理论的种子

考虑函数 $f(z) = \dfrac{1}{z - z_0}$，它在 $z_0$ 处不解析（奇点）．
取以 $z_0$ 为中心、半径为 $R$ 的圆周 $C$：$z - z_0 = R e^{i\theta} \implies \mathrm{d}z = i R e^{i\theta}\mathrm{d}\theta$（$\theta$ 从 $0$ 到 $2\pi$）．

$$
\oint_C \dfrac{1}{z - z_0}\mathrm{d}z = \int_0^{2\pi} \dfrac{i R e^{i\theta}\mathrm{d}\theta}{R e^{i\theta}} = i \int_0^{2\pi}\mathrm{d}\theta = 2\pi i
$$

若考虑一般整数次幂 $(z-z_0)^n$（$n \neq -1$）：

$$
\oint_C (z - z_0)^n \mathrm{d}z = \int_0^{2\pi} R^n e^{in\theta} \cdot i R e^{i\theta}\mathrm{d}\theta = i R^{n+1} \int_0^{2\pi} e^{i(n+1)\theta}\mathrm{d}\theta = 0
$$

**核心结论**：在围绕奇点的闭环积分中，所有其他整幂次积分为零，**唯独 $\dfrac{1}{z-z_0}$ 项贡献了 $2\pi i$**！

---

## 4. 柯西积分公式 (Cauchy's Integral Formula)

若 $f(z)$ 在简单闭合曲线 $C$ 及其内部解析，$z_0$ 为内部任意一点，则：

$$
f(z_0) = \dfrac{1}{2\pi i} \oint_C \dfrac{f(z)}{z - z_0}\mathrm{d}z
$$

### 高阶导数公式
对柯西积分公式两边关于参数 $z_0$ 连续求导，可以在积分号下进行：

$$
f^{(n)}(z_0) = \dfrac{n!}{2\pi i} \oint_C \dfrac{f(z)}{(z - z_0)^{n+1}}\mathrm{d}z
$$

**物理启示**：
1. **无穷阶解析**：复变函数只要一阶可导，就自动具有任意阶导数，不存在实分析中“二阶导数不连续”的病态情形；
2. **极值原理**：解析函数的模长 $|f(z)|$ 不可能在区域内部取得孤立极大值（只能在边界上取得）．这正是静电学中 **恩绍定理 (Earnshaw's Theorem)**——仅依靠静电场无法实现带电粒子在真空中的稳定悬浮——的复分析根源．

---

## 5. 学习衔接

- **上一节**：柯西-黎曼条件与调和势，参见 [解析函数与柯西-黎曼条件](./analytic-functions.md)；
- **下一节**：将解析函数在奇点附近展开为包含负幂次的级数，进入 [级数展开与奇点](./series-expansion.md)．
