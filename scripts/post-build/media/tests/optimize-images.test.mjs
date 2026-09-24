import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";
import sharp from "sharp";
import { optimizeImages } from "../optimize-images.mjs";

async function makeRaster(filename, width, height, format) {
  const pixels = Buffer.alloc(width * height * 3);
  let state = 0x5eed1234;
  for (let index = 0; index < pixels.length; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    pixels[index] = state & 0xff;
  }
  let image = sharp(pixels, { raw: { width, height, channels: 3 } });
  if (format === "png") image = image.png({ compressionLevel: 9 });
  else image = image.jpeg({ quality: 95, chromaSubsampling: "4:4:4" });
  await image.toFile(filename);
}

async function assertWebp(filename) {
  const header = await readFile(filename);
  assert.equal(header.toString("ascii", 8, 12), "WEBP");
}

async function listFiles(directory) {
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else files.push([path.relative(directory, fullPath).split(path.sep).join("/"), await readFile(fullPath)]);
    }
  }
  await visit(directory);
  return files.sort(([left], [right]) => left.localeCompare(right));
}

async function removeFixture(directory) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(directory, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!new Set(["EBUSY", "EPERM"]).has(error.code) || attempt === 5) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
}

async function fixture() {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "plw-media-"));
  const siteDirectory = path.join(temporaryDirectory, "site");
  const pageDirectory = path.join(siteDirectory, "intro", "media-test");
  const imageDirectory = path.join(siteDirectory, "images");
  await mkdir(pageDirectory, { recursive: true });
  await mkdir(imageDirectory, { recursive: true });
  await mkdir(path.join(siteDirectory, "icons"), { recursive: true });
  await mkdir(path.join(siteDirectory, "pagefind"), { recursive: true });

  await makeRaster(path.join(imageDirectory, "large.png"), 600, 400, "png");
  await makeRaster(path.join(imageDirectory, "large-photo.jpg"), 1000, 700, "jpeg");
  await makeRaster(path.join(imageDirectory, "small.png"), 24, 16, "png");
  await makeRaster(path.join(imageDirectory, "optout.png"), 32, 24, "png");
  await makeRaster(path.join(siteDirectory, "pagefind", "thumb.png"), 40, 30, "png");
  await writeFile(
    path.join(siteDirectory, "icons", "shape.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'
  );
  await writeFile(
    path.join(imageDirectory, "animation.gif"),
    Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64")
  );
  await writeFile(path.join(siteDirectory, "styles.css"), 'body { background-image: url("images/large.png"); }');

  const html = `<!doctype html><html><head>
    <link rel="canonical" href="https://physics-learning-wiki.github.io/Physics-Learning-Wiki/intro/media-test/">
    <script id="__config" type="application/json">{"base":"../../"}</script>
    <style>body{background:url(../../images/large.png)}</style></head><body>
    <article class="md-content__inner md-typeset">
      <figure><a href="/zoom/"><img class="diagram hero" src="../../images/large.png?rev=7#figure" alt="示意图" title="保留标题"></a><figcaption>图注保留</figcaption></figure>
      <img src="../../images/small.png" alt="小图" loading="eager">
      <img src="../../images/large-photo.jpg" alt="照片">
      <img class="root-asset" src="/Physics-Learning-Wiki/images/large.png?rev=7" alt="根路径图片">
      <picture class="manual-picture"><source srcset="../../images/small.png 24w"><img src="../../images/small.png" alt="手工响应式图"></picture>
      <div data-plw-no-optimize><img src="../../images/optout.png" alt="跳过"></div>
      <img src="https://cdn.example.test/external.png" alt="外链">
      <img src="data:image/png;base64,iVBORw0KGgo=" alt="内嵌">
      <img src="../../icons/shape.svg" alt="矢量图">
      <img src="../../images/animation.gif" alt="动画">
      <img src="../../pagefind/thumb.png" alt="Pagefind 图标">
    </article>
  </body></html>`;
  const htmlPath = path.join(pageDirectory, "index.html");
  await writeFile(htmlPath, html, "utf8");
  return { temporaryDirectory, siteDirectory, htmlPath, html };
}

test("small PNGs receive dimensions and async decoding without unnecessary WebP files", async t => {
  const data = await fixture();
  t.after(() => removeFixture(data.temporaryDirectory));
  const before = await readFile(path.join(data.siteDirectory, "images", "small.png"));

  const summary = await optimizeImages(data.siteDirectory);
  const document = parse(await readFile(data.htmlPath, "utf8"));
  const small = document.querySelector('img[alt="小图"]');
  assert.equal(small.getAttribute("width"), "24");
  assert.equal(small.getAttribute("height"), "16");
  assert.equal(small.getAttribute("decoding"), "async");
  assert.equal(small.getAttribute("loading"), "eager", "explicit loading is preserved");
  assert.equal(small.closest("picture"), null);
  assert.deepEqual(await readFile(path.join(data.siteDirectory, "images", "small.png")), before);
  assert.equal(await exists(path.join(data.siteDirectory, "images", "small.w24.webp")), false);
  assert.ok(summary.dimensionedImages >= 1);
});

test("large PNG and JPEGs generate bounded responsive WebP variants and preserve content structure", async t => {
  const data = await fixture();
  t.after(() => removeFixture(data.temporaryDirectory));
  const sourceBefore = await readFile(path.join(data.siteDirectory, "images", "large.png"));
  const summary = await optimizeImages(data.siteDirectory);
  const html = await readFile(data.htmlPath, "utf8");
  const document = parse(html);
  const generatedPicture = document.querySelector('picture[data-plw-generated="responsive"]');
  assert.ok(generatedPicture);
  assert.equal(generatedPicture.querySelectorAll("source").length, 1);
  assert.equal(generatedPicture.querySelectorAll("img").length, 1);
  assert.deepEqual(
    generatedPicture
      .querySelector("source")
      .getAttribute("srcset")
      .match(/\b\d+w/g),
    ["480w", "600w"]
  );
  assert.match(generatedPicture.querySelector("source").getAttribute("srcset"), /\?rev=7#figure 480w/);
  assert.match(
    generatedPicture.querySelector("source").getAttribute("srcset"),
    /^\.\.\/\.\.\/images\/large\.w480\.webp/
  );
  const image = generatedPicture.querySelector("img");
  assert.equal(image.getAttribute("alt"), "示意图");
  assert.equal(image.getAttribute("title"), "保留标题");
  assert.equal(image.getAttribute("class"), "diagram hero");
  assert.equal(image.getAttribute("width"), "600");
  assert.equal(image.getAttribute("height"), "400");
  assert.equal(image.getAttribute("loading"), undefined, "the first article image is not forced lazy");
  assert.ok(generatedPicture.closest("a"), "the surrounding link is preserved");
  assert.equal(document.querySelector("figcaption")?.textContent.trim(), "图注保留");

  for (const width of [480, 600]) {
    const variant = path.join(data.siteDirectory, "images", `large.w${width}.webp`);
    await assertWebp(variant);
  }
  for (const width of [480, 960, 1000]) {
    const variant = path.join(data.siteDirectory, "images", `large-photo.w${width}.webp`);
    await assertWebp(variant);
  }
  assert.deepEqual(await readFile(path.join(data.siteDirectory, "images", "large.png")), sourceBefore);
  assert.equal(document.querySelectorAll("picture.manual-picture").length, 1);
  assert.equal(document.querySelectorAll("picture.manual-picture picture").length, 0);
  assert.equal(document.querySelector('img[alt="照片"]').getAttribute("loading"), "lazy");
  assert.equal(document.querySelector('img[alt="手工响应式图"]').getAttribute("width"), "24");
  assert.equal(document.querySelector('img[alt="跳过"]').getAttribute("width"), undefined);
  assert.equal(document.querySelector('img[alt="Pagefind 图标"]').getAttribute("width"), undefined);
  const rootAssetPicture = document
    .querySelector('picture[data-plw-generated="responsive"] img[alt="根路径图片"]')
    ?.closest("picture");
  assert.match(
    rootAssetPicture?.querySelector("source")?.getAttribute("srcset") ?? "",
    /^\/Physics-Learning-Wiki\/images\/large\.w480\.webp\?rev=7/
  );
  for (const alt of ["外链", "内嵌", "矢量图", "动画"]) {
    assert.equal(document.querySelector(`img[alt="${alt}"]`).getAttribute("width"), undefined);
  }
  assert.ok(summary.variants >= 5);

  const compactDocument = parse(html).removeWhitespace();
  const compactParsed = parse(compactDocument.toString());
  assert.equal(compactParsed.querySelectorAll("picture[data-plw-generated=responsive] source").length, 3);
  assert.equal(compactParsed.querySelectorAll("picture[data-plw-generated=responsive] img").length, 3);
});

test("running the optimizer twice leaves the generated HTML and files unchanged", async t => {
  const data = await fixture();
  t.after(() => removeFixture(data.temporaryDirectory));
  await optimizeImages(data.siteDirectory);
  const firstBuild = await listFiles(data.siteDirectory);
  const secondSummary = await optimizeImages(data.siteDirectory);
  const secondBuild = await listFiles(data.siteDirectory);
  assert.deepEqual(secondBuild, firstBuild);
  assert.equal(secondSummary.variants, 0, "the generated picture is recognized on a repeated run");
});

test("the optimizer rejects the source docs directory", async () => {
  const docsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../docs");
  await assert.rejects(optimizeImages(docsDirectory), /never the repository or docs source tree/);
});

async function exists(filename) {
  try {
    await stat(filename);
    return true;
  } catch {
    return false;
  }
}
