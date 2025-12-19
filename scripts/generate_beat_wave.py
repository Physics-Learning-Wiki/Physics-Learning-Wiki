import numpy as np
import matplotlib.pyplot as plt
import matplotlib as mpl
mpl.rcParams['font.sans-serif'] = ['SimHei']  # 设置中文字体为黑体
mpl.rcParams['axes.unicode_minus'] = False  # 解决负号显示问题

# 设置参数
A = 1  # 振幅
k1, k2 = 2 * np.pi / 5, 2 * np.pi / 6  # 两列波的波数
omega1, omega2 = 2 * np.pi / 2, 2 * np.pi / 2.2  # 两列波的角频率
x = np.linspace(0, 50, 1000)  # 空间范围
t = 0  # 时间固定为 0

# 计算两列波
wave1 = A * np.cos(k1 * x - omega1 * t)
wave2 = A * np.cos(k2 * x - omega2 * t)

# 合成波
combined_wave = wave1 + wave2

# 包络线
envelope = 2 * A * np.cos((k1 - k2) * x / 2)

# 绘图
plt.figure(figsize=(10, 6))

# 绘制合成波
plt.plot(x, combined_wave, label="合成波 y(x,t)", color="blue")

# 绘制包络线
plt.plot(x, envelope, label="包络 (Envelope)", linestyle="--", color="red")
plt.plot(x, -envelope, linestyle="--", color="red")

# 图例与标签
plt.title("两列波叠加形成的波包")
plt.xlabel("x")
plt.ylabel("y")
plt.axhline(0, color="black", linewidth=0.5, linestyle="--")
plt.legend()

# 保存图片
plt.savefig("beat_wave.png", dpi=300)
plt.show()