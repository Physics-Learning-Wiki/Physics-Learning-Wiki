---
title: 误差分析 Python 示例说明
author: Physics Learning Wiki Team
status: review
description: 说明单摆和铜棒两套自编教学数据的字段、模型条件、脚本运行命令、验证版本和输出文件，支持误差分析案例复算．
---

## 数据来源与适用范围

本目录的 CSV 均为自编教学数据，固定列出数值，不随机生成，也不代表实际实验记录或仪器规格．[综合案例](../case-studies.md) 给出全部教学假设、手算步骤与报告结果．修改输入数据时，必须同时重新评估仪器信息、相关性与模型，不只替换表格．

## 字段与附加输入

`pendulum-times.csv` 中，`run` 是观测顺序，`oscillations` 是每次的完整周期数，`elapsed_s` 是对应总时间，单位秒．各次使用同一周期数．脚本中的摆长示值为 1.001 m，零点偏差估计为 +0.001 m；摆长分辨率为 0.001 m，校准标准不确定度为 0.00020 m．总时间的共同校准标准不确定度为 0.020 s．这些固定输入在脚本中逐项列出，理由见综合案例．

`copper-expansion.csv` 中，`temperature_c` 是摄氏温度数值，`length_mm` 是已经施加校准修正的长度，单位毫米；`u_length_mm` 是该观测的已知标准不确定度，单位毫米．这些不确定度彼此独立，温度不确定度在教学模型中可忽略．拟合截距表示零摄氏度的模型长度，斜率单位为毫米每开尔文．

## 运行命令与验证版本

在仓库根目录执行以下命令．`uv run --with` 为运行提供额外依赖，不修改项目的依赖声明：

```powershell
uv run --with numpy==2.5.4 --with scipy==1.18.1 --with matplotlib==3.11.2 python docs/experiment/error-analysis/examples/pendulum-analysis.py
uv run --with numpy==2.5.4 --with scipy==1.18.1 --with matplotlib==3.11.2 python docs/experiment/error-analysis/examples/copper-analysis.py
```

验证环境为 Python 3.14.4、NumPy 2.5.4、SciPy 1.18.1、Matplotlib 3.11.2，日期为 2026-10-19．也可以使用兼容的较新版本运行，但应检查数值与绘图差异．Python 和 uv 的安装说明见 [Python 科学计算](../../../tools/python-scicomp.md)．

单独下载时，把脚本与对应 CSV 放在同一文件夹，命令中的脚本路径换成下载路径即可．数据始终按脚本位置读取；默认输出相对于当前工作目录，也可指定 `--output-dir`．输出目录应与源文件目录分开，以保留原始资料．

## 输出与解释

| 脚本                     | 默认目录                            | 输出                                                               |
| ---------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `pendulum-analysis.py` | `.tmp-error-analysis/pendulum/` | `results.json`、`repeated-measurements.svg`、`precision-bias.svg`． |
| `copper-analysis.py`   | `.tmp-error-analysis/copper/`   | `results.json`、`copper-fit.svg`．                                 |

脚本使用非交互绘图后端，不弹出图窗．科学图的轴和图例用英文，中文解释与无障碍替代文字保留在正文．单摆脚本另生成精密度与偏差示意图，不将该图中的示意参考值当作案例观测数据．

单摆 JSON 中，`u_g_m_s2` 是合成标准不确定度，`expanded_u_g_m_s2` 使用包含因子 2；`budget` 中的 `variance_percent` 是方差份额．`timing_mean_ci95_half_width_s` 只对应重复计时均值的 t 区间半宽，不包含所有 B 类信息．

铜棒 JSON 的 `ordinary` 由残差估计共同尺度，`weighted` 使用给定的绝对标准不确定度．`covariance` 的参数顺序为截距、斜率，其各元素单位分别随参数而异；`u_alpha_per_k` 已包括两参数的协方差贡献．`reduced_chi_square` 作为模型检查信息，不自动用来缩放已知输入不确定度．

结果最后应分别得到 $g=(9.811\pm0.024)\,\mathrm{m/s^2}$、$k=2$，以及 $\alpha=1.696\times10^{-5}\,\mathrm{K^{-1}}$、$u(\alpha)=0.035\times10^{-5}\,\mathrm{K^{-1}}$．保留额外位数的 JSON 用于复算，不应代替正文的修约结果．

## 返回学习主线

先读 [重复测量](../repeated-measurements.md)、[不确定度传播](../uncertainty-propagation.md) 与 [直线拟合](../least-squares.md) 理解方法，再回到 [综合案例](../case-studies.md) 组织报告．这里的代码不会判断真实实验是否满足物理假设．
