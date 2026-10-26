---
title: 简正模与简正坐标
status: review
author: Physics Learning Wiki Team
description: 求解小振动的广义特征值问题，推导质量正交与简正坐标，利用初始条件构造运动，并以三原子模型辨析零模．
prerequisites:
  - small-oscillation
  - differential-equation
---

## 寻找保持形状的运动

上一页得到 $M\ddot{\boldsymbol\eta}+K\boldsymbol\eta=0$．直接消去坐标虽可求解，却不容易看出各部分如何一起运动．现在换一个问题：是否存在某些运动，使所有坐标按同一时间函数变化，只保留固定的振幅比例？

这种运动称为 **简正模（normal mode）**．它的振型规定各坐标的相对振幅与正负号，时间变化由一个固有角频率决定．一般运动则可由这些特殊运动叠加而成．

本页沿用 [小振动近似](small-oscillations.md) 的条件，先假定 $M,K$ 实对称且正定，最后单独处理零模．需要会矩阵乘法、特征值与内积；可随用随查 [特征值与特征向量](../../math/linear-algebra/eigenvalues.md) 和 [内积](../../math/linear-algebra/inner-product.md)．

## 从同频运动到广义特征值问题

设

$$
\boldsymbol\eta(t)=\boldsymbol a\cos(\omega t+\phi).
$$

代入运动方程，共同的时间因子消去，得到

$$
\boxed{K\boldsymbol a=\omega^2M\boldsymbol a}.
$$

同样可以用复数试探解 $\boldsymbol a\mathrm e^{\mathrm i\omega t}$，最后取实部．若不熟悉这种记法，可先看 [复数表示](../oscillation-wave/linear-oscillation.md#用复数表示简谐振动)；它不会改变实运动．

我们要的是非零振型 $\boldsymbol a$，所以

$$
\det(K-\omega^2M)=0.
$$

这是关于 $\omega^2$ 的 $s$ 次方程，称为频率方程．求出根后，还必须代回矩阵方程求振型，行列式本身不提供各坐标的振幅比例．$\omega$ 是固有角频率，单位为 $\mathrm{rad/s}$；普通频率为 $f=\omega/(2\pi)$．

形式上可左乘 $M^{-1}$，但 $M^{-1}K$ 通常不是实对称矩阵．不能因此直接套用「不同特征向量按普通点积正交」的结论．合适的内积将由动能中的 $M$ 决定．

### 为什么频率实且为正，并且能找到完整振型

由于 $M$ 正定，可以通过正交对角化定义实对称的 $M^{1/2}$ 与 $M^{-1/2}$：将其正特征值逐个开平方或取平方根的倒数即可．设 $\boldsymbol u=M^{1/2}\boldsymbol a$，特征值问题化为

$$
C\boldsymbol u=\omega^2\boldsymbol u,\qquad
C=M^{-1/2}KM^{-1/2}.
$$

$C$ 是实对称矩阵．对任意非零 $\boldsymbol u$，

$$
\boldsymbol u^{\mathsf T}C\boldsymbol u
=(M^{-1/2}\boldsymbol u)^{\mathsf T}
K(M^{-1/2}\boldsymbol u)>0.
$$

所以 $C$ 正定，具有 $s$ 个正实特征值和一组完整的实正交特征向量．变换回去，就得到 $s$ 个线性无关的实振型．即使频率简并，振型也不会因此缺失．对于量纲不同的广义坐标，上述矩阵平方根可在选定坐标单位、作固定尺度换算后使用；它是证明工具，实际求解仍可直接解广义特征值方程．

也可以用已求出的实振型核对频率：

$$
\omega_\alpha^2
=\dfrac{(\boldsymbol a^{(\alpha)})^{\mathsf T}K\boldsymbol a^{(\alpha)}}
{(\boldsymbol a^{(\alpha)})^{\mathsf T}M\boldsymbol a^{(\alpha)}}>0.
$$

分子表示这一振型的回复作用，分母表示惯性．这里的比值检查不能单独代替前面的完备性论证．

## 质量正交与归一化

上标 $(\alpha)$ 标记第几个模，下标 $i$ 标记原坐标的第几个分量．对两个振型，利用 $K,M$ 的对称性，分别有

$$
(\boldsymbol a^{(\alpha)})^{\mathsf T}K\boldsymbol a^{(\beta)}
=\omega_\beta^2(\boldsymbol a^{(\alpha)})^{\mathsf T}M\boldsymbol a^{(\beta)},
$$

$$
(\boldsymbol a^{(\alpha)})^{\mathsf T}K\boldsymbol a^{(\beta)}
=\omega_\alpha^2(\boldsymbol a^{(\alpha)})^{\mathsf T}M\boldsymbol a^{(\beta)}.
$$

相减得到

$$
(\omega_\alpha^2-\omega_\beta^2)
(\boldsymbol a^{(\alpha)})^{\mathsf T}M\boldsymbol a^{(\beta)}=0.
$$

频率不同时，振型在质量内积 $\langle\boldsymbol a,\boldsymbol b\rangle_M=\boldsymbol a^{\mathsf T}M\boldsymbol b$ 下正交．频率相同时，上式不施加正交限制，但可以在同一特征子空间中按质量内积作 Gram–Schmidt 正交化；线性组合仍属于同一频率．

振型的总体尺度任意．将每个振型除以其质量范数：

$$
\boldsymbol b^{(\alpha)}
=\dfrac{\boldsymbol a^{(\alpha)}}
{\sqrt{(\boldsymbol a^{(\alpha)})^{\mathsf T}M\boldsymbol a^{(\alpha)}}},
\qquad
(\boldsymbol b^{(\alpha)})^{\mathsf T}M\boldsymbol b^{(\beta)}
=\delta_{\alpha\beta}.
$$

这叫质量归一化，右边是 Kronecker 符号：同指标为一，不同指标为零．归一化并没有规定真实运动的振幅，真实振幅仍由初始条件决定．整体反号也不改变振型所代表的模态．

## 简正坐标怎样解耦

把归一化振型按列排列为 $B=(\boldsymbol b^{(1)},\ldots,\boldsymbol b^{(s)})$．质量正交与特征值方程分别给出

$$
B^{\mathsf T}MB=I,\qquad
B^{\mathsf T}KB=\operatorname{diag}(\omega_1^2,\ldots,\omega_s^2).
$$

第二式的第 $\alpha,\beta$ 元素为 $\omega_\beta^2(\boldsymbol b^{(\alpha)})^{\mathsf T}M\boldsymbol b^{(\beta)}$，因此也对角化．定义 **简正坐标（normal coordinates）**

$$
\boldsymbol\eta=B\boldsymbol Q,\qquad
\boxed{\boldsymbol Q=B^{-1}\boldsymbol\eta=B^{\mathsf T}M\boldsymbol\eta}.
$$

$B^{-1}=B^{\mathsf T}M$ 来自第一条矩阵恒等式．普通转置 $B^{\mathsf T}$ 一般不是逆矩阵．这里的 $Q_\alpha$ 表示模态的时间幅值，与前文用 $Q_\alpha$ 表示的广义力含义不同；本页讨论无外力系统，不再用这个字母表示力．

将变换代入二次拉格朗日量：

$$
L^{(2)}=\dfrac12\sum_\alpha
\left(\dot Q_\alpha^2-\omega_\alpha^2Q_\alpha^2\right).
$$

交叉项全部消失，于是

$$
\ddot Q_\alpha+\omega_\alpha^2Q_\alpha=0,\qquad
E^{(2)}=\sum_\alpha E_\alpha,\qquad
E_\alpha=\dfrac12\left(\dot Q_\alpha^2+\omega_\alpha^2Q_\alpha^2\right).
$$

每个模态的能量分别守恒，因为 $\dot E_\alpha=\dot Q_\alpha(\ddot Q_\alpha+\omega_\alpha^2Q_\alpha)=0$．原来几个物体之间仍可交换能量，这不等于模态之间交换能量；物体坐标与简正坐标是两种不同分解．

质量归一化把惯性系数吸收进了坐标．因此 $Q_\alpha$ 一般不再是长度或角度，其单位使 $\dot Q_\alpha^2$ 具有能量单位；不要把系数一误读成「每个振子的实际质量都是一千克」．

## 用初始条件恢复实际运动

给定初始位移 $\boldsymbol\eta_0$ 和速度 $\boldsymbol v_0$，先投影：

$$
Q_\alpha(0)=(\boldsymbol b^{(\alpha)})^{\mathsf T}M\boldsymbol\eta_0,\qquad
\dot Q_\alpha(0)=(\boldsymbol b^{(\alpha)})^{\mathsf T}M\boldsymbol v_0.
$$

每个独立振子的解为

$$
Q_\alpha(t)=Q_\alpha(0)\cos\omega_\alpha t
+\dfrac{\dot Q_\alpha(0)}{\omega_\alpha}\sin\omega_\alpha t,
\qquad
\boldsymbol\eta(t)=\sum_\alpha\boldsymbol b^{(\alpha)}Q_\alpha(t).
$$

这比先解振幅与相位更直接，尤其适合某个模态振幅为零的情况．一共有 $2s$ 个初始量，变换并没有减少初态信息．若要激发一个纯模，初始位移与初始速度都必须沿该振型，其他模态的两项投影都为零．

## 零模：三原子纵向振动

若 $K$ 只有半正定性，部分 $\omega_\alpha^2$ 可以为零．对应的简正方程是 $\ddot Q_\alpha=0$，解为 $Q_\alpha(0)+\dot Q_\alpha(0)t$，不能代入含 $1/\omega_\alpha$ 的振动公式．零二阶曲率究竟意味着自由运动还是高阶回复，需要回到原模型判断．

以一条直线上的三个质点模拟分子纵向运动：两端质量为 $m$，中间质量记为 $m_c$，相邻质点之间各有劲度系数 $k$ 的理想弹簧，忽略外力，只允许沿直线运动．记相对平衡位置的位移为 $x_1,x_2,x_3$，则

$$
T=\dfrac12m(\dot x_1^2+\dot x_3^2)+\dfrac12m_c\dot x_2^2,\qquad
V=\dfrac12k(x_2-x_1)^2+\dfrac12k(x_3-x_2)^2.
$$

因此

$$
M=\begin{pmatrix}m&0&0\\0&m_c&0\\0&0&m\end{pmatrix},\qquad
K=k\begin{pmatrix}1&-1&0\\-1&2&-1\\0&-1&1\end{pmatrix}.
$$

求解时可以利用两端对称性，而不必展开三阶行列式．

1. 若三者位移相同，弹簧都不变长，因此 $\boldsymbol a_0=(1,1,1)^{\mathsf T}$，$\omega_0=0$．这是整体平移模，原势能对整体平移严格不变，零模确实对应自由的质心运动．
2. 若两端位移相反，取 $\boldsymbol a_-=(1,0,-1)^{\mathsf T}$，中间所受两弹簧力抵消．第一行方程给出 $\omega_-^2=k/m$．
3. 若两端位移相同，设振型为 $(a,b,a)^{\mathsf T}$．两条独立方程为

$$
k(a-b)=m\omega^2a,\qquad
2k(b-a)=m_c\omega^2b.
$$

对非零频率，将第一式乘二再与第二式相加，得到 $2ma+m_cb=0$，即质心没有随这个模态运动．于是

$$
\boldsymbol a_+=\begin{pmatrix}1\\-2m/m_c\\1\end{pmatrix},
\qquad
\omega_+^2=\dfrac{k}{m}+\dfrac{2k}{m_c}.
$$

三个振型线性无关，且两两质量正交．其质量范数平方依次为 $2m+m_c$、$2m$ 和 $2m+4m^2/m_c$，可用前述程序归一化及投影初态．两个非零模都保持质心不动；若初态有总动量，零模给出额外的匀速平移．

这个模型的零模不同于 $V=a q^4$ 的零曲率：后者被二次近似漏掉了高阶回复力，不能据此宣称原系统自由运动．含零模时也不能将前文关于非退化稳定平衡、全部坐标有界振动的结论原样照搬．

## 文内自测

1. 两个不同频率的振型普通点积不为零，是否说明计算有误？

??? note "核对：正交使用哪个内积"
    不一定．应检查 $\boldsymbol a^{\mathsf T}M\boldsymbol b=0$．只有质量矩阵与单位矩阵成比例等特殊情况下，质量正交才直接等同于普通点积正交．
    
2. 初始位移沿一个振型，但初始速度含另一个振型的分量，后续运动是否仍是纯模？

??? note "核对：两组初态都要投影"
    不是．另一个模态虽有 $Q_\beta(0)=0$，却有 $\dot Q_\beta(0)\ne0$，会产生正弦项．
    
3. 三原子模型初始位置都在平衡点，三者初速度同为 $v$，它们会产生内部振动吗？

??? note "核对：零模初态"
    不会．$\boldsymbol x(t)=vt(1,1,1)^{\mathsf T}$，弹簧形变始终为零，能量全部是质心平移动能．

## 继续学习与参考资料

上一页：[平衡附近的小振动](small-oscillations.md)．下一页：[双摆的小振动与模态](double-pendulum-modes.md)，用同一流程完成一个动能耦合的实例．

- [David Tong，Classical Dynamics，§2.6](https://www.damtp.cam.ac.uk/user/tong/dynamics/dynhtml/S2.html#S2.SS6)：小振动及三原子纵向模型．
