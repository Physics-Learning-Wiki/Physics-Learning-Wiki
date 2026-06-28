???+ note "注意"
    该页面有待完善。如果遇到错误或不完整的地方，欢迎提交 [Issue](https://github.com/Physics-Learning-Wiki/Physics-Learning-Wiki/issues)

## 向量

在物理学中，向量是描述既有大小又有方向的物理量的数学工具。例如，位移、速度、加速度、力等都是向量。

### 定义

一个 $n$ 维向量 $\vec{v}$ 可以表示为一个有序的数字列表：

$$
\vec{v} = (v_1, v_2, \dots, v_n)
$$

其中 $v_i$ 是向量在第 $i$ 个维度上的分量。在三维欧几里得空间中，一个向量通常表示为：

$$
\vec{r} = x\hat{i} + y\hat{j} + z\hat{k}
$$

其中 $\hat{i}, \hat{j}, \hat{k}$ 是沿 $x, y, z$ 轴的单位向量。

### 向量运算

#### 加法和减法

两个向量 $\vec{a} = (a_1, a_2, \dots, a_n)$ 和 $\vec{b} = (b_1, b_2, \dots, b_n)$ 的和与差定义为：

$$
\vec{a} \pm \vec{b} = (a_1 \pm b_1, a_2 \pm b_2, \dots, a_n \pm b_n)
$$

向量加法满足交换律和结合律。

#### 数量乘法

一个标量（普通数）$c$ 与向量 $\vec{v}$ 的乘积定义为：

$$
c\vec{v} = (cv_1, cv_2, \dots, cv_n)
$$

#### 点积（内积）

两个向量的点积是一个标量，定义为：

$$
\vec{a} \cdot \vec{b} = \sum_{i=1}^{n} a_i b_i = a_1 b_1 + a_2 b_2 + \dots + a_n b_n
$$

点积也等于两个向量的模长与其夹角 $\theta$ 的余弦之积：

$$
\vec{a} \cdot \vec{b} = |\vec{a}| |\vec{b}| \cos\theta
$$

其中向量的模长 $|\vec{v}| = \sqrt{\vec{v} \cdot \vec{v}} = \sqrt{v_1^2 + v_2^2 + \dots + v_n^2}$。

**例题：** 计算力 $\vec{F} = (3, 4, 5)$ N 作用下，物体沿位移 $\vec{d} = (2, 1, 0)$ m 移动时，力所做的功。

**解：** 功是力与位移的点积 $W = \vec{F} \cdot \vec{d}$。

$$
W = (3)(2) + (4)(1) + (5)(0) = 6 + 4 + 0 = 10 \, \text{J}
$$

#### 叉积（外积）

在三维空间中，两个向量的叉积是一个向量，其方向垂直于由原向量构成的平面（遵循右手定则），其大小等于以此两向量为邻边的平行四边形的面积。

$$
\vec{a} \times \vec{b} = (a_2 b_3 - a_3 b_2)\hat{i} + (a_3 b_1 - a_1 b_3)\hat{j} + (a_1 b_2 - a_2 b_1)\hat{k}
$$

叉积的大小为 $|\vec{a} \times \vec{b}| = |\vec{a}| |\vec{b}| \sin\theta$。

**例题：** 计算一个位于 $\vec{r} = (1, 1, 0)$ m 处的质点，受到力 $\vec{F} = (0, 5, 0)$ N 作用时，相对于原点的力矩 $\vec{\tau}$。

**解：** 力矩定义为 $\vec{\tau} = \vec{r} \times \vec{F}$。

$$
\vec{\tau} = ((1)(0) - (0)(5))\hat{i} + ((0)(0) - (1)(0))\hat{j} + ((1)(5) - (1)(0))\hat{k} = 5\hat{k} \, \text{N} \cdot \text{m}
$$

## 矩阵

矩阵是一个按长方阵列排列的复数或实数集合。在物理学中，矩阵被广泛用于描述线性变换，如旋转、缩放，以及在量子力学中表示算符。

### 定义

一个 $m \times n$ 的矩阵 $A$ 是一个有 $m$ 行和 $n$ 列的数字阵列：

$$
A = \begin{pmatrix}
a_{11} & a_{12} & \cdots & a_{1n} \\
a_{21} & a_{22} & \cdots & a_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
a_{m1} & a_{m2} & \cdots & a_{mn}
\end{pmatrix}
$$

### 矩阵运算

#### 加法和减法

只有同维度的矩阵才能进行加减法。对于两个 $m \times n$ 矩阵 $A$ 和 $B$，其和与差 $C = A \pm B$ 定义为：

$$
c_{ij} = a_{ij} \pm b_{ij}
$$

#### 数量乘法

一个标量 $c$ 与矩阵 $A$ 的乘积 $B = cA$ 定义为：

$$
b_{ij} = c a_{ij}
$$

#### 矩阵乘法

若 $A$ 是一个 $m \times n$ 矩阵，$B$ 是一个 $n \times p$ 矩阵，则它们的乘积 $C = AB$ 是一个 $m \times p$ 矩阵，其元素定义为：

$$
c_{ij} = \sum_{k=1}^{n} a_{ik} b_{kj}
$$

**重要提示：** 矩阵乘法不满足交换律，即 $AB \neq BA$。

**例题：** 在二维平面中，将向量 $\vec{v} = (2, 1)$ 先逆时针旋转 $90^\circ$，再沿 $x$ 轴方向拉伸为原来的 $3$ 倍。求最终的向量。

**解：** 逆时针旋转 $90^\circ$ 的变换矩阵为 $R = \begin{pmatrix} \cos 90^\circ & -\sin 90^\circ \\ \sin 90^\circ & \cos 90^\circ \end{pmatrix} = \begin{pmatrix} 0 & -1 \\ 1 & 0 \end{pmatrix}$。
沿 $x$ 轴拉伸 $3$ 倍的变换矩阵为 $S = \begin{pmatrix} 3 & 0 \\ 0 & 1 \end{pmatrix}$。

向量 $\vec{v}$ 可以写成列向量形式 $\begin{pmatrix} 2 \\ 1 \end{pmatrix}$。
最终的变换矩阵为 $T = SR$。

$$
T = \begin{pmatrix} 3 & 0 \\ 0 & 1 \end{pmatrix} \begin{pmatrix} 0 & -1 \\ 1 & 0 \end{pmatrix} = \begin{pmatrix} (3)(0)+(0)(1) & (3)(-1)+(0)(0) \\ (0)(0)+(1)(1) & (0)(-1)+(1)(0) \end{pmatrix} = \begin{pmatrix} 0 & -3 \\ 1 & 0 \end{pmatrix}
$$

最终的向量为 $\vec{v}' = T\vec{v}$：

$$
\vec{v}' = \begin{pmatrix} 0 & -3 \\ 1 & 0 \end{pmatrix} \begin{pmatrix} 2 \\ 1 \end{pmatrix} = \begin{pmatrix} (0)(2)+(-3)(1) \\ (1)(2)+(0)(1) \end{pmatrix} = \begin{pmatrix} -3 \\ 2 \end{pmatrix}
$$

所以最终的向量为 $(-3, 2)$。

### 特殊矩阵

-   **单位矩阵 $I$：** 主对角线元素为 1，其余为 0 的方阵。任何矩阵乘以单位矩阵都等于其自身 ($AI = IA = A$)。
-   **转置矩阵 $A^T$：** 将原矩阵的行与列交换得到的矩阵。
-   **逆矩阵 $A^{-1}$：** 对于方阵 $A$，如果存在一个矩阵 $A^{-1}$ 使得 $AA^{-1} = A^{-1}A = I$，则称 $A^{-1}$ 是 $A$ 的逆矩阵。
-   **对称矩阵：** 如果一个方阵等于其转置 ($A = A^T$)。
-   **正交矩阵：** 如果一个方阵的逆等于其转置 ($A^{-1} = A^T$)。在物理中，旋转矩阵是正交矩阵。
-   **厄米矩阵 (Hermitian Matrix)：** 如果一个复方阵等于其共轭转置 ($A = A^\dagger$)。在量子力学中，可观测量由厄米算符表示。

### 行列式

一个 $n \times n$ 方阵 $A$ 的行列式，记作 $\det(A)$ 或 $|A|$，是一个标量。它在几何上可以理解为矩阵所代表的线性变换对空间“体积”的影响。

对于 $2 \times 2$ 矩阵：

$$
\det \begin{pmatrix} a & b \\ c & d \end{pmatrix} = ad - bc
$$

对于 $3 \times 3$ 矩阵：

$$
\det \begin{pmatrix} a & b & c \\ d & e & f \\ g & h & i \end{pmatrix} = a(ei - fh) - b(di - fg) + c(dh - eg)
$$

**重要性质：**

-   $\det(AB) = \det(A)\det(B)$
-   $\det(A^T) = \det(A)$
-   $\det(A^{-1}) = 1/\det(A)$
-   如果 $\det(A) = 0$，则矩阵 $A$ 不可逆（称为奇异矩阵）。

### 特征值与特征向量

对于一个给定的 $n \times n$ 方阵 $A$，如果存在一个非零向量 $\vec{v}$ 和一个标量 $\lambda$，使得：

$$
A\vec{v} = \lambda\vec{v}
$$

则称 $\lambda$ 为矩阵 $A$ 的一个 **特征值**，$\vec{v}$ 为对应于特征值 $\lambda$ 的 **特征向量**。

这个方程意味着，当矩阵 $A$ 所代表的线性变换作用在特征向量 $\vec{v}$ 上时，其效果仅仅是将 $\vec{v}$ 进行缩放，缩放因子即为特征值 $\lambda$，而其方向保持不变（或反向）。

特征值和特征向量在物理中有极其重要的应用，例如在振动分析中求解系统的简正频率，或在量子力学中求解定态薛定谔方程的能量本征值。
