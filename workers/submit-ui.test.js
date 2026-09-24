import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadTurnstile, mountTurnstile, resetTurnstileForTests } from "../scripts/forms/src/turnstile.ts";

test("Turnstile uses one loader promise and removes its widget when the feature is disposed", async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const listeners = new Map();
  let appendCount = 0;
  let removedWidget;
  let renderedOptions;
  let resetWidget;
  let script;
  const fakeWindow = {};
  const fakeDocument = {
    querySelector() {
      return null;
    },
    createElement() {
      script = {
        async: false,
        dataset: {},
        isConnected: false,
        addEventListener(name, listener) {
          listeners.set(name, listener);
        },
        removeEventListener(name) {
          listeners.delete(name);
        },
        remove() {
          this.isConnected = false;
        }
      };
      return script;
    },
    head: {
      append(element) {
        appendCount += 1;
        element.isConnected = true;
      }
    }
  };
  const api = {
    render(container, options) {
      assert.equal(container.id, "turnstile-widget");
      renderedOptions = options;
      return "widget-1";
    },
    remove(id) {
      removedWidget = id;
    },
    reset(id) {
      resetWidget = id;
    }
  };

  Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true, writable: true });
  Object.defineProperty(globalThis, "document", { value: fakeDocument, configurable: true, writable: true });
  resetTurnstileForTests();
  try {
    const first = loadTurnstile();
    const second = loadTurnstile();
    assert.equal(appendCount, 1);
    assert.match(script.src, /turnstile\/v0\/api\.js\?render=explicit$/);

    fakeWindow.turnstile = api;
    listeners.get("load")();
    assert.equal(await first, api);
    assert.equal(await second, api);

    const container = {
      id: "turnstile-widget",
      isConnected: true,
      cleared: false,
      replaceChildren() {
        this.cleared = true;
      }
    };
    const controller = new AbortController();
    const mounted = await mountTurnstile(container, controller.signal, () => {});
    assert.ok(mounted);
    assert.equal(renderedOptions.sitekey, "0x4AAAAAADWCCejih_jntWim");
    assert.equal(mounted.token, null);
    renderedOptions.callback("challenge-token");
    assert.equal(mounted.token, "challenge-token");
    mounted.reset();
    assert.equal(resetWidget, "widget-1");
    controller.abort();
    assert.equal(removedWidget, "widget-1");
    assert.equal(container.cleared, true);
    mounted.dispose();
    assert.equal(removedWidget, "widget-1");
  } finally {
    resetTurnstileForTests();
    if (previousWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, "window", { value: previousWindow, configurable: true, writable: true });
    if (previousDocument === undefined) delete globalThis.document;
    else Object.defineProperty(globalThis, "document", { value: previousDocument, configurable: true, writable: true });
  }
});

test("form entry modules contain no global Turnstile callback wrapper", () => {
  for (const sourcePath of [
    new URL("../scripts/forms/src/submit.ts", import.meta.url),
    new URL("../scripts/forms/src/question-contribute.ts", import.meta.url)
  ]) {
    const source = readFileSync(sourcePath, "utf8");
    assert.match(source, /export async function mount/);
    assert.doesNotMatch(source, /window\.onloadTurnstileCallback/);
    assert.doesNotMatch(source, /document\$\.subscribe/);
  }
});
