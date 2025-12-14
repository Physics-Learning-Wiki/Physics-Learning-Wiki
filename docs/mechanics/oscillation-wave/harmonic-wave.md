author: Leafuke

## 简谐波（Harmonic Waves）

“简谐波”指在空间与时间上都呈正弦（或余弦）形式的波，是线性波动中最基本的解。
它既是理解波动方程、波速、相速度/群速度、干涉衍射等现象的基石，也是把一般波形分解为频率分量（傅里叶分析）的核心对象。

## 1. 一维简谐行波的表达式

沿 $x$ 轴传播的简谐行波可写为

$$
 y(x,t)=A\cos(kx-\omega t+\varphi).
$$

- $A$：振幅
- $k$：波数
- $\omega$：角频率
- $\varphi$：初相位

波长与周期：

$$
\lambda=\frac{2\pi}{k},\quad T=\frac{2\pi}{\omega},\quad f=\frac{1}{T}.
$$

**相速度（phase velocity）**：保持相位 $kx-\omega t+\varphi=\text{常数}$，得

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

## 6. 能量与强度（不同介质形式略有差异）

对具体介质（弦、声波、电磁波），能量密度与能流表达不同，但共同点是：

- 强度 $I$ 往往与振幅平方成正比：$I\propto A^2$。
- 线性无耗散下，时间平均能流与群速度相关（进阶结论）。

声波与弦波的能量推导可在 [连续介质中的波](wave-in-continuous-medium.md) 中找到。
