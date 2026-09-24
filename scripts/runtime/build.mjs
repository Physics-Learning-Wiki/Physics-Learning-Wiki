#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(ROOT, "scripts/runtime/src/loader.ts");
const OUTPUT = path.join(ROOT, "docs/_static/js/runtime-loader.js");
const check = process.argv.includes("--check");

const result = await build({
  entryPoints: [SOURCE],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2021"],
  minify: true,
  legalComments: "none",
  write: false,
  charset: "utf8"
});
const generated = result.outputFiles[0].contents;

if (check) {
  let current;
  try {
    current = await fs.readFile(OUTPUT);
  } catch {
    console.error(`Generated runtime loader is missing: ${path.relative(ROOT, OUTPUT)}`);
    process.exit(1);
  }
  if (!current.equals(generated)) {
    console.error(`Generated runtime loader is stale: ${path.relative(ROOT, OUTPUT)}`);
    process.exit(1);
  }
  console.log(`Runtime loader bundle is current (${generated.byteLength} bytes).`);
} else {
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, generated);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)} (${generated.byteLength} bytes).`);
}
