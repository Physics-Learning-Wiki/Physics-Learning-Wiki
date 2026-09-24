# Site performance audit

The production-site audit is intentionally report-only during the architecture refactor. It records current page and asset sizes, feature resource references, raster image sizes, and deterministic local compression estimates.

After building the site, run:

```bash
node scripts/perf/audit-site.mjs --site site --mode report
```

The command writes `site-performance-report.json` at the repository root by default and prints a human-readable summary. Choose another report path with `--output`. The report does not modify files under `site/`.

Use `--mode blocking` to run the engineering consistency checks. At this stage they cover site path collisions and the explicit large-image allowlist format and paths. `reportOnly` goals in `scripts/perf/budgets.json` are observations, not enforced limits. The image allowlist is a manually reviewed inventory of existing site raster files larger than 500 KiB; the audit never edits or expands it.

Gzip and Brotli byte counts use Node.js zlib with fixed settings. They are deterministic estimates for local comparison and do not represent the compressed response sizes served by GitHub Pages or Netlify.
