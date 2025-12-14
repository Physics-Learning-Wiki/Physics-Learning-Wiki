author: 匿名同学

## 连续介质中的波（Waves in Continuous Media）

本页从“连续介质近似”出发，推导最常见的波动方程，并给出弦波、声波等典型波的波速、能量与边界反射/透射的核心结果。

## 0. 连续介质近似与基本思想

- 把介质看成由无穷多小体元组成，每个体元可用场量（位移、速度、压强、密度等）描述。
- 相邻体元之间存在“弹性耦合”，使局部扰动传播成波。
- 线性小扰动下，方程通常为线性的二阶偏微分方程（波动方程）。

??? note "常见符号"
    - 弦横向位移：$y(x,t)$
    - 弦张力：$T$（本文用 $T$ 表示张力，与周期 $T$ 区分时会写 $\mathcal{T}$ 表示周期）
    - 线密度：$\mu$
    - 声波：压强扰动 $p'(x,t)$、质点速度 $u(x,t)$、密度扰动 $\rho'(x,t)$

## 1. 弦上的横波：波动方程与波速

### 1.1 建模假设

- 弦沿 $x$ 轴平放，小振幅横向位移为 $y(x,t)$。
- 张力大小近似恒定为 $T$。
- 斜率很小：$|\partial y/\partial x|\ll 1$，可用 $\sin\theta\approx\tan\theta\approx\partial y/\partial x$。

### 1.2 对小弦元受力分析

取区间 $[x, x+\Delta x]$ 的小弦元，其质量

$$
\Delta m=\mu\Delta x.
$$

两端张力大小都约为 $T$，方向分别与弦切线一致。端点处切线角分别为 $\theta(x)$、$\theta(x+\Delta x)$。

竖直方向合力（横向）为

$$
F_y=T\sin\theta(x+\Delta x)-T\sin\theta(x).
$$

小角度近似 $\sin\theta\approx \tan\theta\approx \partial y/\partial x$，于是

$$
F_y\approx T\left[\frac{\partial y}{\partial x}(x+\Delta x,t)-\frac{\partial y}{\partial x}(x,t)\right]
\approx T\frac{\partial^2 y}{\partial x^2}\Delta x.
$$

由牛顿第二定律：

$$
\Delta m\frac{\partial^2 y}{\partial t^2}=F_y
\quad\Rightarrow\quad
\mu\Delta x\frac{\partial^2 y}{\partial t^2}=T\frac{\partial^2 y}{\partial x^2}\Delta x.
$$

消去 $\Delta x$ 得到弦波动方程：

$$
\frac{\partial^2 y}{\partial t^2}=\frac{T}{\mu}\frac{\partial^2 y}{\partial x^2}.
$$

因此弦上横波波速

$$
 v=\sqrt{\frac{T}{\mu}}.
$$

## 2. 一维纵波与声波：基本方程与声速

以一维管内声波为例（忽略黏性与热传导，做线性小扰动）。

### 2.1 线性化变量

设静态平衡态为 $p_0,\rho_0$。

扰动：

$$
 p(x,t)=p_0+p'(x,t),\quad \rho(x,t)=\rho_0+\rho'(x,t),\quad |p'|\ll p_0,\ |\rho'|\ll\rho_0.
$$

质点（流体微元）速度为 $u(x,t)$（沿 $x$）。

### 2.2 连续性方程（质量守恒，线性化）

一维连续性方程：

$$
\frac{\partial \rho}{\partial t}+\frac{\partial (\rho u)}{\partial x}=0.
$$

线性化（忽略二阶小量 $\rho' u$）：

$$
\frac{\partial \rho'}{\partial t}+\rho_0\frac{\partial u}{\partial x}=0.
$$

### 2.3 欧拉方程（动量守恒，线性化）

无黏性一维欧拉方程：

$$
\rho\left(\frac{\partial u}{\partial t}+u\frac{\partial u}{\partial x}\right)=-\frac{\partial p}{\partial x}.
$$

线性化（忽略 $u\partial u/\partial x$，并用 $\rho\approx\rho_0$）：

$$
\rho_0\frac{\partial u}{\partial t}=-\frac{\partial p'}{\partial x}.
$$

### 2.4 状态方程（闭合关系）

小扰动可近似为绝热过程：

$$
 p'=c_s^2\rho',\quad c_s^2=\left(\frac{\partial p}{\partial \rho}\right)_s.
$$

其中 $c_s$ 即声速。

### 2.5 推导声波方程

对连续性方程对时间再求导：

$$
\frac{\partial^2 \rho'}{\partial t^2}+\rho_0\frac{\partial}{\partial x}\left(\frac{\partial u}{\partial t}\right)=0.
$$

用欧拉方程给出

$$
\frac{\partial u}{\partial t}=-\frac{1}{\rho_0}\frac{\partial p'}{\partial x},
$$

代入得

$$
\frac{\partial^2 \rho'}{\partial t^2}-\frac{\partial^2 p'}{\partial x^2}=0.
$$

再用 $p'=c_s^2\rho'$，得到压强扰动的波动方程：

$$
\frac{\partial^2 p'}{\partial t^2}=c_s^2\frac{\partial^2 p'}{\partial x^2}.
$$

同理可得 $\rho'$、$u$ 也满足相同形式的波动方程，传播速度均为 $c_s$。

### 2.6 理想气体声速

理想气体绝热过程 $p\rho^{-\gamma}=\text{常数}$，因此

$$
 c_s^2=\left(\frac{\partial p}{\partial \rho}\right)_s=\gamma\frac{p_0}{\rho_0}.
$$

又由 $p_0=\rho_0\frac{RT}{M}$ 得

$$
 c_s=\sqrt{\gamma\frac{RT}{M}}.
$$

## 3. 通解：d'Alembert 形式（1D）

一维波动方程

$$
\frac{\partial^2 y}{\partial t^2}=v^2\frac{\partial^2 y}{\partial x^2}
$$

通解可写为

$$
 y(x,t)=f(x-vt)+g(x+vt).
$$

解释：

- $f(x-vt)$：向 $+x$ 传播的任意波形
- $g(x+vt)$：向 $-x$ 传播的任意波形

代入检验（给出关键步骤）：

$$
\frac{\partial y}{\partial t}=-v f'(x-vt)+v g'(x+vt),\quad
\frac{\partial^2 y}{\partial t^2}=v^2 f''(x-vt)+v^2 g''(x+vt)
$$

$$
\frac{\partial y}{\partial x}=f'(x-vt)+g'(x+vt),\quad
\frac{\partial^2 y}{\partial x^2}=f''(x-vt)+g''(x+vt)
$$

于是满足方程。

## 4. 边界与反射：固定端与自由端（弦波）

考虑波到达端点反射，反射波与入射波叠加后需满足边界条件。

### 4.1 固定端反射（位移为零）

固定端 $x=0$：$y(0,t)=0$。
设入射波 $y_i=A\cos(kx-\omega t)$，反射波 $y_r=A_r\cos(kx+\omega t+\phi)$。

要求 $y_i(0,t)+y_r(0,t)=0$ 对任意 $t$ 成立，得到

$$
A_r=A,\quad \phi=\pi.
$$

即固定端反射发生 **相位反转**（反射系数为 $-1$）。

### 4.2 自由端反射（张力横向分量为零）

自由端近似满足 $\partial y/\partial x=0$。
同理可得反射不反相（反射系数为 $+1$）。

## 5. 弦波的能量与功率（时间平均）

对弦上横波 $y(x,t)$，小振幅下弦元的动能密度与势能密度分别可写为

$$
\mathcal{E}_K=\frac12\mu\left(\frac{\partial y}{\partial t}\right)^2,
\quad
\mathcal{E}_P=\frac12 T\left(\frac{\partial y}{\partial x}\right)^2.
$$

对简谐行波 $y=A\cos(kx-\omega t)$：

$$
\frac{\partial y}{\partial t}=A\omega\sin(kx-\omega t),\quad
\frac{\partial y}{\partial x}=-Ak\sin(kx-\omega t).
$$

代入并用 $\omega=vk$ 与 $v^2=T/\mu$ 可得两者时间平均相等：

$$
\langle \mathcal{E}_K\rangle=\langle \mathcal{E}_P\rangle=\frac14\mu\omega^2A^2.
$$

总能量密度时间平均

$$
\langle \mathcal{E}\rangle=\frac12\mu\omega^2A^2.
$$

能流（功率）平均值为

$$
\langle P\rangle=\langle \mathcal{E}\rangle\,v=
\frac12\mu\omega^2A^2 v.
$$

这说明：在线性无耗散下，功率与 $A^2$ 成正比。

## 6. 小结与学习建议

- 记住两条“标准推导链”：
  1) 弦：受力分析 $\to$ 波动方程 $\to$ 波速 $\sqrt{T/\mu}$
  2) 声波：连续性 + 欧拉 + 状态方程 $\to$ 声波方程 $\to$ 声速
- 熟练掌握边界条件（固定端/自由端）与驻波条件（$k_n=n\pi/L$）。
