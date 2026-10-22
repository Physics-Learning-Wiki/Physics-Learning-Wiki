---
status: review
author: Physics Learning Wiki Team
description: 探讨矢量分析核心积分定理（高斯散度定理、斯托克斯旋度定理、格林第一与第二恒等式）及其在麦克斯韦方程组微分与积分形式转换中的核心地位．
---

## 矢量积分定理与麦克斯韦方程

## 物理问题引入：如何连通「局域微分场」与「宏观通量测量」？

在经典电磁学中，物理定律往往同时拥有两种表述：

-   **微分形式（局域性）**：空间任意一点电荷密度与电场散度直接相关 $\nabla\cdot\boldsymbol{E} = \dfrac{\rho}{\varepsilon_0}$；时变磁场激发局部涡旋电场 $\nabla\times\boldsymbol{E} = -\dfrac{\partial\boldsymbol{B}}{\partial t}$；
-   **积分形式（宏观测量）**：穿过闭合曲面的总电通量等于包围的总电荷量 $\oiint \boldsymbol{E}\cdot\mathrm{d}\boldsymbol{S} = \dfrac{Q_{\text{enc}}}{\varepsilon_0}$；沿闭合导线环路的感应电动势等于穿过回路磁通量的变化率 $\oint \boldsymbol{E}\cdot\mathrm{d}\boldsymbol{r} = -\dfrac{\mathrm{d}\Phi_B}{\mathrm{d}t}$．

**这两种表述为什么能完全等价？**连接微观局域偏微分与宏观可测量积分的坚固桥梁，就是矢量微积分的**两大皇冠积分定理与格林恒等式**．

***

<a id="1-高斯散度定理-gausss-divergence-theorem"></a>

## 1. 高斯散度定理（Gauss's Divergence Theorem）

### 定理陈述

设 $V$ 为三维空间中的有界闭区域，边界曲面 $S = \partial V$ 是分块光滑的闭合曲面，外法线方向取为正方向．
若矢量场 $\boldsymbol{F}(\boldsymbol{r})$ 及其一阶偏导数在 $V$ 上连续，则：

$$
\oiint_S \boldsymbol{F} \cdot \mathrm{d}\boldsymbol{S} = \iiint_V (\nabla \cdot \boldsymbol{F}) \, \mathrm{d}V
$$

**物理直观**：

-   闭合曲面内无穷多个无限小微元各自向外喷发的净源通量，在相邻界面处相互抵消；
-   最终只有边界曲面上的净溢出通量得以幸存！曲面总通量等于体内部全部散度源的代数积分．

### 麦克斯韦高斯定理的推导

将 $\boldsymbol{F} = \boldsymbol{E}$ 代入，右端利用微观高斯方程 $\nabla\cdot\boldsymbol{E} = \dfrac{\rho}{\varepsilon_0}$：

$$
\oiint_S \boldsymbol{E} \cdot \mathrm{d}\boldsymbol{S} = \iiint_V \dfrac{\rho(\boldsymbol{r})}{\varepsilon_0} \mathrm{d}V = \dfrac{1}{\varepsilon_0} Q_{\text{enclosed}}
$$

这里以微分高斯方程作为物理前提，再由散度定理得到积分形式．散度定理本身是数学恒等关系，不能单独给出电荷与电场之间的经验源项．点电荷奇点不能直接代入要求光滑的定理，应挖去奇点后处理其边界贡献，或使用分布意义的表达．

***

<a id="2-斯托克斯旋度定理-stokes-curl-theorem"></a>

## 2. 斯托克斯旋度定理（Stokes' Curl Theorem）

### 定理陈述

设 $S$ 为分块光滑的开曲面，其边界 $\partial S = C$ 为分段光滑的简单闭合曲线，曲线方向与曲面法向量 $\hat{n}$ 满足右手螺旋法则．
若矢量场 $\boldsymbol{F}(\boldsymbol{r})$ 在 $S$ 及其边界上连续可微，则：

$$
\oint_C \boldsymbol{F} \cdot \mathrm{d}\boldsymbol{r} = \iint_S (\nabla \times \boldsymbol{F}) \cdot \mathrm{d}\boldsymbol{S}
$$

**物理直观**：

-   曲面上每一个微小网格单元沿边界环流流动，相邻网格的内边流动反向抵消；
-   最终全曲面各点局域漩涡强度的通量总和，精确等于最外圈宏观回路的总环流！

### 法拉第电磁感应定律的推导

对空间中固定的曲面与回路，将 $\boldsymbol{F} = \boldsymbol{E}$ 代入，利用局域法拉第方程 $\nabla\times\boldsymbol{E} = -\dfrac{\partial\boldsymbol{B}}{\partial t}$：

$$
\oint_C \boldsymbol{E} \cdot \mathrm{d}\boldsymbol{r} = \iint_S \left(-\dfrac{\partial\boldsymbol{B}}{\partial t}\right) \cdot \mathrm{d}\boldsymbol{S} = -\dfrac{\mathrm{d}}{\mathrm{d}t}\iint_S \boldsymbol{B} \cdot \mathrm{d}\boldsymbol{S} = -\dfrac{\mathrm{d}\Phi_B}{\mathrm{d}t}
$$

固定回路的环流等于磁通量变化率的负值．若回路运动，还须处理运动边界及磁力项，不能直接照搬上述换序步骤．静电情形的旋度为零；从局部旋度零进一步推出全局单值势，还需要单连通等区域条件，或另行确认所有闭合回路的积分均为零．

***

<a id="3-格林恒等式-greens-identities"></a>

## 3. 格林恒等式（Green's Identities）

将高斯散度定理应用于标量场与梯度场的乘积 $\boldsymbol{F} = \psi \nabla\phi$，利用矢量微商积法则：

$$
\nabla\cdot(\psi \nabla\phi) = \nabla\psi \cdot \nabla\phi + \psi \nabla^2\phi
$$

代入散度定理，即得到 **格林第一恒等式（Green's First Identity）**：

$$
\oiint_S \psi \dfrac{\partial\phi}{\partial n} \mathrm{d}S = \iiint_V \left( \nabla\psi \cdot \nabla\phi + \psi \nabla^2\phi \right) \mathrm{d}V
$$

交换 $\psi$ 与 $\phi$ 的角色相减，立刻得到著名的 **格林第二恒等式（Green's Second Identity）**：

$$
\oiint_S \left( \psi \dfrac{\partial\phi}{\partial n} - \phi \dfrac{\partial\psi}{\partial n} \right) \mathrm{d}S = \iiint_V \left( \psi \nabla^2\phi - \phi \nabla^2\psi \right) \mathrm{d}V
$$

???+ tip "格林恒等式的静电应用"
    1.  **静电场唯一性**：令两解之差为 $w$，并在第一恒等式中取两个标量均为 $w$．相同源使 $\nabla^2w=0$，相容的导体和外边界数据使边界项消失，于是 $\int |\nabla w|^2\,\mathrm{d}V=0$，得到电场相同．固定导体净电荷与固定电势需分别说明边界项为何消失，完整推导见 [静电边值问题唯一性](../../electromagnetism/chapter-3/uniqueness.md)．
    2.  **Green 函数表示**：第二恒等式可以把势表示成源积分与边界积分．须先指定 Green 函数满足的源项归一化和边界条件，不能省略源项或认为数学恒等式自动给出所有边值解．详见 [格林函数方法](../eigenfunction-methods/greens-function.md)．

***

## 4. 学习衔接

-   **前驱复习**：算子形式定义与几何直观，参见 [梯度、散度与旋度](./operators.md)；
-   **微分方程出口**：偏微分方程与点源响应，进入 [格林函数方法](../eigenfunction-methods/greens-function.md)．
