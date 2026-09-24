#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(ROOT, "scripts/features/src/mermaid.ts");
const OUTPUT = path.join(ROOT, "docs/_static/js/features/mermaid.js");
const THEME_CSS = path.join(
  ROOT,
  "mkdocs-material/src/templates/assets/javascripts/components/content/mermaid/index.css"
);
const check = process.argv.includes("--check");

const themeCss = await fs.readFile(THEME_CSS, "utf8");
const result = await build({
  absWorkingDir: ROOT,
  entryPoints: [SOURCE],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2021"],
  minify: true,
  legalComments: "none",
  write: false,
  charset: "utf8",
  define: { __PLW_MERMAID_THEME_CSS__: JSON.stringify(themeCss) }
});
const generated = result.outputFiles[0].contents;

if (check) {
  let current;
  try {
    current = await fs.readFile(OUTPUT);
  } catch {
    console.error(`Generated Mermaid bundle is missing: ${path.relative(ROOT, OUTPUT)}`);
    process.exit(1);
  }
  if (!current.equals(generated)) {
    console.error(`Generated Mermaid bundle is stale: ${path.relative(ROOT, OUTPUT)}`);
    process.exit(1);
  }
  console.log(`Mermaid bundle is current (${generated.byteLength} bytes).`);
} else {
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, generated);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)} (${generated.byteLength} bytes).`);
}
