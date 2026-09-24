---
status: stable
author: Physics Learning Wiki Team
description: 掌握格林函数方法、点源脉冲响应思想、逆微分算子、对称互易性、本征函数谱展开法以及在静电镜像法与电动力学推迟势中的核心应用．
---

## 格林函数方法

## 物理问题引入：为什么微分方程可以变成积分卷积？

在电磁学中求解静电势时，泊松方程是一个空间偏微分方程：

$$
\nabla^2 \phi(\boldsymbol{r}) = -\dfrac{\rho(\boldsymbol{r})}{\varepsilon_0}
$$

如果你直接面对复杂的连续带电体（如带电云层、带电导体），尝试直接求解偏微分方程是极其困难的．
然而，大一普通物理就教给过我们一个积分公式：

$$
\phi(\boldsymbol{r}) = \dfrac{1}{4\pi\varepsilon_0}\iiint \dfrac{\rho(\boldsymbol{r}')}{|\boldsymbol{r} - \boldsymbol{r}'|} \mathrm{d}^3\boldsymbol{r}'
$$

**为什么一个二阶偏微分方程能够被彻底逆转为一个求和积分？** 乔治·格林 (George Green) 在 1828 年创立的 **格林函数法 (Green's Function Method)** 揭示了这种转化背后的普适数学思想：**先求单个点源的激发场，再通过连续积分线性叠加出全空间任意场源的响应！**

***

## 1. 格林函数的基本定义与代数思想

设线性自共轭微分算子为 $\mathcal{L}$，考虑带有复杂非齐次源项 $f(\boldsymbol{r})$ 的定解方程：

$$
\mathcal{L} u(\boldsymbol{r}) = f(\boldsymbol{r}) \quad (\boldsymbol{r} \in \Omega)
$$

且在边界 $\partial\Omega$ 上满足齐次边界条件（如 $\left.u\right|_{\partial\Omega} = 0$）．

### 1.1 点源响应方程

定义 **格林函数 $G(\boldsymbol{r}, \boldsymbol{r}')$** 为位于 $\boldsymbol{r}'$ 处的 **理想单位点源** 在观测点 $\boldsymbol{r}$ 所激发出的场响应：

$$
\mathcal{L}_{\boldsymbol{r}} G(\boldsymbol{r}, \boldsymbol{r}') = \delta(\boldsymbol{r} - \boldsymbol{r}')
$$

其中 $G(\boldsymbol{r}, \boldsymbol{r}')$ 在边界上满足与原问题相同的齐次边界条件．

### 1.2 积分卷积直接给出通解

利用狄拉克 $\delta$ 函数的筛选性质，任意连续物理源 $f(\boldsymbol{r})$ 均可表示为点源的连续叠加：

$$
f(\boldsymbol{r}) = \int_\Omega f(\boldsymbol{r}') \delta(\boldsymbol{r} - \boldsymbol{r}') \mathrm{d}\boldsymbol{r}'
$$

根据微分算子 $\mathcal{L}$ 的线性叠加性，总解直接由点源响应的积分卷积给出：

$$
u(\boldsymbol{r}) = \int_\Omega G(\boldsymbol{r}, \boldsymbol{r}') f(\boldsymbol{r}') \mathrm{d}\boldsymbol{r}'
$$

???+ tip "微分算子的逆运算"
    从线性代数的视角看：若将微分算子视作无限维连续矩阵 $\mathcal{L}$，方程为 $\mathcal{L} u = f$．
    则格林函数 $G$ 本质上就是微分算子的 **逆矩阵（逆算子）**：$u = \mathcal{L}^{-1} f$！

***

## 2. 格林函数的对称互易性 (Reciprocity)

由 Sturm–Liouville 自共轭性及格林第二恒等式，对于满足齐次自伴边界条件的体系，格林函数在观测点 $\boldsymbol{r}$ 与源点 $\boldsymbol{r}'$ 的对换下严格对称：

$$
G(\boldsymbol{r}, \boldsymbol{r}') = G(\boldsymbol{r}', \boldsymbol{r})
$$

**物理图像（声学与电磁学互易定理）**：
在 $\boldsymbol{r}'$ 处敲一下音叉，在 $\boldsymbol{r}$ 处测得的声压；严格等于把音叉移到 $\boldsymbol{r}$ 处敲击，在 $\boldsymbol{r}'$ 处测得的声压！

***

## 3. 本征函数展开法（谱表示）

若微分算符 $\mathcal{L}$ 对应的自共轭本征值问题已被解出：

$$
\mathcal{L} \psi_n(\boldsymbol{r}) = \lambda_n \psi_n(\boldsymbol{r})
$$

且本征函数系正交归一完备 $\int \psi_n^*(\boldsymbol{r})\psi_m(\boldsymbol{r})\mathrm{d}\boldsymbol{r} = \delta_{nm}$，根据完备性，$\delta$ 函数可展开为：

$$
\delta(\boldsymbol{r} - \boldsymbol{r}') = \sum_{n=1}^\infty \psi_n(\boldsymbol{r}) \psi_n^*(\boldsymbol{r}')
$$

尝试将格林函数按此基底展开：$G(\boldsymbol{r}, \boldsymbol{r}') = \sum_{n=1}^\infty c_n(\boldsymbol{r}') \psi_n(\boldsymbol{r})$．代入点源方程：

$$
\sum_{n=1}^\infty c_n(\boldsymbol{r}') \lambda_n \psi_n(\boldsymbol{r}) = \sum_{n=1}^\infty \psi_n(\boldsymbol{r}) \psi_n^*(\boldsymbol{r}') \implies c_n(\boldsymbol{r}') = \dfrac{\psi_n^*(\boldsymbol{r}')}{\lambda_n}
$$

由此得到格林函数的 **本征函数谱表示**：

$$
G(\boldsymbol{r}, \boldsymbol{r}') = \sum_{n=1}^\infty \dfrac{\psi_n(\boldsymbol{r}) \psi_n^*(\boldsymbol{r}')}{\lambda_n}
$$

这一公式将微分方程的求逆与线性代数的谱分解（特征值倒数求和）完美融为一体！

***

## 4. 物理经典范例

### 4.1 静电场镜像法：半空间格林函数的构造

考虑在无穷大接地导体平板（$z=0$ 面，电势 $\phi=0$）上方 $z'=d$ 处放置一点电荷 $q$．
要求解满足导体面边界的半空间格林函数，直接利用 **镜像点源构造**：

-   在实源点 $\boldsymbol{r}' = (0, 0, d)$ 放置单位正源；
-   在虚源点 $\boldsymbol{r}'' = (0, 0, -d)$ 放置单位镜像负源；

$$
G(\boldsymbol{r}, \boldsymbol{r}') = \dfrac{1}{4\pi\sqrt{x^2 + y^2 + (z - d)^2}} - \dfrac{1}{4\pi\sqrt{x^2 + y^2 + (z + d)^2}}
$$

当 $z=0$ 时，两项严格抵消，$G|_{\text{导体面}} = 0$！**普物中神乎其技的「镜像法」，本质上就是通过寻找几何对称虚源来强行满足格林函数的齐次边界条件！**

### 4.2 电动力学时变波动方程与推迟势

对于真空中四维达朗贝尔波动方程 $\square A = -\mu_0 J$，由于光速 $c$ 有限，响应必须服从因果律（响应时间 $t$ 晚于激发时间 $t'$）．
利用傅里叶变换与围道积分，解出波动方程的 **推迟格林函数 (Retarded Green's Function)**：

$$
G(\boldsymbol{r}, t; \boldsymbol{r}', t') = \dfrac{1}{4\pi |\boldsymbol{r} - \boldsymbol{r}'|} \delta\left( t - t' - \dfrac{|\boldsymbol{r} - \boldsymbol{r}'|}{c} \right)
$$

将此格林函数与电流密度 $J(\boldsymbol{r}', t')$ 卷积，立刻导出发射电磁辐射的著名 **推迟势 (Retarded Potentials)**：

$$
\boldsymbol{A}(\boldsymbol{r}, t) = \dfrac{\mu_0}{4\pi} \iiint \dfrac{\boldsymbol{J}\left(\boldsymbol{r}', t - \dfrac{|\boldsymbol{r}-\boldsymbol{r}'|}{c}\right)}{|\boldsymbol{r} - \boldsymbol{r}'|} \mathrm{d}^3\boldsymbol{r}'
$$

***

## 5. 学习衔接

-   **下一大阶段**：掌握柱坐标与球坐标下的特殊函数解法，进入 [特殊函数族导学](../special-functions/gamma-beta.md)；
-   **量子力学接口**：格林函数在量子力学微扰展开中对应 **传播子 (Propagator) 与预解算子**．
