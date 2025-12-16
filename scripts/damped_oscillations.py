import numpy as np
import matplotlib.pyplot as plt

def underdamped(beta, omega, A, phi, t):
    """Calculate underdamped oscillation."""
    omega_d = np.sqrt(omega**2 - beta**2)
    return A * np.exp(-beta * t) * np.cos(omega_d * t + phi), A * np.exp(-beta * t)

def critically_damped(beta, A, C1, C2, t):
    """Calculate critically damped oscillation."""
    return (C1 + C2 * t) * np.exp(-beta * t), (C1 + C2 * t) * np.exp(-beta * t)

def overdamped(beta, omega, C1, C2, t):
    """Calculate overdamped oscillation."""
    r1 = -beta + np.sqrt(beta**2 - omega**2)
    r2 = -beta - np.sqrt(beta**2 - omega**2)
    x = C1 * np.exp(r1 * t) + C2 * np.exp(r2 * t)
    envelope = np.maximum(C1 * np.exp(r1 * t), C2 * np.exp(r2 * t))
    return x, envelope

# Parameters
beta = 0.2
omega = 1.0
A = 1.0
phi = 0.0
C1, C2 = 1.0, 0.5
t = np.linspace(0, 50, 1000)

# Underdamped
x_underdamped, envelope_underdamped = underdamped(beta, omega, A, phi, t)
plt.figure(figsize=(8, 6))
plt.plot(t, x_underdamped, label="Underdamped Oscillation")
plt.plot(t, envelope_underdamped, 'r--', label="Envelope")
plt.plot(t, -envelope_underdamped, 'r--')
plt.title("Underdamped Oscillation")
plt.xlabel("Time (s)")
plt.ylabel("Displacement")
plt.legend()
plt.grid()
plt.savefig("underdamped_oscillation.png")
plt.close()

# Critically damped
x_critically_damped, envelope_critically_damped = critically_damped(beta, A, C1, C2, t)
plt.figure(figsize=(8, 6))
plt.plot(t, x_critically_damped, label="Critically Damped Oscillation")
plt.plot(t, envelope_critically_damped, 'r--', label="Envelope")
plt.title("Critically Damped Oscillation")
plt.xlabel("Time (s)")
plt.ylabel("Displacement")
plt.legend()
plt.grid()
plt.savefig("critically_damped_oscillation.png")
plt.close()

# Overdamped
x_overdamped, envelope_overdamped = overdamped(beta, omega, C1, C2, t)
plt.figure(figsize=(8, 6))
plt.plot(t, x_overdamped, label="Overdamped Oscillation")
plt.plot(t, envelope_overdamped, 'r--', label="Envelope")
plt.title("Overdamped Oscillation")
plt.xlabel("Time (s)")
plt.ylabel("Displacement")
plt.legend()
plt.grid()
plt.savefig("overdamped_oscillation.png")
plt.close()