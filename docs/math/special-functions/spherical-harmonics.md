---
status: stable
author: Physics Learning Wiki Team
description: 探讨球谐函数定义、单位球面正交归一完备性、加法定理、空间旋转对称性以及在量子力学轨道角动量算符与原子轨道波函数中的核心地位．
---

## 球谐函数与中心势场

## 物理问题引入：如何描述球面上任意起伏的物理场？

我们在地球表面测量的重力场异常、地球物理地磁场模型、宇宙学中普朗克卫星绘制的 **宇宙微波背景辐射 (CMB) 各向异性天图**，以及化学物理中原子外层电子云的角向分布，都是定义在二维球面 $S^2$ 上的函数 $f(\theta, \phi)$．
在平面上，我们可以用二维傅里叶级数 $\sum c_{nm} e^{i(k_x x + k_y y)}$ 将任意波形分解为平面波；**但在一个处处弯曲、闭合且具有三维空间旋转不变性（$SO(3)$ 对称性）的球面上，正交完备的「球面傅里叶基底」是什么？** 答案就是 **球谐函数 (Spherical Harmonics,$Y_l^m(\theta, \phi)$)**．

***

## 1. 球谐函数的数学定义

球谐函数是拉普拉斯算符在球坐标系下 **纯角向部分** 的共同本征函数：

$$
Y_l^m(\theta, \phi) = \sqrt{ \dfrac{2l + 1}{4\pi} \dfrac{(l - m)!}{(l + m)!} } P_l^m(\cos\theta) e^{im\phi}
$$

-   **角量子数（阶数）$l$**：非负整数 $l = 0, 1, 2, 3, \dots$（对应原子物理中的 $s, p, d, f$ 轨道）；
-   **磁量子数（次数）$m$**：整数，受限于 $-l \le m \le l$（每个 $l$ 对应 $2l + 1$ 个独立模态）；
-   $P_l^m(\cos\theta)$ 为连带勒让德多项式；
-   前面根号因子为使单位球面模长为 1 的归一化常数（相角遵循 Condon–Shortley 相位约定）．

共轭对称性：$Y_l^{-m}(\theta, \phi) = (-1)^m [Y_l^m(\theta, \phi)]^*$．

***

## 2. 正交归一性与球面完备性

球谐函数在整个单位立体角 $\mathrm{d}\Omega = \sin\theta\,\mathrm{d}\theta\,\mathrm{d}\phi$ 上构成严格正交归一完备基：

$$
\int_0^{2\pi} \mathrm{d}\phi \int_0^\pi \sin\theta \, \mathrm{d}\theta \, [Y_l^m(\theta, \phi)]^* Y_{l'}^{m'}(\theta, \phi) = \delta_{ll'} \, \delta_{mm'}
$$

### 球面广义傅里叶展开

定义在球面上的任意物理场 $f(\theta, \phi)$，均可唯一展开为球谐级数：

$$
f(\theta, \phi) = \sum_{l=0}^\infty \sum_{m=-l}^l a_{lm} Y_l^m(\theta, \phi)
$$

展开系数（球面多极矩振幅）通过内积投影直接提取：

$$
a_{lm} = \int_{S^2} f(\theta, \phi) [Y_l^m(\theta, \phi)]^* \mathrm{d}\Omega
$$

在现代宇宙学中，CMB 温度起伏的 **角功率谱**  $C_l = \dfrac{1}{2l+1}\sum_{m=-l}^l |a_{lm}|^2$ 正是这一展开的直接实验测量！

***

## 3. 球谐函数加法定理 (Addition Theorem)

设空间中有两个方向矢量 $\hat{n}_1 = (\theta_1, \phi_1)$ 与 $\hat{n}_2 = (\theta_2, \phi_2)$，两者夹角为 $\gamma$（满足 $\cos\gamma = \hat{n}_1 \cdot \hat{n}_2$）．**加法定理** 指出：夹角 $\gamma$ 的普通勒让德多项式可以被神奇地双线性展开为两个方向各自球谐函数的标量积：

$$
P_l(\cos\gamma) = \dfrac{4\pi}{2l + 1} \sum_{m=-l}^l Y_l^m(\theta_1, \phi_1) [Y_l^m(\theta_2, \phi_2)]^*
$$

这一公式使得在计算三维任意空间电荷分布产生的相互作用库仑势或多极辐射时，观测点坐标与源点坐标被彻底解耦，是格林函数谱展开与多极展开的杀手级公式．

***

## 4. 量子力学轨道角动量算符的本征态

在量子力学中，轨道角动量算符 $\hat{\boldsymbol{L}} = \boldsymbol{r} \times \hat{\boldsymbol{p}} = -i\hbar (\boldsymbol{r} \times \nabla)$．
其模长平方算符 $\hat{\boldsymbol{L}}^2$ 和 $z$ 方向投影算符 $\hat{L}_z$ 在球坐标下写为纯角向微分算子：

$$
\hat{\boldsymbol{L}}^2 = -\hbar^2 \left[ \dfrac{1}{\sin\theta}\dfrac{\partial}{\partial\theta}\left(\sin\theta\dfrac{\partial}{\partial\theta}\right) + \dfrac{1}{\sin^2\theta}\dfrac{\partial^2}{\partial\phi^2} \right]
$$

$$
\hat{L}_z = -i\hbar \dfrac{\partial}{\partial\phi}
$$

直接作用于球谐函数，惊人地发现：

$$
\hat{\boldsymbol{L}}^2 Y_l^m(\theta, \phi) = \hbar^2 l(l+1) Y_l^m(\theta, \phi)
$$

$$
\hat{L}_z Y_l^m(\theta, \phi) = \hbar m Y_l^m(\theta, \phi)
$$

???+ tip "球谐函数就是轨道角动量的本征态矢量"
    球谐函数不仅是一套正交函数，它就是量子态空间中角动量大小为 $\hbar\sqrt{l(l+1)}$、且 $z$ 轴投影为 $m\hbar$ 的 **量子本征波函数态矢 $|l, m\rangle$**！
    
    -   $l=0$（$s$ 轨道）：球对称球形分布，无角动量；
    -   $l=1$（$p$ 轨道）：哑铃形三个方向波瓣（$p_x, p_y, p_z$ 对应 $m = 0, \pm 1$ 的线性组合）；
    -   $l=2$（$d$ 轨道）：四叶草形空间轨道．

***

## 5. 学习衔接

-   **下一节**：柱对称几何中的波动与振动，进入 [贝塞尔函数](./bessel.md)；
-   **量子径向衔接**：氢原子波函数的径向方程解，参见 [连带拉盖尔多项式](./laguerre.md)．
