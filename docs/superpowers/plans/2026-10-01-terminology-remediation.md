# 全站术语修复与验收记录

原始输入：`.tmp-inspect/terminology-audit/`，原报告保持不变．本记录区分知识错误、用词约定与误报，不沿用未经核对的“17 处”总数．公开 docs 为修复对象；题库、根 CONTEXT.md、作者署名、图片源文件与 CI 门禁不在改写范围．

## 已确定的编辑约定

- 通行名：费曼、海森堡、菲涅尔、范德瓦尔斯、史瓦西、约当；首次中英对照，其他译名作为别名．
- 向量／矢量、算子／算符、特征／本征／固有按语境区分，不使用全站盲替换．
- 热学主词：物态方程、等体过程、定容热容；功 A 对外为正，Q=ΔU+A．
- 读者术语表与贡献者写作约定分别维护；新增检查器手动运行，不增加 CI．

## 核证依据

- 氧三相点附近饱和数据：NIST Chemistry WebBook SRD 69，https://webbook.nist.gov/cgi/fluid.cgi?ID=C7782447&Action=Data&Wide=on&Type=SatP&Digits=5&TLow=54.361&THigh=54.362&TInc=0.001&RefState=DEF&TUnit=K&PUnit=Pa&DUnit=mol%2Fl&HUnit=kJ%2Fmol&WUnit=m%2Fs&VisUnit=uPa%2As&STUnit=N%2Fm ，54.361 K 对应 146.28 Pa．按原表头 10^5 Pa 换算为 0.00146；不是无依据补小数点．核对日期 2026-10-01．
- 标准摩尔体积：理想气体 pV=νRT，R=8.31446261815324 J/(mol·K)，273.15 K、100 kPa 得 22.71095464 L/mol；101.325 kPa 得 22.41396955 L/mol．
- Robin 的命名对象为 Gustave Robin，不能因英语近似而改为 Robinson（罗宾逊）．第三类边界条件保留罗宾；参考 https://mathworld.wolfram.com/RobinBoundaryConditions.html ．
- 协变并非 GR 专属：对广义坐标点变换，欧拉–拉格朗日方程按雅可比变换，因此分析力学中的该用法不构成错误；正文可补“形式不变”的读者解释．
- 摩擦系数／摩擦因数是同一无量纲系数的通行叫法．遵循项目通行名方针，保留摩擦系数，不作为知识硬伤．
- torque-angular-momentum.md 实际存在，课程链接有效；原报告“应改 torque.md”属于误报．
- phase 页 v_g、v_L 指两相物质的量，不是摩尔体积；不可据报告 C5 一并替换为 V_m．
- 热扩散率沿用 a²=κ/(cρ)，符号本身没有错误；改名称不改为 a．

## 逐项处置

实施中．最终清单附在本节，保留原发现编号及合理保留、误报、暂缓的理由．

## 扫描与验证

原报告提及的 scan-long.csv 与五个扫描脚本未包含在输入目录内，不能声称复现旧版 481 组扫描．使用新增只读检查器重建公开页面词形清单；scan-current-before.json／scan-current-after.json 为本轮基线与结果，扫描规则及排除范围由仓库版本确定．
