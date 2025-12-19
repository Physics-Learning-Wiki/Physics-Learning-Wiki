author: Leafuke

## 简谐波（Harmonic Waves）

“简谐波”指在空间与时间上呈正弦（或余弦）形式的波，是线性波动中最基本的解。
它既是理解波动方程、波速、相速度/群速度、干涉衍射等现象的基石，也是把一般波形分解为频率分量（傅里叶分析）的核心对象。

## 0. 什么是波动

波动是自然界中一种普遍存在的现象，它描述了某种扰动在空间和时间上的传播。我们在日常生活中可以观察到许多波动的例子：

- **水波**：当一颗石子投入平静的湖面时，水面会出现一圈圈向外扩散的波纹，这就是水波。
- **声波**：我们通过空气中的声波听到声音。声波是由物体振动引起的空气分子密度的周期性变化。
- **光波**：太阳光穿过窗户照亮房间，光波是一种电磁波，它不需要介质也能传播。
- **地震波**：地震发生时，地壳的震动会以波的形式传播，形成地震波。

波动的本质是能量的传播，而不是物质的移动。例如，当水波传播时，水分子只是围绕其平衡位置做上下或前后的振动，而不是随着波一起移动。

波动可以分为两大类：

1. **机械波**：需要介质传播的波，例如水波、声波和地震波。机械波的传播依赖于介质中粒子的相互作用。
2. **电磁波**：不需要介质也能传播的波，例如光波、无线电波和X射线。电磁波是由电场和磁场相互作用形成的。

波动的基本特性包括：

- **振幅**：描述波动的强度。
- **波长**：相邻两个波峰或波谷之间的距离。
- **频率**：每秒内波动完成的周期数。
- **波速**：波在介质中传播的速度。

通过研究波动，我们能够理解许多自然现象的规律，例如声音的传播、光的折射与干涉、地震的成因等。波动也是现代科技的基础，例如无线通信、激光技术和医学成像等领域都依赖于对波动的深入理解。

## 1. 一维简谐行波的表达式

沿 $x$ 轴传播的简谐行波可写为

$$
y(x,t)=A\cos(\omega t - kx+\varphi).
$$

- $A$：振幅
- $k$：波数
- $\omega$：角频率
- $\varphi$：初相位

波长与周期：

$$
\lambda=\frac{2\pi}{k},\quad T=\frac{2\pi}{\omega},\quad f=\frac{1}{T}.
$$

我们可以用**相位传输法**来理解这个简谐波的方程。对于一个从原点开始上下振动的波源，其振动表达式为 $y(0,t)=A\cos(\omega t+\varphi)$。当波源在时间 $t$ 处于某一相位时，距离波源 $x$ 处的点需要等到时间 $t+\frac{x}{v}$ 才能感受到这个相位的变化（其中 $v$ 是波速）。因此，距离 $x$ 处的点的振动可以表示为：

$$
y(x,t) = A\cos\left(\omega \left(t - \frac{x}{v}\right) + \varphi\right)
$$

令 $k=\frac{\omega}{v}$，则得到简谐波的标准形式：

$$
y(x,t)=A\cos(\omega t - kx+\varphi)
$$

更一般地，如果这个波源位于 $x=x_0$，则振动表达式为

$$
y(x,t) = A\cos\left(\omega t - k(x-x_0) + \varphi\right)
$$

**相速度（phase velocity）**：保持相位 $\omega t-kx+\varphi=\text{常数}$，得

$$
 v_p=\frac{dx}{dt}=\frac{\omega}{k}.
$$

若改为 $kx+\omega t$，则表示向 $-x$ 传播。

??? note "相位的理解"
    相位相同意味着“波形上相同位置”（如同一个波峰）。相速度描述波形特征点移动的速度，不一定等于能量或信息传递速度（色散介质中尤为重要）。

## 2. 由波动方程得到简谐波

一维无耗散波动方程（波速 $v$）

$$
\frac{\partial^2 y}{\partial t^2}=v^2\frac{\partial^2 y}{\partial x^2}.
$$

代入试探解 $y=A\cos(kx-\omega t)$：

$$
\frac{\partial^2 y}{\partial t^2}=-\omega^2 A\cos(kx-\omega t),\quad
\frac{\partial^2 y}{\partial x^2}=-k^2 A\cos(kx-\omega t).
$$

满足方程需要

$$
\omega^2=v^2k^2\quad\Rightarrow\quad \omega=vk.
$$

因此

$$
 v_p=\frac{\omega}{k}=v.
$$

**结论**：在“无色散”的理想介质中，相速度等于波动方程中的波速 $v$。

## 3. 叠加与相位差：干涉的最小模型

两列同频同方向简谐波叠加：

$$
\begin{aligned}
 y_1 &= A\cos(kx-\omega t),\\
 y_2 &= A\cos(kx-\omega t+\Delta\varphi).
\end{aligned}
$$

则

$$
 y=y_1+y_2=2A\cos\left(\frac{\Delta\varphi}{2}\right)\cos\left(kx-\omega t+\frac{\Delta\varphi}{2}\right).
$$

合成振幅

$$
A_{\text{res}}=2A\left|\cos\left(\frac{\Delta\varphi}{2}\right)\right|.
$$

若相位差来自程差 $\Delta x$：$\Delta\varphi=k\Delta x=\frac{2\pi}{\lambda}\Delta x$。

- 增强干涉：$\Delta\varphi=2m\pi \Leftrightarrow \Delta x=m\lambda$
- 相消干涉：$\Delta\varphi=(2m+1)\pi \Leftrightarrow \Delta x=(m+\tfrac12)\lambda$

## 4. 驻波（Standing Waves）

两列同频同振幅、相向传播的行波叠加：

$$
\begin{aligned}
 y_1&=A\cos(kx-\omega t),\\
 y_2&=A\cos(kx+\omega t).
\end{aligned}
$$

相加得到

$$
 y=2A\cos(kx)\cos(\omega t).
$$

这就是驻波：

- 空间因子：$2A\cos(kx)$ 决定各点振幅
- 时间因子：$\cos(\omega t)$ 表示各点同频振动

### 4.1 波节与波腹

- 波节（node）：$\cos(kx)=0 \Rightarrow kx=(m+\tfrac12)\pi$

$$
 x=\left(m+\frac12\right)\frac{\lambda}{2}
$$

- 波腹（antinode）：$|\cos(kx)|=1 \Rightarrow kx=m\pi$

$$
 x=m\frac{\lambda}{2}.
$$

### 4.2 弦的固有频率（两端固定）

长度 $L$ 的弦两端固定：$y(0,t)=y(L,t)=0$。
驻波形式 $y=2A\sin(kx)\cos(\omega t)$（换用 $\sin$ 更满足边界），则

$$
\sin(kL)=0\Rightarrow k_n=\frac{n\pi}{L},\quad n=1,2,3,\dots
$$

频率

$$
 f_n=\frac{\omega_n}{2\pi}=\frac{v k_n}{2\pi}=\frac{nv}{2L}.
$$

其中弦波速 $v=\sqrt{T/\mu}$（张力 $T$、线密度 $\mu$），推导见 [连续介质中的波](wave-in-continuous-medium.md)。

## 5. 色散与群速度（进阶但常用）

若介质满足色散关系 $\omega=\omega(k)$，则

- 相速度：

$$
 v_p=\frac{\omega}{k}
$$

- 群速度（波包包络速度）：

$$
 v_g=\frac{d\omega}{dk}.
$$

### 5.1 两个近波数分量的波包推导

取两列波数接近的简谐波：

$$
\begin{aligned}
 y_1 &= A\cos(k_1x-\omega_1 t),\\
 y_2 &= A\cos(k_2x-\omega_2 t),
\end{aligned}
$$

相加得

$$
 y=2A\cos\left(\frac{\Delta k}{2}x-\frac{\Delta\omega}{2}t\right)
\cos\left(\bar k x-\bar\omega t\right),
$$

其中 $\Delta k=k_1-k_2$，$\Delta\omega=\omega_1-\omega_2$，$\bar k=(k_1+k_2)/2$，$\bar\omega=(\omega_1+\omega_2)/2$。

包络相位保持常数给出包络传播速度

$$
 v_{\text{env}}=\frac{\Delta\omega}{\Delta k}\xrightarrow[\Delta k\to 0]{}\frac{d\omega}{dk}=v_g.
$$


## 6. 简谐波的能量

### 6.1 质元的能量
波传播时，介质质元在振动，具有动能与势能。以弦波为例，弦上质元密度 $\rho$，取一体积为 $\Delta V$ 的质元，质元质量 $m=\rho \Delta V$。

设该质元的振动表达式为

$$
y=A\cos(\omega t - kx),
$$

则质元速度

$$
v_y=\frac{\partial y}{\partial t}=-\omega A\sin(\omega t - kx)
$$

接下来我们证明质元的动能和势能具有相同的形式。

??? note "证明过程"

    质元的动能为：

    $$
    \Delta E_k = \frac{1}{2} m v_y^2 = \frac{1}{2} \rho \Delta V \omega^2 A^2 \sin^2(\omega t - kx).
    $$

    接下来计算质元的势能。考虑弦波中长度为 $\Delta x$ 的一小段弦，其原长为 $\Delta x$。当波传播时，该弦段发生形变，长度变为 $\Delta s$。弦的张力为 $T$，且在小振动下视为常量。势能等于张力乘以伸长量，即

    $$
    \Delta E_p = T (\Delta s - \Delta x).
    $$

    计算伸长量 $\Delta s - \Delta x$。弦段两端点的横向位移分别为 $y(x,t)$ 和 $y(x+\Delta x, t)$，纵向位移忽略不计（横波）。弦段长度近似为

    $$
    \Delta s = \sqrt{(\Delta x)^2 + (\Delta y)^2} \approx \Delta x \left[ 1 + \frac{1}{2}\left( \frac{\partial y}{\partial x} \right)^2 \right],
    $$

    其中 $\Delta y = y(x+\Delta x,t) - y(x,t) \approx \frac{\partial y}{\partial x} \Delta x$。因此，

    $$
    \Delta s - \Delta x \approx \frac{1}{2} \left( \frac{\partial y}{\partial x} \right)^2 \Delta x.
    $$

    代入势能表达式得

    $$
    \Delta E_p \approx \frac{1}{2} T \left( \frac{\partial y}{\partial x} \right)^2 \Delta x.
    $$

    对于给定的波函数 $y = A \cos(\omega t - kx)$，求偏导得

    $$
    \frac{\partial y}{\partial x} = -k A \sin(\omega t - kx),
    $$

    所以

    $$
    \left( \frac{\partial y}{\partial x} \right)^2 = k^2 A^2 \sin^2(\omega t - kx).
    $$

    弦上横波的波速 $v$ 满足 $v = \sqrt{T / \rho}$，其中 $\rho$ 为弦的体密度（若弦的横截面积为 $S$，则线密度 $\mu = \rho S$，波速也可表示为 $v = \sqrt{T / \mu}$）。因此 $T = \rho v^2$。另外，波数 $k$ 与角频率 $\omega$ 满足 $\omega = v k$，即 $v = \omega / k$。

    将 $T$ 和 $\left( \frac{\partial y}{\partial x} \right)^2$ 代入 $\Delta E_p$：
    $$
    \Delta E_p = \frac{1}{2} \rho v^2 \cdot k^2 A^2 \sin^2(\omega t - kx) \Delta x = \frac{1}{2} \rho \frac{\omega^2}{k^2} \cdot k^2 A^2 \sin^2(\omega t - kx) \Delta x = \frac{1}{2} \rho \omega^2 A^2 \sin^2(\omega t - kx) \Delta x.
    $$

    注意到质元的体积 $\Delta V = S \Delta x$，其中 $S$ 为弦的横截面积。代入上式得
    $$
    \Delta E_p = \frac{1}{2} \rho \omega^2 A^2 \sin^2(\omega t - kx) \Delta V.
    $$

    这与动能表达式 $\Delta E_k = \frac{1}{2} \rho \Delta V \omega^2 A^2 \sin^2(\omega t - kx)$ 形式完全相同。因此，质元的动能和势能具有相同的形式，且同步变化。

    证明完毕。

我们发现，对于单个质元，$ \Delta E_k + \Delta E_p \ne \text{const} $ ，这是因为波在传播过程中，能量在不同质元之间传递。所以对于整个振动系统，机械能依然是守恒的。

### 6.2 能量密度与能流

单位体积中波的能量称为**能量密度** $w$：

$$
w=w_k+w_p=\frac{\Delta E_k+\Delta E_p}{\Delta V}=\rho \omega^2 A^2 \sin^2(\omega t - kx)
$$

时间平均能量密度：

$$
\langle w \rangle = \frac{1}{T}\int_0^T w \, dt = \frac{1}{T} \int_0^T \rho \omega^2 A^2 \sin^2(\omega t - kx) \, dt = \frac{1}{2} \rho \omega^2 A^2
$$

单位时间通过垂直于波传播方向某一面积的能量称为通过该面积的**能流** $P$ （单位为瓦特，$W$）：

$$
P=w v_p S=\rho \omega^2 A^2 v \sin^2(\omega t - kx) S
$$

时间平均能流：

$$
\langle P \rangle = \frac{1}{T} \int_0^T P \, dt = \frac{1}{T} \int_0^T \rho \omega^2 A^2 v \sin^2(\omega t - kx) S \, dt = \frac{1}{2} \rho \omega^2 A^2 v S
$$

把平均能流除以面积 $S$，得到**能流密度** $I$，也把它称为波的**强度**：

$$
I=\frac{\langle P \rangle}{S}=\frac{1}{2} \rho \omega^2 A^2 v_p
$$

### 6.3 

如果波不被介质吸收，那么在单位时间内穿过任意波面的能量是相等的，于是我们有：

$$
I_1 S_1 = I_2 S_2
$$

- 平面波：$ S_1=S_2 $，则 $ I_1=I_2 $，强度不变。$ A = \text{const} $
- 球面波：$ S=4\pi r^2 $，则 $ I \propto \frac{1}{r^2} $，强度与距离平方成反比。$ A \propto \frac{1}{r} $
- 柱面波：$ S=2\pi r h $，则 $ I \propto \frac{1}{r} $，强度与距离成反比。$ A \propto \frac{1}{\sqrt{r}} $

## 6. 能量与强度（不同介质形式略有差异）

对具体介质（弦、声波、电磁波），能量密度与能流表达不同，但共同点是：

- 强度 $I$ 往往与振幅平方成正比：$I\propto A^2$。
- 线性无耗散下，时间平均能流与群速度相关（进阶结论）。

声波与弦波的能量推导可在 [连续介质中的波](wave-in-continuous-medium.md) 中找到。
