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

阶段 2–5 共抽取 187 条报告记录（含重复项、合规记录和风格建议），按原编号闭环，不将其等同于 187 个独立错误．当前位置为当前源码的复核入口：有原行号的按基线到当前文本映射；跨页条目以代表页面或模块导学为入口，实际改动可结合五批提交审阅．原始报告不改写．

| 编号／原报告位置 | 原发现 | 分类／结果 | 当前复核入口 | 处理依据 |
|---|---|---|---|---|
| S2-A1（stage2-mechanics-findings.md:7） | A1 / angular-momentum-conservation.md / L89 / "均在**坚**直方向" / 竖直（错别字） | 知识／数值／符号：已修复 | [docs/mechanics/rigid-body/angular-momentum-conservation.md:90](../../mechanics/rigid-body/angular-momentum-conservation.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-A2（stage2-mechanics-findings.md:8） | A2 / nonlinear.md / L84 / "**幅相**关系"（推导的是振幅-频率响应） / 幅频关系 | 知识／数值／符号：已修复 | [docs/mechanics/oscillation-wave/nonlinear.md:88](../../mechanics/oscillation-wave/nonlinear.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-A3（stage2-mechanics-findings.md:9） | A3 / nonlinear.md / L200 / "**常数量级**" / 常数量级 | 知识／数值／符号：已修复 | [docs/mechanics/oscillation-wave/nonlinear.md:204](../../mechanics/oscillation-wave/nonlinear.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-A4（stage2-mechanics-findings.md:10） | A4 / linear-oscillation.md / L9 / "某一**物量**" / 某一物理量（漏字） | 知识／数值／符号：已修复 | [docs/mechanics/oscillation-wave/linear-oscillation.md:9](../../mechanics/oscillation-wave/linear-oscillation.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-A5（stage2-mechanics-findings.md:11） | A5 / linear-oscillation.md / L144 / "**则则**称" / 则称 | 知识／数值／符号：已修复 | [docs/mechanics/oscillation-wave/linear-oscillation.md:148](../../mechanics/oscillation-wave/linear-oscillation.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-A6（stage2-mechanics-findings.md:12） | A6 / system-of-particles.md / L33 / "**质点**的运动只由合外力决定" / 质心的运动（主语错） | 知识／数值／符号：已修复 | [docs/mechanics/dynamics/system-of-particles.md:41](../../mechanics/dynamics/system-of-particles.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-A7（stage2-mechanics-findings.md:13） | A7 / doppler-effect.md / L17 / "声源**本征**频率" / 固有频率（与全站"固有频率"统一） | 知识／数值／符号：已修复 | [docs/mechanics/oscillation-wave/doppler-effect.md:19](../../mechanics/oscillation-wave/doppler-effect.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-A8（stage2-mechanics-findings.md:14） | A8 / force-concepts.md / L50 / 弹簧 k 称"**弹性系数**" / 劲度系数 | 知识／数值／符号：已修复 | [docs/mechanics/dynamics/force-concepts.md:62](../../mechanics/dynamics/force-concepts.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-A9（stage2-mechanics-findings.md:15） | A9 / force-concepts.md / L90 等 / "摩擦**系数**" / 摩擦**因数**（名词委） | 知识／数值／符号：合理保留 | [docs/mechanics/dynamics/force-concepts.md:104](../../mechanics/dynamics/force-concepts.md) | 摩擦系数是通行术语，不强制淘汰． |
| S2-B1（stage2-mechanics-findings.md:21） | 位置向量 / 位置矢量（多数页）/ 位矢（system-particles、torque L18,66）/ 矢径（index L46） / 位置矢量；行文中可简称"位矢"，但不用"矢径" | 术语／格式：合理保留 | [docs/mechanics/rigid-body/torque-angular-momentum.md:26](../../mechanics/rigid-body/torque-angular-momentum.md) | 位置矢量／位矢为全称与简称；矢径在几何与有心力语境可用． |
| S2-B2（stage2-mechanics-findings.md:22） | 质点系统 / 质点系 20 / 质点组 10（system-of-particles 整页用组） / 质点系 | 术语／格式：已修复 | [docs/mechanics/dynamics/system-of-particles.md:1](../../mechanics/dynamics/system-of-particles.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B3（stage2-mechanics-findings.md:23） | SHM 名称 / 简谐振动 26 / 简谐运动（compound-pendulum L50）；"简单谐振动"（linear-oscillation 6 处，非规范扩展） / 简谐振动；删除"简单谐振动" | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/linear-oscillation.md:54](../../mechanics/oscillation-wave/linear-oscillation.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B4（stage2-mechanics-findings.md:24） | restoring force / 回复力（linear-oscillation）/ 恢复力；oscillation-wave L9 同句并用"恢复力（或回复力矩）" / 回复力、回复力矩 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/linear-oscillation.md:9](../../mechanics/oscillation-wave/linear-oscillation.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B5（stage2-mechanics-findings.md:25） | 轴定理 / 正交轴定理（moment-of-inertia L165）/ 垂直轴定理（rigid-body L40、index L48） / 垂直轴定理 | 术语／格式：已修复 | [docs/mechanics/rigid-body/moment-of-inertia.md:175](../../mechanics/rigid-body/moment-of-inertia.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B6（stage2-mechanics-findings.md:26） | 转动动能 / 转动能（torque-angular-momentum）/ 转动动能（rigid-body、angular-conservation） / 转动动能 | 术语／格式：已修复 | [docs/mechanics/rigid-body/torque-angular-momentum.md:1](../../mechanics/rigid-body/torque-angular-momentum.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B7（stage2-mechanics-findings.md:27） | 惯性系 / 惯性系 29 / 惯性参考系 14（reference-frames、inertial-force） / 惯性系 | 术语／格式：合理保留 | [docs/mechanics/kinematics/reference-frames.md:1](../../mechanics/kinematics/reference-frames.md) | 惯性参考系与惯性系是全称与简称，不构成错误． |
| S2-B8（stage2-mechanics-findings.md:28） | 质心系 / 质心系 / 质心参考系（momentum-energy L284-286 同段并用） / 质心系 | 术语／格式：合理保留 | [docs/mechanics/dynamics/momentum-energy.md:313](../../mechanics/dynamics/momentum-energy.md) | 质心参考系与质心系是全称与简称，不构成错误． |
| S2-B9（stage2-mechanics-findings.md:29） | 离心力（惯性） / 惯性离心力（L73）/ 离心惯性力（L110） / 惯性离心力 | 术语／格式：已修复 | [docs/mechanics/dynamics/inertial-force.md:85](../../mechanics/dynamics/inertial-force.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B10（stage2-mechanics-findings.md:30） | linear momentum / 线动量（torque L67）/ 线性动量（system-particles L37,39） / 线动量 | 术语／格式：已修复 | [docs/mechanics/dynamics/system-of-particles.md:77](../../mechanics/dynamics/system-of-particles.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B11（stage2-mechanics-findings.md:31） | 均质/均匀 / 均质（angular-conservation L117）/ 均匀（多处） / 均匀（形容词统一） | 术语／格式：合理保留 | [docs/mechanics/rigid-body/angular-momentum-conservation.md:118](../../mechanics/rigid-body/angular-momentum-conservation.md) | 均质与均匀在此题均指质量分布均匀． |
| S2-B12（stage2-mechanics-findings.md:32） | 有心力 / 中心力（angular-conservation L144）/ 有心力（标准） / 有心力 | 术语／格式：合理保留 | [docs/mechanics/rigid-body/angular-momentum-conservation.md:150](../../mechanics/rigid-body/angular-momentum-conservation.md) | 中心力假设为合法用法，与有心力名称并存不改变物理含义． |
| S2-B13（stage2-mechanics-findings.md:33） | 对数减缩 / 对数减量（oscillation-wave L168） / 对数减缩 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/oscillation-wave.md:170](../../mechanics/oscillation-wave/oscillation-wave.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B14（stage2-mechanics-findings.md:34） | forced oscillation / 受迫振动（全站）/ 强迫振动（linear-oscillation L377 标题） / 受迫振动 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/linear-oscillation.md:381](../../mechanics/oscillation-wave/linear-oscillation.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B15（stage2-mechanics-findings.md:35） | d'Alembert / d'Alembert 形式（wave-medium L168）/ 达朗贝尔原理（index L12） / 达朗贝尔（统一译名） | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/wave-in-continuous-medium.md:172](../../mechanics/oscillation-wave/wave-in-continuous-medium.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B16（stage2-mechanics-findings.md:36） | 相位传播 / "相位传输法"（harmonic-wave L54） / 相位传播法 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/harmonic-wave.md:56](../../mechanics/oscillation-wave/harmonic-wave.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B17（stage2-mechanics-findings.md:37） | constructive 干涉 / "增强干涉"（harmonic-wave L137） / 相长干涉（与相消配对） | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/harmonic-wave.md:139](../../mechanics/oscillation-wave/harmonic-wave.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B18（stage2-mechanics-findings.md:38） | 弦阻抗 / "机械阻抗"（wave-medium L269，Z=√Tμ） / 特性阻抗 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/wave-in-continuous-medium.md:275](../../mechanics/oscillation-wave/wave-in-continuous-medium.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B19（stage2-mechanics-findings.md:39） | 弹性力 / 弹力 10（force-concepts）/ 弹性力 0 / 建议明确：正文统一"弹性力"或保留中学"弹力"并在首次出现时并注 | 术语／格式：已修复 | [docs/mechanics/dynamics/force-concepts.md:1](../../mechanics/dynamics/force-concepts.md) | 保留弹力，在首次标题并注弹性力． |
| S2-B20（stage2-mechanics-findings.md:40） | 球壳 / moment-of-inertia 表用"空心球"（2/3 MR² 实为薄球壳） / 球壳 | 术语／格式：已修复 | [docs/mechanics/rigid-body/moment-of-inertia.md:1](../../mechanics/rigid-body/moment-of-inertia.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B21（stage2-mechanics-findings.md:41） | 直线运动 / "线性运动"（moment-of-inertia L3,21、torque L25,74,113） / 直线运动 | 术语／格式：已修复 | [docs/mechanics/rigid-body/moment-of-inertia.md:1](../../mechanics/rigid-body/moment-of-inertia.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B22（stage2-mechanics-findings.md:42） | 生造词 / "作用荷"（index L34）、"流逝率"（index L32） / 作用源/（直接表述） | 术语／格式：已修复 | [docs/mechanics/index.md:33](../../mechanics/index.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-B23（stage2-mechanics-findings.md:43） | 能量传播 / "能量传输"（index L49） / 能量传播 | 术语／格式：合理保留 | [docs/mechanics/index.md:50](../../mechanics/index.md) | 能量传输与能量传播均可准确描述波的能量输运． |
| S2-B24（stage2-mechanics-findings.md:44） | 冲击波处 / "压力跃变"（doppler L112） / 压强跃变 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/doppler-effect.md:114](../../mechanics/oscillation-wave/doppler-effect.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-C1（stage2-mechanics-findings.md:48） | - 矢量 57 / 向量 3：3 处"向量"= torque L20"向量叉乘"、reference-frames L416、（另一处待核）。力学模块应统一取"矢量"或随 symbol.md 取"向量"（见总报告决策）。 | 术语／格式：已修复 | [docs/mechanics/rigid-body/torque-angular-momentum.md:28](../../mechanics/rigid-body/torque-angular-momentum.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-C2（stage2-mechanics-findings.md:49） | - 算子 1（superposition L20"线性算子"）；固有 5（固有频率/固有角频率，正确）。 | 术语／格式：合理保留 | [docs/mechanics/oscillation-wave/superposition.md:22](../../mechanics/oscillation-wave/superposition.md) | 线性算子和固有频率语境正确． |
| S2-D1（stage2-mechanics-findings.md:53） | 1. 半角括号夹英文：force-concepts、newton-laws、inertial-force、torque、moment-of-inertia、rigid-body、compound-pendulum 标题 vs basic-concepts/projectile 等全角页——模块内不统一（PUNC-2）。 | 术语／格式：已修复 | [docs/mechanics/dynamics/force-concepts.md:1](../../mechanics/dynamics/force-concepts.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-D2（stage2-mechanics-findings.md:54） | 2. 加粗失效（** 后带空格）：basic-concepts L40,L53；superposition L334；linear-oscillation L250,L301；oscillation-wave L123；wave-medium L234。 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/superposition.md:42](../../mechanics/oscillation-wave/superposition.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-D3（stage2-mechanics-findings.md:55） | 3. 块引用（MDFM-5 要求用 admonition）：basic-concepts L20；newton-laws L41,L59,L103。 | 术语／格式：已修复 | [docs/mechanics/dynamics/newton-laws.md:20](../../mechanics/dynamics/newton-laws.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-D4（stage2-mechanics-findings.md:56） | 4. blockquote 内写 [!NOTE]/[!TIP] 原始语法：angular-conservation L53、index L11（渲染异常）。 | 术语／格式：已修复 | [docs/mechanics/rigid-body/angular-momentum-conservation.md:53](../../mechanics/rigid-body/angular-momentum-conservation.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-D5（stage2-mechanics-findings.md:57） | 5. oscillation-wave L243/L249/L259/L389：\tilde \tan \tau 的 \t 被转成制表符，命令损坏（" ilde X"" an δ"" au"）。 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/oscillation-wave.md:245](../../mechanics/oscillation-wave/oscillation-wave.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-D6（stage2-mechanics-findings.md:58） | 6. oscillation-wave L264–271：$$ 未及时闭合，admonition 被吞入公式。 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/oscillation-wave.md:266](../../mechanics/oscillation-wave/oscillation-wave.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-D7（stage2-mechanics-findings.md:59） | 7. harmonic-wave L461："### 6.3" 空标题。 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/harmonic-wave.md:463](../../mechanics/oscillation-wave/harmonic-wave.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-D8（stage2-mechanics-findings.md:60） | 8. 图片多为 PNG（SAVE-3 建议 SVG）：rotating_frame、各 axis 图、duffing、beats、driven、mach_cone 等。 | 术语／格式：有依据的暂缓 | [docs/mechanics/index.md:1](../../mechanics/index.md) | 用户范围明确不重绘图片，保留作者原图． |
| S2-D9（stage2-mechanics-findings.md:61） | 9. fluid.md / gravitation.md frontmatter 缺 status: planned（仅有 noindex meta）。 | 术语／格式：已修复 | [docs/mechanics/fluid.md:1](../../mechanics/fluid.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-D10（stage2-mechanics-findings.md:62） | 10. newton-laws L51："阶段一的小测默认题目……"疑似残留文本。 | 术语／格式：已修复 | [docs/mechanics/dynamics/newton-laws.md:57](../../mechanics/dynamics/newton-laws.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-D11（stage2-mechanics-findings.md:63） | 11. doppler L100：序号用半角 (1)(2)，应为全角（1）（2）。 | 术语／格式：已修复 | [docs/mechanics/oscillation-wave/doppler-effect.md:102](../../mechanics/oscillation-wave/doppler-effect.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S2-D12（stage2-mechanics-findings.md:64） | 12. angular-conservation L9 英文注 "Rotational Invariance" 与"空间各向同性"不符（应为 Isotropy of Space）。 | 术语／格式：已修复 | [docs/mechanics/rigid-body/angular-momentum-conservation.md:9](../../mechanics/rigid-body/angular-momentum-conservation.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A1（stage3-thermo-findings.md:12） | A1 / chapter-2/equipartition… L110 / **绝热指数（泊松比）** / 绝热指数（比热容比） / **严重误标**：泊松比（Poisson's ratio）是弹性力学概念（横向/纵向应变比 ν），与 γ=Cp/CV 毫无关系；L112 已自行补「比热容比」 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-2/equipartition-theorem-and-heat-capacity.md:116](../../thermodynamics/chapter-2/equipartition-theorem-and-heat-capacity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A2（stage3-thermo-findings.md:13） | A2 / chapter-4/clausius… L598 / **施密特（Schmidt）的诘难** / **洛施密特（Loschmidt）的诘难** / **人名张冠李戴**：H 定理的「可逆性诘难」（Umkehreinwand）出自 Loschmidt，非 Schmidt | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-4/clausius-inequality-and-entropy.md:599](../../thermodynamics/chapter-4/clausius-inequality-and-entropy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A3（stage3-thermo-findings.md:14） | A3 / chapter-1/phase-transitions… L61 / C→B：**气固共存** / 固液共存 / 同文件 L96 正确写「固液共存」，自相矛盾 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-1/phase-transitions-and-coexistence.md:63](../../thermodynamics/chapter-1/phase-transitions-and-coexistence.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A4（stage3-thermo-findings.md:15） | A4 / chapter-1/heat-and-its-nature L124 / 「功是宏观运动分子热运动．热量是分子热运动分子热运动」 / 做功是宏观运动与分子热运动的转化；传热是分子热运动的传递 / 句子残缺、叠词 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-1/heat-and-its-nature.md:127](../../thermodynamics/chapter-1/heat-and-its-nature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A5（stage3-thermo-findings.md:16） | A5 / chapter-1/temperature L57 / 丹尼尔·加布里埃尔·**华氏** / **华伦海特**（Fahrenheit） / 「华氏」是温标名，不是人名译名 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-1/temperature.md:59](../../thermodynamics/chapter-1/temperature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A6（stage3-thermo-findings.md:17） | A6 / chapter-1/temperature L60 / 压强或体积在**定量**条件下的变化 / 疑为「定容（或定压）」误写 / 语义不通 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-1/temperature.md:62](../../thermodynamics/chapter-1/temperature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A7（stage3-thermo-findings.md:18） | A7 / chapter-1/phase-transitions L31、L33 / **出**于热平衡 / 处于热平衡 / 错别字，2 处 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-1/phase-transitions-and-coexistence.md:33](../../thermodynamics/chapter-1/phase-transitions-and-coexistence.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A8（stage3-thermo-findings.md:19） | A8 / chapter-1/phase-transitions L133 / O₂ 三相点压强「9.0015」 / 0.0015（×10⁵ Pa，约 146 Pa） / 数值疑漏小数点 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-1/phase-transitions-and-coexistence.md:135](../../thermodynamics/chapter-1/phase-transitions-and-coexistence.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A9（stage3-thermo-findings.md:20） | A9 / chapter-1/temperature L135 / 标准态 100 kPa 配摩尔体积 22.4 L / 100 kPa 下应为 22.71 L（22.4 L 对应 101.325 kPa） / 教材沿袭小疵，建议加注 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-1/temperature.md:137](../../thermodynamics/chapter-1/temperature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A10（stage3-thermo-findings.md:21） | A10 / chapter-3/first-law-ideal-gas L95 / 「Adiabatic index 或**热容比比热容**」 / 绝热指数（比热容比） / 文字叠床架屋 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-3/first-law-ideal-gas.md:94](../../thermodynamics/chapter-3/first-law-ideal-gas.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A11（stage3-thermo-findings.md:22） | A11 / chapter-3/cycle L688-690 / 链接 images/./first-law-ideal-gas.md、images/../chapter-4/index.md / 去掉 images/ 前缀 / 3 处链接全部失效 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-3/cycle-process-and-carnot-cycle.md:657](../../thermodynamics/chapter-3/cycle-process-and-carnot-cycle.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A12（stage3-thermo-findings.md:23） | A12 / chapter-3/index L13 / 孤立空列表符「-」 / 补写学习目标 / 内容未完成 | 知识／数值／符号：已修复 | [docs/thermodynamics/index.md:14](../../thermodynamics/index.md) | 移除孤立列表符号，不扩写空壳学习目标． |
| S3-A13（stage3-thermo-findings.md:24） | A13 / chapter-1/temperature L148-151；heat L188-191 / admonition 内列表损坏（「\- 」「-$0」） / 修复列表 / 渲染异常 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-1/temperature.md:150](../../thermodynamics/chapter-1/temperature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-A14（stage3-thermo-findings.md:25） | A14 / chapter-1/phase-transitions L96 / (V\_g^{mol}) 转义下划线原样显示 / 去掉反斜杠 / — | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-1/phase-transitions-and-coexistence.md:98](../../thermodynamics/chapter-1/phase-transitions-and-coexistence.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B1（stage3-thermo-findings.md:33） | 范德瓦尔斯 / 范德瓦耳斯 / 13 / 5 / **范德瓦耳斯** / 名词委译名；gas.md 同文件内 L19/24/31/573 用「斯」、L582/628/634 用「耳」 | 术语／格式：已修复 | [docs/thermodynamics/index.md:20](../../thermodynamics/index.md) | 按已确定规则采用范德瓦尔斯，登记范德瓦耳斯为别名． |
| S3-B2（stage3-thermo-findings.md:34） | 物态方程 / 状态方程 / 19 / 10 / **物态方程** / 赵书体系用词；但 thermo-writing L82 写「状态方程」，需先改写作指南 | 术语／格式：已修复 | [docs/thermodynamics/thermodynamics-writing.md:84](../../thermodynamics/thermodynamics-writing.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B3（stage3-thermo-findings.md:35） | 蒸气 / 蒸汽 / 15 / 18 / **蒸气**（饱和蒸气、蒸气压、蒸气机） / 物理学术语；「蒸汽」为口语/特指水蒸气 | 术语／格式：已修复 | [docs/thermodynamics/chapter-1/phase-transitions-and-coexistence.md:1](../../thermodynamics/chapter-1/phase-transitions-and-coexistence.md) | 学术气相使用蒸气；蒸汽机等设备名合理保留． |
| S3-B4（stage3-thermo-findings.md:36） | 等体 / 等容（过程） / 37 / 1 / **等体过程** / 赵书用词，数据高度收敛 | 术语／格式：已修复 | [docs/thermodynamics/chapter-3/first-law-ideal-gas.md:1](../../thermodynamics/chapter-3/first-law-ideal-gas.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B5（stage3-thermo-findings.md:37） | 定容 / 定体（热容/温度计） / 18 / 4 / **定容热容**；「定体气体温度计」可保留赵书原名 / 事实约定：过程用「等体」、热容用「定容」 | 术语／格式：已修复 | [docs/thermodynamics/chapter-2/equipartition-theorem-and-heat-capacity.md:1](../../thermodynamics/chapter-2/equipartition-theorem-and-heat-capacity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B6（stage3-thermo-findings.md:38） | 摩尔数 / 物质的量 / 摩尔数 6 处 / **物质的量**（符号 ν） / temperature L135、phase L69、gas L538、gas-heat-capacity L468/L515 | 术语／格式：已修复 | [docs/thermodynamics/chapter-1/temperature.md:137](../../thermodynamics/chapter-1/temperature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B7（stage3-thermo-findings.md:39） | 粘滞 / 黏滞 / 1 / 3 / **黏滞**（黏滞性、黏性） / second-law L48 用「粘滞」 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/second-law-and-carnot-theorem.md:50](../../thermodynamics/chapter-4/second-law-and-carnot-theorem.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B8（stage3-thermo-findings.md:40） | 汤姆孙 / 汤姆森 / — / **汤姆孙** / gas-heat-capacity 全篇「焦耳-汤姆孙」正确；temperature L62 作「威廉·汤姆森」需统一 | 术语／格式：已修复 | [docs/thermodynamics/chapter-1/temperature.md:64](../../thermodynamics/chapter-1/temperature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B9（stage3-thermo-findings.md:41） | 定温/恒温/等温（条件描述） / 定温 5 / 条件名统一**等温等容、等温等压**；描述热源用「恒温」 / thermal-equilibrium 标题「定温定体」、正文「恒温恒容/恒温恒压」、他处「等温等压」并存 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/thermal-equilibrium-and-free-energy.md:1](../../thermodynamics/chapter-4/thermal-equilibrium-and-free-energy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B10（stage3-thermo-findings.md:42） | 比热容 / 比热 / 12 / 13（全站） / **比热容** / heat L53「比热容或比热」并列 | 术语／格式：合理保留 | [docs/thermodynamics/chapter-1/heat-and-its-nature.md:54](../../thermodynamics/chapter-1/heat-and-its-nature.md) | 比热容为主词，首次说明比热别名可保留． |
| S3-B11（stage3-thermo-findings.md:43） | 热容 / 热容量 / 115 / 11（全站） / **热容** / equipartition L92、标题链接处残留「热容量」 | 术语／格式：已修复 | [docs/thermodynamics/chapter-2/equipartition-theorem-and-heat-capacity.md:96](../../thermodynamics/chapter-2/equipartition-theorem-and-heat-capacity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B12（stage3-thermo-findings.md:44） | 化学计量数 / 化学计量系数 / — / **化学计量数** / clausius L341/L497/L504 用「系数」 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/clausius-inequality-and-entropy.md:343](../../thermodynamics/chapter-4/clausius-inequality-and-entropy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B13（stage3-thermo-findings.md:45） | 反转温度 / 转换温度 / — / **转换温度**（inversion temperature） / gas-heat-capacity L354 用「反转温度」 | 术语／格式：已修复 | [docs/thermodynamics/chapter-3/gas-heat-capacity-internal-energy-enthalpy.md:362](../../thermodynamics/chapter-3/gas-heat-capacity-internal-energy-enthalpy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B14（stage3-thermo-findings.md:46） | 直线型/非直线型（分子） / — / **线型/非线型** / equipartition L40/L49 | 术语／格式：已修复 | [docs/thermodynamics/chapter-2/equipartition-theorem-and-heat-capacity.md:44](../../thermodynamics/chapter-2/equipartition-theorem-and-heat-capacity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B15（stage3-thermo-findings.md:47） | Clausius-Clapeyron 英文裸用 / 2 处标题级 / **克劳修斯-克拉珀龙方程** / carnot-applications L138/L164/L214 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/carnot-theorem-applications.md:140](../../thermodynamics/chapter-4/carnot-theorem-applications.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B16（stage3-thermo-findings.md:48） | 策尔梅洛 / 策梅洛 / — / **策梅洛**（Zermelo） / clausius L608 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/clausius-inequality-and-entropy.md:609](../../thermodynamics/chapter-4/clausius-inequality-and-entropy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B17（stage3-thermo-findings.md:49） | 始态复现定理 / 庞加莱回归定理 / — / **庞加莱回归定理** / clausius L610 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/clausius-inequality-and-entropy.md:609](../../thermodynamics/chapter-4/clausius-inequality-and-entropy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B18（stage3-thermo-findings.md:50） | 闭合系统 / 封闭系统 / 闭合 3 处 / **封闭系统** / energy-conservation L85/L95/L178 | 术语／格式：已修复 | [docs/thermodynamics/chapter-3/energy-conservation-to-first-law.md:89](../../thermodynamics/chapter-3/energy-conservation-to-first-law.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B19（stage3-thermo-findings.md:51） | 精确微分/不完全微分 / — / **全微分（恰当微分）/非全微分** / energy-conservation L134 | 术语／格式：已修复 | [docs/thermodynamics/chapter-3/energy-conservation-to-first-law.md:140](../../thermodynamics/chapter-3/energy-conservation-to-first-law.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B20（stage3-thermo-findings.md:52） | 相转变 / 相变 / — / **相变** / heat L65 | 术语／格式：已修复 | [docs/thermodynamics/chapter-1/heat-and-its-nature.md:67](../../thermodynamics/chapter-1/heat-and-its-nature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B21（stage3-thermo-findings.md:53） | 平移、旋转（分子运动形式） / — / **平动、转动**（平动、振动、转动） / heat L83 | 术语／格式：已修复 | [docs/thermodynamics/chapter-1/heat-and-its-nature.md:85](../../thermodynamics/chapter-1/heat-and-its-nature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B22（stage3-thermo-findings.md:54） | 迪赛尔 / 狄塞尔 / — / **狄塞尔**（Rudolf Diesel） / cycle 全篇「迪赛尔」 | 术语／格式：已修复 | [docs/thermodynamics/chapter-3/cycle-process-and-carnot-cycle.md:1](../../thermodynamics/chapter-3/cycle-process-and-carnot-cycle.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B23（stage3-thermo-findings.md:55） | 截止比 / 预胀比 / — / **预胀比**（cutoff ratio） / cycle L333 | 术语／格式：已修复 | [docs/thermodynamics/chapter-3/cycle-process-and-carnot-cycle.md:345](../../thermodynamics/chapter-3/cycle-process-and-carnot-cycle.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B24（stage3-thermo-findings.md:56） | 热能 / 内能 / 口语多处 / 严谨处用**内能** / heat L52「储存热能的能力」；second-law L23；clausius L486 | 术语／格式：已修复 | [docs/thermodynamics/chapter-1/heat-and-its-nature.md:54](../../thermodynamics/chapter-1/heat-and-its-nature.md) | 储存能量用内能，摩擦与热量区别已澄清；工程能源叙述中的热能保留． |
| S3-B25（stage3-thermo-findings.md:57） | 「泊松方程」（绝热 pV^γ） / 3 处 / **绝热泊松公式**（与电磁学泊松方程区分） / gas-heat-capacity L147、first-law L95 | 术语／格式：已修复 | [docs/thermodynamics/chapter-3/first-law-ideal-gas.md:148](../../thermodynamics/chapter-3/first-law-ideal-gas.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B26（stage3-thermo-findings.md:58） | 对比压力 / 对比压强 / — / **对比压强** / gas L619 | 术语／格式：已修复 | [docs/thermodynamics/index.md:1](../../thermodynamics/index.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B27（stage3-thermo-findings.md:59） | 状态方程式 / 状态方程 / — / **状态（物态）方程** / gas L617 | 术语／格式：已修复 | [docs/thermodynamics/index.md:1](../../thermodynamics/index.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B28（stage3-thermo-findings.md:60） | 直角坐标系 / 笛卡尔坐标系 / — / **笛卡尔坐标系** / gas L60 | 术语／格式：合理保留 | [docs/thermodynamics/index.md:61](../../thermodynamics/index.md) | 直角坐标系与笛卡尔坐标系是合法全称与别名． |
| S3-B29（stage3-thermo-findings.md:61） | 阿焦耳（attojoule 音译） / 1 处 / 阿[托]焦耳或直接 10⁻¹⁸ J / gas L440 | 术语／格式：已修复 | [docs/thermodynamics/index.md:1](../../thermodynamics/index.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-B30（stage3-thermo-findings.md:62） | 作功 / 做功 / 作功 3（全站） / **做功** / gas-heat-capacity L193、汇总表 | 术语／格式：已修复 | [docs/thermodynamics/chapter-3/gas-heat-capacity-internal-energy-enthalpy.md:195](../../thermodynamics/chapter-3/gas-heat-capacity-internal-energy-enthalpy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-C1（stage3-thermo-findings.md:68） | C1 / **功的符号分裂**：chapter-1 heat 页用 W；chapter-3/4 主体用 A（A>0 系统对外做功）；cycle 页 L38 定义 A=外界对系统做功、A'=系统对外做功，与同章 energy-conservation 页 L100「A>0 系统对外做功」直接冲突 / 全模块统一：A 表系统对外做功且为正（与第一定律 Q=ΔU+A 配套），cycle 页撇号约定改写或明确说明 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-3/cycle-process-and-carnot-cycle.md:31](../../thermodynamics/chapter-3/cycle-process-and-carnot-cycle.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-C2（stage3-thermo-findings.md:69） | C2 / first-law-ideal-gas L213-219 汇总表「外界作功」列符号与正文约定矛盾（等压膨胀正文 A'=pΔV>0，表中作 −pΔV；绝热行膨胀时为负） / 统一口径，建议表头改「系统对外做功 A」并全列改号 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-3/first-law-ideal-gas.md:215](../../thermodynamics/chapter-3/first-law-ideal-gas.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-C3（stage3-thermo-findings.md:70） | C3 / thermal-equilibrium：L40 用 Σ 表系统，L582 又用 Σ 表净熵流率 / 熵流率改用 $\dot S_{\rm net}$ 等 | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-4/thermal-equilibrium-and-free-energy.md:44](../../thermodynamics/chapter-4/thermal-equilibrium-and-free-energy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-C4（stage3-thermo-findings.md:71） | C4 / heat L98/L100 数学模式内用字面 << >> / 改 \ll \gg | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-1/heat-and-its-nature.md:101](../../thermodynamics/chapter-1/heat-and-its-nature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-C5（stage3-thermo-findings.md:72） | C5 / phase L72：v_g/v_L 小写，与 V_g^{mol} 大小写不一；gas L505/511 用 v_α/v 表分子数密度（非标准） / 统一摩尔体积 V_m、分子数密度 n | 知识／数值／符号：误报 | [docs/thermodynamics/chapter-1/phase-transitions-and-coexistence.md:74](../../thermodynamics/chapter-1/phase-transitions-and-coexistence.md) | 两相 v_g/v_L 是物质的量，已补解释；分子数密度的符号可自定义，不机械改为摩尔体积． |
| S3-C6（stage3-thermo-findings.md:73） | C6 / 摩尔热容记号 C^{mol} / C_m 两种写法并存 / 统一 C_m（与 first-law 多方页 C_m 一致） | 知识／数值／符号：已修复 | [docs/thermodynamics/chapter-3/gas-heat-capacity-internal-energy-enthalpy.md:1](../../thermodynamics/chapter-3/gas-heat-capacity-internal-energy-enthalpy.md) | 气体过程摩尔热容统一为 C_{V,m}/C_{p,m}，与总热容明确区分． |
| S3-C7（stage3-thermo-findings.md:74） | C7 / gas L424 称 k 为「热容系数」 / 改为玻尔兹曼常量，原表述不严谨 | 知识／数值／符号：已修复 | [docs/thermodynamics/index.md:1](../../thermodynamics/index.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-D1（stage3-thermo-findings.md:78） | 1. **半角直引号 " " 大量用于中文**（PUNC-3，应「」）：chapter-2/index L13；maxwell 页 L38/75/89/252/259/433/439/441 等；chapter-4 各页极多（second-law L7/21/27/102；clausius L89/549/559/563/592/603/612/624/630；thermal L489/508/538；carnot-app L205；cycle L600）。 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/second-law-and-carnot-theorem.md:15](../../thermodynamics/chapter-4/second-law-and-carnot-theorem.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-D2（stage3-thermo-findings.md:79） | 2. **连接号带空格**（PUNC-8）：temperature L112「盖 - 吕萨克」；gas-heat-capacity 多处「焦耳 - 汤姆孙」「林德 - 汉普孙」；应「焦耳-汤姆孙」。 | 术语／格式：已修复 | [docs/thermodynamics/chapter-1/temperature.md:114](../../thermodynamics/chapter-1/temperature.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-D3（stage3-thermo-findings.md:80） | 3. thermal-equilibrium L589 数值区间「2—3」「4%—25%」误用 em dash，应 en dash 或「～」。 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/thermal-equilibrium-and-free-energy.md:573](../../thermodynamics/chapter-4/thermal-equilibrium-and-free-energy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-D4（stage3-thermo-findings.md:81） | 4. second-law L72 加粗失效（\*\* … \*\*）。 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/second-law-and-carnot-theorem.md:74](../../thermodynamics/chapter-4/second-law-and-carnot-theorem.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-D5（stage3-thermo-findings.md:82） | 5. **块引用图注**（MDFM-5 应用折叠框或普通排印）：phase L46/52/136；cycle L68/72/409/429。 | 术语／格式：已修复 | [docs/thermodynamics/chapter-1/phase-transitions-and-coexistence.md:48](../../thermodynamics/chapter-1/phase-transitions-and-coexistence.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-D6（stage3-thermo-findings.md:83） | 6. first-law L135「5~6」、L168 等处波浪号代区间，全站不统一（en dash 与～混用）。 | 术语／格式：合理保留 | [docs/thermodynamics/chapter-3/first-law-ideal-gas.md:137](../../thermodynamics/chapter-3/first-law-ideal-gas.md) | 正文区间符号存在不同写法但含义明确；公式／示例不机械替换． |
| S3-D7（stage3-thermo-findings.md:84） | 7. thermal-equilibrium L598「下一章还没施工完成捏~」——口语化，违反 CONT-5 书面客观。 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/thermal-equilibrium-and-free-energy.md:582](../../thermodynamics/chapter-4/thermal-equilibrium-and-free-energy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-D8（stage3-thermo-findings.md:85） | 8. maxwell L265 表头半角括号。 | 术语／格式：已修复 | [docs/thermodynamics/index.md:1](../../thermodynamics/index.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-D9（stage3-thermo-findings.md:86） | 9. 图片大量使用 PNG（cycle 页 12 张全部 PNG），phase L104 临界点图为 JPG；与全站 SVG 倡议不符。 | 术语／格式：有依据的暂缓 | [docs/thermodynamics/chapter-3/cycle-process-and-carnot-cycle.md:112](../../thermodynamics/chapter-3/cycle-process-and-carnot-cycle.md) | 用户范围明确不重绘图片． |
| S3-D10（stage3-thermo-findings.md:87） | 10. second-law L183「情况①②」圈码序号，按 CONT-8 建议用「情况一、情况二」。 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/second-law-and-carnot-theorem.md:183](../../thermodynamics/chapter-4/second-law-and-carnot-theorem.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-D11（stage3-thermo-findings.md:88） | 11. clausius L333 标准态写 1 atm，与 gas-heat-capacity 标准态 p°=1 bar 不一致。 | 术语／格式：已修复 | [docs/thermodynamics/chapter-4/clausius-inequality-and-entropy.md:335](../../thermodynamics/chapter-4/clausius-inequality-and-entropy.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S3-D12（stage3-thermo-findings.md:89） | 12. 含 frontmatter author: … ChatGPT 的页面：energy-conservation、heat 页（建议统一署名策略）。 | 术语／格式：合理保留 | [docs/thermodynamics/chapter-3/energy-conservation-to-first-law.md:1](../../thermodynamics/chapter-3/energy-conservation-to-first-law.md) | 用户要求保留真实署名，不能统一覆盖贡献者． |
| S4-A1（stage4-math-findings.md:12） | A1 / vector-analysis/operators L133 / 「**هر** 点」混入波斯语字符 هر / 每一点 | 知识／数值／符号：已修复 | [docs/math/index.md:1](../../math/index.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-A2（stage4-math-findings.md:13） | A2 / complex-analysis/analytic-functions L264 / 「则称其实调和函数」 / 则称其为实调和函数 | 知识／数值／符号：已修复 | [docs/math/complex-analysis/analytic-functions.md:270](../../math/complex-analysis/analytic-functions.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-A3（stage4-math-findings.md:14） | A3 / transforms/fourier-transform L52-57 / 性质表多行被拆进错误单元格（\$…\$ 转义、列错位） / 修复表格 | 知识／数值／符号：已修复 | [docs/math/transforms/fourier-transform.md:56](../../math/transforms/fourier-transform.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-A4（stage4-math-findings.md:15） | A4 / transforms/delta-function L60-66 / 同上，性质表 3 行错位 / 修复表格 | 知识／数值／符号：已修复 | [docs/math/transforms/delta-function.md:60](../../math/transforms/delta-function.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-A5（stage4-math-findings.md:16） | A5 / differential-equations/pde-intro L104-106 / 三类边界条件表数学式被拆到相邻单元格 / 修复表格 | 知识／数值／符号：已修复 | [docs/math/differential-equations/pde-intro.md:106](../../math/differential-equations/pde-intro.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-A6（stage4-math-findings.md:17） | A6 / 多处块引用内残留字面 [!NOTE]/[!TIP] / 根 complex L120、complex-numbers L442、analytic L400、series-expansion L348、residue L388、calculus/ode L9、variational L9、根 special-functions L9 / 改为 ??? note/tip 折叠框 | 知识／数值／符号：已修复 | [docs/math/complex-analysis/complex-numbers.md:121](../../math/complex-analysis/complex-numbers.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-A7（stage4-math-findings.md:18） | A7 / vector-analysis/integral-theorems L34/44/62/72/97/98 / 中文句末用半角 !（6 处：「得以幸存！」「纯数学得出！」等） / 改用全角！或改为陈述语气 | 知识／数值／符号：已修复 | [docs/math/vector-analysis/integral-theorems.md:36](../../math/vector-analysis/integral-theorems.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-A8（stage4-math-findings.md:19） | A8 / 其余半角 ! 散落 / operators L59、greens L24/64/77/107/125、hermite L35、laguerre L57/113/133、fourier-transform L81/99、fourier-series L109/120、residue L76/209、contour L332/333、variations L75/81、delta L113、pde L118、laplace L56 / 同上 | 知识／数值／符号：已修复 | [docs/math/eigenfunction-methods/greens-function.md:59](../../math/eigenfunction-methods/greens-function.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B1（stage4-math-findings.md:29） | 抽象线性代数、向量空间、特征向量、态向量 / **向量** / linear-algebra 6 页高度统一（matrix/space/operators…） | 术语／格式：合理保留 | [docs/math/linear-algebra/matrix.md:1](../../math/linear-algebra/matrix.md) | 抽象代数保持向量． |
| S4-B2（stage4-math-findings.md:30） | 几何向量场、位置/位移矢量、矢量分析 / **矢量** / vector-analysis 3 页、complex 几何段 | 术语／格式：合理保留 | [docs/math/index.md:1](../../math/index.md) | 物理几何保持矢量． |
| S4-B3（stage4-math-findings.md:31） | 量子力学/代数中作用于态或函数的映射 / **算符**（线性算符、厄米算符、对易子、产生/湮灭算符） / linear-algebra、hermitian-unitary、QM 各页 | 术语／格式：已修复 | [docs/math/linear-algebra/hermitian-unitary.md:1](../../math/linear-algebra/hermitian-unitary.md) | 量子态作用使用算符；普通数学函数空间映射使用算子，修正审查过宽规则． |
| S4-B4（stage4-math-findings.md:32） | 场论微分算子（nabla 算子、Laplace 算子、Wirtinger 算子） / **算子** / vector-analysis、symbol.md 权威写法 | 术语／格式：合理保留 | [docs/intro/symbol.md:1](../../intro/symbol.md) | 数学及场论微分映射保持算子． |
| S4-B5（stage4-math-findings.md:35） | - vector-analysis/operators L4/L14：同段「微分算子／矢量微分算符」并用，且 L14 一句内「向量／矢量」并用。 | 术语／格式：已修复 | [docs/math/vector-analysis/operators.md:10](../../math/vector-analysis/operators.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B6（stage4-math-findings.md:36） | - eigenfunction-methods/sturm-liouville：**全篇算子/算符无规律交替**（L4/18/22 算子，L30/64 算符，L120/135 算子，L138 算符），为全站最集中的混用页，需按 B1 规则逐处定夺（S-L 微分算子作用于函数空间，建议统一「算子」；哈密顿算符等 QM 语境保留「算符」）。 | 术语／格式：已修复 | [docs/math/eigenfunction-methods/sturm-liouville.md:4](../../math/eigenfunction-methods/sturm-liouville.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B7（stage4-math-findings.md:37） | - curvilinear L8/34/35「基向量/单位向量」与 L28/93「位移矢量/径向矢量」并存——符合 B1 分工，可保留。 | 术语／格式：合理保留 | [docs/math/vector-analysis/curvilinear-coordinates.md:14](../../math/vector-analysis/curvilinear-coordinates.md) | 基向量的代数语境与位移矢量的几何语境允许并存． |
| S4-B8（stage4-math-findings.md:38） | - analytic L381/387「复电场强度矢量／实向量分析」同段并存，需修。 | 术语／格式：已修复 | [docs/math/complex-analysis/analytic-functions.md:389](../../math/complex-analysis/analytic-functions.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B9（stage4-math-findings.md:39） | - complex-numbers L11 向量、L110/119 矢量，符合分工；L25/L428「几率」→概率。 | 术语／格式：已修复 | [docs/math/complex-analysis/complex-numbers.md:11](../../math/complex-analysis/complex-numbers.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B10（stage4-math-findings.md:45） | 菲涅尔（7） / **菲涅耳** / 根 complex L49/92；contour L7/305/307/309/359 | 术语／格式：合理保留 | [docs/math/complex-analysis/contour-integrals.md:49](../../math/complex-analysis/contour-integrals.md) | 用户指定菲涅尔为主词，菲涅耳登记为别名． |
| S4-B11（stage4-math-findings.md:46） | 费曼（5） / **费恩曼** / 根 complex L104；residue L7/367/369 | 术语／格式：合理保留 | [docs/math/complex-analysis/residue-calculus.md:111](../../math/complex-analysis/residue-calculus.md) | 用户指定费曼为主词，费恩曼登记为别名． |
| S4-B12（stage4-math-findings.md:47） | 海森堡（4） / **海森伯** / hermite L113；fourier-transform L4/85/112 | 术语／格式：合理保留 | [docs/math/transforms/fourier-transform.md:121](../../math/transforms/fourier-transform.md) | 用户指定海森堡为主词，海森伯登记为别名． |
| S4-B13（stage4-math-findings.md:48） | 几率（2） / **概率** / complex-numbers L25/428 | 术语／格式：已修复 | [docs/math/complex-analysis/complex-numbers.md:23](../../math/complex-analysis/complex-numbers.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B14（stage4-math-findings.md:49） | 塔塔利亚 / **塔尔塔利亚**（Tartaglia） / complex-numbers L33 | 术语／格式：已修复 | [docs/math/complex-analysis/complex-numbers.md:34](../../math/complex-analysis/complex-numbers.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B15（stage4-math-findings.md:50） | 阿根（图） / **阿尔冈图**（Argand；名词委） / complex-numbers L35、根 complex L31/80 | 术语／格式：合理保留 | [docs/math/complex-analysis/complex-numbers.md:34](../../math/complex-analysis/complex-numbers.md) | 阿根图为通行译名，保留． |
| S4-B16（stage4-math-findings.md:51） | 若当／约当（引理、不等式） / **若尔当**（Jordan） / residue 同页并用：若当 L146/223、约当 L200/208/240/276/392；contour L339/346 | 术语／格式：已修复 | [docs/math/complex-analysis/residue-calculus.md:154](../../math/complex-analysis/residue-calculus.md) | 统一约当，其他译名作别名；保留旧标题锚点． |
| S4-B17（stage4-math-findings.md:52） | 普列梅利 / **普莱姆利**（Plemelj） / residue L347（索霍茨基-普莱姆利公式） | 术语／格式：已修复 | [docs/math/complex-analysis/residue-calculus.md:353](../../math/complex-analysis/residue-calculus.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B18（stage4-math-findings.md:53） | 规约（regularization） / **正则化／正规化** / residue L349/355/375 | 术语／格式：已修复 | [docs/math/complex-analysis/residue-calculus.md:353](../../math/complex-analysis/residue-calculus.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B19（stage4-math-findings.md:54） | 恩绍 / 建议**恩肖**（Earnshaw，与名词委对照后定稿） / contour L186 | 术语／格式：合理保留 | [docs/math/complex-analysis/contour-integrals.md:187](../../math/complex-analysis/contour-integrals.md) | 恩绍为通行译名，审查未提供必须改名的依据． |
| S4-B20（stage4-math-findings.md:55） | 艾米·诺特 / **埃米·诺特**（Emmy Noether） / variations L120 | 术语／格式：已修复 | [docs/math/variational-methods/calculus-of-variations.md:128](../../math/variational-methods/calculus-of-variations.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B21（stage4-math-findings.md:56） | 量子跃迁幅 / **跃迁概率幅／跃迁振幅** / contour L369 | 术语／格式：已修复 | [docs/math/complex-analysis/contour-integrals.md:377](../../math/complex-analysis/contour-integrals.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B22（stage4-math-findings.md:60） | - 母函数／生成函数：同页并用（legendre、bessel、series-expansion），建议统一**生成函数（母函数）**首次并列后用其一。 | 术语／格式：已修复 | [docs/math/special-functions/legendre.md:1](../../math/special-functions/legendre.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B23（stage4-math-findings.md:61） | - 极射赤平投影／球极投影：series-expansion L306，建议物理语境统一**球极（平面）投影**。 | 术语／格式：已修复 | [docs/math/complex-analysis/series-expansion.md:316](../../math/complex-analysis/series-expansion.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B24（stage4-math-findings.md:62） | - 威克旋转（Wick）：通行，可保留（亦作维克转动）。 | 术语／格式：合理保留 | [docs/math/complex-analysis/residue-calculus.md:1](../../math/complex-analysis/residue-calculus.md) | 威克旋转是通行译名． |
| S4-B25（stage4-math-findings.md:63） | - 热扩散系数 a²（pde L56）：建议称**热扩散率** a。 | 术语／格式：已修复 | [docs/math/differential-equations/pde-intro.md:56](../../math/differential-equations/pde-intro.md) | 称热扩散率，保留已定义的 a²=κ/(cρ)，不擅改记号． |
| S4-B26（stage4-math-findings.md:64） | - 「傅里叶实验定律」（pde L53）：建议删「实验」，作**傅里叶定律**。 | 术语／格式：已修复 | [docs/math/differential-equations/pde-intro.md:53](../../math/differential-equations/pde-intro.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-B27（stage4-math-findings.md:65） | - 「罗宾边界」（pde L106）：建议**罗宾逊边界条件**。 | 术语／格式：误报 | [docs/math/differential-equations/pde-intro.md:106](../../math/differential-equations/pde-intro.md) | Robin 指 Gustave Robin，不是 Robinson；保留罗宾边界条件． |
| S4-B28（stage4-math-findings.md:66） | - 「柯西-古萨定理」（contour L85）：规范，保留。 | 术语／格式：合理保留 | [docs/math/complex-analysis/contour-integrals.md:87](../../math/complex-analysis/contour-integrals.md) | 柯西-古萨定理规范． |
| S4-B29（stage4-math-findings.md:67） | - 莫雷拉定理、皮卡大定理、刘维尔定理、茹科夫斯基变换、克拉默斯-克勒尼希关系、施瓦茨反射原理、洛必达法则、邦贝利、卡尔达诺、莫雷拉、伽马/贝塔函数、连带勒让德/拉盖尔、双阶乘、柯西主值、传播子、推迟/超前势——译名均正确。 | 术语／格式：合理保留 | [docs/math/index.md:1](../../math/index.md) | 此行为合规清单，不是待修知识错误． |
| S4-C1（stage4-math-findings.md:71） | 1. **半角直引号 " " 用于中文**（应「」）：probability 三实质页大量（basic L29/137/142/154/159；characteristic L7/65；one-dim L7/95）；complex-analysis 五页普遍（如 analytic、contour、series-expansion 段首引语）；根 complex L114。 | 术语／格式：已修复 | [docs/math/probability.md:35](../../math/probability.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-C2（stage4-math-findings.md:72） | 2. **连接号带空格**（PUNC-8）：根 complex「皮埃尔 - 西蒙」「柯西 - 施瓦茨」「格拉姆 - 施密特」；variations「欧拉 - 拉格朗日」全篇；contour「Cauchy-Goursat」处；fourier-series L16「让 - 巴普蒂斯特」。 | 术语／格式：已修复 | [docs/math/variational-methods/calculus-of-variations.md:18](../../math/variational-methods/calculus-of-variations.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-C3（stage4-math-findings.md:73） | 3. variations L115「单一行标量积分」衍字（应「一个标量积分」）；L116「形式保持严格协变」用词不当（应**形式不变**）。 | 术语／格式：已修复 | [docs/math/variational-methods/calculus-of-variations.md:123](../../math/variational-methods/calculus-of-variations.md) | 删除衍字；广义坐标点变换下形式不变（协变）的含义已说明． |
| S4-C4（stage4-math-findings.md:74） | 4. 块引用排印证明/图注（MDFM-5）：residue L215-227、contour L118-121 等长段证明置于 blockquote，建议改折叠框。 | 术语／格式：已修复 | [docs/math/complex-analysis/residue-calculus.md:225](../../math/complex-analysis/residue-calculus.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-C5（stage4-math-findings.md:75） | 5. calculus 三主页（limit/derivative/integral）标签后用半角冒号「左极限 **:**」「常数法则 **:**」，应全角。 | 术语／格式：已修复 | [docs/math/variational-methods/calculus-of-variations.md:1](../../math/variational-methods/calculus-of-variations.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-C6（stage4-math-findings.md:76） | 6. integral L10 半角括号夹英文「原函数（Antiderivative)」；delta L82「拉梅系数（Lamé coefficients)」同类。 | 术语／格式：已修复 | [docs/math/transforms/delta-function.md:10](../../math/transforms/delta-function.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-C7（stage4-math-findings.md:77） | 7. 根 probability L51-53 半角括号夹英文无空格。 | 术语／格式：已修复 | [docs/math/probability.md:57](../../math/probability.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S4-C8（stage4-math-findings.md:78） | 8. 含 frontmatter author: … 页：probability 三页作「Physics Learning Wiki」、law-of-large-numbers 作「Physics Learning Wiki, Leafuke」，署名体例不统一。 | 术语／格式：合理保留 | [docs/math/probability.md:1](../../math/probability.md) | 真实署名保持原样． |
| S5-A1（stage5-other-findings.md:12） | A1 / modern/general-relativity L428 / 「**冲量参数**（impact parameter）$b$」 / **碰撞参数（瞄准参数）**；冲量对应 impulse，与 impact parameter 无关 | 知识／数值／符号：已修复 | [docs/modern/general-relativity.md:443](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-A2（stage5-other-findings.md:13） | A2 / modern/general-relativity L23、L55 / 「方程形式…保持**协变**」（theoretical-mechanics L23 同） / 经典力学语境应作**形式不变**；协变是 GR 术语 | 知识／数值／符号：误报 | [docs/modern/general-relativity.md:25](../../modern/general-relativity.md) | 协变不是 GR 专有；已补经典力学形式不变的语境说明． |
| S5-A3（stage5-other-findings.md:14） | A3 / tools/latex/templates L254 / 「**波恩**诠释」 / **玻恩诠释**（Born；全站其余处均作玻恩） | 知识／数值／符号：已修复 | [docs/tools/latex/templates.md:256](../../tools/latex/templates.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-A4（stage5-other-findings.md:15） | A4 / tools/latex/figures L133、L136 / 「普朗克**常数**光电效应法」「估算**常数** $h$」 / 普朗克**常量**、估算常量 | 知识／数值／符号：已修复 | [docs/tools/latex/figures-tables-bib.md:135](../../tools/latex/figures-tables-bib.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-A5（stage5-other-findings.md:16） | A5 / tools/latex/math-and-physics L132 / 「普朗克常数」「玻尔兹曼常数」 / 普朗克**常量**、玻尔兹曼**常量**（L131「自然常数」为固定词组，保留） | 知识／数值／符号：已修复 | [docs/tools/latex/math-and-physics.md:134](../../tools/latex/math-and-physics.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-A6（stage5-other-findings.md:17） | A6 / tools/latex/math-and-physics L315 / 「**费曼图**」（2 处） / **费恩曼图** | 知识／数值／符号：合理保留 | [docs/tools/latex/math-and-physics.md:317](../../tools/latex/math-and-physics.md) | 费曼图符合用户主译名规则；代码标识 tikz-feynman 保留． |
| S5-B1（stage5-other-findings.md:25） | Schwarzschild（L7/328/332/341/347/359/363/386/390/398/410/532/534/604/626/628/663/681） / **施瓦茨席尔德** / 中文社区广泛使用「史瓦西」；见 D 节方针冲突 | 术语／格式：已修复 | [docs/modern/general-relativity.md:9](../../modern/general-relativity.md) | 采用史瓦西（Schwarzschild）及首次英文对照． |
| S5-B2（stage5-other-findings.md:26） | Shapiro 延迟（L7/444） / **夏皮罗延迟** /  | 术语／格式：已修复 | [docs/modern/general-relativity.md:9](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B3（stage5-other-findings.md:27） | Minkowski 间隔（L87） / **闵可夫斯基间隔** /  | 术语／格式：已修复 | [docs/modern/general-relativity.md:90](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B4（stage5-other-findings.md:28） | Christoffel 符号（L131/133/141/199） / **克里斯托费尔符号** /  | 术语／格式：已修复 | [docs/modern/general-relativity.md:136](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B5（stage5-other-findings.md:29） | Levi-Civita 连接（L131） / **列维-奇维塔联络** / symbol.md 另有「Levi-Civita 符号」 | 术语／格式：已修复 | [docs/modern/general-relativity.md:136](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B6（stage5-other-findings.md:30） | Riemann 曲率张量（L195） / **黎曼曲率张量** /  | 术语／格式：已修复 | [docs/modern/general-relativity.md:202](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B7（stage5-other-findings.md:31） | Ricci 张量（L206） / **里奇张量** /  | 术语／格式：已修复 | [docs/modern/general-relativity.md:215](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B8（stage5-other-findings.md:32） | Bianchi 恒等式（L212） / **比安基恒等式** /  | 术语／格式：已修复 | [docs/modern/general-relativity.md:221](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B9（stage5-other-findings.md:33） | Hilbert–Einstein 作用量（L253） / **希尔伯特-爱因斯坦作用量** /  | 术语／格式：已修复 | [docs/modern/general-relativity.md:264](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B10（stage5-other-findings.md:34） | Lorenz 规范（L284/294） / **洛伦兹规范** / 注意是 Lorenz 非 Lorentz，中文同译 | 术语／格式：已修复 | [docs/modern/general-relativity.md:295](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B11（stage5-other-findings.md:35） | Eddington–Finkelstein、Kruskal（L347） / **爱丁顿-芬克尔斯泰因、克鲁斯卡尔** /  | 术语／格式：已修复 | [docs/modern/general-relativity.md:360](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B12（stage5-other-findings.md:36） | FRW 度规（L454） / **弗里德曼-罗伯逊-沃克度规** /  | 术语／格式：已修复 | [docs/modern/general-relativity.md:471](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B13（stage5-other-findings.md:37） | Friedmann 方程（L464） / **弗里德曼方程** /  | 术语／格式：已修复 | [docs/modern/general-relativity.md:483](../../modern/general-relativity.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-B14（stage5-other-findings.md:38） | courses/electromagnetism mermaid：Gauss、Biot-Savart、Ampère、Faraday（L29/30/33） / 高斯、**毕奥-萨伐尔**、安培、法拉第 / 图表节点同样建议中文化 | 术语／格式：已修复 | [docs/courses/electromagnetism.md:30](../../courses/electromagnetism.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-C1（stage5-other-findings.md:44） | 1. tools 模块：矢量 25 / 向量 2；算符 17 / 算子 5。 | 术语／格式：已修复 | [docs/courses/mathematical-methods-for-physics.md:1](../../courses/mathematical-methods-for-physics.md) | 课程页微分算子按语境统一；矢量图、量子算符合法保留． |
| S5-C2（stage5-other-findings.md:49） | 2. intro 权威文件内部无矛盾：symbol.md 向量 31、矢量 0；nabla/Laplace 均作「算子」；format.md 中「算符」全部位于「运算符」一词内。 | 术语／格式：合理保留 | [docs/intro/symbol.md:1](../../intro/symbol.md) | 符号表抽象代数用向量；运算符是固定名称． |
| S5-C3（stage5-other-findings.md:50） | 3. EM writing L23「简单向量运算」、L92「矢量场」符合语境分工。 | 术语／格式：合理保留 | [docs/intro/writing.md:25](../../intro/writing.md) | 代数运算与物理矢量场允许按语境分工． |
| S5-D1（stage5-other-findings.md:56） | - 严格名词委路线：施瓦茨席尔德、费恩曼、海森伯、菲涅耳； | 术语／格式：合理保留 | [docs/intro/writing.md:1](../../intro/writing.md) | 执行用户确认的通行主译名规则，不采用严格替换路线． |
| S5-D2（stage5-other-findings.md:57） | - 项目方针路线（从宽从众）：史瓦西（中文 GR 社区主流）可保留，但费曼/海森堡/菲涅尔在正式教材中已普遍被推荐形取代，建议仍改。 | 术语／格式：合理保留 | [docs/intro/writing.md:1](../../intro/writing.md) | 译名争议已由用户确定，其他译名登记别名． |
| S5-E1（stage5-other-findings.md:62） | 1. **PUNC-1 句末点号**： | 术语／格式：已修复 | [docs/quiz/library.md:1](../../quiz/library.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-E2（stage5-other-findings.md:66） | 2. **连接号带空格**：GR L101「4 - 速度」、L158「欧拉 - 拉格朗日」、L310「横向 - 无迹」；EM index L61、courses/electromagnetism L50「毕奥 - 萨伐尔」；theoretical-mechanics L45/55；math-methods L57 等。 | 术语／格式：已修复 | [docs/courses/theoretical-mechanics.md:1](../../courses/theoretical-mechanics.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-E3（stage5-other-findings.md:67） | 3. **折叠框/块引用损坏**： | 术语／格式：已修复 | [docs/electromagnetism/index.md:1](../../electromagnetism/index.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-E4（stage5-other-findings.md:72） | 4. **加粗/列表损坏**：courses/index L17「\*\* 课程路线…\*\*」字面反斜杠；theoretical-mechanics L45-55 全部映射表链接作「-[…]」（- 后缺空格，列表不成立）；GR L528/650「\*\* 结论 \*\*」同类；GR L585「4\.」转义序号。 | 术语／格式：已修复 | [docs/courses/theoretical-mechanics.md:17](../../courses/theoretical-mechanics.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-E5（stage5-other-findings.md:73） | 5. **失效链接**：theoretical-mechanics L48 指向 torque-angular-momentum.md，实际文件为 rigid-body/torque.md。 | 术语／格式：误报 | [docs/courses/theoretical-mechanics.md:43](../../courses/theoretical-mechanics.md) | 实际文件 torque-angular-momentum.md 存在，原链接保留并核验． |
| S5-E6（stage5-other-findings.md:74） | 6. htc.md L15/L20 折叠框标题用英文「Warning/Tip」；L31 引文半角「！」。 | 术语／格式：已修复 | [docs/intro/htc.md:21](../../intro/htc.md) | 按批准计划修复对应错词、定义、符号或可见排版；上下文与别名解释按写作指引保留． |
| S5-E7（stage5-other-findings.md:75） | 7. GR L2 frontmatter author「匿名同学」且无 status 字段；probability stub 署名体例不一（阶段 4 已记）。 | 术语／格式：已修复 | [docs/modern/general-relativity.md:2](../../modern/general-relativity.md) | 涉及页补状态；作者匿名同学及概率页真实署名保留． |

### 阶段 6、总报告及规范表补充

| 项目 | 结果与依据 | 当前入口 |
|---|---|---|
| S6-1 导航缺失 | 已修复：简介中置于数学符号表后，移除忽略项． | mkdocs.yml；scripts/nav-coverage-ignore.txt |
| S6-2 元信息 | 已修复：补 status、description；不伪造个人署名． | docs/glossary/glossary.md:1 |
| S6-3 中文首词与拼音 | 已修复：60 条中文词条按中文拼音分组． | docs/glossary/glossary.md |
| S6-4 衍射与绕射 | 已修复：衍射为主词，绕射为合法别名，不作淘汰形． | glossary 衍射条 |
| S6-5 电场定义 | 已修复：以对电荷产生作用的矢量场定义，避免含混物质状态表述． | glossary 电场条 |
| S6-6 规模与易混词 | 已修复：保留原六概念，增加易混概念、英文／符号、限定及正文链接． | glossary 全页 |
| S6 草稿：熵 | 已修复：可逆热量定义与统计意义，不能仅称无序程度． | glossary 熵条 |
| S6 草稿：内积／标量积 | 已修复：一般内积与欧氏点积区分；不将全部内积称点积． | glossary 内积、标量积条 |
| S6 草稿：向心力 | 已修复：合力的向心分量，不能当成新的一类相互作用． | glossary 向心力条 |
| 规范表：向量积／外积／叉积 | 合理保留：三维叉积与一般外积不能无条件混同；数学正文与速查表按适用空间限定． | docs/math/linear-algebra/matrix.md；glossary 矢量积条 |
| 规范表：预解算子 | 合理保留：resolvent operator 可称预解算子，不应机械改为预解式． | docs/math/eigenfunction-methods/greens-function.md |
| 规范表：谐振子、惯量主轴、李代数 | 已修复：消除单摆谐振子混称，惯量主轴及李代数加中文对应． | docs/math/linear-algebra/eigenvalues.md；operators.md |
| 规范表：摆线／旋轮线 | 合理保留：通行名称，不据偏好扩大改写． | docs/math/variational-methods/calculus-of-variations.md |
| 规范表：常数／常量 | 已修复：物理基本常量用常量；数学常数和固定名称保留． | docs/intro/writing.md |
| 总报告：扫描附件缺失 | 有依据的暂缓：原称 scan-long.csv 和五个脚本未提供，不能补造历史结果；以新检查器重建当前扫描． | 本记录扫描与验证节 |
| 总报告：题库与空壳 | 合理保留：不修改审核状态、不扩写空壳；只修涉及页面元信息和折叠框． | 用户批准范围 |

## 扫描与验证

原报告提及的 scan-long.csv 与五个扫描脚本未包含在输入目录内，不能声称复现旧版 481 组扫描．使用新增只读检查器重建公开页面词形清单；scan-current-before.json／scan-current-after.json 为本轮基线与结果，扫描规则及排除范围由仓库版本确定．

### 阶段 1 的汇总发现

阶段 1 是统计汇总，下面按概念记录其去重处理，相关具体错误归入前述阶段 2–5 编号．

| 概念／建议 | 结果 | 当前依据与入口 |
|---|---|---|
| vector、operator、eigen/proper | 已修复：按代数、物理几何、数学映射、量子与振动语境分工． | intro/writing.md；Sturm–Liouville 页；glossary |
| 状态参量／态参量 | 合理保留：全称与简称，不将其等同于物态方程的主词约定． | thermodynamics 各章 |
| 质点系／质点组 | 已修复：力学主词统一质点系． | mechanics/dynamics/system-of-particles.md |
| 守恒定律／守恒律 | 合理保留：全称与简称． | mechanics 各章 |
| 惯性系／惯性参考系 | 合理保留：全称与简称． | mechanics/kinematics/reference-frames.md |
| 方程／方程式 | 合理保留：数学通行名称；物态方程式已统一物态方程． | thermodynamics/chapter-1/gas.md |
| 蒸气／蒸汽、热容／热容量、比热容／比热 | 已修复主词；合法设备名与首次别名解释保留． | thermodynamics；glossary |
| 状态方程／物态方程 | 已修复：热学与声波气体闭合关系采用物态方程；数值模拟中的状态空间方程保留． | thermodynamics；mechanics/oscillation-wave/wave-in-continuous-medium.md；tools/simulation.md |
| 物态／聚集态 | 合理保留：语义范围与教材表达允许并存． | thermodynamics/chapter-1/phase-transitions-and-coexistence.md |
| 分布律／分布率 | 已修复：热学导学链接文字改为麦克斯韦速度分布律． | thermodynamics/index.md |
| 等温／定温、等压／定压、等容／定容 | 已修复：过程与热容语境区分；温度计名称及别名解释保留． | thermodynamics；intro/writing.md |
| 做功／作功、物质的量／摩尔数 | 已修复正文主词；保留明确引用或解释的合法旧称． | thermodynamics |
| 实际气体／真实气体 | 合理保留：均指偏离理想气体模型的气体． | thermodynamics/chapter-1/gas.md |
| 六个人名主译名 | 已修复一致性与首次英文说明；与用户约定冲突的严格译名替换建议不采纳． | intro/writing.md；glossary；GR |
| Born | 已修复：玻恩诠释． | tools/latex/templates.md |
| Newton、Einstein、Maxwell、Hamilton 等英文 | 合理保留已有中英标题及代码／数学标识；不按英文命中次数判错． | 相关正文与工具示例 |
| 常数／常量、奇异点／奇点 | 已修复物理基本常量与奇点主词；数学常数保持数学意义． | math/special-functions/gamma-beta.md；各热学与工具页 |
| “标点违规 0、错别字零发现” | 误报：只是缺失扫描的汇总断言，已被后续具体表格、错词与标点发现否定，不作为验收依据． | 阶段 2–5 逐项清单 |
| 术语表导航、六词规模、中文首词 | 已修复：60 条、中文拼音分组、简介导航入口． | glossary/glossary.md；mkdocs.yml |

### 重建扫描的含义

以 `81afdc3^` 为 Git 基线，用最终检查器的相同屏蔽与排除规则生成 `scan-current-before.json`，并额外生成 `scan-findings-before.json`；最终源码生成对应 after 文件．两侧均扫描 182 个公开 Markdown 页面．这是本轮可比较的重建扫描，不是对缺失历史扫描数据的伪造恢复．检查器只覆盖确认错词和有限语境规则，不能据其命中数推算全部知识错误数量．

剩余提示逐条人工判读：课程数学与量子对应、术语表／写作指引别名说明、Sturm–Liouville 页语境说明、球谐与傅里叶量子算符应用，以及数值模拟的状态空间方程均合法保留．不使用全站豁免隐藏提示．

### 本轮验证方法与范围

- 手动检查器扫描 182 个公开 Markdown：确认错误 0，语境／别名提示 14；重建基线的硬规则命中为 6．这些数字仅代表检查器覆盖的有限规则，不代表审查全部知识错误的数量．规则与调用方式见 `scripts/README.md`．
- 原六个术语全部保留，术语表最终 60 条；一般内积、欧氏标量积和三维叉积分别说明适用条件．
- 只为本轮触及的实质页补缺漏的 status／description，规划空壳不编造内容；作者字段与原图均保留．
- 理想气体、范德瓦尔斯气体的等体、等压、等温、绝热、多方过程逐行检验 `Q=ΔU+A`；对非零功过程独立积分 `p(V)` 与表中公式比较，反向积分对应压缩功的负号．范德瓦尔斯修正 D 在等温热量中抵消；γ′ 不混作一般 Cp/CV．
- 卡诺正循环检查输出功、效率；逆循环分别检查带符号净功及输入功大小、制冷系数和热泵系数．标准摩尔体积以 SI 气体常量复算；氧三相点数据与表头单位同步核对．
- 热学最终复核补回格式处理时丢失的 p–V／T–V 图标记；对照 Git 基线比较相近正文行的行内数学表达式数量，未再发现非预期丢失．
- 既有格式检查无硬错误，68 条排版建议保留为非阻断提示；折叠框缩进检查 184 文件通过，导航检查 203 Markdown／177 导航项通过．格式规则本身不会发现损坏的数学表格，因此另验生成 HTML 和浏览器截图．
- 题库 validate：0 错误、2 条原有 draft-set 引用提示；coverage 的未覆盖主题不扩写；math-audit：87 题、79 已发布、0 诊断，不改变审核或发布状态．
- quiz／runtime／forms 的类型检查、单测和生成产物检查，submit 测试与语法检查，features 类型与产物检查、media 与 post-build 单测均通过．

原始审查附件继续留在 `.tmp-inspect/terminology-audit/`，本轮扫描输出也在该目录．未提交临时辅助编辑脚本、浏览器截图或构建产物目录；交付文档、检查器和测试均纳入版本控制．本轮仅本地提交，不推送或部署，不增加 CI 门禁．

### 最终验收结果（2026-10-01）

| 验收项 | 结果 | 本地证据 |
|---|---|---|
| Python 完整选择 | 120 passed，274.00 秒；含检查器、格式、题库、集成与 SEO． | `.tmp-inspect/python-tests-final.log` |
| 完整生产构建 | 退出码 0，包含 Pagefind、MathJax SSR、图片后处理、压缩、SEO 和 blocking 性能审计． | `.tmp-inspect/production-build-final.log`；`site-performance-report.json` |
| 完整 Playwright | 25 passed，20.9 秒；包括 smoke、search、小测、表单、Mermaid、性能加载与即时导航． | `.tmp-inspect/e2e-final.log` |
| 修复表格 | 傅里叶 4 列、δ 函数 3 列、边界条件 3 列；理想气体 6 列、范德瓦尔斯气体 5 列，各行列数一致，公式完整． | `.tmp-inspect/render-physics-verification.json`；`render-review/` 截图 |
| 术语表 | 60 词条，正文链接及页内锚点无失效；简介导航位于数学符号表后． | 同上；glossary 浏览器截图 |
| 旧标题锚点 | 以实际 MkDocs 扩展配置重建基线，复核修改页 1401 个原标题锚点，缺失 0． | 同上 |
| 公式与折叠框 | 受影响页面 MathJax 错误标记 0；振动公式未吞入折叠框，EM 建设中提示正文及 GR 代码均在对应框内． | 同上；浏览器截图 |
| 物理数值与符号 | 10 组理想／范德瓦尔斯过程满足第一定律，独立功积分及等压热容积分一致；卡诺与斯特林再生循环核算一致． | 同上 physics 部分 |
| 生成产物 | quiz、runtime、forms、features 的 build:check 均通过． | `.tmp-inspect/*-bundle-check.log` |

构建曾因 GitHub 署名缓存的 `ECONNRESET` 失败；最终运行使用本机已有代理（Node `--use-env-proxy`），完整重跑成功．没有修改构建逻辑、署名缓存或 CI 来绕过验证．格式检查的 68 条非阻断建议和术语检查的 14 条已判读提示仍如实保留．

本轮五批提交依次覆盖约定与证据、物理修复、语境术语、渲染／术语表及手动检查工具／最终记录．第四批包含验收中发现的残余符号和元信息修补；第五批不增加运行时功能或自动替换．
