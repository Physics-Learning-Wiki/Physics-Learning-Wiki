import assert from "node:assert/strict";
import test from "node:test";

import {
  createPointerSummaryManager,
  isChoiceInput,
  isPreservedNavigationControl,
  isTextEditingElement,
  resolveOptionIndex,
  shouldQuizHandleEnter,
  shouldQuizHandleOptionShortcut
} from "../src/keyboard.js";

// Lightweight mock helper for DOM elements in Node.js test environment
function createMockElement(options: {
  tagName: string;
  type?: string;
  isContentEditable?: boolean;
  parent?: any;
  isConnected?: boolean;
}): any {
  const el: any = {
    tagName: options.tagName.toUpperCase(),
    type: options.type,
    isContentEditable: Boolean(options.isContentEditable),
    parentElement: options.parent ?? null,
    isConnected: options.isConnected ?? true,
    closest(selector: string): any {
      const selectors = selector.split(",").map(s => s.trim().toLowerCase());
      let current: any = el;
      while (current) {
        const tag = current.tagName.toLowerCase();
        for (const s of selectors) {
          if (s === tag) return current;
          if (s.startsWith('input[type="') && tag === "input") {
            const expectedType = s.slice(12, -2);
            if (current.type?.toLowerCase() === expectedType) return current;
          }
          if (s === '[contenteditable="true"]' && current.isContentEditable) return current;
        }
        current = current.parentElement;
      }
      return null;
    }
  };
  return el;
}

test("isTextEditingElement classifies editable controls vs static/choice controls", () => {
  const textInput = createMockElement({ tagName: "input", type: "text" });
  const numberInput = createMockElement({ tagName: "input", type: "number" });
  const textarea = createMockElement({ tagName: "textarea" });
  const select = createMockElement({ tagName: "select" });
  const editableDiv = createMockElement({ tagName: "div", isContentEditable: true });
  const childOfEditable = createMockElement({ tagName: "span", parent: editableDiv });

  assert.equal(isTextEditingElement(textInput), true);
  assert.equal(isTextEditingElement(numberInput), true);
  assert.equal(isTextEditingElement(textarea), true);
  assert.equal(isTextEditingElement(select), true);
  assert.equal(isTextEditingElement(editableDiv), true);
  assert.equal(isTextEditingElement(childOfEditable), true);

  const radio = createMockElement({ tagName: "input", type: "radio" });
  const checkbox = createMockElement({ tagName: "input", type: "checkbox" });
  const button = createMockElement({ tagName: "button" });
  const summary = createMockElement({ tagName: "summary" });
  const heading = createMockElement({ tagName: "h2" });

  assert.equal(isTextEditingElement(radio), false);
  assert.equal(isTextEditingElement(checkbox), false);
  assert.equal(isTextEditingElement(button), false);
  assert.equal(isTextEditingElement(summary), false);
  assert.equal(isTextEditingElement(heading), false);
  assert.equal(isTextEditingElement(null), false);
});

test("isChoiceInput identifies radio and checkbox controls", () => {
  assert.equal(isChoiceInput(createMockElement({ tagName: "input", type: "radio" })), true);
  assert.equal(isChoiceInput(createMockElement({ tagName: "input", type: "checkbox" })), true);
  assert.equal(isChoiceInput(createMockElement({ tagName: "input", type: "text" })), false);
  assert.equal(isChoiceInput(createMockElement({ tagName: "button" })), false);
  assert.equal(isChoiceInput(null), false);
});

test("isPreservedNavigationControl preserves native arrow/page navigation for form controls and summaries", () => {
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "button" })), true);
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "a" })), true);
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "input", type: "radio" })), true);
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "input", type: "text" })), true);
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "select" })), true);
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "textarea" })), true);
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "summary" })), true);
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "div", isContentEditable: true })), true);

  // General question card or heading should NOT preserve native navigation (quiz moves between questions)
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "h2" })), false);
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "div" })), false);
  assert.equal(isPreservedNavigationControl(createMockElement({ tagName: "main" })), false);
  assert.equal(isPreservedNavigationControl(null), false);
});

test("shouldQuizHandleEnter routes Enter to Quiz only on choices and question card, preserving native on buttons, links, summaries, and text fields", () => {
  // Quiz handles Enter on radio and checkbox
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "input", type: "radio" })), true);
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "input", type: "checkbox" })), true);
  // Quiz handles Enter on question card or heading
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "h2" })), true);
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "div" })), true);

  // Quiz must NOT handle Enter on summary (preserves native toggle)
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "summary" })), false);
  const spanInSummary = createMockElement({ tagName: "span", parent: createMockElement({ tagName: "summary" }) });
  assert.equal(shouldQuizHandleEnter(spanInSummary), false);

  // Quiz must NOT handle Enter on buttons or links
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "button" })), false);
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "a" })), false);

  // Quiz must NOT handle Enter on text-editing inputs
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "input", type: "text" })), false);
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "input", type: "number" })), false);
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "textarea" })), false);
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "select" })), false);
  assert.equal(shouldQuizHandleEnter(createMockElement({ tagName: "div", isContentEditable: true })), false);
});

test("shouldQuizHandleOptionShortcut allows shortcuts everywhere except text-editing elements", () => {
  // Allowed on summary, radio, checkbox, button, headings
  assert.equal(shouldQuizHandleOptionShortcut(createMockElement({ tagName: "summary" })), true);
  assert.equal(shouldQuizHandleOptionShortcut(createMockElement({ tagName: "input", type: "radio" })), true);
  assert.equal(shouldQuizHandleOptionShortcut(createMockElement({ tagName: "input", type: "checkbox" })), true);
  assert.equal(shouldQuizHandleOptionShortcut(createMockElement({ tagName: "button" })), true);
  assert.equal(shouldQuizHandleOptionShortcut(createMockElement({ tagName: "h2" })), true);

  // Blocked on text editing elements
  assert.equal(shouldQuizHandleOptionShortcut(createMockElement({ tagName: "input", type: "text" })), false);
  assert.equal(shouldQuizHandleOptionShortcut(createMockElement({ tagName: "input", type: "number" })), false);
  assert.equal(shouldQuizHandleOptionShortcut(createMockElement({ tagName: "textarea" })), false);
  assert.equal(shouldQuizHandleOptionShortcut(createMockElement({ tagName: "select" })), false);
  assert.equal(shouldQuizHandleOptionShortcut(createMockElement({ tagName: "div", isContentEditable: true })), false);
});

test("resolveOptionIndex parses letters and digits deterministically", () => {
  assert.equal(resolveOptionIndex("a"), 0);
  assert.equal(resolveOptionIndex("A"), 0);
  assert.equal(resolveOptionIndex("b"), 1);
  assert.equal(resolveOptionIndex("B"), 1);
  assert.equal(resolveOptionIndex("c"), 2);
  assert.equal(resolveOptionIndex("d"), 3);
  assert.equal(resolveOptionIndex("z"), 25);

  assert.equal(resolveOptionIndex("1"), 0);
  assert.equal(resolveOptionIndex("2"), 1);
  assert.equal(resolveOptionIndex("4"), 3);
  assert.equal(resolveOptionIndex("9"), 8);

  assert.equal(resolveOptionIndex("0"), -1);
  assert.equal(resolveOptionIndex("Enter"), -1);
  assert.equal(resolveOptionIndex("Escape"), -1);
  assert.equal(resolveOptionIndex("Tab"), -1);
  assert.equal(resolveOptionIndex("$"), -1);
});

test("createPointerSummaryManager restores focus only for pointer-origin clicks when summary remains active", async () => {
  const listeners: Record<string, EventListener[]> = {};
  const mockRoot: any = {
    addEventListener(type: string, fn: EventListener) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    removeEventListener(type: string, fn: EventListener) {
      listeners[type] = (listeners[type] || []).filter(l => l !== fn);
    },
    contains(child: any) {
      return Boolean(child);
    }
  };

  const summary = createMockElement({ tagName: "summary", isConnected: true });
  let focusRestored = 0;
  const restoreFocus = () => {
    focusRestored += 1;
  };

  // Setup fake document.activeElement
  const origDoc = (globalThis as any).document;
  (globalThis as any).document = { activeElement: summary };

  const manager = createPointerSummaryManager({
    root: mockRoot,
    restoreFocus
  });

  try {
    // 1. Pointerdown on summary, followed by click
    listeners["pointerdown"][0]({ target: summary } as any);
    listeners["click"][0]({ target: summary } as any);

    // Wait for microtask
    await new Promise<void>(resolve => queueMicrotask(() => resolve()));
    assert.equal(focusRestored, 1, "Focus should be restored after pointerdown + click on summary");

    // 2. Keyboard-origin click (no pointerdown prior)
    listeners["click"][0]({ target: summary } as any);
    await new Promise<void>(resolve => queueMicrotask(() => resolve()));
    assert.equal(focusRestored, 1, "Focus must NOT be restored on synthetic/keyboard click without pointerdown");

    // 3. Pointerdown cancelled
    listeners["pointerdown"][0]({ target: summary } as any);
    listeners["pointercancel"][0]({} as any);
    listeners["click"][0]({ target: summary } as any);
    await new Promise<void>(resolve => queueMicrotask(() => resolve()));
    assert.equal(focusRestored, 1, "Cancelled pointerdown must not trigger focus restoration");

    // 4. Pointerdown on summary, but activeElement moved elsewhere before microtask
    (globalThis as any).document.activeElement = createMockElement({ tagName: "button" });
    listeners["pointerdown"][0]({ target: summary } as any);
    listeners["click"][0]({ target: summary } as any);
    await new Promise<void>(resolve => queueMicrotask(() => resolve()));
    assert.equal(focusRestored, 1, "Focus must not be restored if activeElement is not the summary");
  } finally {
    manager.dispose();
    (globalThis as any).document = origDoc;
  }
});
