---
status: stable
author: Physics Learning Wiki Team
description: 探讨狄拉克 Delta 函数的物理起源、广义函数严格极限定义、筛选性与复合函数性质、三维形式以及在静电泊松方程与格林函数中的核心地位。
---

## 狄拉克 Delta 函数

## 物理问题引入：如何用数学描述“没有体积的点电荷”？

在宏观电磁学中，电荷密度定义为单位体积内的电荷量：$\rho = \frac{\Delta q}{\Delta V}$．
但是，经典电动力学常常研究**理想点电荷** $q$：
- 它集中在空间中一个没有体积的几何点 $\boldsymbol{r}_0$ 处（$\Delta V \to 0$）；
- 在该点处，电荷密度应当发散到无穷大（$\rho(\boldsymbol{r}_0) = \infty$）；
- 在除该点之外的其余所有空间，电荷密度严格为零（$\rho(\boldsymbol{r} \neq \boldsymbol{r}_0) = 0$）；
- 然而，当对包含该点的整个空间区域积分时，总电荷必须精确等于 $q$：$\iiint \rho(\boldsymbol{r})\mathrm{d}V = q$．

在传统柯西-黎曼积分体系中，一个“几乎处处为零”的函数其积分必然为零，根本无法容纳这种物理现实．
为了给点电荷、瞬间冲量、质点质量密度赋予合法的数学身份，保罗·狄拉克 (Paul Dirac) 引入了 **$\delta$ 函数**（后由数学家施瓦茨建立为严格的 **广义函数 / 分布 (Distribution) 理论**）．

---

## 1. 狄拉克 $\delta$ 函数的定义与极限表示

### 1.1 算子定义（筛选性定义）
严格来说，$\delta(x)$ 并非传统逐点定义的普通函数，而是一个作用于连续测试函数 $f(x)$ 上的线性泛函：

$$
\int_{-\infty}^{\infty} f(x) \delta(x - a) \mathrm{d}x = f(a)
$$

### 1.2 物理近似序列（弱收敛极限）
在真实物理系统中，点源都是某种极端极限下的近似．$\delta(x)$ 可视为下列光滑函数序列在参数 $\epsilon \to 0$ 时的弱极限：

1. **高斯函数极限**：

   $$
   \delta(x) = \lim_{\epsilon \to 0} \dfrac{1}{\sqrt{2\pi}\epsilon} \exp\left(-\dfrac{x^2}{2\epsilon^2}\right)
   $$

2. **洛伦兹型（柯西分布）极限**：

   $$
   \delta(x) = \lim_{\epsilon \to 0} \dfrac{1}{\pi} \dfrac{\epsilon}{x^2 + \epsilon^2}
   $$

3. **波动与傅里叶积分核极限（狄利克雷核）**：

   $$
   \delta(x) = \lim_{K \to \infty} \dfrac{\sin(K x)}{\pi x} = \dfrac{1}{2\pi} \int_{-\infty}^{\infty} e^{ikx} \mathrm{d}k
   $$

---

## 2. 核心代数与微积分性质

| 性质名称 | 数学表达式 | 物理背景与直观 |
| :--- | :--- | :--- |
| **偶函数性** | $\delta(-x) = \delta(x)$ | 点源无固有空间朝向 |
| **标度变换** | $\delta(c x) = \dfrac{1}{|c|}\delta(x) \quad (c \neq 0)$ | 坐标轴缩放反比改变峰值密度 |
| **自变量函数根展开** | $\delta(g(x)) = \sum_{i} \dfrac{\delta(x - x_i)}{|g'(x_i)|} \quad (g(x_i)=0)$ | 复合非线性系统通过各单根零点处做局部线性化 |
| **一阶导数筛选** | $\int_{-\infty}^{\infty} f(x)\delta'(x-a)\mathrm{d}x = -f'(a)$ | 由分部积分给出，物理上对应理想**电偶极子**分布 |
| **与阶跃函数关系** | $\delta(x) = \dfrac{\mathrm{d}}{\mathrm{d}x}\Theta(x)$ | 物理开关瞬时通断产生的冲激流 |

---

## 3. 三维空间形式与正交坐标系表达

在三维空间中，点源的三维狄拉克 $\delta$ 函数定义为笛卡尔分量的乘积：

$$
\delta(\boldsymbol{r} - \boldsymbol{r}_0) = \delta(x - x_0)\delta(y - y_0)\delta(z - z_0)
$$

满足全空间体积分归一性：$\iiint_{\mathbb{R}^3} \delta(\boldsymbol{r} - \boldsymbol{r}_0)\mathrm{d}^3\boldsymbol{r} = 1$．

### 曲线正交坐标系中的展开
由于体积元在曲线坐标系中含有拉梅系数（Lamé coefficients）雅可比行列式 $\mathrm{d}V = h_1 h_2 h_3 \mathrm{d}u_1 \mathrm{d}u_2 \mathrm{d}u_3$：

- **柱坐标系** $(r, \theta, z)$：

  $$
  \delta(\boldsymbol{r} - \boldsymbol{r}_0) = \dfrac{1}{r} \delta(r - r_0)\delta(\theta - \theta_0)\delta(z - z_0)
  $$

- **球坐标系** $(r, \theta, \phi)$：

  $$
  \delta(\boldsymbol{r} - \boldsymbol{r}_0) = \dfrac{1}{r^2 \sin\theta} \delta(r - r_0)\delta(\theta - \theta_0)\delta(\phi - \phi_0)
  $$

---

## 4. 物理皇冠公式：泊松方程与基本解

在经典静电学中，距原点 $r$ 处的单位点电荷激发的库仑势为 $\phi(\boldsymbol{r}) = \dfrac{1}{4\pi\varepsilon_0 r}$．
在除原点外的任意位置：

$$
\nabla^2 \left(\dfrac{1}{r}\right) = \dfrac{1}{r^2}\dfrac{\mathrm{d}}{\mathrm{d}r}\left(r^2 \dfrac{\mathrm{d}}{\mathrm{d}r}\dfrac{1}{r}\right) = \dfrac{1}{r^2}\dfrac{\mathrm{d}}{\mathrm{d}r}\left(-1\right) = 0
$$

然而，根据高斯散度定理，包围原点的任意闭合球面上电场通量为：

$$
\oint_S \nabla\left(\dfrac{1}{r}\right)\cdot\mathrm{d}\boldsymbol{S} = \oint_S \left(-\dfrac{\hat{r}}{r^2}\right)\cdot (\hat{r} r^2 \mathrm{d}\Omega) = -\oint_S \mathrm{d}\Omega = -4\pi
$$

如果 $\nabla^2(1/r)$ 处处为零，根据散度定理体积分也应为零，这产生明显矛盾！
唯一的解释是，原点处包含了集中发散的散度源．用 $\delta$ 函数表达这一深刻事实即为：

$$
\nabla^2 \left(\dfrac{1}{|\boldsymbol{r} - \boldsymbol{r}'|}\right) = -4\pi \delta(\boldsymbol{r} - \boldsymbol{r}')
$$

???+ tip "格林函数方法的诞生之门"
    上式意味着：$G(\boldsymbol{r}, \boldsymbol{r}') = \dfrac{1}{4\pi|\boldsymbol{r} - \boldsymbol{r}'|}$ 是拉普拉斯算符在三维无限大自由空间中的**格林函数**！后续所有静电边值与电动力学积分，均源于这一个方程．

---

## 5. 学习衔接

- **下一节**：用正交基展开周期信号与函数，进入 [傅里叶级数](./fourier-series.md)；
- **核心应用**：在 [格林函数方法](../eigenfunction-methods/greens-function.md) 中掌握任意点源场卷积积分．
