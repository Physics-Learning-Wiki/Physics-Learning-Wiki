# 误差分析教材重构：审查入口

工作分支：`codex/error-analysis-textbook`．编辑与自动核验由 AI 执行，不构成人工签署或读者学习效果认证．

## 阶段 A：基线与分工

2026-11-07 确认 `D:/Documents/课件/误差分析` 可访问，实际包含以下 9 份 PDF．页码采用从 1 起算的文件物理页码，原课件不复制进仓库、不作为公开正文引用．

| 文件 | 页数 | 内容执行者与映射记录 |
| --- | --- | --- |
| 01 第一章 误差理论与数据处理-绪论.pdf | 62 | GPT 6.1 Terra：[基础审计](foundations-audit.md) |
| 02 第二章 随机误差.pdf | 64 | 同上 |
| 03 第二章 系统误差 粗大误差.pdf | 43 | GPT 6.1 Terra：[误差与不确定度审计](errors-audit.md) |
| 04 第三章 误差的合成与分配.pdf | 53 | 同上 |
| 05 第四章 测量不确定度.pdf | 33 | 同上 |
| 06 第四章 测量不确定度.pdf | 41 | 同上 |
| 07 第五章 线性参数的最小二乘1.pdf | 43 | GPT 6.1 Terra：[拟合审计](fitting-audit.md) |
| 08 第五章 线性参数的最小二乘2.pdf | 44 | 同上 |
| 09 第六章 回归分析.pdf | 31 | 同上 |

基线共有 15 篇专题、15 个题集、168 道题（156 draft、12 published）和 3 张 SVG．综合案例的 12 道题及其题集已发布，保留其原始版本与签署．其余资源优先修订复用；新增题按全局序列分配，从 q-000777 起，保持 draft．工作开始时 `output/` 已为未跟踪目录，本次不纳入提交．

独立执行的基线检查：`validate --include-drafts` 为 0 错误、19 警告；`mkdocs build --clean` 退出 0（51.23 秒），存在 4 条无关页面的失效相对链接警告（intro/htc、reference-frames、thermodynamics/chapter-2 两处）．原格式检查存在公式排版建议．完整日志存于忽略目录 `.tmp-error-analysis/rebuild/`．

## 课程组织与文件边界

保留全部 15 个页面 URL、page_id、既有目标 ID 与题集 ID；有用旧锚点保留入口．维持「测量与记录 → 重复与加权 → 系统效应与异常值 → 不确定度评定、传播与分配 → 拟合、组合测量与完整报告」的能力顺序．课件第六章的回归方差分解、显著性与失拟检验纳入拟合专题，不为每张幻灯片新建页面．

| 分工 | 独占页面 basename（同名题目录与题集） |
| --- | --- |
| Terra 基础组 | measurement-basics、metrology、data-recording、repeated-measurements、weighted-measurements |
| Terra 误差组 | systematic-errors-outliers、outlier-tests、uncertainty-evaluation、uncertainty-propagation、error-allocation |
| Terra 拟合组 | least-squares、linear-parameters、nonlinear-fitting、combined-measurements、case-studies；examples 数据与复算脚本 |
| 总编审 | 原创配图与生成脚本、独立数值核验、跨页集成、构建与渲染验收、Git 与本报告 |

先以 repeated-measurements 做完整试点，经总编审反馈返工，再把有效原则用于其余页面：定义与首次推导留在主线；锚点落到真正讲授位置；条件在首次使用处说明；数值例题展示数据到结果的过程；选项反馈指出该选项具体误解；自评题提供可操作的分层依据；不复制试点标题骨架．

## 原创图资源

生成器：`scripts/figures/error-analysis.py`．命令：

```powershell
uv run --with numpy --with scipy --with matplotlib python scripts/figures/error-analysis.py
```

输出至 `docs/experiment/error-analysis/images/`：均值抽样分布、正态覆盖与 t 分布、逆方差加权、函数灵敏度、共同偏移消除、方差预算、组合观测、回归偏差分解、弦长与弓高，共 9 张原创 SVG．既有 3 张图及其数据继续复用．生成器保持 SVG 文本可编辑，PNG 仅供本地视觉检查，不提交．图中无真实实验断言，所有示例为教学模型．

本次绘图执行环境：Python 3.12.15、NumPy 2.5.4、SciPy 1.18.1、Matplotlib 3.11.2；未修改项目依赖锁．

## 审稿与交付状态

阶段 B、C 的问题与修改见各组审计记录及 [试点记录](pilot.md)；最终计算、关联、生产/预览构建和渲染结果见 [质量报告](quality-review.md)．逐章页面、题集和题号清单见 [chapter-inventory.json](chapter-inventory.json)．题库自动验证、AI 复核与 PR 均不代替物理、教学、版权三个维度的真实人工审核．
