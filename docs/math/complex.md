???+ note "注意"
    该页面有待完善。如果遇到错误或不完整的地方，欢迎提交 [Issue](https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues)

复数在物理学的许多领域中都扮演着至关重要的角色，尤其是在波动理论、交流电路分析、量子力学和信号处理中。它们提供了一种优雅而强大的数学语言来描述振荡和相位。

## 复数 (Complex Numbers)

### 定义

一个复数 $z$ 定义为 $z = a + bi$，其中 $a$ 和 $b$ 是实数， $i$ 是虚数单位，满足 $i^2 = -1$。
- $a = \text{Re}(z)$ 称为 $z$ 的**实部**。
- $b = \text{Im}(z)$ 称为 $z$ 的**虚部**。

### 复平面 (Complex Plane)

复数可以在一个二维平面上表示，称为复平面或阿尔冈图。水平轴代表实部，垂直轴代表虚部。复数 $z = a+bi$ 对应于点 $(a, b)$。

### 极坐标表示与欧拉公式

一个复数也可以用极坐标 $(r, \theta)$ 来表示：
- $r = |z| = \sqrt{a^2 + b^2}$ 是复数的**模**或**绝对值**。
- $\theta = \arg(z)$ 是复数的**辐角**，是从正实轴到表示复数的向量的夹角。

根据三角关系，我们有 $a = r\cos\theta$ 和 $b = r\sin\theta$，所以：

$$
z = r(\cos\theta + i\sin\theta)
$$

**欧拉公式 (Euler's Formula)** 是复数理论中最核心和最美的公式之一，它将指数函数与三角函数联系起来：

$$
e^{i\theta} = \cos\theta + i\sin\theta
$$

利用欧拉公式，任何复数都可以被简洁地表示为：

$$
z = r e^{i\theta}
$$

这种形式在处理乘除法和幂运算时特别方便。

**例题：** 计算 $i^i$。
**解：** 首先，将 $i$ 写成极坐标形式。$i$ 的模是 1，辐角是 $\pi/2$。
所以 $i = e^{i\pi/2}$。
那么，$i^i = (e^{i\pi/2})^i = e^{i^2\pi/2} = e^{-\pi/2}$。
这是一个实数，约等于 0.2078。

### 复共轭

复数 $z = a+bi$ 的**复共轭**记作 $z^*$ 或 $\bar{z}$，定义为 $z^* = a-bi$。
在极坐标下，如果 $z = re^{i\theta}$，则 $z^* = re^{-i\theta}$。

**重要性质：**
- $z + z^* = 2a = 2\text{Re}(z)$
- $z - z^* = 2ib = 2i\text{Im}(z)$
- $zz^* = (a+bi)(a-bi) = a^2 + b^2 = |z|^2$

在物理学中，一个物理量（如波函数 $\psi$）的概率密度通常与其模的平方成正比，即 $\psi^*\psi = |\psi|^2$。

## 复变函数 (Complex Functions)

复变函数是以复数为自变量的函数，即 $w = f(z)$，其中 $z$ 和 $w$ 都是复数。
我们可以将 $w$ 分解为实部和虚部：$w = u + iv$。由于 $z = x+iy$，所以 $u$ 和 $v$ 都是 $x$ 和 $y$ 的实函数：

$$
f(z) = u(x, y) + i v(x, y)
$$

### 解析函数与柯西-黎曼条件

一个复变函数 $f(z)$ 在区域 $D$ 内**解析**（或称为**全纯**），如果它在该区域内的每一点都可导。复变函数的可导性是一个比实函数强得多的条件。

如果 $f(z) = u(x, y) + i v(x, y)$ 在某点解析，那么它的实部和虚部必须满足**柯西-黎曼条件 (Cauchy-Riemann conditions)**：

$$
\dfrac{\partial u}{\partial x} = \dfrac{\partial v}{\partial y} \quad \text{and} \quad \dfrac{\partial u}{\partial y} = -\dfrac{\partial v}{\partial x}
$$

这个条件是函数解析的必要条件。如果 $u$ 和 $v$ 的一阶偏导数连续且满足柯西-黎曼条件，那么这也是函数解析的充分条件。

**例题：** 判断函数 $f(z) = z^2$ 是否为解析函数。
**解：**
$f(z) = (x+iy)^2 = (x^2 - y^2) + i(2xy)$。
所以 $u(x, y) = x^2 - y^2$，$v(x, y) = 2xy$。
我们来检验柯西-黎曼条件：

$$
\dfrac{\partial u}{\partial x} = 2x, \quad \dfrac{\partial v}{\partial y} = 2x
$$

$$
\dfrac{\partial u}{\partial y} = -2y, \quad \dfrac{\partial v}{\partial x} = 2y
$$

我们看到 $\frac{\partial u}{\partial x} = \frac{\partial v}{\partial y}$ 和 $\frac{\partial u}{\partial y} = -\frac{\partial v}{\partial x}$ 在整个复平面上都成立。因此，$f(z) = z^2$ 是一个解析函数。

### 柯西积分定理与柯西积分公式

解析函数具有非常强大的性质，其中最重要的是柯西积分定理和公式。

**柯西积分定理 (Cauchy's Integral Theorem)**：如果 $f(z)$ 在一个单连通区域 $D$ 内解析，那么对于 $D$ 内的任何闭合路径 $C$，函数沿该路径的积分为零：

$$
\oint_C f(z) dz = 0
$$

这个定理在物理学中意味着，如果一个力场是保守的（在复分析中对应于解析函数），那么沿任何闭合路径所做的功都为零。

**柯西积分公式 (Cauchy's Integral Formula)**：如果 $f(z)$ 在包含闭合路径 $C$ 及其内部的区域内解析，那么对于 $C$ 内部的任何一点 $z_0$，有：

$$
f(z_0) = \dfrac{1}{2\pi i} \oint_C \dfrac{f(z)}{z - z_0} dz
$$

这个惊人的公式表明，一个解析函数在某区域内部的值完全由其在该区域边界上的值所确定。

### 留数定理 (Residue Theorem)

柯西积分公式可以推广到处理具有奇点（不解析的点）的函数积分。

**奇点**：函数 $f(z)$ 在 $z_0$ 点不解析，但在 $z_0$ 的任意小邻域内总能找到 $f(z)$ 解析的点，则称 $z_0$ 为一个**孤立奇点**。
如果函数可以表示为洛朗级数 $f(z) = \sum_{n=-\infty}^{\infty} a_n (z-z_0)^n$，其中 $a_{-1}$ 项的系数被称为函数在 $z_0$ 点的**留数 (Residue)**，记作 $\text{Res}(f, z_0)$。

**留数定理**：设 $f(z)$ 在闭合路径 $C$ 内部有有限个孤立奇点 $z_1, z_2, \dots, z_k$，在 $C$ 上解析。则：

$$
\oint_C f(z) dz = 2\pi i \sum_{j=1}^k \text{Res}(f, z_j)
$$

留数定理是计算实积分和物理学中许多其他问题的强大工具，例如在计算散射振幅和传播子时。

**例题：** 计算积分 $\oint_C \frac{e^z}{z^2} dz$，其中 $C$ 是包围原点的任意简单闭合路径。
**解：**
被积函数 $f(z) = \frac{e^z}{z^2}$ 在 $z=0$ 处有一个奇点。
为了求留数，我们将 $e^z$ 在 $z=0$ 附近展开为泰勒级数：
$e^z = 1 + z + \frac{z^2}{2!} + \dots$
所以，$f(z) = \frac{1}{z^2}(1 + z + \frac{z^2}{2!} + \dots) = \frac{1}{z^2} + \frac{1}{z} + \frac{1}{2} + \dots$
根据定义，留数是 $(z-0)^{-1}$ 即 $1/z$ 项的系数，所以 $\text{Res}(f, 0) = 1$。
根据留数定理：

$$
\oint_C \dfrac{e^z}{z^2} dz = 2\pi i \cdot \text{Res}(f, 0) = 2\pi i
$$
