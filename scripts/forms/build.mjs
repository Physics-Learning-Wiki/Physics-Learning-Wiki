import { build } from "esbuild";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const check = process.argv.includes("--check");
const features = [
  {
    name: "submit",
    entry: resolve(root, "scripts/forms/src/submit.ts"),
    javascript: resolve(root, "docs/_static/js/features/submit.js"),
    stylesheet: resolve(root, "docs/_static/css/features/submit.css")
  },
  {
    name: "question-contribute",
    entry: resolve(root, "scripts/forms/src/question-contribute.ts"),
    javascript: resolve(root, "docs/_static/js/features/question-contribute.js"),
    stylesheet: resolve(root, "docs/_static/css/features/question-contribute.css")
  }
];

const easyMdeCss = await readFile(resolve(root, "node_modules/easymde/dist/easymde.min.css"), "utf8");
const formCss = await readFile(resolve(root, "docs/_static/css/submit-form.css"), "utf8");
const staleOutputs = [];

for (const feature of features) {
  await mkdir(dirname(feature.javascript), { recursive: true });
  await mkdir(dirname(feature.stylesheet), { recursive: true });
  const temporaryJavascript = check ? `${feature.javascript}.check` : feature.javascript;
  const temporaryStylesheet = check ? `${feature.stylesheet}.check` : feature.stylesheet;

  const result = await build({
    entryPoints: [feature.entry],
    outfile: temporaryJavascript,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2021"],
    minify: true,
    sourcemap: false,
    legalComments: "none"
  });
  const javascript = result.outputFiles?.[0]?.contents ?? (await readFile(temporaryJavascript));
  const stylesheet = Buffer.from(`${easyMdeCss}\n${formCss}`);
  await writeFile(temporaryStylesheet, stylesheet);

  if (check) {
    const [currentJavascript, currentStylesheet] = await Promise.all([
      readFile(feature.javascript).catch(() => Buffer.alloc(0)),
      readFile(feature.stylesheet).catch(() => Buffer.alloc(0))
    ]);
    if (!currentJavascript.equals(javascript) || !currentStylesheet.equals(stylesheet)) {
      staleOutputs.push(feature.name);
    }
    await Promise.all([rm(temporaryJavascript, { force: true }), rm(temporaryStylesheet, { force: true })]);
  } else {
    await writeFile(feature.javascript, javascript);
    process.stdout.write(`built ${feature.javascript} (${javascript.byteLength} bytes)\n`);
    process.stdout.write(`built ${feature.stylesheet} (${stylesheet.byteLength} bytes)\n`);
  }
}

if (staleOutputs.length) {
  process.stderr.write(`Form feature assets are stale: ${staleOutputs.join(", ")}; run yarn forms:build\n`);
  process.exitCode = 1;
} else if (check) {
  process.stdout.write("Form feature bundles and stylesheets are current.\n");
}
