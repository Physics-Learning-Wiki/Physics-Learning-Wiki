#!/usr/bin/env node

import fs from "node:fs/promises";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const BUDGETS_PATH = path.join(SCRIPT_DIR, "budgets.json");
const ALLOWLIST_PATH = path.join(SCRIPT_DIR, "large-image-allowlist.json");
const KIB = 1024;
const RASTER_EXTENSIONS = new Set([".apng", ".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const REPRESENTATIVE_PAGES = [
  "intro/about/index.html",
  "intro/faq/index.html",
  "modern/general-relativity/index.html",
  "thermodynamics/chapter-1/gas/index.html",
  "mechanics/oscillation-wave/harmonic-wave/index.html",
  "intro/symbol/index.html",
  "courses/index.html",
  "quiz/index.html",
  "submit/index.html",
  "quiz/contribute/index.html"
];
const FEATURE_RESOURCE_PATTERNS = {
  math: /mathjax\.css/i,
  mermaid: /(?:mermaid(?:-responsive)?\.js|mermaid(?:\.min)?\.js|mermaid@)/i,
  quizJs: /(?:quiz-app|features\/quiz)\.js/i,
  quizCss: /quiz\.css/i,
  submit: /(?:submit-form|features\/submit)\.(?:js|css)/i,
  questionContribute: /(?:question-contribute|features\/question-contribute)\.js/i,
  easyMde: /easymde/i,
  pagefind: /(?:^|\/)pagefind(?:\/|\.|-)/i
};

function parseArgs(argv) {
  const options = { site: "site", mode: "report", output: "site-performance-report.json" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--site" || value === "--mode" || value === "--output") {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) throw new Error(`Missing value for ${value}`);
      options[value.slice(2)] = next;
      index += 1;
    } else if (value === "--help" || value === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  if (!new Set(["report", "blocking"]).has(options.mode)) {
    throw new Error(`Unsupported mode "${options.mode}"; use report or blocking`);
  }
  return options;
}

async function walkFiles(root) {
  const files = [];
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolutePath);
      else if (entry.isFile()) files.push(absolutePath);
    }
  }
  await visit(root);
  return files;
}

function relativePosix(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function formatBytes(bytes) {
  if (bytes < KIB) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB"];
  let value = bytes / KIB;
  let unit = units[0];
  for (let index = 1; value >= KIB && index < units.length; index += 1) {
    value /= KIB;
    unit = units[index];
  }
  return `${value.toFixed(2)} ${unit}`;
}

function parseTagAttributes(tag) {
  const attributes = {};
  const body = tag.replace(/^<[\w:-]+\b|\/?\s*>$/g, " ");
  const expression = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of body.matchAll(expression)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

function collectPageReferences(html) {
  const stylesheets = [];
  const scripts = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = parseTagAttributes(match[0]);
    if ((attributes.rel ?? "").split(/\s+/).some(token => token.toLowerCase() === "stylesheet") && attributes.href) {
      stylesheets.push(attributes.href);
    }
  }
  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const source = parseTagAttributes(match[0]).src;
    if (source) scripts.push(source);
  }
  return { stylesheets, scripts };
}

function compressSizes(buffer) {
  return {
    rawBytes: buffer.byteLength,
    gzipBytesEstimate: gzipSync(buffer, { level: 9, mtime: 0 }).byteLength,
    brotliBytesEstimate: brotliCompressSync(buffer, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 }
    }).byteLength
  };
}

async function readAllowlist() {
  const raw = await fs.readFile(ALLOWLIST_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${path.relative(REPO_ROOT, ALLOWLIST_PATH)} must be a JSON array`);
  return parsed;
}

function findPathCollisions(files, siteDir) {
  const pathsByFoldedName = new Map();
  for (const absolutePath of files) {
    const relative = relativePosix(siteDir, absolutePath);
    const folded = relative.toLocaleLowerCase("en-US");
    const current = pathsByFoldedName.get(folded) ?? [];
    current.push(relative);
    pathsByFoldedName.set(folded, current);
  }
  return [...pathsByFoldedName.values()].filter(paths => paths.length > 1);
}

function validateAllowlist(allowlist, siteDir) {
  const failures = [];
  const exactSeen = new Set();
  const foldedSeen = new Set();
  for (const item of allowlist) {
    if (typeof item !== "string" || item.length === 0) {
      failures.push(`Allowlist entry must be a non-empty path: ${JSON.stringify(item)}`);
      continue;
    }
    if (/[?*\[\]]/.test(item)) failures.push(`Allowlist must not contain globs: ${item}`);
    const normalized = item.replaceAll("\\", "/").replace(/^\.\//, "");
    const folded = normalized.toLocaleLowerCase("en-US");
    if (exactSeen.has(normalized) || foldedSeen.has(folded)) failures.push(`Duplicate allowlist entry: ${item}`);
    exactSeen.add(normalized);
    foldedSeen.add(folded);
    const absolutePath = path.resolve(siteDir, normalized);
    if (!absolutePath.startsWith(`${siteDir}${path.sep}`)) {
      failures.push(`Allowlist path must stay within site/: ${item}`);
      continue;
    }
    try {
      const stats = statSync(absolutePath);
      if (!stats.isFile()) failures.push(`Allowlist path is not a file: ${item}`);
    } catch {
      failures.push(`Allowlist path does not exist in site/: ${item}`);
    }
  }
  return failures;
}

function countFeatures(htmlFiles) {
  const counts = {};
  let pagesWithAttribute = 0;
  for (const absolutePath of htmlFiles) {
    const text = readFileSync(absolutePath, "utf8");
    const match = text.match(/\bdata-plw-features\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!match) continue;
    pagesWithAttribute += 1;
    for (const feature of (match[1] ?? match[2] ?? "").split(/\s+/).filter(Boolean)) {
      counts[feature] = (counts[feature] ?? 0) + 1;
    }
  }
  return { pagesWithAttribute, counts };
}

async function buildReport(siteDir) {
  const budgets = JSON.parse(await fs.readFile(BUDGETS_PATH, "utf8"));
  const largeImageLimit = budgets.blocking.largeImageThresholdBytes ?? 500 * KIB;
  const files = await walkFiles(siteDir);
  const fileStats = await Promise.all(files.map(async absolutePath => ({
    absolutePath,
    path: relativePosix(siteDir, absolutePath),
    bytes: (await fs.stat(absolutePath)).size
  })));
  const htmlFiles = fileStats.filter(file => file.path.toLowerCase().endsWith(".html"));
  const rasterFiles = fileStats.filter(file => RASTER_EXTENSIONS.has(path.extname(file.path).toLowerCase()));
  const cssJsFiles = fileStats.filter(file => /\.(?:css|mjs|js)$/i.test(file.path));
  const sortedByBytes = entries => [...entries].sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path));
  const htmlTop = sortedByBytes(htmlFiles).slice(0, 20).map(({ path: filePath, bytes }) => ({ path: filePath, bytes }));
  const cssJsTop = sortedByBytes(cssJsFiles).slice(0, 20).map(({ path: filePath, bytes }) => ({ path: filePath, bytes }));
  const rasterTop = sortedByBytes(rasterFiles).slice(0, 20).map(({ path: filePath, bytes }) => ({ path: filePath, bytes }));
  const lookup = new Map(fileStats.map(file => [file.path, file]));
  const representativePages = {};
  const missingRepresentativePages = [];
  const ordinaryPages = ["intro/about/index.html", "intro/faq/index.html"];
  const ordinaryPageFeatureResources = {};
  const compression = {};
  const compressedPaths = new Set();

  for (const relativePath of REPRESENTATIVE_PAGES) {
    const file = lookup.get(relativePath);
    if (!file) {
      missingRepresentativePages.push(relativePath);
      continue;
    }
    const html = await fs.readFile(file.absolutePath, "utf8");
    const references = collectPageReferences(html);
    representativePages[relativePath] = { bytes: file.bytes, cssUrls: references.stylesheets, jsUrls: references.scripts };
    compression[relativePath] = compressSizes(await fs.readFile(file.absolutePath));
    compressedPaths.add(relativePath);
    for (const pagePath of ordinaryPages) {
      if (pagePath !== relativePath) continue;
      const allUrls = [...references.stylesheets, ...references.scripts];
      ordinaryPageFeatureResources[relativePath] = Object.fromEntries(
        Object.entries(FEATURE_RESOURCE_PATTERNS).map(([feature, pattern]) => [feature, allUrls.some(url => pattern.test(url))])
      );
    }
  }

  const namedCorePaths = fileStats.filter(file =>
    /(?:^|\/)(?:main|bundle|runtime-loader|mathjax|quiz|submit-form|question-contribute)[^/]*\.(?:css|mjs|js)$/i.test(file.path)
  );
  const corePaths = new Set([...cssJsTop.map(file => file.path), ...namedCorePaths.map(file => file.path)]);
  for (const relativePath of corePaths) {
    if (compressedPaths.has(relativePath)) continue;
    const file = lookup.get(relativePath);
    if (file) compression[relativePath] = compressSizes(await fs.readFile(file.absolutePath));
  }

  const mathCss = fileStats.filter(file => /(?:^|\/)mathjax\.css$/i.test(file.path));
  const legacySearchIndex = lookup.get("search/search_index.json");
  const runtimeLoader = lookup.get("_static/js/runtime-loader.js");
  const featureDistribution = countFeatures(htmlFiles.map(file => file.absolutePath));
  const allowlist = await readAllowlist();
  const allowlistFailures = validateAllowlist(allowlist, siteDir);
  const pathCollisions = findPathCollisions(files, siteDir);
  const largeImages = sortedByBytes(rasterFiles.filter(file => file.bytes > largeImageLimit));
  const unallowlistedLargeImages = largeImages.filter(file => !allowlist.includes(file.path));
  const largeImageStats = {
    over250KiB: rasterFiles.filter(file => file.bytes > 250 * KIB).length,
    over500KiB: rasterFiles.filter(file => file.bytes > 500 * KIB).length,
    over1MiB: rasterFiles.filter(file => file.bytes > 1024 * KIB).length
  };
  const totalBytes = fileStats.reduce((sum, file) => sum + file.bytes, 0);
  const duplicateGeneratedPathFailures = pathCollisions.map(paths => `Case-insensitive site path collision: ${paths.join(", ")}`);
  const blockingChecks = {
    siteExists: true,
    duplicateGeneratedPaths: pathCollisions.length === 0,
    allowlistPathsExist: allowlistFailures.length === 0,
    largeRasterImagesAllowlisted: unallowlistedLargeImages.length === 0
  };
  const blockingFailures = [
    ...duplicateGeneratedPathFailures,
    ...allowlistFailures,
    ...(budgets.blocking.enforceLargeImageAllowlist
      ? unallowlistedLargeImages.map(file => `Raster image over ${formatBytes(largeImageLimit)} is not allowlisted: ${file.path} (${file.bytes} bytes)`)
      : [])
  ];

  return {
    generatedAt: new Date().toISOString(),
    siteDirectory: path.resolve(siteDir),
    budgets,
    totals: { bytes: totalBytes, formatted: formatBytes(totalBytes), files: fileStats.length, htmlPages: htmlFiles.length },
    htmlTop20: htmlTop,
    cssJsTop20: cssJsTop,
    rasterTop20: rasterTop,
    mathjaxCss: {
      exists: mathCss.length > 0,
      files: mathCss.map(({ path: filePath, bytes }) => ({ path: filePath, bytes })),
      bytes: mathCss.reduce((sum, file) => sum + file.bytes, 0)
    },
    legacySearchIndex: { exists: Boolean(legacySearchIndex), bytes: legacySearchIndex?.bytes ?? 0 },
    runtimeLoader: { exists: Boolean(runtimeLoader), bytes: runtimeLoader?.bytes ?? 0 },
    representativePages,
    ordinaryPageFeatureResources,
    largeImageCounts: largeImageStats,
    largeImagesOver500KiB: largeImages.map(({ path: filePath, bytes }) => ({ path: filePath, bytes })),
    unallowlistedLargeImages: unallowlistedLargeImages.map(({ path: filePath, bytes }) => ({ path: filePath, bytes })),
    dataPlwFeatures: featureDistribution,
    compressionEstimates: {
      method: "Local deterministic Node.js zlib gzip level 9 and Brotli quality 11 estimates; these are not CDN transfer measurements.",
      files: compression
    },
    blockingChecks,
    missingRepresentativePages,
    blockingFailures
  };
}

function renderSummary(report, mode) {
  const lines = [
    `Performance audit (${mode})`,
    `Site: ${report.totals.formatted} across ${report.totals.files} files; ${report.totals.htmlPages} HTML pages`,
    `MathJax CSS: ${report.mathjaxCss.exists ? formatBytes(report.mathjaxCss.bytes) : "not present"}`,
    `Legacy search index: ${report.legacySearchIndex.exists ? formatBytes(report.legacySearchIndex.bytes) : "not present"}`,
    `Runtime loader: ${report.runtimeLoader.exists ? formatBytes(report.runtimeLoader.bytes) : "not present"}`,
    `Raster images: >250 KiB ${report.largeImageCounts.over250KiB}, >500 KiB ${report.largeImageCounts.over500KiB}, >1 MiB ${report.largeImageCounts.over1MiB}`,
    `Feature-marked pages: ${report.dataPlwFeatures.pagesWithAttribute}`,
    `Compression estimates: ${report.compressionEstimates.method}`
  ];
  if (report.blockingFailures.length) {
    lines.push("Blocking checks:", ...report.blockingFailures.map(failure => `  FAIL ${failure}`));
  } else {
    lines.push("Blocking checks: all passed");
  }
  lines.push("Largest HTML pages:");
  lines.push(...report.htmlTop20.slice(0, 10).map(file => `  ${formatBytes(file.bytes)}  ${file.path}`));
  lines.push("Largest CSS/JS assets:");
  lines.push(...report.cssJsTop20.slice(0, 20).map(file => `  ${formatBytes(file.bytes)}  ${file.path}`));
  lines.push("Largest raster images:");
  lines.push(...report.rasterTop20.slice(0, 20).map(file => `  ${formatBytes(file.bytes)}  ${file.path}`));
  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/perf/audit-site.mjs [--site site] [--mode report|blocking] [--output report.json]");
    return;
  }
  const siteDir = path.resolve(REPO_ROOT, options.site);
  const siteStats = await fs.stat(siteDir).catch(() => null);
  if (!siteStats?.isDirectory()) throw new Error(`Site directory does not exist: ${siteDir}`);
  const report = await buildReport(siteDir);
  const reportPath = path.resolve(REPO_ROOT, options.output);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(renderSummary(report, options.mode));
  console.log(`JSON report: ${path.relative(REPO_ROOT, reportPath).split(path.sep).join("/")}`);
  if (options.mode === "blocking" && report.blockingFailures.length > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
