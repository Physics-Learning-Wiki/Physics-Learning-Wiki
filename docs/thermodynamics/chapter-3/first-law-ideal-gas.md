---
author: Physics Learning Wiki, Leafuke
---

# 热力学第一定律对理想气体的应用

在热力学中，理想气体是研究气态物质热力学性质的理想模型。热力学第一定律给出：

$$
Q = \Delta U + A
$$

对于 $\nu$ 摩尔的理想气体，内能仅是温度的函数：$\Delta U = \nu C_V \Delta T$。以下我们将讨论热力学第一定律在理想气体的几种典型准静态过程中的应用。

## 核心内容

### 等体过程

**等体过程（Isochoric process）** 是指系统体积保持不变的过程，即 $V = \text{const}$ 或 $\text{d}V = 0$。

在等体过程中，气体不对外做功，也不接收**外界的功**：

$$
A = \int_{V_1}^{V_2} p \,\text{d}V = 0
$$

根据热力学第一定律，系统吸收的热量全部用于增加系统的内能：

$$
Q_V = \Delta U = \nu C_V^{mol} (T_2 - T_1) = \nu C_V^{mol} \Delta T
$$

其中 $C_V^{mol}$ 为理想气体的摩尔定体热容。

### 等压过程

**等压过程（Isobaric process）** 是指系统压强保持不变的过程，即 $p = \text{const}$ 或 $\text{d}p = 0$。

在等压过程中，**气体对外做的功**为：

$$
{A}' = \int_{V_1}^{V_2} p \,\text{d}V = p(V_2 - V_1) = p \Delta V
$$

根据理想气体状态方程 $pV = \nu RT$，做功也可表示为 ${A}' = \nu R (T_2 - T_1) = \nu R \Delta T$。

系统在等压过程中吸收的热量为：

$$
Q_p = \nu C_p^{mol} \Delta T
$$

其中 $C_p^{mol}$ 为理想气体的摩尔定压热容。根据热力学第一定律 $Q_p = \Delta U + {A}'$，可以推导出迈耶公式（Mayer's relation）：

$$
\nu C_p^{mol} \Delta T = \nu C_V^{mol} \Delta T + \nu R \Delta T \implies C_p^{mol} = C_V^{mol} + R
$$

### 等温过程

**等温过程（Isothermal process）** 是指系统温度保持不变的过程，即 $T = \text{const}$ 或 $\text{d}T = 0$。

由于理想气体的内能仅是温度的函数，因此在等温过程中，内能变化为零：

$$
\Delta U = 0
$$

根据热力学第一定律，系统吸收的热量全部用来对外做功：

$$
Q_T = A = \int_{V_1}^{V_2} p \,\text{d}V = \int_{V_1}^{V_2} \frac{\nu RT}{V} \,\text{d}V = \nu RT \ln\frac{V_2}{V_1}
$$

由玻意耳定律 $p_1 V_1 = p_2 V_2$，做功及吸热也可表示为：

$$
Q_T = A = \nu RT \ln\frac{p_1}{p_2}
$$

### 绝热过程

**绝热过程（Adiabatic process）** 是指系统与外界没有热量交换的过程，即 $Q = 0$ 或 $\text{d}Q = 0$。

根据热力学第一定律，绝热过程中外界对系统做功等于系统内能的增加（或系统对外做功等于内能的减少）：

$$
\text{d}U + \text{d}A = 0 \implies \nu C_V^{mol} \,\text{d}T + p \,\text{d}V = 0
$$

结合理想气体状态方程微分形式 $p \,\text{d}V + V \,\text{d}p = \nu R \,\text{d}T$，可推导理想气体绝热过程方程。引入绝热指数（Adiabatic index 或热容比比热容） $\gamma = \frac{C_p^{mol}}{C_V^{mol}}$，得到 **泊松方程（Poisson's equations）**：

$$
pV^\gamma = \text{const}
$$

$$
TV^{\gamma-1} = \text{const}
$$

$$
p^{1-\gamma}T^\gamma = \text{const}
$$

在绝热过程中，气体对外做功为：

$$
A = -\Delta U = -\nu C_V^{mol} (T_2 - T_1) = \frac{\nu R}{\gamma - 1}(T_1 - T_2) = \frac{p_1 V_1 - p_2 V_2}{\gamma - 1}
$$

### 实际应用

热力学定律对理想气体的应用在诸如大气物理学等领域有着广泛且直观的体现。

#### 大气的垂直温度梯度

在对流层中，当我们假设一个干燥空气微团快速上升时，由于空气导热性极差且上升迅速，该过程可视为 **绝热膨胀** 过程。

随着高度 $z$ 增加，周围大气压强 $p$ 下降，遵守流体静力学方程 $\text{d}p = -\rho g \,\text{d}z$。利用理想气体状态方程 $\rho = \frac{pM}{RT}$ 和绝热方程 $T \propto p^{\frac{\gamma-1}{\gamma}}$ 微分形式 $\frac{\text{d}T}{T} = \frac{\gamma-1}{\gamma}\frac{\text{d}p}{p}$，我们可以得到干绝热递减率（Dry adiabatic lapse rate）：

$$
\Gamma_d = -\frac{\text{d}T}{\text{d}z} = \frac{\gamma - 1}{\gamma} \frac{Mg}{R} = \frac{g}{c_p}
$$

其中 $c_p$ 是空气的比定压热容（比热容）。对于地球干空气，此数值约为 $9.8 \,^\circ \text{C}/\text{km}$。这意味着海拔每升高 1000 米，气温大约下降 9.8 摄氏度。

#### 焚风

**焚风（Foehn wind）** 是一种常见于山脉背风坡的干热风，其形成原理是热力学过程在大气中的典型应用。

1. **迎风坡上升**：湿润气流在迎风坡被迫抬升。最初沿干绝热递减率降温，当达到露点温度后水汽凝结，释放潜热。此时空气沿 **湿绝热递减率**（较干由于凝结放热，降温较慢，约 $5 \sim 6 \,^\circ \text{C}/\text{km}$）继续降温，并在山顶附近形成降水，失去大量水分。
2. **背风坡下降**：越过山脉后，原本潮湿的空气已经干燥。在背风坡下沉过程中，气压增大，空气做绝热压缩。由于是干空气，沿 **干绝热递减率** 升温（升温快）。
3. **结果**：当气流到达背风坡山麓时，其温度比迎风坡同海拔处高得多，且因为水汽已经流失，变得异常干燥，形成“焚风”。

### 多方过程

**多方过程（Polytropic process）** 是指在过程进行期间系统摩尔热容保持不变的过程（$C_m = \text{const}$）。这是等温、等压、等体和绝热过程的一般化。

根据热力学第一定律的微分形式 $\text{d}Q = \text{d}U + \text{d}A$：

$$
\nu C_m \,\text{d}T = \nu C_V^{mol} \,\text{d}T + p \,\text{d}V
$$

结合理想气体状态方程，经过推导可得 **多方过程方程式**：

$$
pV^n = \text{const}
$$

其中 $n$ 称为 **多方指数（Polytropic index）**，其与摩尔热容的关系为：

$$
n = \frac{C_m - C_p^{mol}}{C_m - C_V^{mol}}
$$

多方过程涵盖了多种典型过程，不同 $n$ 值对应的经典热力学过程总结如下：

| 过程名称 | 摩尔热容 $C_m$ | 多方指数 $n$ | 多方方程 | 过程特征 |
| :--- | :---: | :---: | :---: | :--- |
| 等压过程 | $C_p^{mol}$ | $0$ | $p = \text{const}$ | 压强不变 |
| 等温过程 | $\pm \infty$ | $1$ | $pV = \text{const}$ | 温度不变，内能不变 |
| 绝热过程 | $0$ | $\gamma$ | $pV^\gamma = \text{const}$ | 无热交换 |
| 等体过程 | $C_V^{mol}$ | $\pm \infty$ | $V = \text{const}$ | 体积不变，对外不作功 |

多方过程对外做功公式为（其中 $n \neq 1$）：

$$
A = \int_{V_1}^{V_2} p \,\text{d}V = \frac{p_1 V_1 - p_2 V_2}{n - 1} = \frac{\nu R(T_1 - T_2)}{n - 1}
$$

??? note "例题：多方过程的功与热"
    **题目**： 1 摩尔理想气体（单原子分子，$\gamma = 1.67$，$C_V^{mol} = \frac{3}{2}R$）从初始状态 $(p_0, V_0, T_0)$ 经历多方过程膨胀至 $2V_0$，已知其多方指数 $n = 1.25$。求此过程中气体对外做的功 $A$，内能变化 $\Delta U$ 以及吸收的热量 $Q$。

    **解答**：
    由于方程为 $pV^n = \text{const}$，故状态参量的关系为 $T V^{n-1} = \text{const}$。
    末态温度 $T_2$为：
    
    $$
    T_2 = T_0 \left(\frac{V_0}{2V_0}\right)^{n-1} = T_0 (0.5)^{1.25 - 1} = T_0 (0.5)^{0.25} \approx 0.841 T_0
    $$
    
    1. 气体对外做功：
       
       $$
       A = \frac{\nu R(T_0 - T_2)}{n - 1} = \frac{1 \cdot R \cdot (T_0 - 0.841 T_0)}{1.25 - 1} = \frac{0.159 R T_0}{0.25} = 0.636 R T_0
       $$
       
    2. 内能变化：
    
       $$
       \Delta U = \nu C_V^{mol} (T_2 - T_0) = 1 \cdot \frac{3}{2}R \cdot (0.841 T_0 - T_0) = 1.5 R (-0.159 T_0) = -0.2385 R T_0
       $$
       
    3. 吸收热量（根据第一定律）：
    
       $$
       Q = \Delta U + A = -0.2385 R T_0 + 0.636 R T_0 = 0.3975 R T_0
       $$
       
       由于 $n=1.25$ 介于 $1$ (等温) 和 $\gamma \approx 1.67$ (绝热) 之间，说明尽管体积膨胀温度降低（内能减小），但气体其实还在吸热。