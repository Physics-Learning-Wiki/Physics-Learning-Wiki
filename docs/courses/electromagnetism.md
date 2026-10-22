---
title: 电磁学课程路线
status: draft
author: Physics Learning Wiki Team
description: 面向物理专业本科初学者的静电学五章课程路线，明确学习目标、数学进入时机、练习与后续电磁学接口．
---

## 课程目标与使用方式

这条路线面向首次系统学习电磁学的本科生，要求有基础力学、一元微积分和简单矢量运算．学习目标包括物理图像、完整推导、方法选择与条件核验；唯一性证明、球面镜像和电四极子均在必读范围．不要把「完成路线」理解为只背公式或跳过证明．

## 五章静电学路线

| 阶段 | 学习入口 | 完成后的能力 |
| --- | --- | --- |
| 1 | [电荷与静电场](../electromagnetism/chapter-1/index.md) | 由给定电荷分布选择积分、对称性或割补方法，说明方向、分段区域和尺度近似． |
| 2 | [电势与静电场方程](../electromagnetism/chapter-2/index.md) | 在电荷、场和势之间转换，理解微分方程、远场展开与边界数据各自提供的信息． |
| 3 | [静电场中的导体与边值问题](../electromagnetism/chapter-3/index.md) | 把区域、源和导体约束写成边值问题，构造并验证平面与球面的镜像解． |
| 4 | [电容与静电能](../electromagnetism/chapter-4/index.md) | 界定能量系统与保持不变的量，以组装功和场能计算静电力并与直接受力核验． |
| 5 | [电介质](../electromagnetism/chapter-5/index.md) | 联立自由电荷、极化、本构与界面条件，解释材料中的场、储能及准静态受力． |

## 数学工具的进入时机

第一章在连续电荷模型中使用定积分和坐标微元；第二章由势引入方向导数与梯度，再由通量和环流引入散度、旋度与积分定理；第三章为唯一性推导 Green 恒等式．需要通用细节时，按需阅读 [矢量微分算子](../math/vector-analysis/operators.md)、[矢量积分定理](../math/vector-analysis/integral-theorems.md)及[曲线坐标系](../math/vector-analysis/curvilinear-coordinates.md)．

## 怎样验证学习进度

每章先做正文迁移练习，再独立完成三道综合推导题．每章还有十题概念与方法自测及解析；题库中新编内容在完成人工审核前以静态练习提供，已有发布题集可以直接作答．证明题按关键条件、主步骤与检验三个层次自评．

## 后续课程接口

后续依次建设 [恒定电流与电路](../electromagnetism/dc-circuit.md)、[恒定磁场](../electromagnetism/magnetostatics.md)、[电磁感应](../electromagnetism/induction.md)、[交流电路](../electromagnetism/ac-circuit.md)及[麦克斯韦方程组与电磁波](../electromagnetism/maxwell.md)．静态、稳恒与时变条件须分别说明；电路将作为连续场在相应条件下的近似引入．

