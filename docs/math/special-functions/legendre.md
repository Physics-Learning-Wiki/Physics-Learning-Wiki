---
status: review
author: Physics Learning Wiki Team
description: 探讨勒让德微分方程、罗德里格斯公式、正交性、生成函数多极展开、连带勒让德多项式以及在静电球对称边值与导体球极化中的物理应用．
---

## 勒让德多项式与轴对称边值

## 物理问题引入：当拉普拉斯方程遇到球对称几何

在静电学与万有引力中，许多实际问题具备 **轴对称性**（如均匀外电场中的导体球、均匀带电细圆环、自转行星的引力场）．
在球坐标系 $(r, \theta, \phi)$ 中，拉普拉斯方程为：

$$
\nabla^2 \Phi = \dfrac{1}{r^2}\dfrac{\partial}{\partial r}\left(r^2 \dfrac{\partial\Phi}{\partial r}\right) + \dfrac{1}{r^2\sin\theta}\dfrac{\partial}{\partial\theta}\left(\sin\theta \dfrac{\partial\Phi}{\partial\theta}\right) + \dfrac{1}{r^2\sin^2\theta}\dfrac{\partial^2\Phi}{\partial\phi^2} = 0
$$

若体系绕 $z$ 轴旋转对称，则势与方位角无关（$\frac{\partial\Phi}{\partial\phi} = 0$）．
设分离变量解 $\Phi(r, \theta) = R(r) \Theta(\theta)$，分离常数记为 $l(l+1)$：

-   径向欧拉方程解出：$R(r) = A_l r^l + \dfrac{B_l}{r^{l+1}}$；
-   做变量代换令 $x = \cos\theta \in [-1, 1]$，角度方程化为著名的 **勒让德方程 (Legendre Equation)**：

$$
(1 - x^2)\dfrac{\mathrm{d}^2 y}{\mathrm{d}x^2} - 2x\dfrac{\mathrm{d}y}{\mathrm{d}x} + l(l+1)y = 0
$$

***

## 1. 物理边界截断与勒让德多项式

在南北极点（$\theta = 0 \implies x = 1$，$\theta = \pi \implies x = -1$），方程的系数出现正则奇点．
前文幂级数分析表明：**只有当参数 $l$ 取非负整数 $l = 0, 1, 2, \dots$ 时，无穷级数才会截断为有限项多项式，使电势在球面上处处有限不发散！** 这组截断多项式即为 **勒让德多项式 $P_l(x)$**．

### 1.1 罗德里格斯公式 (Rodrigues' Formula)

勒让德多项式可由微分公式唯美给出：

$$
P_l(x) = \dfrac{1}{2^l l!} \dfrac{\mathrm{d}^l}{\mathrm{d}x^l}\left( x^2 - 1 \right)^l
$$

前几阶具体形式：

-   $P_0(x) = 1$（球对称单极）
-   $P_1(x) = x = \cos\theta$（偶极电势）
-   $P_2(x) = \dfrac{1}{2}(3x^2 - 1) = \dfrac{1}{4}(3\cos 2\theta + 1)$（四极电势）
-   $P_3(x) = \dfrac{1}{2}(5x^3 - 3x)$

奇偶性：$P_l(-x) = (-1)^l P_l(x)$，在端点处归一化为 $P_l(1) = 1, P_l(-1) = (-1)^l$．

***

## 2. 正交性与广义傅里叶展开

勒让德多项式是区间 $[-1, 1]$ 上权函数 $w(x) = 1$ 的 Sturm–Liouville 自共轭本征函数系，满足严格正交性：

$$
\int_{-1}^1 P_l(x) P_{l'}(x) \mathrm{d}x = \dfrac{2}{2l + 1} \, \delta_{ll'}
$$

任意轴对称角向分布 $f(\theta)$ 均可唯一展开为勒让德级数：

$$
f(\theta) = \sum_{l=0}^\infty c_l P_l(\cos\theta), \quad c_l = \dfrac{2l + 1}{2} \int_0^\pi f(\theta) P_l(\cos\theta) \sin\theta \, \mathrm{d}\theta
$$

***

## 3. 母函数与静电多极展开

考察位于 $z$ 轴上 $z'=d$ 处的点电荷在观测点 $\boldsymbol{r}$ 激发的库仑势：
设两点夹角为 $\theta$，$x = \cos\theta$，两点距离倒数为：

$$
\dfrac{1}{|\boldsymbol{r} - \boldsymbol{r}'|} = \dfrac{1}{\sqrt{r^2 - 2rd\cos\theta + d^2}} = \dfrac{1}{r} \dfrac{1}{\sqrt{1 - 2x(d/r) + (d/r)^2}}
$$

令微小几何比值 $t = d/r < 1$，根号展开给出了勒让德多项式的 **生成函数 (Generating Function)**：

$$
\dfrac{1}{\sqrt{1 - 2xt + t^2}} = \sum_{l=0}^\infty P_l(x) t^l
$$

因此，静电点电荷势可直接展开为径向与角向分离的多极级数：

$$
\dfrac{1}{|\boldsymbol{r} - \boldsymbol{r}'|} = \sum_{l=0}^\infty \dfrac{r_<^l}{r_>^{l+1}} P_l(\cos\theta)
$$

其中 $r_< = \min(r, d), r_> = \max(r, d)$．**物理多极矩的数学实质**：

-   $l=0$ 项：单极矩项 $\frac{1}{r}$（总电荷）；
-   $l=1$ 项：偶极矩项 $\frac{d\cos\theta}{r^2}$；
-   $l=2$ 项：四极矩项 $\frac{d^2(3\cos^2\theta-1)}{2r^3}$．
    勒让德多项式天然就是物理多极展开的几何谐波基底！

***

## 4. 连带勒让德多项式 $P_l^m(x)$

若体系不再具备轴对称性，即 $\Phi$ 依赖于方位角 $\phi$，分离变量后方位角方程给出 $e^{\pm im\phi}$（$m \in \mathbb{Z}$），此时角向方程推广为 **连带勒让德方程 (Associated Legendre Equation)**：

$$
(1 - x^2)\dfrac{\mathrm{d}^2 y}{\mathrm{d}x^2} - 2x\dfrac{\mathrm{d}y}{\mathrm{d}x} + \left[ l(l+1) - \dfrac{m^2}{1 - x^2} \right] y = 0
$$

其满足边界有限性的解为 **连带勒让德函数**：

$$
P_l^m(x) = (-1)^m (1 - x^2)^{m/2} \dfrac{\mathrm{d}^m}{\mathrm{d}x^m} P_l(x) \quad (-l \le m \le l)
$$

它与方位角相位因子 $e^{im\phi}$ 相乘，便构成了全空间各向同性的最高阶数学工具——**球谐函数**．

***

## 5. 学习衔接

-   **下一节**：将连带勒让德多项式推广到全球面坐标，进入 [球谐函数与角动量本征态](./spherical-harmonics.md)；
-   **物理应用**：在 [电磁学：静电场边值](../../electromagnetism/electrostatics.md) 中掌握外电场下导体球感应电荷分布．
