author: ChatGPT

## 线性振动（Linear Oscillations）

线性振动研究“在平衡位置附近的小振幅运动”。其核心特征是：

- 恢复力（或回复力矩）对位移近似成正比：$F\approx-kx$。
- 阻尼力对速度近似成正比：$F_d\approx-b\dot x$。
- 外驱动力若存在，可写为已知函数 $F(t)$（常见为简谐驱动）。

线性模型的强大之处在于：**可解、可叠加、可用频域方法统一处理**。本页覆盖单自由度线性振动的主干内容：简谐振动、阻尼振动、受迫振动与共振。

??? note "本章导航"
	- [振动的合成与分解](superposition.md)
	- [非线性振动](nonlinear.md)
	- [简谐波](harmonic-wave.md)
	- [连续介质中的波](wave-in-continuous-medium.md)
	- [多普勒效应](doppler-effect.md)

## 0. 建模：单自由度线性振子

设质点位移为 $x(t)$，平衡位置取 $x=0$。线性弹簧与线性阻尼下：

$$
m\ddot x+b\dot x+kx=F(t).
$$

定义三个常用参数：

$$
\omega_0=\sqrt{\frac{k}{m}},\quad
2\gamma=\frac{b}{m},\quad
f(t)=\frac{F(t)}{m}.
$$

则方程写成标准形式

$$
\ddot x+2\gamma\dot x+\omega_0^2 x=f(t).
$$

其中 $\omega_0$ 是无阻尼固有角频率，$\gamma$ 描述阻尼强度。

## 1. 无阻尼自由振动：简谐振动的推导

当 $b=0$ 且 $F(t)=0$：

$$
m\ddot x+kx=0\quad\Rightarrow\quad \ddot x+\omega_0^2 x=0.
$$

### 1.1 解的形式

试探 $x=e^{rt}$：

$$
r^2+\omega_0^2=0\Rightarrow r=\pm i\omega_0.
$$

因此通解可写为

$$
x(t)=C_1\cos(\omega_0 t)+C_2\sin(\omega_0 t)
=A\cos(\omega_0 t+\varphi).
$$

速度与加速度：

$$
\dot x=-A\omega_0\sin(\omega_0 t+\varphi),\quad
\ddot x=-\omega_0^2 x.
$$

### 1.2 “线性”为什么重要

线性意味着：

- 方程的解空间是线性的（可做线性组合）。
- 同频激励产生同频响应（稳态下尤为明显）。
- 复杂振动可分解为简谐分量再叠加，详见 [振动的合成与分解](superposition.md)。

## 2. 能量观点：等分与守恒

无阻尼自由振动中，动能与势能分别为

$$
K=\frac12 m\dot x^2,\quad U=\frac12 kx^2=\frac12 m\omega_0^2 x^2.
$$

总能量

$$
E=K+U=\frac12 m\dot x^2+\frac12 m\omega_0^2 x^2.
$$

对时间求导：

$$
\dot E=m\dot x\ddot x+m\omega_0^2 x\dot x
=m\dot x(\ddot x+\omega_0^2 x)=0.
$$

所以 $E$ 守恒。

对 $x=A\cos(\omega_0 t+\varphi)$，可得

$$
E=\frac12 kA^2.
$$

时间平均满足能量等分（这里指周期平均）：

$$
\langle K\rangle=\langle U\rangle=\frac{E}{2}.
$$

??? note "例题：由能量求速度"
	质点做简谐振动，振幅 $A$，位移为 $x$ 时速度大小是多少？

	**解：**能量守恒

	$$
	\frac12 m v^2+\frac12 kx^2=\frac12 kA^2
	$$

	得

	$$
	v=\omega_0\sqrt{A^2-x^2}.
	$$

## 3. 阻尼自由振动（Damped Free Oscillation）

令 $F(t)=0$，得到

$$
\ddot x+2\gamma\dot x+\omega_0^2 x=0.
$$

试探 $x=e^{rt}$：

$$
r^2+2\gamma r+\omega_0^2=0
\Rightarrow r=-\gamma\pm\sqrt{\gamma^2-\omega_0^2}.
$$

根据判别式大小分三类。

### 3.1 欠阻尼（$\gamma<\omega_0$）

令

$$
\omega_d=\sqrt{\omega_0^2-\gamma^2},
$$

则

$$
x(t)=Ae^{-\gamma t}\cos(\omega_d t+\varphi).
$$

振幅按 $e^{-\gamma t}$ 衰减，振动角频率从 $\omega_0$ 降为 $\omega_d$。

**对数减量**（衡量衰减）：若相邻两个峰值间隔约为 $T_d=2\pi/\omega_d$，则

$$
\delta=\ln\frac{x(t)}{x(t+T_d)}\approx \gamma T_d=\frac{2\pi\gamma}{\omega_d}.
$$

### 3.2 临界阻尼（$\gamma=\omega_0$）

根为重根 $r=-\omega_0$，通解

$$
x(t)=(C_1+C_2 t)e^{-\omega_0 t}.
$$

此时系统回到平衡位置最快且不振荡。

### 3.3 过阻尼（$\gamma>\omega_0$）

两个实根均为负，通解为两个指数衰减项叠加：

$$
x(t)=C_1e^{r_1 t}+C_2e^{r_2 t},\quad r_{1,2}=-\gamma\pm\sqrt{\gamma^2-\omega_0^2}.
$$

同样不发生振荡。

### 3.4 阻尼下的能量衰减

从原方程乘以 $m\dot x$：

$$
m\dot x\ddot x+b\dot x^2+kx\dot x=0.
$$

前两项与第三项可组合为能量导数：

$$
\frac{d}{dt}\left(\frac12 m\dot x^2+\frac12 kx^2\right)=-b\dot x^2\le 0.
$$

因此阻尼以功率 $b\dot x^2$ 消耗机械能。

## 4. 简谐受迫振动（Driven Oscillation）

考虑最常见外力

$$
F(t)=F_0\cos(\Omega t),\quad f(t)=\frac{F_0}{m}\cos(\Omega t).
$$

方程

$$
\ddot x+2\gamma\dot x+\omega_0^2 x=\frac{F_0}{m}\cos(\Omega t).
$$

总解 = 齐次解（暂态）+ 特解（稳态）。暂态随时间衰减，长时间后只剩稳态响应。

### 4.1 复数法求稳态特解

用复表示：取驱动 $\Re\{(F_0/m)e^{i\Omega t}\}$，设稳态响应

$$
x_p(t)=\Re\{\tilde X e^{i\Omega t}\}.
$$

代入得

$$
(-\Omega^2+2i\gamma\Omega+\omega_0^2)\tilde X=\frac{F_0}{m}.
$$

因此

$$
	ilde X=\frac{F_0/m}{\omega_0^2-\Omega^2+2i\gamma\Omega}.
$$

稳态振幅 $A(\Omega)$ 与相位滞后 $\delta(\Omega)$ 由

$$
	ilde X=Ae^{-i\delta}
$$

给出：

$$
A(\Omega)=\frac{F_0/m}{\sqrt{(\omega_0^2-\Omega^2)^2+(2\gamma\Omega)^2}},
$$

$$
	an\delta=\frac{2\gamma\Omega}{\omega_0^2-\Omega^2}.
$$

于是稳态响应可写为

$$
x_p(t)=A\cos(\Omega t-\delta).
$$

### 4.2 共振与共振频率

振幅随 $\Omega$ 的峰值称共振。对欠阻尼（$\gamma\ll\omega_0$），最大振幅出现在

$$
\Omega_r\approx\sqrt{\omega_0^2-2\gamma^2}\approx \omega_0\quad(\gamma\ll\omega_0).
$$

在 $\Omega=\omega_0$ 时（常称“驱动频率等于固有频率”）

$$
A(\omega_0)=\frac{F_0/m}{2\gamma\omega_0}.
$$

可见阻尼越小（$\gamma$ 越小），共振峰越高。

### 4.3 功率与带宽（品质因数）

稳态下外力做功的平均功率等于阻尼耗散的平均功率。

阻尼耗散功率：

$$
P_d=b\dot x^2.
$$

对 $x=A\cos(\Omega t-\delta)$，有 $\dot x=-A\Omega\sin(\Omega t-\delta)$，故周期平均

$$
\langle P_d\rangle=b\langle \dot x^2\rangle=b\cdot\frac12A^2\Omega^2.
$$

在弱阻尼近共振时，定义品质因数

$$
Q=\frac{\omega_0}{2\gamma}.
$$

也可用“半功率带宽”近似描述：

$$
\Delta\Omega\approx\frac{\omega_0}{Q}=2\gamma
\quad(\gamma\ll\omega_0).
$$

直观理解：$Q$ 越大，共振峰越尖锐，系统对频率更“挑剔”。

??? note "例题：由共振峰估算阻尼"
	实验测得受迫振动在 $\Omega=100\,\text{rad/s}$ 附近共振，半功率点频率约为 $\Omega_1=98\,\text{rad/s}$、$\Omega_2=102\,\text{rad/s}$。估算 $\gamma$ 与 $Q$。

	**解：**

	$$
	\Delta\Omega=\Omega_2-\Omega_1\approx 4\,\text{rad/s}\approx 2\gamma
	$$

	得 $\gamma\approx 2\,\text{s}^{-1}$。

	$$
	Q\approx\frac{\omega_0}{2\gamma}\approx\frac{100}{4}=25.
	$$

## 5. 暂态 + 稳态：为什么“久了只剩稳态”

受迫振动的通解

$$
x(t)=x_h(t)+x_p(t).
$$

- $x_h(t)$ 为齐次解（阻尼自由振动），含因子 $e^{-\gamma t}$（欠阻尼时）。
- $x_p(t)$ 为稳态特解，频率等于驱动频率 $\Omega$。

因此当 $t\gg 1/\gamma$，$x_h$ 衰减到很小，实验上看到的就是稳态响应。

## 6. 典型模型：单摆的小角近似

长度为 $\ell$ 的单摆，在小角度 $|\theta|\ll 1$ 时，回复力矩

$$
	au\approx -mg\ell\,\theta.
$$

转动方程（转动惯量 $I=m\ell^2$）：

$$
I\ddot\theta=\tau\Rightarrow m\ell^2\ddot\theta+mg\ell\,\theta=0.
$$

得到

$$
\ddot\theta+\frac{g}{\ell}\theta=0,
\quad \omega_0=\sqrt{\frac{g}{\ell}},
\quad T=2\pi\sqrt{\frac{\ell}{g}}.
$$

??? warning "小角近似的边界"
	当振幅较大时，单摆周期会随振幅增大而变长（非等时性），属于非线性效应，可参考 [非线性振动](nonlinear.md) 中“频率随振幅变化”的讨论。

## 7. 常见易错点清单

- $\omega_0$（无阻尼固有频率）与 $\omega_d$（欠阻尼振动频率）不要混。
- 共振发生在“驱动频率附近”，严格最大点是 $\Omega_r\approx\sqrt{\omega_0^2-2\gamma^2}$。
- 相位滞后 $\delta$：低频时 $\delta\approx 0$，高频时 $\delta\to \pi$，在接近共振时 $\delta\approx \pi/2$。
- 使用 $Q\approx\omega_0/(2\gamma)$ 与 $\Delta\Omega\approx 2\gamma$ 的前提是弱阻尼。

## 8. 与“波”的衔接

波动可视为“无数个振子通过耦合连接起来”的结果：

- 单个振子：$\ddot x+\omega_0^2 x=0$
- 连续耦合：相邻点相互作用 $\Rightarrow$ 偏微分方程 $\Rightarrow$ 波动方程

从振动过渡到波动的关键推导在 [连续介质中的波](wave-in-continuous-medium.md)。