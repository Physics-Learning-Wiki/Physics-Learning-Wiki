import { readFile, writeFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import standalone from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const schema = JSON.parse(await readFile(new URL("contracts/submission.schema.json", root), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false, inlineRefs: false, validateFormats: false, code: { source: true, esm: true } });
ajv.addSchema(schema);
const standaloneSource = standalone(ajv, {
    validateEnvelope: schema.$id,
    validateQuestionSchema: schema.$id + "#/$defs/questionSource",
    validateWithdrawal: schema.$id + "#/$defs/withdrawalRequest"
  });
const bundle = await build({ stdin: { contents: standaloneSource, resolveDir: fileURLToPath(root) },
  bundle: true, write: false, platform: "neutral", format: "esm", target: "es2021", minify: true });
const source = "// Generated from contracts/submission.schema.json; do not edit.\n" + bundle.outputFiles[0].text;
const target = new URL("contracts/generated.js", root);
if (process.argv.includes("--check")) {
  if (await readFile(target, "utf8").catch(() => "") !== source) {
    throw new Error("Submission contract is stale; run corepack yarn submission:contract");
  }
} else {
  await writeFile(target, source);
}
