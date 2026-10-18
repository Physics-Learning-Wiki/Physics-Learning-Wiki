import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

console.log(`[media:check] Node ${process.versions.node}, ${process.platform}-${process.arch}`);

try {
  console.log(`[media:check] sharp: ${import.meta.resolve("sharp")}`);
  const { default: sharp } = await import("sharp");
  const png = await sharp({
    create: { width: 8, height: 6, channels: 3, background: "#336699" }
  })
    .png()
    .toBuffer();
  const { data, info } = await sharp(png).resize(4, 3).webp().toBuffer({ resolveWithObject: true });
  assert.equal(info.format, "webp");
  assert.equal(info.width, 4);
  assert.equal(info.height, 3);
  const decoded = await sharp(data).raw().toBuffer({ resolveWithObject: true });
  assert.equal(decoded.info.width, 4);
  assert.equal(decoded.info.height, 3);
  console.log(
    `[media:check] sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}: PNG → resize → WebP → decode OK`
  );
} catch (error) {
  console.error(error);
  // Keep the original failure. Diagnostics must never turn a broken install green.
  process.exitCode = 1;
  if (process.platform === "linux") {
    console.error("[media:check] Installed libvips libraries, sharp addons and their dynamic links:");
    const diagnostic = spawnSync(
      "find",
      [
        "node_modules",
        "-type",
        "f",
        "(",
        "-name",
        "libvips-cpp.so*",
        "-o",
        "-name",
        "sharp-*.node",
        ")",
        "-print",
        "-name",
        "sharp-*.node",
        "-exec",
        "ldd",
        "{}",
        ";"
      ],
      { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 }
    );
    if (diagnostic.stdout) console.error(diagnostic.stdout.trimEnd());
    if (diagnostic.stderr) console.error(diagnostic.stderr.trimEnd());
    if (diagnostic.error) console.error(`[media:check] Diagnostics unavailable: ${diagnostic.error.message}`);
  }
}
