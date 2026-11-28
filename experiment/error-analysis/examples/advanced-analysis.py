"""Reproduce self-authored course examples; no site/build dependency changes.

Run: uv run --with numpy --with scipy python PATH/advanced-analysis.py
CSV inputs live beside this script. Output is separate from author sources.
"""

import argparse
import csv
import json
from pathlib import Path

import numpy as np
from scipy import integrate, optimize, stats

SOURCE = Path(__file__).resolve().parent


def read_rows(name):
    with (SOURCE / name).open(encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def gauss_newton(time, voltage, initial=(4.8, 0.25), max_steps=50):
    """Scaled step checks and backtracking; raises on rank/convergence failure."""
    time, voltage = np.asarray(time, float), np.asarray(voltage, float)
    if time.ndim != 1 or time.shape != voltage.shape or len(time) <= 2:
        raise ValueError("At least three paired observations are required")
    if not np.isfinite(time).all() or not np.isfinite(voltage).all():
        raise ValueError("Observations must be finite")
    theta = np.asarray(initial, float)
    trace = [theta.copy()]
    for _ in range(max_steps):
        amplitude, rate = theta
        exponential = np.exp(-rate * time)
        residual = voltage - amplitude * exponential
        jacobian = np.column_stack((exponential, -amplitude * time * exponential))
        step, _, rank, _ = np.linalg.lstsq(jacobian, residual, rcond=None)
        if rank < 2:
            raise ValueError("The decay parameters are not identifiable")
        scale = 1.0
        while scale >= 2**-20:
            candidate = theta + scale * step
            if candidate[0] > 0 and candidate[1] >= 0:
                candidate_residual = voltage - candidate[0] * np.exp(-candidate[1] * time)
                if candidate_residual @ candidate_residual <= residual @ residual + 1e-15:
                    break
            scale /= 2
        else:
            raise RuntimeError("No decreasing physically admissible step")
        theta = candidate
        trace.append(theta.copy())
        if np.max(np.abs(scale * step) / np.maximum(np.abs(theta), 1)) < 1e-10:
            return theta, np.asarray(trace)
    raise RuntimeError("Gauss–Newton did not converge")


def analyze():
    rows = read_rows("weighted-lengths.csv")
    x = np.array([float(r["length_mm"]) for r in rows])
    u = np.array([float(r["u_mm"]) for r in rows])
    if not np.isfinite(x).all() or not np.isfinite(u).all() or np.any(u <= 0):
        raise ValueError("Known standard uncertainties must be positive and finite")
    weights = 1 / u**2
    mean = float(weights @ x / weights.sum())
    # Independently minimize the likelihood objective for a check.
    alternate = optimize.minimize_scalar(lambda z: np.sum(((x - z) / u) ** 2)).x
    np.testing.assert_allclose(mean, alternate, atol=1e-8)
    result = {"weighted": {"mean_mm": mean, "u_mm": float(1 / np.sqrt(weights.sum())),
                           "chi_square": float(np.sum(((x - mean) / u) ** 2))}}

    candidate, remainder = 10.8, np.array([9.9, 10.0, 10.1, 10.0, 10.0])
    sample = np.append(remainder, candidate)
    n = len(sample)
    quantile = stats.t.ppf(1 - .05 / (2 * n), n - 2)
    result["outliers"] = {
        "fixed_candidate_t": float((candidate - remainder.mean()) /
                                   (remainder.std(ddof=1) * np.sqrt(1 + 1 / len(remainder)))),
        "fixed_candidate_df": len(remainder) - 1,
        "grubbs_g": float(np.max(np.abs(sample - sample.mean())) / sample.std(ddof=1)),
        "grubbs_critical_05": float((n - 1) / np.sqrt(n) * np.sqrt(quantile**2 / (n - 2 + quantile**2))),
        "dixon_r10": .26 / .30,
    }
    rows = read_rows("budget-inputs.csv")
    q = np.array([float(r["standard_uncertainty"]) * float(r["sensitivity"]) for r in rows])
    df = np.array([float(r["df"]) for r in rows])
    uc = float(np.linalg.norm(q))
    effective = float(uc**4 / np.sum(q**4 / df))
    k = float(stats.t.ppf(.975, effective))
    result["finite_df"] = {"uc_mm": uc, "df": effective, "k": k, "expanded_mm": k * uc}
    result["allocation"] = {
        "equal_ul_mm": 1 / np.sqrt(2) / 50,
        "equal_uw_mm": 1 / np.sqrt(2) / 100,
        "adjusted_ul_mm": np.sqrt(1 - .8**2) / 50,
        "omit_ratio_05": np.sqrt(2 * .05 - .05**2),
        "scheme_one_mm": np.sqrt(.008**2 + (.005 / 2)**2 + (.007 / 2)**2),
        "scheme_two_mm": np.hypot(.008, .010) / 2,
    }
    # Validate allocation by substitution into the full output variance.
    np.testing.assert_allclose((50 * result["allocation"]["adjusted_ul_mm"])**2 + (100 * .008)**2, 1)

    rows = read_rows("combined-lengths.csv")
    design = np.array([[float(r[k]) for k in ("a_coefficient", "b_coefficient", "c_coefficient")] for r in rows])
    length = np.array([float(r["length_mm"]) for r in rows])
    parameter, _, rank, _ = np.linalg.lstsq(design, length, rcond=None)
    if rank != 3:
        raise ValueError("Combination model must identify all three lengths")
    residual = length - design @ parameter
    s2 = float(residual @ residual / (len(length) - rank))
    normal_inverse = np.linalg.solve(design.T @ design, np.eye(rank))
    # An independent constrained optimizer and normal-equation orthogonality.
    alternate = optimize.least_squares(lambda z: design @ z - length, np.zeros(3)).x
    np.testing.assert_allclose(parameter, alternate, atol=1e-8)
    np.testing.assert_allclose(design.T @ residual, 0, atol=1e-10)
    result["combined"] = {"length_mm": parameter.tolist(), "residual_mm": residual.tolist(),
                          "s0_mm": s2**.5, "covariance_mm2": (s2 * normal_inverse).tolist(),
                          "u_mm": np.sqrt(np.diag(s2 * normal_inverse)).tolist(),
                          "total_mm": float(parameter.sum()),
                          "total_u_mm": float(np.sqrt(s2 * normal_inverse.sum())),
                          "known_absolute_u_mm": np.sqrt(np.diag(.020**2 * normal_inverse)).tolist()}
    rows = read_rows("decay-voltage.csv")
    time = np.array([float(r["time_s"]) for r in rows])
    voltage = np.array([float(r["voltage_v"]) for r in rows])
    theta, trace = gauss_newton(time, voltage)
    alternate = optimize.least_squares(lambda z: z[0] * np.exp(-z[1] * time) - voltage,
                                      (6, .5), bounds=(0, np.inf), xtol=1e-13, ftol=1e-13, gtol=1e-13).x
    np.testing.assert_allclose(theta, alternate, rtol=1e-7)
    exp = np.exp(-theta[1] * time)
    jac = np.column_stack((exp, -theta[0] * time * exp))
    residual = voltage - theta[0] * exp
    sse = float(residual @ residual)
    covariance = sse / 3 * np.linalg.solve(jac.T @ jac, np.eye(2))
    # Central numerical derivatives check the independently supplied analytic Jacobian.
    for j in range(2):
        delta = np.zeros(2); delta[j] = 1e-6
        def model(z):
            return z[0] * np.exp(-z[1] * time)
        numeric = (model(theta + delta) - model(theta - delta)) / (2e-6)
        np.testing.assert_allclose(jac[:, j], numeric, rtol=1e-7, atol=1e-8)
    result["decay"] = {"parameters": theta.tolist(), "iterations": trace.tolist(), "sse_v2": sse,
                       "covariance": covariance.tolist(), "u": np.sqrt(np.diag(covariance)).tolist()}

    def comparison(z):
        ls, difference, dt, da, alpha, temperature_difference = z
        return ls + difference - ls * (dt * da + alpha * temperature_difference)
    center = np.array([100, .002, 1, 1e-6, 1e-5, .1])
    inputs_u = np.array([.0001, .0002, .2, .2e-6, .5e-6, .02])
    coefficients = np.array([1 - 2e-6, 1, -.0001, -100, -10, -.001])
    for j, h in enumerate([1e-3, 1e-3, .01, 1e-5, 1e-5, .01]):
        delta = np.zeros(6); delta[j] = h
        derivative = (comparison(center + delta) - comparison(center - delta)) / (2 * h)
        np.testing.assert_allclose(derivative, coefficients[j], rtol=1e-5, atol=1e-10)
    result["comparison"] = {"length_mm": comparison(center), "u_mm": float(np.linalg.norm(coefficients * inputs_u))}
    # Independent integration of two nonnormal distribution second moments.
    triangular_variance = integrate.quad(lambda z: z*z * (1-abs(z)), -1, 1)[0]
    arcsine_variance = integrate.quad(lambda phase: np.sin(phase)**2/(2*np.pi), 0, 2*np.pi)[0]
    np.testing.assert_allclose([triangular_variance, arcsine_variance], [1/6, 1/2])
    result["distribution_variances_unit_halfwidth"] = [triangular_variance, arcsine_variance]
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path(".tmp-error-analysis/advanced"))
    args = parser.parse_args()
    if args.output_dir.resolve() == SOURCE:
        raise ValueError("Output must be separate from teaching source files")
    result = analyze()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "results.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Verified weighted, outlier, allocation, finite-df, matrix, decay and comparison examples.")
    print("Results:", (args.output_dir / "results.json").resolve())
