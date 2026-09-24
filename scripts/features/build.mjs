#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MERMAID_SOURCE = path.join(ROOT, "scripts/features/src/mermaid.ts");
const MERMAID_OUTPUT = path.join(ROOT, "docs/_static/js/features/mermaid.js");
const MERMAID_THEME_CSS = path.join(
  ROOT,
  "mkdocs-material/src/templates/assets/javascripts/components/content/mermaid/index.css"
);
const args = process.argv.slice(2);
const check = args.length === 1 && args[0] === "--check";

if (args.length > 0 && !check) {
  console.error("Usage: node scripts/features/build.mjs [--check]");
  process.exit(2);
}

function runFeatureBuild(name, script) {
  process.stdout.write(`${check ? "Checking" : "Building"} ${name} assets...\n`);
  const result = spawnSync(process.execPath, [path.join(ROOT, script), ...(check ? ["--check"] : [])], {
    cwd: ROOT,
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function buildMermaid() {
  const themeCss = await fs.readFile(MERMAID_THEME_CSS, "utf8");
  const result = await build({
    absWorkingDir: ROOT,
    entryPoints: [MERMAID_SOURCE],
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
      current = await fs.readFile(MERMAID_OUTPUT);
    } catch {
      console.error(`Generated Mermaid bundle is missing: ${path.relative(ROOT, MERMAID_OUTPUT)}`);
      process.exit(1);
    }
    if (!current.equals(generated)) {
      console.error(`Generated Mermaid bundle is stale: ${path.relative(ROOT, MERMAID_OUTPUT)}`);
      process.exit(1);
    }
    process.stdout.write(`Mermaid bundle is current (${generated.byteLength} bytes).\n`);
    return;
  }

  await fs.mkdir(path.dirname(MERMAID_OUTPUT), { recursive: true });
  await fs.writeFile(MERMAID_OUTPUT, generated);
  process.stdout.write(`Wrote ${path.relative(ROOT, MERMAID_OUTPUT)} (${generated.byteLength} bytes).\n`);
}

runFeatureBuild("runtime", "scripts/runtime/build.mjs");
runFeatureBuild("quiz", "scripts/quiz/build.mjs");
await buildMermaid();
runFeatureBuild("forms", "scripts/forms/build.mjs");
process.stdout.write(`All feature assets are ${check ? "current" : "built"}.\n`);
