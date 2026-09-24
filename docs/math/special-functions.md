---
status: review
author: Physics Learning Wiki Team
description: 常用特殊函数模块已全面模块化解耦升级．本页提供重构后的架构指引与直达入口，涵盖伽马与贝塔函数、勒让德多项式、球谐函数、贝塞尔函数、厄米多项式与拉盖尔多项式．
---

## 常用特殊函数

> \[!NOTE] 模块架构升级说明
> 为彻底解决原单篇《常用特殊函数》信息过度压缩的问题，根据 **Issue #14** 与《数学物理方法》教学主线，本模块已按物理来源和几何对称性拆解为 6 篇系统化的 **特殊函数专题知识库**．
>
> 如果你是通过旧版书签或外部链接访问本页，建议直接前往对应的细分专题：

<div class="grid cards" markdown>

-   **[1. 伽马与贝塔函数](./special-functions/gamma-beta.md)**

    ***

    阶乘向复数域的解析延拓、高斯积分高阶矩计算与高维相空间超球体积．

-   **[2. 勒让德多项式与轴对称边值](./special-functions/legendre.md)**

    ***

    球坐标轴对称拉普拉斯方程解、罗德里格斯公式、正交性与静电场多极矩展开．

-   **[3. 球谐函数与中心势场](./special-functions/spherical-harmonics.md)**

    ***

    单位球面正交归一完备基、空间旋转对称性与量子力学轨道角动量算符本征态．

-   **[4. 贝塞尔函数与柱坐标波动](./special-functions/bessel.md)**

    ***

    柱坐标径向方程解、第一/二类贝塞尔函数、圆膜振动简正模与光学艾里斑衍射．

-   **[5. 厄米多项式与量子谐振子](./special-functions/hermite.md)**

    ***

    一维量子简谐振子定态薛定谔方程解、高斯加权正交性与零点能的物理根源．

-   **[6. 连带拉盖尔多项式与氢原子束缚态](./special-functions/laguerre.md)**

    ***

    库仑中心势径向波函数解、波函数节点数与玻尔能级公式 $E_n \propto -1/n^2$ 的纯数学导出．

</div>

***

## 统一数学母体：Sturm–Liouville 理论

强烈建议在阅读各特殊函数具体推导前，先阅读 **[Sturm–Liouville 本征值理论](./eigenfunction-methods/sturm-liouville.md)**，理解所有特殊函数正交性与完备性的共同物理算符本质．
