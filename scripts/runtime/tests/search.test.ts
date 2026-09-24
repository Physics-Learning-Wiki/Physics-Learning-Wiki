import assert from "node:assert/strict";
import test from "node:test";
import { shouldOpenSearchShortcut } from "../src/search.ts";

function keyboardEvent(key: string, targetTag = "BODY", extras: Record<string, unknown> = {}) {
  return {
    key,
    target: {
      tagName: targetTag,
      isContentEditable: false,
      closest: () => null
    } as unknown as EventTarget,
    ...extras
  };
}

test("search shortcuts open on slash, s, and f when focus is outside editable controls", () => {
  for (const key of ["/", "s", "S", "f", "F"]) {
    assert.equal(shouldOpenSearchShortcut(keyboardEvent(key)), true, key);
  }
});

test("search shortcuts leave editable fields and modified keystrokes alone", () => {
  for (const tag of ["INPUT", "TEXTAREA", "SELECT", "OPTION"]) {
    assert.equal(shouldOpenSearchShortcut(keyboardEvent("s", tag)), false, tag);
  }
  assert.equal(shouldOpenSearchShortcut(keyboardEvent("f", "BODY", { ctrlKey: true })), false);
  assert.equal(shouldOpenSearchShortcut(keyboardEvent("/", "BODY", { altKey: true })), false);
});

test("search shortcuts ignore editable content containers", () => {
  const target = {
    tagName: "DIV",
    isContentEditable: false,
    closest: (selector: string) => (selector.includes("contenteditable") ? target : null)
  } as unknown as EventTarget;
  assert.equal(shouldOpenSearchShortcut({ key: "s", target }), false);
});
