export function isElement(target: unknown): target is HTMLElement {
  if (!target || typeof target !== "object") return false;
  if (typeof HTMLElement !== "undefined") {
    return target instanceof HTMLElement;
  }
  return "nodeType" in target || "tagName" in target || "closest" in target;
}

export function isTextEditingElement(target: unknown): boolean {
  if (!isElement(target)) return false;
  if ("isContentEditable" in target && (target as HTMLElement).isContentEditable) return true;
  if (typeof target.closest === "function" && target.closest('textarea, select, [contenteditable="true"]')) return true;
  const input = typeof target.closest === "function" ? (target.closest("input") as HTMLInputElement | null) : null;
  if (input) {
    const type = (input.type || "text").toLowerCase();
    if (type !== "radio" && type !== "checkbox" && type !== "button" && type !== "submit" && type !== "reset") {
      return true;
    }
  }
  return false;
}

export function isChoiceInput(target: unknown): boolean {
  if (!isElement(target)) return false;
  const input = typeof target.closest === "function" ? (target.closest("input") as HTMLInputElement | null) : null;
  if (!input) return false;
  const type = (input.type || "text").toLowerCase();
  return type === "radio" || type === "checkbox";
}

export function isPreservedNavigationControl(target: unknown): boolean {
  if (!isElement(target)) return false;
  if ("isContentEditable" in target && (target as HTMLElement).isContentEditable) return true;
  if (typeof target.closest === "function") {
    return Boolean(target.closest('button, a, input, select, textarea, summary, [contenteditable="true"]'));
  }
  return false;
}

export function shouldQuizHandleEnter(target: unknown): boolean {
  if (!isElement(target)) return false;
  if (typeof target.closest === "function" && target.closest("button, a, summary")) return false;
  if (isTextEditingElement(target)) return false;
  return true;
}

export function shouldQuizHandleOptionShortcut(target: unknown): boolean {
  if (!isElement(target)) return false;
  return !isTextEditingElement(target);
}

export function resolveOptionIndex(key: string): number {
  if (key.length !== 1) return -1;
  const upper = key.toUpperCase();
  if (upper >= "A" && upper <= "Z") {
    return upper.charCodeAt(0) - 65;
  }
  if (upper >= "1" && upper <= "9") {
    return parseInt(upper, 10) - 1;
  }
  return -1;
}

export interface PointerSummaryManager {
  dispose(): void;
}

export function createPointerSummaryManager(options: {
  root: HTMLElement;
  restoreFocus: () => void;
  signal?: AbortSignal;
}): PointerSummaryManager {
  let pointerSummary: HTMLElement | null = null;

  const onPointerDown = (event: Event) => {
    const target = event.target as HTMLElement | null;
    const summary = typeof target?.closest === "function" ? target.closest("summary") : null;
    if (summary && options.root.contains(summary)) {
      pointerSummary = summary;
    } else {
      pointerSummary = null;
    }
  };

  const onPointerCancel = () => {
    pointerSummary = null;
  };

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement | null;
    const summary = typeof target?.closest === "function" ? target.closest("summary") : null;
    if (summary && summary === pointerSummary) {
      pointerSummary = null;
      queueMicrotask(() => {
        const active = typeof document !== "undefined" ? document.activeElement : null;
        if (active === summary && summary.isConnected) {
          options.restoreFocus();
        }
      });
    } else {
      pointerSummary = null;
    }
  };

  options.root.addEventListener("pointerdown", onPointerDown as EventListener, { signal: options.signal });
  options.root.addEventListener("pointercancel", onPointerCancel as EventListener, { signal: options.signal });
  options.root.addEventListener("click", onClick as EventListener, { signal: options.signal });

  return {
    dispose() {
      pointerSummary = null;
      options.root.removeEventListener("pointerdown", onPointerDown as EventListener);
      options.root.removeEventListener("pointercancel", onPointerCancel as EventListener);
      options.root.removeEventListener("click", onClick as EventListener);
    }
  };
}
