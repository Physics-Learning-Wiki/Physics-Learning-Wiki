---
status: stable
author: Physics Learning Wiki Team
description: 探讨线性算符定义、抽象算符代数、在基底下的矩阵表示、对易子运算、基变换相似矩阵以及在刚体惯量张量与量子力学观测算符中的物理应用。
---

## 线性算符与矩阵表示

## 物理问题引入：物理操作如何用数学语言精确表达？

在初等物理中，速度、电场等物理量被看作静态的向量 $\boldsymbol{v}$．
然而，在理论力学与量子力学中，物理学家更关心的是**操作与演化**：
- **刚体旋转**：刚体的角动量 $\boldsymbol{L}$ 与角速度 $\boldsymbol{\omega}$ 并不总是平行的，它们通过一个将角速度变换为角动量的矩阵相互联系：$\boldsymbol{L} = \mathbf{I}\boldsymbol{\omega}$（惯量张量）；
- **偏振光学**：一个偏振片、波片会对穿过的偏振光矢量进行衰减与相位旋转（琼斯矩阵运算）；
- **量子力学测量**：对微观粒子的测量本质上是对态矢量的一个线性作用，动量测量对应空间导数算符 $\hat{p} = -i\hbar\frac{\mathrm{d}}{\mathrm{d}x}$．

将一个态变换为另一个态的数学映射，就是 **线性算符 (Linear Operator)**．

---

## 1. 线性算符的严格定义与基本性质

设 $V$ 为数域 $\mathbb{F}$（通常为 $\mathbb{R}$ 或 $\mathbb{C}$）上的线性空间．
映射 $\hat{T}: V \to V$ 称为 **线性算符**，如果它保持加法与数乘的线性：

$$
\hat{T}(\alpha |\boldsymbol{u}\rangle + \beta |\boldsymbol{v}\rangle) = \alpha \hat{T}|\boldsymbol{u}\rangle + \beta \hat{T}|\boldsymbol{v}\rangle \quad (\forall |\boldsymbol{u}\rangle, |\boldsymbol{v}\rangle \in V, \, \forall \alpha, \beta \in \mathbb{F})
$$

（在此引入理论物理通用的狄拉克右矢符号 $|\boldsymbol{v}\rangle$ 表示向量）．

### 算符代数运算
- **加法与数乘**：$(\alpha\hat{A} + \beta\hat{B})|\boldsymbol{v}\rangle = \alpha\hat{A}|\boldsymbol{v}\rangle + \beta\hat{B}|\boldsymbol{v}\rangle$；
- **算符乘法（复合运算）**：$(\hat{A}\hat{B})|\boldsymbol{v}\rangle = \hat{A}(\hat{B}|\boldsymbol{v}\rangle)$，一般**不满足交换律**（$\hat{A}\hat{B} \neq \hat{B}\hat{A}$）；
- **对易子 (Commutator)**：衡量两个算符不可交换程度的核心代数工具：

$$
[\hat{A}, \hat{B}] = \hat{A}\hat{B} - \hat{B}\hat{A}
$$

若 $[\hat{A}, \hat{B}] = 0$，称两算符**相互对易**（可以同时被精确测量，具有共同本征基底）．

---

## 2. 算符在基底下的矩阵表示

算符是抽象的对象，但在选定具体坐标基底后，算符即可完全等价地表示为一个二维 **矩阵 (Matrix)**．

设有限维空间 $V$ 的一组基为 $\{|\boldsymbol{e}_1\rangle, |\boldsymbol{e}_2\rangle, \dots, |\boldsymbol{e}_n\rangle\}$．
线性算符 $\hat{T}$ 作用在每一个基向量上，结果必定仍可由该基底线性展开：

$$
\hat{T}|\boldsymbol{e}_j\rangle = \sum_{i=1}^n T_{ij} |\boldsymbol{e}_i\rangle = T_{1j}|\boldsymbol{e}_1\rangle + T_{2j}|\boldsymbol{e}_2\rangle + \dots + T_{nj}|\boldsymbol{e}_n\rangle
$$

展开系数构成的矩阵 $T = (T_{ij})$ 即为算符 $\hat{T}$ 在该基底下的 **矩阵表示**．
第 $j$ 列的元素就是第 $j$ 个基向量经算符变换后的新坐标！

---

## 3. 基变换与相似变换矩阵

若选取另一组新基 $\{|\boldsymbol{e}'_1\rangle, \dots, |\boldsymbol{e}'_n\rangle\}$，新旧基通过可逆过渡矩阵 $P$ 相联系：

$$
|\boldsymbol{e}'_j\rangle = \sum_{i=1}^n P_{ij} |\boldsymbol{e}_i\rangle
$$

同一个抽象算符 $\hat{T}$ 在新基下的矩阵表示 $T'$ 与旧基矩阵 $T$ 满足 **相似变换关系**：

$$
T' = P^{-1} T P
$$

**物理启示**：
物理真实不会因为我们选用了笛卡尔坐标还是倾斜坐标而改变．
矩阵的迹（$\text{Tr}(T)$）和行列式（$\det(T)$）在相似变换下保持严格不变，它们是算符本身的**固有物理不变量**！

---

## 4. 物理实战范例：泡利自旋矩阵 (Pauli Matrices)

在量子力学自旋 $1/2$ 体系中，电子的内禀角动量算符 $\hat{\boldsymbol{S}} = \frac{\hbar}{2}\boldsymbol{\sigma}$．
在以自旋向上 $|+\rangle = \begin{pmatrix} 1 \\ 0 \end{pmatrix}$ 与自旋向下 $|-\rangle = \begin{pmatrix} 0 \\ 1 \end{pmatrix}$ 为基底时，泡利自旋算符的矩阵表示为：

$$
\sigma_x = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}, \quad \sigma_y = \begin{pmatrix} 0 & -i \\ i & 0 \end{pmatrix}, \quad \sigma_z = \begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix}
$$

直接检验它们的对易代数：

$$
[\sigma_x, \sigma_y] = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}\begin{pmatrix} 0 & -i \\ i & 0 \end{pmatrix} - \begin{pmatrix} 0 & -i \\ i & 0 \end{pmatrix}\begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix} = \begin{pmatrix} i & 0 \\ 0 & -i \end{pmatrix} - \begin{pmatrix} -i & 0 \\ 0 & i \end{pmatrix} = 2i \sigma_z
$$

循环对易关系 $[\sigma_a, \sigma_b] = 2i \epsilon_{abc} \sigma_c$ 完美展现了三维空间量子旋转算符 Lie 代数的全部物理结构．

---

## 5. 学习衔接

- **下一节**：寻找使算符矩阵变为对角阵的特殊基底，进入 [本征值、本征矢与对角化](./eigenvalues.md)；
- **几何底座**：复空间长度与正交基，参见 [内积空间与正交归一化](./inner-product.md)．
