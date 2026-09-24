#!/usr/bin/env node

import { realpath, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "node-html-parser";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const defaultSiteDirectory = path.join(repositoryRoot, "site");
const overrideFile = path.join(scriptDirectory, "image-overrides.json");
const MIN_VARIANT_SOURCE_BYTES = 128 * 1024;
const VARIANT_WIDTHS = [480, 960, 1440];
const DEFAULT_SIZES = "(max-width: 720px) 100vw, 720px";
const URL_ORIGIN = "https://plw-image-optimizer.invalid";
const RASTER_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const EXCLUDED_PATH_PARTS = new Set(["pagefind", "_generated"]);

function parseOptions(argv) {
  const options = { site: defaultSiteDirectory };
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option !== "--site") throw new Error(`Unknown argument: ${option}`);
    const value = argv[index + 1];
    if (!value) throw new Error("Missing value for --site");
    options.site = path.resolve(value);
    index += 1;
  }
  return options;
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function encodePath(value) {
  return value
    .split("/")
    .map(segment => encodeURIComponent(segment))
    .join("/");
}

function getPageUrlPath(htmlFile, siteDirectory) {
  const relative = toPosixPath(path.relative(siteDirectory, htmlFile));
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative}`;
}

function getDocumentBase(document, pageUrlPath) {
  const canonicalHref = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
  let sitePrefix = "/";
  if (canonicalHref) {
    try {
      const canonicalPath = decodeURIComponent(new URL(canonicalHref, `${URL_ORIGIN}/`).pathname);
      if (canonicalPath.endsWith(pageUrlPath)) {
        const prefix = canonicalPath.slice(0, canonicalPath.length - pageUrlPath.length);
        sitePrefix = prefix ? `${prefix.replace(/\/$/, "")}/` : "/";
      }
    } catch {
      // A non-standard canonical URL should not stop relative image processing.
    }
  }
  const pageUrl = new URL(`${sitePrefix.replace(/\/$/, "")}${pageUrlPath}` || "/", `${URL_ORIGIN}/`);
  const htmlBase = document.querySelector("base[href]")?.getAttribute("href");
  const browserBase = htmlBase ? new URL(htmlBase, pageUrl) : pageUrl;
  let siteBasePath = sitePrefix;

  const configElement = document.querySelector("#__config");
  if (configElement?.textContent) {
    try {
      const config = JSON.parse(configElement.textContent);
      if (typeof config.base === "string" && config.base) {
        siteBasePath = new URL(config.base, browserBase).pathname;
        if (!siteBasePath.endsWith("/")) siteBasePath += "/";
      }
    } catch {
      // The optimizer can still resolve ordinary page-relative URLs without the Material config.
    }
  }

  return { browserBase, siteBasePath };
}

function resolveLocalUrl(reference, context) {
  const value = reference?.trim();
  if (!value || value.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(value)) return undefined;

  let url;
  try {
    url = new URL(value, context.browserBase);
  } catch {
    return undefined;
  }
  if (url.origin !== URL_ORIGIN) return undefined;

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return undefined;
  }
  const basePrefixed = pathname.startsWith(context.siteBasePath) && context.siteBasePath !== "/";
  if (basePrefixed) {
    pathname = `/${pathname.slice(context.siteBasePath.length)}`;
  }

  const absolutePath = path.resolve(context.siteDirectory, `.${pathname}`);
  if (!isWithin(context.siteDirectory, absolutePath)) return undefined;
  return { absolutePath, search: url.search, hash: url.hash, pathname, basePrefixed };
}

function isExcludedAsset(absolutePath, siteDirectory) {
  const relative = path.relative(siteDirectory, absolutePath);
  const parts = relative.split(path.sep);
  if (parts.some(part => EXCLUDED_PATH_PARTS.has(part))) return true;
  const normalized = toPosixPath(relative).toLowerCase();
  return normalized.startsWith("assets/fonts/mathjax/") || normalized.startsWith("assets/vendor/mathjax/");
}

function getImageContext(img, siteDirectory, documentBase, imageIndex) {
  if (img.closest("[data-plw-no-optimize]")) return undefined;
  const source = resolveLocalUrl(img.getAttribute("src"), { ...documentBase, siteDirectory });
  if (!source || !RASTER_EXTENSIONS.has(path.extname(source.absolutePath).toLowerCase())) return undefined;
  if (isExcludedAsset(source.absolutePath, siteDirectory)) return undefined;

  const relativeOutput = toPosixPath(path.relative(siteDirectory, source.absolutePath));
  const rootAbsolute = img.getAttribute("src")?.trim().startsWith("/") ?? false;
  let basePrefix = "";
  if (rootAbsolute && source.basePrefixed) {
    basePrefix = documentBase.siteBasePath.replace(/\/$/, "");
  }

  return {
    source,
    sourceRelative: relativeOutput,
    rootAbsolute,
    basePrefix,
    browserBase: documentBase.browserBase,
    siteBasePath: documentBase.siteBasePath,
    search: source.search,
    hash: source.hash,
    insidePicture: Boolean(img.closest("picture")),
    hasSrcset: img.hasAttribute("srcset"),
    articleImageIndex: imageIndex
  };
}

function imageDimensions(metadata) {
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const orientation = metadata.orientation ?? 1;
  return orientation >= 5 && orientation <= 8 ? { width: height, height: width } : { width, height };
}

function setAttributeIfMissing(element, name, value) {
  if (element.hasAttribute(name)) return false;
  element.setAttribute(name, String(value));
  return true;
}

function getWebpOptions(extension, override) {
  const mode = override?.mode ?? (extension === ".png" ? "lossless" : "lossy");
  const effort = override?.effort ?? 5;
  if (mode === "lossless") return { lossless: true, effort };
  if (mode === "nearLossless") return { nearLossless: true, quality: override?.quality ?? 80, effort };
  if (mode === "lossy") return { quality: override?.quality ?? 82, effort };
  throw new Error(`Unsupported WebP mode "${mode}"`);
}

function variantUrl(variantRelativePath, context) {
  if (context.rootAbsolute) {
    const prefix = context.basePrefix;
    const pathname = `/${[prefix.replace(/^\//, "").replace(/\/$/, ""), variantRelativePath]
      .filter(Boolean)
      .join("/")}`;
    return `${encodePath(pathname)}${context.search}${context.hash}`;
  }

  const basePath = new URL(context.browserBase.href).pathname;
  const baseDirectory = basePath.endsWith("/") ? basePath : path.posix.dirname(basePath);
  const targetPath = `${context.siteBasePath}${variantRelativePath}`;
  const relative = path.posix.relative(baseDirectory, targetPath);
  return `${encodePath(relative)}${context.search}${context.hash}`;
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function makePicture(img, variants, sizes) {
  const srcset = variants.map(variant => `${variant.url} ${variant.width}w`).join(", ");
  const markup = `<picture data-plw-generated="responsive"><source type="image/webp" srcset="${escapeAttribute(
    srcset
  )}" sizes="${escapeAttribute(sizes)}">${img.toString()}</picture>`;
  return parse(markup).querySelector("picture");
}

function parseSrcsetUrls(srcset) {
  return srcset
    .split(",")
    .map(candidate => candidate.trim().split(/\s+/, 1)[0])
    .filter(Boolean);
}

async function walkFiles(directory) {
  const files = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) files.push(file);
    }
  }
  await visit(directory);
  return files;
}

async function referencedGeneratedVariants(htmlFiles, siteDirectory) {
  const variants = new Set();
  for (const htmlFile of htmlFiles) {
    const document = parse(await readFile(htmlFile, "utf8"));
    const pageUrlPath = getPageUrlPath(htmlFile, siteDirectory);
    const documentBase = getDocumentBase(document, pageUrlPath);
    for (const source of document.querySelectorAll(
      'picture[data-plw-generated="responsive"] source[type="image/webp"]'
    )) {
      const srcset = source.getAttribute("srcset") ?? "";
      for (const reference of parseSrcsetUrls(srcset)) {
        const resolved = resolveLocalUrl(reference, { ...documentBase, siteDirectory });
        if (resolved) variants.add(toPosixPath(path.relative(siteDirectory, resolved.absolutePath)));
      }
    }
  }
  return variants;
}

async function safeVariantPath(sourceRelative, extension, width, siteDirectory, managedVariants, reservedOutputs) {
  const directory = path.posix.dirname(sourceRelative);
  const stem = path.posix.basename(sourceRelative, extension);
  const candidates = [
    path.posix.join(directory, `${stem}.w${width}.webp`),
    path.posix.join(directory, `${stem}${extension}.w${width}.webp`)
  ];

  for (const candidate of candidates) {
    if (reservedOutputs.has(candidate)) continue;
    const absolutePath = path.resolve(siteDirectory, ...candidate.split("/"));
    const alreadyManaged = managedVariants.has(candidate);
    let exists = false;
    try {
      await stat(absolutePath);
      exists = true;
    } catch {
      // The target has not been generated before.
    }
    if (!exists || alreadyManaged) {
      reservedOutputs.add(candidate);
      return { relativePath: candidate, absolutePath };
    }
  }

  throw new Error(`Could not choose a safe WebP output path for ${sourceRelative} (${width}px)`);
}

async function loadOverrides() {
  const raw = JSON.parse(await readFile(overrideFile, "utf8"));
  if (!raw || typeof raw !== "object" || !raw.images || typeof raw.images !== "object" || Array.isArray(raw.images)) {
    throw new Error(`${overrideFile} must contain an "images" object`);
  }
  for (const [relativePath, override] of Object.entries(raw.images)) {
    if (!override || typeof override !== "object" || Array.isArray(override)) {
      throw new Error(`Image override for ${relativePath} must be an object`);
    }
    if (override.mode !== undefined && !["lossless", "nearLossless", "lossy"].includes(override.mode)) {
      throw new Error(`Unsupported WebP mode for ${relativePath}: ${override.mode}`);
    }
    if (
      override.quality !== undefined &&
      (!Number.isInteger(override.quality) || override.quality < 1 || override.quality > 100)
    ) {
      throw new Error(`WebP quality for ${relativePath} must be an integer from 1 to 100`);
    }
    if (
      override.effort !== undefined &&
      (!Number.isInteger(override.effort) || override.effort < 0 || override.effort > 6)
    ) {
      throw new Error(`WebP effort for ${relativePath} must be an integer from 0 to 6`);
    }
  }
  return raw.images;
}

/** Optimize local PNG/JPEG references inside a generated MkDocs site directory. */
export async function optimizeImages(siteDirectory = defaultSiteDirectory) {
  const requestedSiteDirectory = path.resolve(siteDirectory);
  const resolvedSiteDirectory = await realpath(requestedSiteDirectory);
  const resolvedDocsDirectory = await realpath(path.join(repositoryRoot, "docs"));
  const resolvedRepositoryRoot = await realpath(repositoryRoot);
  if (
    resolvedSiteDirectory === resolvedRepositoryRoot ||
    isWithin(resolvedDocsDirectory, resolvedSiteDirectory) ||
    isWithin(resolvedSiteDirectory, resolvedDocsDirectory)
  ) {
    throw new Error(
      "Image optimization must target a generated site directory, never the repository or docs source tree"
    );
  }

  const siteStats = await stat(resolvedSiteDirectory);
  if (!siteStats.isDirectory()) throw new Error(`Site directory does not exist: ${resolvedSiteDirectory}`);
  const htmlFiles = (await walkFiles(resolvedSiteDirectory)).filter(file => file.toLowerCase().endsWith(".html"));
  const managedVariants = await referencedGeneratedVariants(htmlFiles, resolvedSiteDirectory);
  const reservedOutputs = new Set();
  const overrides = await loadOverrides();
  const metadataCache = new Map();
  const variantCache = new Map();
  const statsSummary = { htmlFiles: htmlFiles.length, rasterImages: 0, dimensionedImages: 0, variants: 0, skipped: 0 };

  // Sharp uses a thread pool; cap it so CI builds do not compete with the HTML post-process workers.
  sharp.concurrency(2);

  for (const htmlFile of htmlFiles) {
    const originalHtml = await readFile(htmlFile, "utf8");
    const document = parse(originalHtml, {
      comment: true,
      blockTextElements: { script: true, style: true, pre: true }
    });
    const pageUrlPath = getPageUrlPath(htmlFile, resolvedSiteDirectory);
    const documentBase = getDocumentBase(document, pageUrlPath);
    const article = document.querySelector("article.md-content__inner.md-typeset");
    const articleImageIndexes = new Map((article?.querySelectorAll("img") ?? []).map((img, index) => [img, index]));
    let changed = false;

    for (const img of document.querySelectorAll("img")) {
      const articleImageIndex = articleImageIndexes.get(img);
      const imageContext = getImageContext(img, resolvedSiteDirectory, documentBase, articleImageIndex);
      if (!imageContext) {
        statsSummary.skipped += 1;
        continue;
      }
      statsSummary.rasterImages += 1;

      let metadataPromise = metadataCache.get(imageContext.source.absolutePath);
      if (!metadataPromise) {
        metadataPromise = sharp(imageContext.source.absolutePath).metadata();
        metadataCache.set(imageContext.source.absolutePath, metadataPromise);
      }

      let metadata;
      let imageSize;
      try {
        [metadata, imageSize] = await Promise.all([
          metadataPromise,
          stat(imageContext.source.absolutePath).then(result => result.size)
        ]);
      } catch (error) {
        process.stderr.write(`Skipping unreadable image ${imageContext.sourceRelative}: ${error.message}\n`);
        statsSummary.skipped += 1;
        continue;
      }

      const dimensions = imageDimensions(metadata);
      const extension = path.extname(imageContext.source.absolutePath).toLowerCase();
      const expectedFormat = extension === ".png" ? "png" : "jpeg";
      if (metadata.format !== expectedFormat || !dimensions.width || !dimensions.height) {
        statsSummary.skipped += 1;
        continue;
      }
      let imageChanged = false;
      imageChanged = setAttributeIfMissing(img, "width", dimensions.width) || imageChanged;
      imageChanged = setAttributeIfMissing(img, "height", dimensions.height) || imageChanged;
      imageChanged = setAttributeIfMissing(img, "decoding", "async") || imageChanged;
      if (articleImageIndex !== undefined && articleImageIndex > 0) {
        imageChanged = setAttributeIfMissing(img, "loading", "lazy") || imageChanged;
      }
      if (imageChanged) {
        changed = true;
        statsSummary.dimensionedImages += 1;
      }

      if (imageSize < MIN_VARIANT_SOURCE_BYTES || imageContext.insidePicture || imageContext.hasSrcset) {
        if (imageContext.insidePicture || imageContext.hasSrcset) statsSummary.skipped += 1;
        continue;
      }

      const override = overrides[imageContext.sourceRelative];
      const cacheKey = `${imageContext.sourceRelative}:${JSON.stringify(override ?? {})}`;
      let variantsPromise = variantCache.get(cacheKey);
      if (!variantsPromise) {
        variantsPromise = (async () => {
          const widthSet = [...new Set([...VARIANT_WIDTHS, dimensions.width])]
            .filter(width => width > 0 && width <= dimensions.width)
            .sort((left, right) => left - right);
          const variants = [];
          for (const width of widthSet) {
            const output = await safeVariantPath(
              imageContext.sourceRelative,
              extension,
              width,
              resolvedSiteDirectory,
              managedVariants,
              reservedOutputs
            );
            const info = await sharp(imageContext.source.absolutePath)
              .rotate()
              .resize({ width, withoutEnlargement: true })
              .webp(getWebpOptions(extension, override))
              .toFile(output.absolutePath);
            managedVariants.add(output.relativePath);
            statsSummary.variants += 1;
            variants.push({ relativePath: output.relativePath, width: info.width });
          }
          return variants.sort((left, right) => left.width - right.width);
        })();
        variantCache.set(cacheKey, variantsPromise);
      }

      const variants = (await variantsPromise).map(variant => ({
        ...variant,
        url: variantUrl(variant.relativePath, imageContext)
      }));
      if (variants.length > 0) {
        const picture = makePicture(img, variants, img.getAttribute("sizes") ?? DEFAULT_SIZES);
        if (picture) {
          img.replaceWith(picture);
          changed = true;
        }
      }
    }

    if (changed) await writeFile(htmlFile, document.toString(), "utf8");
  }

  return statsSummary;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const summary = await optimizeImages(options.site);
  process.stdout.write(
    `Responsive images: ${summary.rasterImages} local raster references across ${summary.htmlFiles} HTML files; ` +
      `${summary.dimensionedImages} images received dimensions/decoding; ${summary.variants} WebP variants generated.\n`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
