---
status: stable
author: Physics Learning Wiki Team
description: 掌握偏微分方程分离变量法定解法、空间-时间解耦、齐次边界导出分立特征值与本征函数、驻波模态叠加以及通向 Sturm-Liouville 理论的桥梁。
---

## 偏微分方程分离变量法

## 物理问题引入：两端固定的弦为什么只允许特定频率振荡？

考察一根长度为 $L$、两端牢固固定的吉他弦：
- 在宏观上，你可以用拨片随意拨出各种奇怪的初始折线形状 $u(x, 0) = \phi(x)$；
- 但在波动动力学演化中，琴弦**绝不能**以任意连续频率振动；
- 物理测量显示，琴弦的声音必定由 $f_1 = \frac{v}{2L}, f_2 = 2f_1, f_3 = 3f_1, \dots$ 等一组**严格分立的特征基频与泛音**构成．

为什么连续的偏微分方程 $\dfrac{\partial^2 u}{\partial x^2} = \dfrac{1}{v^2}\dfrac{\partial^2 u}{\partial t^2}$ 会自动筛选出这组分立的离散频率？
**分离变量法 (Separation of Variables，又称傅里叶法)** 揭示了这一奇迹背后的全部数学奥秘．

---

## 1. 分离变量法四步通用范式

以最典型的一维有限长弦齐次波动定解问题为例：

$$
\begin{cases}
\dfrac{\partial^2 u}{\partial t^2} = v^2 \dfrac{\partial^2 u}{\partial x^2} & (0 < x < L, \, t > 0) \\[6pt]
u(0, t) = 0, \quad u(L, t) = 0 & (\text{齐次第一类边界条件}) \\[6pt]
u(x, 0) = \phi(x), \quad \left.\dfrac{\partial u}{\partial t}\right|_{t=0} = \psi(x) & (\text{初始位移与初速度})
\end{cases}
$$

### 第一步：设乘积解，变量解耦
假设未知场函数可以分解为纯空间因子与纯时间因子的乘积：

$$
u(x, t) = X(x) T(t)
$$

代入波动方程：$X(x) T''(t) = v^2 X''(x) T(t)$．两边同除以 $v^2 X(x) T(t)$：

$$
\dfrac{X''(x)}{X(x)} = \dfrac{1}{v^2}\dfrac{T''(t)}{T(t)}
$$

等式左边只依赖于空间坐标 $x$，等式右边只依赖于时间 $t$．要让这两个完全独立的自变量在任意时刻、任意地点处处相等，**它们必须共同等于同一个与 $x, t$ 均无关的常数**，记为 $-\lambda$（分离常数）：

$$
\dfrac{X''(x)}{X(x)} = -\lambda \implies X''(x) + \lambda X(x) = 0
$$

$$
\dfrac{T''(t)}{T(t)} = -v^2 \lambda \implies T''(t) + v^2 \lambda T(t) = 0
$$

偏微分方程被成功降阶为两个独立的常微分方程！

---

### 第二步：结合齐次边界，求解空间本征值问题
齐次边界条件给出：$u(0, t) = X(0)T(t) = 0 \implies X(0) = 0$；同理 $X(L) = 0$．
由此得到空间常微分方程的 **边值问题（又称 Sturm–Liouville 本征值问题）**：

$$
X''(x) + \lambda X(x) = 0, \quad X(0) = 0, \quad X(L) = 0
$$

分类讨论分离常数 $\lambda$：
1. 若 $\lambda < 0$ 或 $\lambda = 0$，通解为双曲函数或线性函数，代入两端边界只能得到平凡零解 $X(x) \equiv 0$（弦完全不振动，无物理意义）；
2. 若 $\lambda > 0$，令 $\lambda = k^2$，通解为：$X(x) = C_1 \cos(kx) + C_2 \sin(kx)$．
   - $X(0) = 0 \implies C_1 = 0$；
   - $X(L) = C_2 \sin(k L) = 0$．

为了得到非零解，必须满足正弦函数零点条件：$k L = n\pi$ ($n = 1, 2, 3, \dots$)．
由此，边界条件强制筛选出一组**离散分立的特征值（本征值）与本征函数**：

$$
\lambda_n = \left(\dfrac{n\pi}{L}\right)^2, \quad X_n(x) = \sin\left(\dfrac{n\pi x}{L}\right) \quad (n = 1, 2, 3, \dots)
$$

---

### 第三步：求解时间方程，构造简正模
将求得的特征值 $\lambda_n$ 代回时间常微分方程：

$$
T_n''(t) + \omega_n^2 T_n(t) = 0, \quad \text{其中 } \omega_n = v\sqrt{\lambda_n} = \dfrac{n\pi v}{L}
$$

解出时间演化为单频正弦简谐振荡：

$$
T_n(t) = A_n \cos(\omega_n t) + B_n \sin(\omega_n t)
$$

将空间本征函数与时间解相乘，得到满足方程和齐次边界的特定特解——**物理驻波简正模态 (Normal Modes)**：

$$
u_n(x, t) = X_n(x) T_n(t) = \left[ A_n \cos(\omega_n t) + B_n \sin(\omega_n t) \right] \sin\left(\dfrac{n\pi x}{L}\right)
$$

每一个驻波模态都具有固定的空间波节分布和纯粹的单色频率 $\omega_n$！

---

### 第四步：线性叠加，满足非齐次初始条件
根据线性叠加原理，一般通解由所有简正模态的无穷级数求和给出：

$$
u(x, t) = \sum_{n=1}^\infty \left[ A_n \cos(\omega_n t) + B_n \sin(\omega_n t) \right] \sin\left(\dfrac{n\pi x}{L}\right)
$$

代入初值条件：
1. 初始位移：$u(x, 0) = \sum_{n=1}^\infty A_n \sin\left(\dfrac{n\pi x}{L}\right) = \phi(x)$；
2. 初始速度：$\left.\dfrac{\partial u}{\partial t}\right|_{t=0} = \sum_{n=1}^\infty (B_n \omega_n) \sin\left(\dfrac{n\pi x}{L}\right) = \psi(x)$．

这正是本征基底 $\sin\left(\frac{n\pi x}{L}\right)$ 的**傅里叶正弦级数展开**！利用正交性直接求出振幅系数：

$$
A_n = \dfrac{2}{L} \int_0^L \phi(x) \sin\left(\dfrac{n\pi x}{L}\right) \mathrm{d}x
$$

$$
B_n = \dfrac{2}{n\pi v} \int_0^L \psi(x) \sin\left(\dfrac{n\pi x}{L}\right) \mathrm{d}x
$$

至此，定解问题获得唯一确定的解析级数通解！

---

## 2. 分离变量法通向现代物理的中枢地位

分离变量法绝不局限于笛卡尔坐标下的正弦函数：
1. **圆对称体系（柱坐标）**：拉普拉斯算子分离出的径向本征方程是 **贝塞尔方程**，导出的本征函数是 **贝塞尔函数 $J_m(kr)$**；
2. **球对称体系（球坐标）**：角向本征方程是 **勒让德方程**，本征函数是 **球谐函数 $Y_l^m(\theta, \phi)$**；
3. **量子定态薛定谔方程**：波函数做空间-时间分离 $\Psi(\boldsymbol{r}, t) = \psi(\boldsymbol{r}) e^{-iEt/\hbar}$，空间本征方程 $\hat{H}\psi = E\psi$ 就是最标准的分离变量产物！

所有这些不同的几何方程，在深层数学结构上全部统一于一个宏伟理论——**Sturm–Liouville 本征值理论**．

---

## 3. 学习衔接

- **下一节**：探索全系特殊函数本征正交性的统一母体，进入 [Sturm–Liouville 理论](../eigenfunction-methods/sturm-liouville.md)；
- **特殊函数应用**：在 [贝塞尔函数](../special-functions/bessel.md) 与 [勒让德多项式](../special-functions/legendre.md) 中掌握非直角坐标的分离变量求解．
