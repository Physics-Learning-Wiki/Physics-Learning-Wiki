---
status: stable
author: Physics Learning Wiki Team, Leafuke
description: 经典力学知识模块导引与内容看板，梳理运动学、动力学、刚体、振动波、引力、流体与分析力学的知识结构，并提供理论力学课程直达通道。
---

## 经典力学概览

**经典力学 (Classical Mechanics)** 是物理学中最古老、最基础的基石领域，主要研究宏观物体在相互作用下的运动与动力学规律．其核心思想与数学方法（微积分、矢量分析、微分方程、变分法）贯穿于整个物理学大厦．

> [!TIP] 大学《理论力学》跟课导引
> 如果你正在学习大学本科二年级的专业必修课《理论力学》，建议直接访问 **[理论力学课程路线](../courses/theoretical-mechanics.md)**．该路线按高校教学大纲组织，将数学工具、质点系与刚体动力学、达朗贝尔原理与分析力学体系按教学进度串联，更贴合课程学习需求．

---

## 1. 经典力学的适用边界

经典力学在宏观低速弱引力条件下拥有极高的预测精度，但需明确其物理边界：

- **宏观尺度**：研究对象尺度远大于原子尺寸（$L \gg 10^{-10} \text{ m}$）．当进入微观原子或亚原子尺度时，必须由 **量子力学** 描述；
- **低速运动**：物体运动速度远小于真空光速（$v \ll c \approx 3 \times 10^8 \text{ m/s}$）．当速度接近光速时，必须采用 **狭义相对论**；
- **弱引力场**：在极端强引力场（如黑洞视界附近、致密星体）中，牛顿万有引力失效，必须采用 **广义相对论**．

---

## 2. 核心公理与基本物理量

在建立动力学微分方程之前，经典力学基于以下公理化假设与核心对象：

1. **绝对时空观**：
   - 空间是三维均匀平直的欧几里得空间，与物质存在无关；
   - 时间是绝对均匀流逝的标量参数，在所有参考系中均具有相同流逝率．
2. **质量 (Mass)**：
   - 物体惯性大小的量度，同时也是万有引力的源和作用荷（弱等效原理：惯性质量等于引力质量）．在非相对论力学中质量严格守恒且与运动状态无关．
3. **力 (Force)**：
   - 物体间相互作用的表征，是改变物体运动状态（产生加速度）的外因．

---

## 3. 知识模块全景与建设看板

Wiki 的力学模块严格按照物理知识体系组织，下表展示了当前各子模块的建设状态与推荐阅读指引：

| 知识模块 | 包含子章节 | 成熟度 | 学习重点与导引 |
| :--- | :--- | :--- | :--- |
| **质点运动学** | [基础概念](./kinematics/basic-concepts.md) · [参考系与坐标系](./kinematics/reference-frames.md) · [直线运动](./kinematics/linear-motion.md) · [匀变速运动](./kinematics/uniformly-accelerated-motion.md) · [抛体运动](./kinematics/projectile-motion.md) | **`status: stable`** | 矢径、速度与加速度矢量定义，平面极坐标与自然坐标系，相对运动与速度合成 |
| **质点动力学** | [力的概念](./dynamics/force-concepts.md) · [牛顿运动定律](./dynamics/newton-laws.md) · [惯性力与转动系](./dynamics/inertial-force.md) · [动量与能量](./dynamics/momentum-energy.md) · [质点系动力学](./dynamics/system-of-particles.md) | **`status: stable`** | 受力分析与动力学微分方程求解、非惯性系中科里奥利力、三大守恒定律与质心系 |
| **刚体力学** | [力矩与角动量](./rigid-body/torque-angular-momentum.md) · [转动惯量](./rigid-body/moment-of-inertia.md) · [刚体运动](./rigid-body/rigid-body.md) · [角动量守恒](./rigid-body/angular-momentum-conservation.md) · [复摆](./rigid-body/compound-pendulum.md) | **`status: stable`** | 定轴转动微分方程、转动动能、平行轴与垂直轴定理、角动量守恒应用 |
| **振动与波** | [总览](./oscillation-wave/oscillation-wave.md) · [线性振动](./oscillation-wave/linear-oscillation.md) · [振动的合成](./oscillation-wave/superposition.md) · [非线性振动](./oscillation-wave/nonlinear.md) · [简谐波](./oscillation-wave/harmonic-wave.md) · [介质中的波](./oscillation-wave/wave-in-continuous-medium.md) · [多普勒效应](./oscillation-wave/doppler-effect.md) | **`status: stable`** | 阻尼与受迫振动共振、相位与旋转矢量法、机械波波动方程与能量传输 |
| **引力与天体** | [万有引力与天体物理](./gravitation.md) | **`status: planned`** | 开普勒定律推导、二体问题简化为有效单体势、引力势能 |
| **流体力学** | [流体力学基础](./fluid.md) | **`status: planned`** | 连续性方程、理想流体伯努利方程、黏性流体与雷诺数 |
| **分析力学** | [拉格朗日力学](./analytical/lagrangian.md) · [哈密顿力学](./analytical/hamiltonian.md) | **`status: planned`** | 广义坐标、虚位移与达朗贝尔原理、拉格朗日方程与哈密顿正则体系（当前建设重心） |

---

## 4. 推荐学习顺序

```mermaid
flowchart LR
    Kinematics["质点运动学<br/>(位置、速度、加速度)"] --> Dynamics["质点动力学<br/>(牛顿定律、动量、能量)"]
    Dynamics --> RigidBody["刚体力学<br/>(定轴转动、角动量)"]
    RigidBody --> Waves["振动与波<br/>(简谐振动、波动方程)"]
    Waves --> Advanced["进阶拓展<br/>(引力轨道、流体与分析力学)"]
```

1. **普物基础阶段**：按 运动学 $\to$ 动力学 $\to$ 刚体力学 $\to$ 振动与波 顺次学习，建立扎实的受力分析、微分方程求解与守恒律思维；
2. **理论深化阶段**：结合 [数学工具中的常微分方程](../math/differential-equations/ode-intro.md) 与 [变分法](../math/variational-methods/calculus-of-variations.md)，进入 [理论力学课程路线](../courses/theoretical-mechanics.md) 学习分析力学的高阶方法．

如需了解本模块编写标准，请参阅 [力学章节编写说明](./mechanics-writing.md)．
