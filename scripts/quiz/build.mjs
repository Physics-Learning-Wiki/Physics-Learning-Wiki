import {build} from "esbuild";
import {mkdir, readFile, rm} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(root, "docs/_static/js/features/quiz.js");
const check = process.argv.includes("--check");
const temporary = check ? `${output}.check` : output;

await mkdir(dirname(output), {recursive: true});

await build({
  entryPoints: [resolve(root, "scripts/quiz/src/app.ts")],
  outfile: temporary,
  bundle: true,
  format: "esm",
  target: ["es2019"],
  minify: true,
  sourcemap: false,
  legalComments: "none",
});

if (check) {
  const [expected, actual] = await Promise.all([readFile(output), readFile(temporary)]);
  await rm(temporary, {force: true});
  if (!expected.equals(actual)) {
    process.stderr.write("features/quiz.js is out of date; run yarn quiz:build\n");
    process.exitCode = 1;
  }
} else {
  const content = await readFile(output);
  process.stdout.write(`built ${output} (${content.length} bytes)\n`);
}
