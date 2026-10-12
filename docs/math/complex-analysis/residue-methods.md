---
status: review
author: Physics Learning Wiki Team
description: 从奇点分类和极点阶数出发，选择洛朗展开、单极点极限、商式、高阶导数、泰勒系数或无穷远点方法计算留数。
page_id: math.complex-analysis.residue-methods
---

# 求留数：方法选择与计算

留数定理把围道积分化成留数之和，但真正动手时，第一步通常是判断「这个点是否为孤立奇点，应该用哪一种计算法」。本页根据《数学物理方法》讲义 3.5–3.7 节整理这一步的操作流程。先修内容是[洛朗展开与奇点分类](series-expansion.md)，积分应用见[留数定理与实积分计算](residue-calculus.md)。

学习目标：判类型 → 定阶数 → 选公式 → 找 $a_{-1}$。这里的箭头表示检查顺序，不要求每道题都使用同一个公式。完成例题后，可进入[六套专项习题与综合题集](residue-exercises/index.md)。

## 1. 留数究竟是哪一个系数？

若 $f$ 在 $0<|z-z_0|<r$ 内解析，则

$$
f(z)=\sum_{n=-\infty}^{\infty}a_n(z-z_0)^n,
\qquad \operatorname{Res}(f,z_0)=a_{-1}.
$$

绕 $z_0$ 一周的正向小圆积分满足

$$
\oint_C(z-z_0)^n\,\mathrm dz=
\begin{cases}2\pi i,&n=-1,\\0,&n\ne-1.\end{cases}
$$

所以积分只留下 $a_{-1}$ 的贡献。留数既不是主部的所有系数之和，也不是最高负幂的系数。

**留数为零不能判定奇点可去。** $1/z^2$ 在原点是二阶极点，$e^{1/z^2}$ 在原点是本性奇点，两者留数都是零。解析点或可去奇点的留数则一定为零。

## 2. 先分类、定阶，再选方法

对商式 $P/Q$，先比较分子与分母在 $z_0$ 的零点阶数。若分别为 $p,q$，局部写成

$$
P(z)=(z-z_0)^p u(z),\quad Q(z)=(z-z_0)^q v(z),
\qquad u(z_0)v(z_0)\ne0.
$$

当 $q>p$ 时，实际极点阶数是 $q-p$；当 $q\le p$ 时可解析延拓。分母的幂次不一定等于实际极点阶数。

| 看到的结构 | 首选方法 | 使用前检查 | 专项训练 |
| --- | --- | --- | --- |
| $e^{1/z}$、$\sin(1/z)$ 等本性奇点 | 洛朗展开，匹配 $-1$ 次幂 | 必须有解析的去心邻域 | [洛朗展开](residue-exercises/laurent.md) |
| 已知一阶极点，因子容易消去 | $\lim_{z\to z_0}(z-z_0)f(z)$ | 约分后确为一阶极点 | [极限法](residue-exercises/simple-pole.md) |
| $P/Q$，且 $Q(z_0)=0,Q'(z_0)\ne0$ | $P(z_0)/Q'(z_0)$ | $P,Q$ 在该点解析；$P(z_0)=0$ 时点可去 | [商式法](residue-exercises/quotient.md) |
| 实际 $m$ 阶极点 | 求 $m-1$ 阶导数，除以 $(m-1)!$ | 消去极点后的函数解析 | [高阶极点公式](residue-exercises/higher-pole.md) |
| $g(z)/(z-z_0)^m$，$g$ 易展开 | 取 $g$ 的 $m-1$ 次泰勒系数 | $g$ 在该点解析；即使 $g(z_0)=0$ 也能取系数 | [泰勒系数法](residue-exercises/taylor.md) |
| 有理函数的全部有限留数之和 | 无穷远展开与总和定理 | 求「和」还是求「每一个」必须分清 | [无穷远点与总和](residue-exercises/infinity.md) |

最后两种局部公式是同一系数关系的两种写法；单极点的商式法也是极限法的简化。方法可以交叉核对，不是互斥分类。

若奇点聚集在 $z_0$，上述局部留数定义不适用。例如 $1/\sin(1/z)$ 的极点 $1/(n\pi)$ 聚于原点，原点没有解析的去心邻域，不能机械地称为本性奇点并求其通常意义下的留数。

## 3. 洛朗展开：只追踪能产生 $-1$ 次幂的项

对 $z^2e^{2/z}$，有

$$
z^2e^{2/z}=\sum_{n=0}^{\infty}\dfrac{2^n}{n!}z^{2-n}.
$$

令 $2-n=-1$ 得 $n=3$，所以留数为 $2^3/3!=4/3$。无需写完全部主部，本性奇点也有确定的留数。

乘积展开时，要考虑所有能组成 $-1$ 次幂的组合。例如在 $0<|z|<1$ 内，

$$
\dfrac{e^{1/z}}{1-z}
=\left(\sum_{n=0}^{\infty}\dfrac{z^{-n}}{n!}\right)
 \left(\sum_{k=0}^{\infty}z^k\right).
$$

$k-n=-1$ 给出 $n=k+1$，因此

$$
\operatorname{Res}\left(\dfrac{e^{1/z}}{1-z},0\right)
=\sum_{k=0}^{\infty}\dfrac1{(k+1)!}=e-1.
$$

两级数在该圆环内的紧子集上一致绝对收敛，可以相乘取系数。这里有无穷多项共同贡献，不能只取 $e^{1/z}$ 中的 $1/z$ 项。

## 4. 单极点极限与商式法

对于一阶极点，写 $f(z)=h(z)/(z-z_0)$，其中 $h$ 在 $z_0$ 解析，则

$$
\operatorname{Res}(f,z_0)=h(z_0)=\lim_{z\to z_0}(z-z_0)f(z).
$$

例如

$$
\operatorname{Res}\left(\dfrac{z+2}{(z-1)(z+3)},1\right)
=\left.\dfrac{z+2}{z+3}\right|_{z=1}=\dfrac34.
$$

若 $Q(z_0)=0,Q'(z_0)\ne0$，由 $Q(z)=Q'(z_0)(z-z_0)+O((z-z_0)^2)$，得到

$$
\operatorname{Res}\left(\dfrac P Q,z_0\right)=\dfrac{P(z_0)}{Q'(z_0)}.
$$

例如 $f(z)=2z/(z^4+1)$ 的极点是 $z_k=e^{i(\pi/4+k\pi/2)}$（$k=0,1,2,3$），均为一阶极点，且

$$
\operatorname{Res}(f,z_k)=\dfrac{2z_k}{4z_k^3}=\dfrac1{2z_k^2}.
$$

$Q'(z_0)=0$ 时不能使用这个商式公式，应重新定阶。$Q'(z_0)\ne0$ 但 $P(z_0)=0$ 时，该公式仍给出留数零，不过该点是可去点而非单极点。

## 5. 高阶极点公式与泰勒系数法

若 $g(z)=(z-z_0)^m f(z)$ 在 $z_0$ 解析，将它展开为

$$
g(z)=\sum_{n=0}^{\infty}\dfrac{g^{(n)}(z_0)}{n!}(z-z_0)^n,
\qquad f(z)=\sum_{n=0}^{\infty}\dfrac{g^{(n)}(z_0)}{n!}(z-z_0)^{n-m}.
$$

因此

$$
\operatorname{Res}(f,z_0)=\dfrac{g^{(m-1)}(z_0)}{(m-1)!}
=\dfrac1{(m-1)!}\left.\dfrac{\mathrm d^{m-1}}{\mathrm dz^{m-1}}
\left[(z-z_0)^m f(z)\right]\right|_{z=z_0}.
$$

用高阶极点公式时，$m$ 通常取实际极点阶数；用系数法时，只需保证 $g$ 解析，即使 $g(z_0)=0$，取其 $m-1$ 次系数仍正确。

对 $f(z)=z^2/(z^2+1)^2$ 在 $z=i$ 的二阶极点，先消去 $(z-i)^2$：

$$
\operatorname{Res}(f,i)
=\left.\dfrac{\mathrm d}{\mathrm dz}\dfrac{z^2}{(z+i)^2}\right|_{z=i}
=\left.\dfrac{2iz}{(z+i)^3}\right|_{z=i}=-\dfrac i4.
$$

若分子更容易展开，则直接取系数。例如

$$
\dfrac{e^z}{1+z}
=\left(1+z+\dfrac{z^2}2+O(z^3)\right)
 \left(1-z+z^2+O(z^3)\right)
=1+\dfrac{z^2}2+O(z^3).
$$

所以 $e^z/[z^3(1+z)]$ 在原点的留数是 $1/2$。只展开到二次项即可。

## 6. 无穷远点：记住微分带来的负号

无穷远点的**奇点分类**看 $f(1/w)$ 在 $w=0$ 的行为；无穷远点的**留数**则必须连同微分变换，因为 $\mathrm dz=-w^{-2}\mathrm dw$：

$$
\operatorname{Res}(f,\infty)
=-\operatorname{Res}\left(\dfrac{f(1/w)}{w^2},0\right).
$$

若充分大的 $|z|$ 上的展开为 $f(z)=\cdots+c_{-1}/z+c_{-2}/z^2+\cdots$，则

$$
\operatorname{Res}(f,\infty)=-c_{-1},\qquad
\sum_{\text{有限奇点 }z_k}\operatorname{Res}(f,z_k)=c_{-1}.
$$

有理函数只有有限个有限极点，上式总可用。例如

$$
\dfrac{3z+1}{z^2-1}=\dfrac3z+\dfrac1{z^2}+O(z^{-3}),
$$

所以有限留数之和为 $3$，无穷远点留数为 $-3$。逐点计算也得 $z=1,-1$ 处分别为 $2,1$。

不要把 $-\lim_{z\to\infty}zf(z)$ 当成无条件公式。它只在例如 $f(z)=O(1/z)$ 时适用。对

$$
\dfrac{z^3}{z^2+1}=z-\dfrac1z+O(z^{-3}),
$$

虽然 $zf(z)$ 发散，无穷远点留数仍是 $1$，有限留数之和为 $-1$。多项式部分不贡献 $1/z$ 系数。

总和定理只能确定留数**之和**；若要求各点留数，还需要局部计算。只有一个未知留数时，才可用总和反求它。

## 7. 从求留数到求积分

求积分时，在局部计算之外再检查三个问题：哪些奇点在围道内；围道是否经过奇点；绕行方向是什么。对正向简单闭曲线且曲线上无奇点，

$$
\oint_C f(z)\,\mathrm dz=2\pi i\sum_{z_k\text{ 在 }C\text{ 内}}\operatorname{Res}(f,z_k).
$$

顺时针围道需要负号。一般闭路则按各点绕数加权。实轴反常积分还需说明大圆弧是否消失；实轴有极点时要明确普通积分、柯西主值和凹陷路径的区别。

对于 $e^{ipz}$，$|e^{ip(x+iy)}|=e^{-py}$：$p>0$ 选上半平面，$p<0$ 选下半平面并计入顺时针负号；$p=0$ 单独用有理函数的弧长估计。这一检查直接连接讲义的傅里叶积分和 Yukawa 核。

## 8. 自检与后续练习

- 是否先约分并确定实际阶数？例如 $\sin z/z^4$ 在原点是三阶极点。
- 是否求了 $m-1$ 阶导数，并除以 $(m-1)!$？
- 取乘积的 $a_{-1}$ 时，是否漏了其他配对项？
- 无穷远点留数是否取了 $1/z$ 系数的负值？
- 留数为零时，是否仍保留了正确的奇点分类？

接下来完成[专项习题](residue-exercises/index.md)，再做不提示方法的[综合题集](residue-exercises/comprehensive.md)。本页公式与基础例题参考用户提供的《3.5 奇点分类、3.6 留数定理发现之旅与 3.7 留数定理》（仓库 `References/数学物理方法课件/mmplecture 3.5-3.7.md`）；无穷远总和法与训练题按定义补充。
