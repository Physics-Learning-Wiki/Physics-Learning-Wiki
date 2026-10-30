"""Self-authored teaching data: repeated timing and first-order GUM propagation.

Run from any directory. The CSV must be beside this script. No random sampling
is performed. The model assumes independent, stable timing observations,
small-amplitude motion, a point bob and negligible air/finite-size effects.
"""

import argparse
import csv
import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.stats import norm, t

plt.rcParams.update({"svg.hashsalt": "plw-error-analysis", "svg.fonttype": "none"})


def analyze(elapsed_s, oscillations=20):
    elapsed_s = np.asarray(elapsed_s, dtype=float)
    if elapsed_s.ndim != 1 or elapsed_s.size < 2:
        raise ValueError("At least two timing observations are required.")
    if not np.all(np.isfinite(elapsed_s)) or np.any(elapsed_s <= 0):
        raise ValueError("Timing observations must be positive and finite.")
    if not math.isfinite(oscillations) or oscillations <= 0:
        raise ValueError("The oscillation count must be positive and finite.")
    n = elapsed_s.size
    period = float(elapsed_s.mean() / oscillations)
    s_elapsed = float(elapsed_s.std(ddof=1))
    s_period = s_elapsed / oscillations
    u_a_period = s_period / math.sqrt(n)
    # A common calibration uncertainty on elapsed time is NOT divided by sqrt(n).
    u_b_period = 0.020 / oscillations
    u_period = math.hypot(u_a_period, u_b_period)
    length = 1.001 - 0.001  # Indication minus measured zero offset, metres.
    u_length_resolution = 0.001 / math.sqrt(12)
    u_length_calibration = 0.00020
    u_length = math.hypot(u_length_resolution, u_length_calibration)
    g = 4 * math.pi**2 * length / period**2
    c_length, c_period = g / length, -2 * g / period
    inputs = [
        ("length_resolution", u_length_resolution, c_length),
        ("length_calibration", u_length_calibration, c_length),
        ("period_repeatability", u_a_period, c_period),
        ("period_calibration", u_b_period, c_period),
    ]
    variance = sum((u * c) ** 2 for _, u, c in inputs)
    budget = [
        {
            "source": name,
            "u_input": u,
            "sensitivity": c,
            "u_g": abs(u * c),
            "variance_percent": 100 * (u * c) ** 2 / variance,
        }
        for name, u, c in inputs
    ]
    return {
        "n": int(n),
        "oscillations": oscillations,
        "mean_elapsed_s": float(elapsed_s.mean()),
        "s_elapsed_s": s_elapsed,
        "period_s": period,
        "s_period_s": s_period,
        "u_a_period_s": u_a_period,
        "u_b_period_s": u_b_period,
        "u_period_s": u_period,
        "length_m": length,
        "u_length_m": u_length,
        "g_m_s2": g,
        "u_g_m_s2": math.sqrt(variance),
        "coverage_factor": 2,
        "expanded_u_g_m_s2": 2 * math.sqrt(variance),
        # This interval is for the mean timing ONLY, not for g or all B components.
        "timing_mean_ci95_half_width_s": float(t.ppf(0.975, n - 1) * u_a_period),
        "budget": budget,
    }


def make_plot(elapsed_s, result, output):
    periods = elapsed_s / result["oscillations"]
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.8), layout="constrained")
    axes[0].plot(np.arange(1, len(periods) + 1), periods, "o", label="Teaching data")
    axes[0].axhline(result["period_s"], color="C1", label="Mean")
    axes[0].set(
        xlabel="Run", ylabel="Period / s", title="Check the measurement sequence"
    )
    axes[0].legend()
    # A fitted normal curve is illustrative; n=10 cannot establish normality.
    axes[1].hist(periods, bins=5, density=True, alpha=0.5, label="10 observations")
    spread = result["s_period_s"]
    if spread > 0:
        x = np.linspace(periods.mean() - 4 * spread, periods.mean() + 4 * spread, 200)
        axes[1].plot(
            x, norm.pdf(x, periods.mean(), spread), label="Illustrative normal PDF"
        )
    axes[1].set(
        xlabel="Period / s",
        ylabel="Density / (1/s)",
        title="Shape is not proven by 10 points",
    )
    axes[1].legend(fontsize=8)
    fig.savefig(output, metadata={"Date": None})
    plt.close(fig)


def make_precision_plot(output):
    fig, ax = plt.subplots(figsize=(8, 3.6), layout="constrained")
    samples = [
        ([9.7, 10.2, 9.9, 10.1, 10.0], "Wider spread, centred"),
        ([10.38, 10.42, 10.40, 10.39, 10.41], "Small spread, common offset"),
        ([9.98, 10.02, 10.00, 9.99, 10.01], "Small spread, centred"),
    ]
    for row, (values, label) in enumerate(samples):
        ax.scatter(values, np.full(len(values), row), s=50, label=label)
    ax.axvline(10, color="0.35", linestyle="--", label="Illustrative reference")
    ax.set(
        yticks=range(3),
        yticklabels=[s[1] for s in samples],
        xlabel="Indication / arbitrary unit",
        ylim=(-0.5, 2.5),
    )
    ax.grid(axis="x", alpha=0.25)
    ax.legend(loc="upper left", fontsize=8)
    fig.savefig(output, metadata={"Date": None})
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir", type=Path, default=Path(".tmp-error-analysis/pendulum")
    )
    args = parser.parse_args()
    csv_path = Path(__file__).with_name("pendulum-times.csv")
    with csv_path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    counts = {int(row["oscillations"]) for row in rows}
    if len(counts) != 1:
        raise ValueError("This example requires the same cycle count in every run.")
    times = np.array([float(row["elapsed_s"]) for row in rows])
    result = analyze(times, counts.pop())
    args.output_dir.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)
    (args.output_dir / "results.json").write_text(serialized + "\n", encoding="utf-8")
    make_plot(times, result, args.output_dir / "repeated-measurements.svg")
    make_precision_plot(args.output_dir / "precision-bias.svg")
    print(serialized)
    print(
        f"Report (k=2): g = ({result['g_m_s2']:.3f} +/- {result['expanded_u_g_m_s2']:.3f}) m/s^2"
    )


if __name__ == "__main__":
    main()
