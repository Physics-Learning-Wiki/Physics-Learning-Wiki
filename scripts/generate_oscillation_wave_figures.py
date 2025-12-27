import os
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt


REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "docs" / "mechanics" / "images"


def _ensure_out_dir() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)


def _save(fig: plt.Figure, filename: str) -> None:
    _ensure_out_dir()
    out_path = OUT_DIR / filename
    fig.tight_layout()
    fig.savefig(out_path, dpi=300)
    plt.close(fig)
    print(f"Wrote {out_path}")


def generate_driven_response() -> None:
    """Forced oscillator amplitude and phase vs driving frequency."""

    omega0 = 1.0
    gammas = [0.05, 0.10, 0.20]
    F_over_m = 1.0

    Omega = np.linspace(0.0, 2.0 * omega0, 1200)
    x = Omega / omega0

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(7.5, 7.5), sharex=True)

    for gamma in gammas:
        A = (F_over_m) / np.sqrt((omega0**2 - Omega**2) ** 2 + (2 * gamma * Omega) ** 2)
        delta = np.arctan2(2 * gamma * Omega, omega0**2 - Omega**2)

        ax1.plot(x, A, label=fr"$\gamma/\omega_0={gamma/omega0:.2f}$")
        ax2.plot(x, delta, label=fr"$\gamma/\omega_0={gamma/omega0:.2f}$")

    ax1.set_ylabel(r"Amplitude $A(\Omega)$")
    ax1.grid(True, alpha=0.3)
    ax1.legend(loc="best", fontsize=9)

    ax2.set_xlabel(r"Driving frequency ratio $\Omega/\omega_0$")
    ax2.set_ylabel(r"Phase lag $\delta(\Omega)$ (rad)")
    ax2.set_yticks([0, np.pi / 2, np.pi])
    ax2.set_yticklabels([r"$0$", r"$\pi/2$", r"$\pi$"])
    ax2.grid(True, alpha=0.3)

    _save(fig, "driven_response.png")


def generate_duffing_multistability() -> None:
    """Duffing forced response branches (hardening spring example)."""

    omega0 = 1.0
    gamma = 0.05
    eps = 1.0  # hardening
    F_over_m = 0.30

    a = 3.0 * eps / 4.0

    Omega = np.linspace(0.75 * omega0, 1.35 * omega0, 900)
    x = Omega / omega0

    fig, ax = plt.subplots(1, 1, figsize=(7.5, 4.5))

    all_x: list[float] = []
    all_A: list[float] = []

    for Om in Omega:
        b = omega0**2 - Om**2
        c = (2.0 * gamma * Om) ** 2
        coeff = [
            a**2,
            2.0 * a * b,
            (b**2 + c),
            -(F_over_m**2),
        ]

        roots = np.roots(coeff)
        for r in roots:
            if abs(r.imag) > 1e-8:
                continue
            z = float(r.real)
            if z <= 0:
                continue
            all_x.append(Om / omega0)
            all_A.append(np.sqrt(z))

    ax.scatter(all_x, all_A, s=6, alpha=0.7)
    ax.set_xlabel(r"$\Omega/\omega_0$")
    ax.set_ylabel(r"Steady-state amplitude $A$")
    ax.set_title(r"Duffing oscillator: multivalued response (branches)")
    ax.grid(True, alpha=0.3)

    _save(fig, "duffing_response_branches.png")


def generate_dispersion_group_velocity() -> None:
    """Illustrate phase velocity vs group velocity on a dispersive relation."""

    c = 1.0
    omega_c = 1.0

    k = np.linspace(0.0, 4.0, 600)
    omega = np.sqrt(omega_c**2 + (c * k) ** 2)

    k0 = 2.0
    omega0 = float(np.sqrt(omega_c**2 + (c * k0) ** 2))

    v_p = omega0 / k0
    v_g = (c**2 * k0) / omega0

    fig, ax = plt.subplots(1, 1, figsize=(7.5, 4.5))

    ax.plot(k, omega, label=r"$\omega(k)=\sqrt{\omega_c^2+c^2k^2}$")
    ax.scatter([k0], [omega0], zorder=3)

    # phase-velocity line through origin
    ax.plot([0, k0], [0, omega0], linestyle="--", label=fr"phase line, slope $v_p={v_p:.2f}$")

    # group-velocity tangent at (k0, omega0)
    kk = np.array([k0 - 1.2, k0 + 1.2])
    ax.plot(kk, omega0 + v_g * (kk - k0), linestyle=":", label=fr"tangent, slope $v_g={v_g:.2f}$")

    ax.set_xlabel(r"wave number $k$")
    ax.set_ylabel(r"angular frequency $\omega$")
    ax.set_title("Dispersive medium: phase vs group velocity")
    ax.grid(True, alpha=0.3)
    ax.legend(loc="best", fontsize=9)

    _save(fig, "dispersion_group_velocity.png")


def generate_mach_cone() -> None:
    """2D schematic of a Mach cone (wavefront circles and envelope)."""

    v = 1.0
    v_s = 1.6
    t0 = 2.0

    x_now = v_s * t0
    theta = float(np.arcsin(v / v_s))

    fig, ax = plt.subplots(1, 1, figsize=(7.5, 4.5))

    # past emission times
    dts = np.linspace(0.15, t0, 16)
    for dt in dts:
        x_c = v_s * (t0 - dt)
        r = v * dt
        ang = np.linspace(0, 2 * np.pi, 400)
        ax.plot(x_c + r * np.cos(ang), r * np.sin(ang), color="C0", alpha=0.25, linewidth=1)

    # Mach lines from current position
    L = 5.0
    ax.plot([x_now, x_now - L * np.cos(theta)], [0, L * np.sin(theta)], color="C3", linewidth=2, label=fr"Mach line, $\sin\theta=v/v_s$")
    ax.plot([x_now, x_now - L * np.cos(theta)], [0, -L * np.sin(theta)], color="C3", linewidth=2)

    ax.scatter([x_now], [0], color="k", s=25, zorder=4)
    ax.text(x_now + 0.1, 0.1, "source", fontsize=9)

    ax.set_aspect("equal", adjustable="box")
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.set_title("Mach cone schematic (supersonic source)")
    ax.grid(True, alpha=0.3)
    ax.legend(loc="best", fontsize=9)

    _save(fig, "mach_cone.png")


def main() -> None:
    generate_driven_response()
    generate_duffing_multistability()
    generate_dispersion_group_velocity()
    generate_mach_cone()


if __name__ == "__main__":
    main()
