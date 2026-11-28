"""Self-authored teaching data: OLS, WLS and a derived expansion coefficient.

Temperature errors are negligible in this illustrative model. Each supplied
length uncertainty is a known independent STANDARD uncertainty; no common
calibration component is hidden in the diagonal weights.
"""

import argparse
import csv
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.optimize import curve_fit

plt.rcParams.update({"svg.hashsalt": "plw-error-analysis", "svg.fonttype": "none"})


def linear_model(temperature, intercept, slope):
    return intercept + slope * temperature


def model_jacobian(temperature, intercept, slope):
    return np.column_stack((np.ones_like(temperature), temperature))


def fit_line(temperature, length, u_length=None):
    temperature = np.asarray(temperature, dtype=float)
    length = np.asarray(length, dtype=float)
    if temperature.ndim != 1 or length.shape != temperature.shape or len(length) < 3:
        raise ValueError("At least three paired observations are required.")
    if not np.all(np.isfinite(temperature)) or not np.all(np.isfinite(length)):
        raise ValueError("Observations must be finite.")
    if np.ptp(temperature) == 0:
        raise ValueError("Distinct temperatures are needed to determine a slope.")
    sigma = None
    if u_length is not None:
        sigma = np.asarray(u_length, dtype=float)
        if (
            sigma.shape != length.shape
            or not np.all(np.isfinite(sigma))
            or np.any(sigma <= 0)
        ):
            raise ValueError("Each standard uncertainty must be positive and finite.")
    # An analytic Jacobian keeps the small slope stable next to the large intercept.
    params, covariance = curve_fit(
        linear_model,
        temperature,
        length,
        p0=[length.mean(), 0.01],
        sigma=sigma,
        absolute_sigma=sigma is not None,
        jac=model_jacobian,
    )
    intercept, slope = params
    if intercept == 0:
        raise ValueError("Expansion coefficient is undefined for zero intercept.")
    residuals = length - linear_model(temperature, *params)
    gradient = np.array([-slope / intercept**2, 1 / intercept])
    alpha_variance = float(gradient @ covariance @ gradient)
    result = {
        "intercept_mm": float(intercept),
        "slope_mm_per_k": float(slope),
        "covariance": covariance.tolist(),
        "u_intercept_mm": float(np.sqrt(covariance[0, 0])),
        "u_slope_mm_per_k": float(np.sqrt(covariance[1, 1])),
        "alpha_per_k": float(slope / intercept),
        "u_alpha_per_k": float(np.sqrt(alpha_variance)),
        "residuals_mm": residuals.tolist(),
        "degrees_of_freedom": len(length) - 2,
        "residual_standard_deviation_mm": float(
            np.sqrt(residuals @ residuals / (len(length) - 2))
        ),
    }
    if sigma is not None:
        chi_square = float(np.sum((residuals / sigma) ** 2))
        result["chi_square"] = chi_square
        result["reduced_chi_square"] = chi_square / (len(length) - 2)
    return result


def make_plot(temperature, length, sigma, ordinary, weighted, output):
    fig, axes = plt.subplots(2, 1, figsize=(7.2, 6), sharex=True, layout="constrained")
    grid = np.linspace(temperature.min(), temperature.max(), 200)
    axes[0].errorbar(
        temperature,
        length,
        yerr=sigma,
        fmt="o",
        capsize=4,
        label="Teaching data; bars = u(L)",
    )
    for result, style, label in [(ordinary, "--", "OLS"), (weighted, "-", "WLS")]:
        axes[0].plot(
            grid,
            linear_model(grid, result["intercept_mm"], result["slope_mm_per_k"]),
            style,
            label=label,
        )
    axes[0].set(ylabel="Length / mm", title="Copper expansion: a teaching model")
    axes[0].legend()
    axes[1].errorbar(
        temperature, weighted["residuals_mm"], yerr=sigma, fmt="o", capsize=4
    )
    axes[1].axhline(0, color="0.4", linewidth=1)
    axes[1].set(xlabel="Temperature / deg C", ylabel="WLS residual / mm")
    for ax in axes:
        ax.grid(alpha=0.25)
    fig.savefig(output, metadata={"Date": None})
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir", type=Path, default=Path(".tmp-error-analysis/copper")
    )
    args = parser.parse_args()
    with (
        Path(__file__)
        .with_name("copper-expansion.csv")
        .open(encoding="utf-8", newline="") as handle
    ):
        rows = list(csv.DictReader(handle))
    temperature = np.array([float(row["temperature_c"]) for row in rows])
    length = np.array([float(row["length_mm"]) for row in rows])
    sigma = np.array([float(row["u_length_mm"]) for row in rows])
    ordinary = fit_line(temperature, length)
    weighted = fit_line(temperature, length, sigma)
    result = {"ordinary": ordinary, "weighted": weighted}
    args.output_dir.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)
    (args.output_dir / "results.json").write_text(serialized + "\n", encoding="utf-8")
    make_plot(
        temperature,
        length,
        sigma,
        ordinary,
        weighted,
        args.output_dir / "copper-fit.svg",
    )
    print(serialized)
    # For this supplied data u(alpha) rounds to 0.035e-5 (two significant digits).
    print(
        f"Report (standard): alpha = ({weighted['alpha_per_k'] * 1e5:.3f} +/- {weighted['u_alpha_per_k'] * 1e5:.3f}) x 10^-5 /K"
    )


if __name__ == "__main__":
    main()
