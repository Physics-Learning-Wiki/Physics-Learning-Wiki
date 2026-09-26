import assert from "node:assert/strict";
import { test } from "node:test";
import type EasyMDE from "easymde";

// Setup minimal DOM shims for CodeMirror/EasyMDE module loading under Node.js
if (typeof document === "undefined") {
  const dummyEl: any = {
    style: {},
    appendChild: () => {},
    setAttribute: () => {},
    getElementsByTagName: () => []
  };
  (globalThis as any).document = {
    createRange: () => ({}),
    createElement: () => dummyEl,
    createTextNode: () => dummyEl,
    documentElement: dummyEl,
    body: dummyEl
  };
  (globalThis as any).window = globalThis;
}

import { parsePairs } from "../src/parse-pairs.js";

test("question submission option parsing is case-insensitive and rejects invalid pairs", () => {
  assert.deepEqual(parsePairs("a | left\nB|right", "选项"), { A: "left", B: "right" });
  assert.throws(() => parsePairs("A|left\na|duplicate", "选项"), /重复/);
  assert.throws(() => parsePairs("A|", "选项"), /格式应为/);
});

test("createEditorToolbar configures mode buttons with noDisable: true so preview can be exited", async () => {
  const { createEditorToolbar } = await import("../src/editor.js");
  const toolbar = createEditorToolbar(true);
  assert.ok(Array.isArray(toolbar), "toolbar is an array");
  const items = toolbar.filter(
    (item): item is EasyMDE.ToolbarIcon => typeof item === "object" && item !== null && "name" in item
  );

  const preview = items.find(item => item.name === "preview");
  const sideBySide = items.find(item => item.name === "side-by-side");
  const fullScreen = items.find(item => item.name === "fullscreen");

  assert.ok(preview, "preview toolbar button exists");
  assert.ok(sideBySide, "side-by-side toolbar button exists");
  assert.ok(fullScreen, "fullscreen toolbar button exists");

  assert.equal(preview.noDisable, true, "preview button must have noDisable: true");
  assert.equal(sideBySide.noDisable, true, "side-by-side button must have noDisable: true");
  assert.equal(fullScreen.noDisable, true, "fullscreen button must have noDisable: true");

  const bold = items.find(item => item.name === "bold");
  const italic = items.find(item => item.name === "italic");
  assert.notEqual(bold?.noDisable, true, "formatting buttons must not have noDisable: true");
  assert.notEqual(italic?.noDisable, true, "formatting buttons must not have noDisable: true");

  const inlineMath = items.find(item => item.name === "inline-math");
  const blockMath = items.find(item => item.name === "block-math");
  assert.ok(inlineMath, "inline-math button exists");
  assert.ok(blockMath, "block-math button exists");
});
