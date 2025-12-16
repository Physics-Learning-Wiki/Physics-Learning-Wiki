import numpy as np
import matplotlib.pyplot as plt

def lissajous_curve(A, B, omega_x, omega_y, delta, t):
    """
    Generate Lissajous curve points.

    Parameters:
        A (float): Amplitude in x-direction.
        B (float): Amplitude in y-direction.
        omega_x (float): Angular frequency in x-direction.
        omega_y (float): Angular frequency in y-direction.
        delta (float): Phase difference.
        t (numpy.ndarray): Time array.

    Returns:
        x, y (numpy.ndarray): Coordinates of the Lissajous curve.
    """
    x = A * np.cos(omega_x * t)
    y = B * np.cos(omega_y * t + delta)
    return x, y

# Parameters for the grid
rows, cols = 3, 4
fig, axes = plt.subplots(rows, cols, figsize=(12, 9))
fig.suptitle("Lissajous Figures", fontsize=16)

# Time array
t = np.linspace(0, 2 * np.pi, 1000)

# Frequency ratios and phase differences
frequency_ratios = [(1, 1), (1, 2), (1, 3), (1, 4),
                    (2, 1), (2, 3), (2, 5), (2, 7),
                    (3, 2), (3, 4), (3, 5), (3, 7)]
phases = [0, np.pi / 4, np.pi / 2, 3 * np.pi / 4]

# Generate Lissajous figures
for i, (omega_x, omega_y) in enumerate(frequency_ratios):
    row, col = divmod(i, cols)
    ax = axes[row, col]

    for delta in phases:
        x, y = lissajous_curve(1, 1, omega_x, omega_y, delta, t)
        ax.plot(x, y, label=f"Δ={delta:.2f}")

    ax.set_title(f"ω_x:ω_y = {omega_x}:{omega_y}")
    ax.axis("equal")
    ax.legend(fontsize=8)

# Adjust layout and save the figure
plt.tight_layout(rect=[0, 0, 1, 0.95])
plt.savefig("lissajous_grid.png")
plt.show()