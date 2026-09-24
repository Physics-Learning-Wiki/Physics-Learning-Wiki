---
status: review
author: Physics Learning Wiki Team
description: 探讨伴随算符、厄米算符实本征值与正交性定理、酉变换与概率守恒、谱分解定理以及在量子力学可观测物理量与时间演化中的核心数学地位．
---

## 厄米算符、酉变换与谱分解

## 物理问题引入：量子力学的两大铁律需要怎样的数学算符？

量子力学的基本假设对算符提出了两个不可违背的物理铁律：

1.  **可观测量的实数性**：无论我们在实验室测量能量、动量、位置还是自旋，实验仪器读出的读数 **必须且永远是实数**，绝不能跳出一个虚数 $3 + 4i$；
2.  **全概率守恒性**：粒子在全空间各处被发现的概率总和必定恒等于 100%．随着时间演化，总概率不能膨胀，也不能随波蒸发．

这两个物理要求，精准对应了线性代数中两类最尊贵的算符——**厄米算符 (Hermitian Operator)** 与 **酉算符 (Unitary Operator)**．

***

## 1. 伴随算符与厄米算符定义

### 1.1 伴随算符 (Adjoint Operator)

设 $\hat{A}$ 是复希尔伯特空间 $\mathcal{H}$ 上的线性算符．若存在算符 $\hat{A}^\dagger$，使得对任意向量 $|\boldsymbol{u}\rangle, |\boldsymbol{v}\rangle$ 均满足：

$$
\langle\boldsymbol{u}| \hat{A} |\boldsymbol{v}\rangle = \langle \hat{A}^\dagger \boldsymbol{u} | \boldsymbol{v}\rangle
$$

则称 $\hat{A}^\dagger$ 为 $\hat{A}$ 的 **伴随算符（Hermitian 共轭）**．
在标准正交基下，伴随算符的矩阵表示为原矩阵的 **共轭转置**：

$$
(A^\dagger)_{ij} = (A_{ji})^*
$$

### 1.2 厄米算符（自伴算符）

若算符严格等于其自身的伴随算符：

$$
\hat{A}^\dagger = \hat{A} \quad \iff \quad A = A^\dagger
$$

则称 $\hat{A}$ 为 **厄米算符 (Hermitian Operator)**．

***

## 2. 厄米算符的两大核心定理（量子测量基础）

### 定理一：厄米算符的本征值必为纯实数

**证明**：设 $\hat{A}|\boldsymbol{v}\rangle = \lambda |\boldsymbol{v}\rangle$（$|\boldsymbol{v}\rangle \neq \boldsymbol{0}$）．
计算内积：

$$
\langle\boldsymbol{v}| \hat{A} |\boldsymbol{v}\rangle = \langle\boldsymbol{v}| (\lambda |\boldsymbol{v}\rangle) = \lambda \langle\boldsymbol{v}|\boldsymbol{v}\rangle
$$

另一方面，利用厄米自伴性：

$$
\langle\boldsymbol{v}| \hat{A} |\boldsymbol{v}\rangle = \langle \hat{A}\boldsymbol{v} | \boldsymbol{v}\rangle = \langle \lambda\boldsymbol{v} | \boldsymbol{v}\rangle = \lambda^* \langle\boldsymbol{v}|\boldsymbol{v}\rangle
$$

两式相减：$(\lambda - \lambda^*) \langle\boldsymbol{v}|\boldsymbol{v}\rangle = 0$．由于向量非零模长 $\langle\boldsymbol{v}|\boldsymbol{v}\rangle > 0$，故强制得出：

$$
\lambda = \lambda^* \implies \lambda \in \mathbb{R}
$$

### 定理二：属于不同本征值的本征态严格相互正交

**证明**：设 $\hat{A}|1\rangle = \lambda_1|1\rangle$，$\hat{A}|2\rangle = \lambda_2|2\rangle$（$\lambda_1 \neq \lambda_2$）．
同理展开：$\langle 1|\hat{A}|2\rangle = \lambda_2 \langle 1|2\rangle$ 且 $\langle 1|\hat{A}|2\rangle = \lambda_1^* \langle 1|2\rangle = \lambda_1 \langle 1|2\rangle$．
相减得：

$$
(\lambda_1 - \lambda_2) \langle 1|2\rangle = 0
$$

因为 $\lambda_1 \neq \lambda_2$，必须严格满足：

$$
\langle 1|2\rangle = 0
$$

**量子物理公设**：
大自然中每一个物理可观测量（动量 $\hat{p}$、哈密顿量 $\hat{H}$、角动量 $\hat{\boldsymbol{L}}$）**都由一个厄米算符表示**．实验测量的所有可能可能值，严格对应其特征实数本征值！

***

## 3. 酉算符与保内积变换（概率守恒之盾）

### 3.1 酉算符定义

线性算符 $\hat{U}$ 称为 **酉算符 (Unitary Operator)**，若其伴随算符严格等于其逆算符：

$$
\hat{U}^\dagger \hat{U} = \hat{U} \hat{U}^\dagger = \hat{I}
$$

### 3.2 保持内积与模长不变

对任意经过酉变换演化后的态 $|\boldsymbol{u}'\rangle = \hat{U}|\boldsymbol{u}\rangle, |\boldsymbol{v}'\rangle = \hat{U}|\boldsymbol{v}\rangle$：

$$
\langle\boldsymbol{u}'|\boldsymbol{v}'\rangle = \langle \hat{U}\boldsymbol{u} | \hat{U}\boldsymbol{v}\rangle = \langle\boldsymbol{u}| \hat{U}^\dagger \hat{U} |\boldsymbol{v}\rangle = \langle\boldsymbol{u}|\boldsymbol{v}\rangle
$$

态矢量的模长在酉变换下严格守恒！

### 3.3 时间演化算符

若哈密顿量 $\hat{H}$ 是自共轭的，定义时间演化算符为：

$$
\hat{U}(t) = \exp\left(-\dfrac{i}{\hbar}\hat{H}t\right)
$$

计算其伴随：$\hat{U}^\dagger(t) = \exp\left(+\dfrac{i}{\hbar}\hat{H}^\dagger t\right) = \exp\left(+\dfrac{i}{\hbar}\hat{H}t\right) = \hat{U}^{-1}(t)$．$\hat{U}(t)$ 严格为酉算符！它保证了薛定谔波动演化中全空间波函数归一化永远保持为 1．

***

## 4. 谱分解定理 (Spectral Theorem)

设厄米算符 $\hat{A}$ 拥有一组标准正交归一的本征基 $\{|n\rangle\}$，本征值为 $\lambda_n$．
利用恒等算符分解 $\hat{I} = \sum_n |n\rangle\langle n|$：

$$
\hat{A} = \hat{A} \hat{I} = \hat{A} \sum_n |n\rangle\langle n| = \sum_n (\hat{A}|n\rangle)\langle n| = \sum_n \lambda_n |n\rangle\langle n|
$$

这就是宏伟的 **算符谱分解 (Spectral Decomposition)**！

### 量子期望值计算

当系统处于任意归一化态 $|\psi\rangle$ 时，物理量 $A$ 的平均期望值直接由谱展开给出：

$$
\langle\hat{A}\rangle = \langle\psi|\hat{A}|\psi\rangle = \sum_n \lambda_n |\langle n|\psi\rangle|^2 = \sum_n \lambda_n P_n
$$

其中 $P_n = |\langle n|\psi\rangle|^2$ 正是在该态下测量得到本征值 $\lambda_n$ 的 **玻恩测量概率**！

***

## 5. 学习衔接

-   **微积分对应**：微分算子的厄米谱理论，参见 [Sturm–Liouville 理论](../eigenfunction-methods/sturm-liouville.md)；
-   **量子力学实战**：在 [近代物理：量子力学基础](../../modern/index.md) 中全面应用算符表象体系．
