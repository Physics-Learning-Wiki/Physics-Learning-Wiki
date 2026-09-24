#!/usr/bin/env node

import fs from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

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
const FEATURE_SELECTORS = {
  math: "mjx-container, .arithmatex",
  mermaid: "[data-plw-mermaid-source], .mermaid",
  quiz: "#plw-quiz-root, #plw-quiz-sets-root, #plw-quiz-questions-root, #plw-quiz-home-root, .plw-quiz-inline-root",
  submit: "#submission-form",
  "question-contribute": "#plw-question-contribute-form"
};
const OLD_MATHJAX_FALLBACK_GIF = "R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

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

function collectPageReferences(root) {
  const stylesheets = [];
  const scripts = [];
  const links = [];
  for (const link of root.querySelectorAll("link[href]")) {
    const href = link.getAttribute("href");
    const rel = (link.getAttribute("rel") ?? "").toLowerCase().split(/\s+/);
    if (rel.includes("stylesheet") && href) stylesheets.push(href);
    links.push({ href, rel, as: link.getAttribute("as") });
  }
  for (const script of root.querySelectorAll("script[src]")) {
    const source = script.getAttribute("src");
    if (source) scripts.push(source);
  }
  return { stylesheets, scripts, links };
}

function parsePage(html) {
  return parse(html, { comment: false });
}

function countFeatures(pageDocuments) {
  const counts = {};
  let pagesWithAttribute = 0;
  const failures = [];
  for (const page of pageDocuments) {
    const article = page.root.querySelector("article.md-content__inner.md-typeset");
    if (!article) continue;
    const declaredValue = article.getAttribute("data-plw-features");
    const declared = new Set((declaredValue ?? "").split(/\s+/).filter(Boolean));
    if (declaredValue !== null) {
      pagesWithAttribute += 1;
      for (const feature of declared) counts[feature] = (counts[feature] ?? 0) + 1;
    }
    for (const feature of declared) {
      if (!Object.hasOwn(FEATURE_SELECTORS, feature)) {
        failures.push(`${page.path}: unknown declared feature "${feature}"`);
        continue;
      }
      if (!article.querySelector(FEATURE_SELECTORS[feature])) {
        failures.push(`${page.path}: declares ${feature} but its feature root is missing`);
      }
    }
    for (const [feature, selector] of Object.entries(FEATURE_SELECTORS)) {
      if (article.querySelector(selector) && !declared.has(feature)) {
        failures.push(`${page.path}: contains ${feature} feature root but does not declare it`);
      }
    }
  }
  return { pagesWithAttribute, counts, failures };
}

function pageRoute(relativePath) {
  if (relativePath.toLowerCase() === "404.html") return "/404.html";
  return relativePath.toLowerCase().endsWith("/index.html")
    ? `/${relativePath.slice(0, -"index.html".length)}`
    : `/${relativePath}`;
}

function pageUrls(page) {
  const canonicalHref = page.root.querySelector('link[rel="canonical"]')?.getAttribute("href");
  const configText = page.root.querySelector("#__config")?.textContent;
  let configBase = ".";
  try {
    const config = JSON.parse(configText ?? "{}");
    if (typeof config.base === "string" && config.base.length > 0) configBase = config.base;
  } catch {
    // Pages without a Material config use their own URL as the base.
  }

  const route = pageRoute(page.path);
  let pagePath = route;
  let origin = "https://plw-audit.invalid";
  if (canonicalHref) {
    try {
      const canonical = new URL(canonicalHref);
      origin = canonical.origin;
      pagePath = canonical.pathname;
    } catch {
      // Fall back to the generated file path when the canonical URL is malformed.
    }
  }
  const pageUrl = new URL(pagePath, `${origin}/`);
  let siteBase;
  try {
    siteBase = new URL(configBase, pageUrl);
  } catch {
    siteBase = new URL(".", pageUrl);
  }
  return { pageUrl, siteBase };
}

function resolveSitePath(reference, page) {
  if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|data:|#)/i.test(reference)) return null;
  const { pageUrl, siteBase } = pageUrls(page);
  try {
    const resolved = new URL(reference, pageUrl);
    if (resolved.origin !== siteBase.origin || !resolved.pathname.startsWith(siteBase.pathname)) return null;
    return decodeURIComponent(resolved.pathname.slice(siteBase.pathname.length)).replace(/^\//, "");
  } catch {
    return null;
  }
}

function ancestorTag(element, tagName) {
  for (let current = element; current; current = current.parentNode) {
    if (current.tagName?.toLowerCase() === tagName) return current;
  }
  return null;
}

function parseSrcset(srcset) {
  return (srcset ?? "").split(",").map(candidate => candidate.trim().split(/\s+/, 1)[0]).filter(Boolean);
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
  const pageDocuments = await Promise.all(htmlFiles.map(async file => {
    const html = await fs.readFile(file.absolutePath, "utf8");
    const root = parsePage(html);
    return { ...file, html, root, references: collectPageReferences(root) };
  }));
  const documentsByPath = new Map(pageDocuments.map(page => [page.path, page]));
  const htmlTop = sortedByBytes(htmlFiles).slice(0, 20).map(({ path: filePath, bytes }) => ({ path: filePath, bytes }));
  const cssJsTop = sortedByBytes(cssJsFiles).slice(0, 20).map(({ path: filePath, bytes }) => ({ path: filePath, bytes }));
  const rasterTop = sortedByBytes(rasterFiles).slice(0, 20).map(({ path: filePath, bytes }) => ({ path: filePath, bytes }));
  const lookup = new Map(fileStats.map(file => [file.path, file]));
  const representativePages = {};
  const missingRepresentativePages = [];
  const ordinaryPages = ["intro/about/index.html", "intro/faq/index.html", "courses/index.html"];
  const ordinaryPageFeatureResources = {};
  const compression = {};
  const compressedPaths = new Set();
  const namedCorePaths = fileStats.filter(file =>
    /(?:^|\/)(?:main|bundle|runtime-loader|mathjax|quiz|submit-form|question-contribute)[^/]*\.(?:css|mjs|js)$/i.test(file.path)
  );
  const corePaths = new Set([...cssJsTop.map(file => file.path), ...namedCorePaths.map(file => file.path)]);

  for (const relativePath of REPRESENTATIVE_PAGES) {
    const file = lookup.get(relativePath);
    const page = documentsByPath.get(relativePath);
    if (!file) {
      missingRepresentativePages.push(relativePath);
      continue;
    }
    const references = page.references;
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

  for (const relativePath of corePaths) {
    if (compressedPaths.has(relativePath)) continue;
    const file = lookup.get(relativePath);
    if (file) compression[relativePath] = compressSizes(await fs.readFile(file.absolutePath));
  }

  const mathCss = fileStats.filter(file => /(?:^|\/)mathjax\.css$/i.test(file.path));
  const legacySearchIndex = lookup.get("search/search_index.json");
  const pagefindJs = lookup.get("pagefind/pagefind.js");
  const pagefindEntryFile = lookup.get("pagefind/pagefind-entry.json");
  let pagefindEntry = null;
  if (pagefindEntryFile) {
    try {
      pagefindEntry = JSON.parse(await fs.readFile(pagefindEntryFile.absolutePath, "utf8"));
    } catch {
      pagefindEntry = null;
    }
  }
  const runtimeLoader = lookup.get("_static/js/runtime-loader.js");
  const featureDistribution = countFeatures(pageDocuments);
  const allowlist = await readAllowlist();
  const allowlistFailures = validateAllowlist(allowlist, siteDir);
  const pathCollisions = findPathCollisions(files, siteDir);
  const responsiveWebpPaths = new Set();
  const generatedResponsiveWebpPaths = new Set();
  const missingResponsiveWebpFiles = new Set();
  const largeImagesWithoutResponsiveSource = [];
  const searchComponentResidues = [];
  const pagefindStaticPreloads = [];
  const mathPages = [];
  const mathFailures = [];
  let dataLatexPages = 0;
  let fallbackGifPages = 0;

  for (const page of pageDocuments) {
    for (const source of page.root.querySelectorAll("picture source")) {
      if ((source.getAttribute("type") ?? "").toLowerCase() !== "image/webp") continue;
      const generatedPicture = ancestorTag(source, "picture")?.getAttribute("data-plw-generated") === "responsive";
      for (const candidate of parseSrcset(source.getAttribute("srcset"))) {
        const relative = resolveSitePath(candidate, page);
        if (!relative) continue;
        responsiveWebpPaths.add(relative);
        if (generatedPicture) generatedResponsiveWebpPaths.add(relative);
        if (!lookup.has(relative)) missingResponsiveWebpFiles.add(`${page.path}: ${relative}`);
      }
    }
    for (const image of page.root.querySelectorAll("img[src]")) {
      const relative = resolveSitePath(image.getAttribute("src"), page);
      const file = relative ? lookup.get(relative) : null;
      if (!file || !RASTER_EXTENSIONS.has(path.extname(file.path).toLowerCase()) || file.bytes <= largeImageLimit) continue;
      const picture = ancestorTag(image, "picture");
      const hasWebpSource = picture?.querySelectorAll("source").some(source =>
        (source.getAttribute("type") ?? "").toLowerCase() === "image/webp" && Boolean(source.getAttribute("srcset"))
      );
      if (!hasWebpSource) largeImagesWithoutResponsiveSource.push({ page: page.path, image: relative, bytes: file.bytes });
    }
    for (const residue of page.root.querySelectorAll('.md-search[data-md-component="search"]')) {
      searchComponentResidues.push(page.path);
      break;
    }
    for (const link of page.references.links) {
      if (link.href && /pagefind/i.test(link.href) && (link.rel.includes("preload") || link.rel.includes("modulepreload"))) {
        pagefindStaticPreloads.push(`${page.path}: ${link.href}`);
      }
    }

    const article = page.root.querySelector("article.md-content__inner.md-typeset");
    if (article?.querySelector(FEATURE_SELECTORS.math)) {
      mathPages.push(page);
      const mathLinks = page.root.querySelectorAll("link[href]").filter(link => /mathjax\.css(?:\?|$)/i.test(link.getAttribute("href") ?? ""));
      const declaredMathCss = article.getAttribute("data-plw-math-css");
      const { pageUrl, siteBase } = pageUrls(page);
      if (mathLinks.length !== 1) {
        mathFailures.push(`${page.path}: expected one build-time Math CSS link, found ${mathLinks.length}`);
      }
      if (!declaredMathCss) {
        mathFailures.push(`${page.path}: math article is missing data-plw-math-css`);
      } else {
        try {
          const declaredUrl = new URL(declaredMathCss, siteBase);
          if (!declaredUrl.searchParams.has("hash")) mathFailures.push(`${page.path}: data-plw-math-css is not versioned with hash=`);
          if (mathLinks.length === 1) {
            const linkedUrl = new URL(mathLinks[0].getAttribute("href"), pageUrl);
            if (linkedUrl.href !== declaredUrl.href) mathFailures.push(`${page.path}: build-time Math CSS link and data-plw-math-css URLs differ`);
          }
        } catch {
          mathFailures.push(`${page.path}: invalid Math CSS URL`);
        }
      }
    }
    if (/\bdata-latex(?:-item)?\s*=/i.test(page.html) || page.root.querySelector("[data-latex], [data-latex-item]")) dataLatexPages += 1;
    if (page.html.includes(OLD_MATHJAX_FALLBACK_GIF)) fallbackGifPages += 1;
  }

  const largeImages = sortedByBytes(rasterFiles.filter(file => file.bytes > largeImageLimit));
  const unallowlistedLargeImages = largeImages.filter(file => !generatedResponsiveWebpPaths.has(file.path) && !allowlist.includes(file.path));
  const largeImageStats = {
    over250KiB: rasterFiles.filter(file => file.bytes > 250 * KIB).length,
    over500KiB: rasterFiles.filter(file => file.bytes > 500 * KIB).length,
    over1MiB: rasterFiles.filter(file => file.bytes > 1024 * KIB).length
  };
  const totalBytes = fileStats.reduce((sum, file) => sum + file.bytes, 0);
  const duplicateGeneratedPathFailures = pathCollisions.map(paths => `Case-insensitive site path collision: ${paths.join(", ")}`);
  const representativeHtmlLimitFailures = Object.entries(budgets.blocking.representativeHtmlMaxBytes ?? {}).flatMap(([pagePath, maxBytes]) => {
    const file = lookup.get(pagePath);
    if (!file) return [`Representative HTML page is missing: ${pagePath}`];
    return file.bytes <= maxBytes ? [] : [`Representative HTML page exceeds ${formatBytes(maxBytes)}: ${pagePath} (${formatBytes(file.bytes)})`];
  });
  const ordinaryPageArchitectureFailures = Object.entries(ordinaryPageFeatureResources).flatMap(([pagePath, features]) =>
    Object.entries(features).filter(([, referenced]) => referenced).map(([feature]) => `${pagePath}: statically references ${feature}`)
  );
  const searchIndexPageCount = pagefindEntry?.languages?.zh?.page_count;
  const pagesWithPagefindBody = pageDocuments.filter(page => page.root.querySelector("[data-pagefind-body]")).length;
  const notFoundPage = documentsByPath.get("404.html");
  const notFoundPageIgnored = Boolean(notFoundPage && notFoundPage.root.querySelector('body[data-pagefind-ignore="all"]') && !notFoundPage.root.querySelector("[data-pagefind-body]"));
  const expectedPagefindPageCount = pagesWithPagefindBody;
  const pagefindExcludes404 = Number.isInteger(searchIndexPageCount) && searchIndexPageCount === expectedPagefindPageCount && notFoundPageIgnored;
  const searchIndexResidue = searchIndexPageCount === undefined ? "Pagefind entry is missing a valid Chinese page_count" :
    !notFoundPageIgnored ? "404 page must be ignored by Pagefind and must not carry data-pagefind-body" :
    searchIndexPageCount !== expectedPagefindPageCount ? `Pagefind indexes ${searchIndexPageCount} pages; expected ${expectedPagefindPageCount} pages marked data-pagefind-body` : null;
  const mathCssBytes = mathCss.reduce((sum, file) => sum + file.bytes, 0);
  const mathCssHasSingleSharedFile = mathCss.length === 1;
  const ordinaryPageFeatureResourcesPass = Object.keys(ordinaryPageFeatureResources).length === ordinaryPages.length && ordinaryPageArchitectureFailures.length === 0;
  const runtimeLoaderPass = Boolean(runtimeLoader) && runtimeLoader.bytes <= budgets.blocking.runtimeLoaderMaxBytes;
  const representativeHtmlPass = representativeHtmlLimitFailures.length === 0;
  const largeImageAllowlistPass = unallowlistedLargeImages.length === 0;
  const responsiveImagesPass = largeImagesWithoutResponsiveSource.length === 0 && missingResponsiveWebpFiles.size === 0;
  const featureIntegrityPass = featureDistribution.failures.length === 0;
  const mathPass = mathCss.length > 0 && mathCssHasSingleSharedFile && mathCssBytes <= budgets.blocking.mathjaxCssMaxBytes && mathPages.length > 0 && mathFailures.length === 0 && dataLatexPages === 0 && fallbackGifPages === 0;
  const blockingChecks = {
    siteExists: true,
    duplicateGeneratedPaths: pathCollisions.length === 0,
    allowlistPathsExist: allowlistFailures.length === 0,
    largeRasterImagesAllowlisted: largeImageAllowlistPass,
    ordinaryPagesDoNotLoadFeatureBundles: ordinaryPageFeatureResourcesPass,
    legacySearchIndexAbsent: !legacySearchIndex,
    pagefindBundlePresent: Boolean(pagefindJs),
    pagefindNotStaticallyPreloaded: pagefindStaticPreloads.length === 0,
    materialSearchRootClean: searchComponentResidues.length === 0,
    pagefindExcludes404,
    mathArchitectureAndSize: mathPass,
    representativeHtmlCaps: representativeHtmlPass,
    runtimeLoaderSize: runtimeLoaderPass,
    largeImagesHaveResponsiveWebp: responsiveImagesPass,
    featureIntegrity: featureIntegrityPass
  };
  const blockingFailures = [
    ...duplicateGeneratedPathFailures,
    ...allowlistFailures,
    ...unallowlistedLargeImages.map(file => `Raster image over ${formatBytes(largeImageLimit)} is not allowlisted: ${file.path} (${file.bytes} bytes)`),
    ...ordinaryPageArchitectureFailures,
    ...missingRepresentativePages.map(pagePath => `Representative page is missing: ${pagePath}`),
    ...(legacySearchIndex ? ["Legacy search/search_index.json must not be present"] : []),
    ...(!pagefindJs ? ["Pagefind bundle is missing: pagefind/pagefind.js"] : []),
    ...pagefindStaticPreloads.map(item => `Pagefind must not be statically preloaded: ${item}`),
    ...searchComponentResidues.map(pagePath => `${pagePath}: .md-search retains data-md-component=search`),
    ...(searchIndexResidue ? [searchIndexResidue] : []),
    ...(mathCss.length === 0 ? ["Math CSS file is missing"] : []),
    ...(!mathCssHasSingleSharedFile ? [`Expected exactly one shared mathjax.css file; found ${mathCss.length}`] : []),
    ...(mathCssBytes > budgets.blocking.mathjaxCssMaxBytes ? [`mathjax.css exceeds ${formatBytes(budgets.blocking.mathjaxCssMaxBytes)}: ${formatBytes(mathCssBytes)}`] : []),
    ...(mathPages.length === 0 ? ["No math pages were found for Math CSS validation"] : []),
    ...mathFailures,
    ...(dataLatexPages ? [`Production HTML contains data-latex attributes on ${dataLatexPages} pages`] : []),
    ...(fallbackGifPages ? [`Production HTML contains the legacy 1x1 MathJax fallback GIF on ${fallbackGifPages} pages`] : []),
    ...representativeHtmlLimitFailures,
    ...(!runtimeLoader ? ["Runtime loader is missing: _static/js/runtime-loader.js"] : runtimeLoader.bytes > budgets.blocking.runtimeLoaderMaxBytes ? [`Runtime loader exceeds ${formatBytes(budgets.blocking.runtimeLoaderMaxBytes)}: ${formatBytes(runtimeLoader.bytes)}`] : []),
    ...largeImagesWithoutResponsiveSource.map(item => `${item.page}: large image lacks a responsive WebP source: ${item.image} (${item.bytes} bytes)`),
    ...[...missingResponsiveWebpFiles].map(item => `Responsive WebP source file is missing: ${item}`),
    ...featureDistribution.failures
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
      bytes: mathCssBytes,
      pageCount: mathPages.length,
      failures: mathFailures
    },
    legacySearchIndex: { exists: Boolean(legacySearchIndex), bytes: legacySearchIndex?.bytes ?? 0 },
    pagefind: {
      bundleExists: Boolean(pagefindJs),
      indexPageCount: searchIndexPageCount ?? null,
      expectedIndexedPageCount: expectedPagefindPageCount,
      excludes404: pagefindExcludes404,
      staticallyPreloaded: pagefindStaticPreloads
    },
    searchComponentResidues,
    runtimeLoader: { exists: Boolean(runtimeLoader), bytes: runtimeLoader?.bytes ?? 0 },
    runtimeLoaderMaxBytes: budgets.blocking.runtimeLoaderMaxBytes,
    representativePages,
    ordinaryPageFeatureResources,
    ordinaryPageArchitectureFailures,
    representativeHtmlLimitFailures,
    largeImageCounts: largeImageStats,
    largeImagesOver500KiB: largeImages.map(({ path: filePath, bytes }) => ({ path: filePath, bytes })),
    unallowlistedLargeImages: unallowlistedLargeImages.map(({ path: filePath, bytes }) => ({ path: filePath, bytes })),
    responsiveWebpSources: [...responsiveWebpPaths].sort(),
    generatedResponsiveWebpVariants: [...generatedResponsiveWebpPaths].sort(),
    largeImagesWithoutResponsiveSource,
    missingResponsiveWebpFiles: [...missingResponsiveWebpFiles],
    featureIntegrityFailures: featureDistribution.failures,
    dataLatexPages,
    legacyMathFallbackGifPages: fallbackGifPages,
    dataPlwFeatures: { pagesWithAttribute: featureDistribution.pagesWithAttribute, counts: featureDistribution.counts },
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
