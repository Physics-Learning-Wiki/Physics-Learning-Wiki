---
status: stable
author: Physics Learning Wiki Team
description: 探讨本征值方程、特征多项式、代数与几何重数、矩阵对角化条件，以及在刚体主惯性轴、多自由度微振动简正频率与量子可观测量中的物理意义。
---

## 本征值、本征矢与对角化

## 物理问题引入：如何找到让复杂系统解耦的最优坐标系？

考察空间中一个任意形状的刚体：
在一般的笛卡尔坐标系下，惯量张量矩阵包含大量非对角惯性积：

$$
\mathbf{I} = \begin{pmatrix} I_{xx} & -I_{xy} & -I_{xz} \\ -I_{yx} & I_{yy} & -I_{yz} \\ -I_{zx} & -I_{zy} & I_{zz} \end{pmatrix}
$$

当你绕某个轴自转时，角动量 $\boldsymbol{L} = \mathbf{I}\boldsymbol{\omega}$ 居然不与角速度平行，产生强烈的轴承偏心力矩．
**是否存在一组最特殊的“天选坐标轴”，使得矩阵所有非对角项全部为零？**
在理论力学中，这叫 **主惯性轴**；在振动理论中，这叫 **简正坐标**；在量子力学中，这叫 **力学量本征态**！
寻找这些最优方向的数学工具，就是 **本征值与对角化理论**．

---

## 1. 本征值与本征矢的数学定义

设 $\hat{T}$ 为线性空间 $V$ 上的线性算符．
若存在一个非零向量 $|\boldsymbol{v}\rangle \neq \boldsymbol{0}$ 和一个标量 $\lambda$，满足：

$$
\hat{T}|\boldsymbol{v}\rangle = \lambda |\boldsymbol{v}\rangle
$$

则称 $\lambda$ 为算符 $\hat{T}$ 的 **特征值（本征值，Eigenvalue）**；非零向量 $|\boldsymbol{v}\rangle$ 称为属于本征值 $\lambda$ 的 **特征向量（本征矢，Eigenvector）**．

**几何图像**：
一般线性变换会对空间向量既做拉伸又做旋转．
而本征矢代表了空间中那些**方向在变换下保持不变（仅模长被纯缩放 $\lambda$ 倍）的特殊纯粹方向**！

---

## 2. 特征方程与求解范式

在选定基底后，算符写为矩阵 $A$：

$$
A |\boldsymbol{v}\rangle = \lambda |\boldsymbol{v}\rangle \implies (A - \lambda I)|\boldsymbol{v}\rangle = \boldsymbol{0}
$$

为了使齐次线性方程组存在非零解 $|\boldsymbol{v}\rangle \neq \boldsymbol{0}$，系数行列式必须为零，由此得到著名的 **特征方程 (Characteristic Equation)**：

$$
\det(A - \lambda I) = 0
$$

展开左端得到关于 $\lambda$ 的 $n$ 次代数多项式 $P(\lambda)$（特征多项式）．解出多项式的 $n$ 个根 $\lambda_1, \dots, \lambda_n$ 即为本征值．将求得的每一个本征值代回齐次方程组 $(A - \lambda_k I)\boldsymbol{v}_k = \boldsymbol{0}$，即可解出对应的一维或多维本征空间．

---

## 3. 矩阵对角化定理

设 $n \times n$ 方阵 $A$ 拥有 $n$ 个线性无关的特征向量 $\{|\boldsymbol{v}_1\rangle, \dots, |\boldsymbol{v}_n\rangle\}$，对应的特征值为 $\lambda_1, \dots, \lambda_n$．
构造特征向量拼接而成的过渡矩阵：

$$
P = \Big( |\boldsymbol{v}_1\rangle \quad |\boldsymbol{v}_2\rangle \quad \dots \quad |\boldsymbol{v}_n\rangle \Big)
$$

则 $A$ 可通过相似变换严格转化为 **对角矩阵 (Diagonal Matrix)**：

$$
P^{-1} A P = \Lambda = \begin{pmatrix} \lambda_1 & 0 & \dots & 0 \\ 0 & \lambda_2 & \dots & 0 \\ \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & \dots & \lambda_n \end{pmatrix}
$$

???+ tip "对角化的物理魔力：全自由度瞬间解耦"
    原本相互纠缠的联立微分方程组 $\dot{\boldsymbol{x}} = A \boldsymbol{x}$，通过引入本征坐标 $\boldsymbol{y} = P^{-1}\boldsymbol{x}$，瞬间解耦为 $n$ 个完全独立的单变量一阶方程 $\dot{y}_k = \lambda_k y_k$！
    复杂的物理动力学演化被彻底分解为各自独立的纯粹本征模态．

---

## 4. 物理实战：两质点耦合微振动简正模

考虑两质量均为 $m$ 的质点被三个弹性系数均为 $k$ 的弹簧连接在线性轨道上．
牛顿运动方程联立为：

$$
m \ddot{x}_1 = -k x_1 + k(x_2 - x_1) = -2k x_1 + k x_2
$$

$$
m \ddot{x}_2 = -k(x_2 - x_1) - k x_2 = k x_1 - 2k x_2
$$

写成矩阵形式，设固有角频率试探解 $\ddot{\boldsymbol{x}} = -\omega^2 \boldsymbol{x}$：

$$
\begin{pmatrix} 2k/m & -k/m \\ -k/m & 2k/m \end{pmatrix} \begin{pmatrix} x_1 \\ x_2 \end{pmatrix} = \omega^2 \begin{pmatrix} x_1 \\ x_2 \end{pmatrix}
$$

令特征矩阵行列式为零求特征值 $\lambda = \omega^2$：

$$
\det \begin{pmatrix} 2\omega_0^2 - \lambda & -\omega_0^2 \\ -\omega_0^2 & 2\omega_0^2 - \lambda \end{pmatrix} = (2\omega_0^2 - \lambda)^2 - \omega_0^4 = 0 \quad (\omega_0 = \sqrt{k/m})
$$

直接解出两个特征值与对应的特征向量：
1. **同向简正模**：$\lambda_1 = \omega_1^2 = \omega_0^2 \implies \boldsymbol{v}_1 = \dfrac{1}{\sqrt{2}}\begin{pmatrix} 1 \\ 1 \end{pmatrix}$（两质点保持间距同向同相振动，中间弹簧不发生形变）；
2. **反向简正模**：$\lambda_2 = \omega_2^2 = 3\omega_0^2 \implies \boldsymbol{v}_2 = \dfrac{1}{\sqrt{2}}\begin{pmatrix} 1 \\ -1 \end{pmatrix}$（两质点反向相向运动，中间弹簧剧烈压缩伸长，振动频率提高 $\sqrt{3}$ 倍）．

定义简正坐标 $\eta_1 = \frac{x_1 + x_2}{\sqrt{2}}$ 和 $\eta_2 = \frac{x_1 - x_2}{\sqrt{2}}$，原本耦合的振动彻底解耦为两个独立的单摆谐振子！

---

## 5. 学习衔接

- **下一节**：定义复空间向量点乘与几何度量，进入 [内积空间与正交归一化](./inner-product.md)；
- **量子力学前置**：实特征值与保内积变换，参见 [厄米算符、酉变换与谱分解](./hermitian-unitary.md)．
