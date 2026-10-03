import { parseDraft, sameDraft, type SubmissionDraft } from "./draft.js";
import type { EditorHandle } from "./editor.js";

export interface DraftHandle {
  snapshot(): SubmissionDraft;
  clearSubmitted(submitted: SubmissionDraft): void;
  dispose(): void;
}

export function mountSubmissionDraft(form: HTMLFormElement, editor: EditorHandle, signal: AbortSignal): DraftHandle {
  const document = form.ownerDocument;
  const window = document.defaultView!;
  const type = form.querySelector<HTMLSelectElement>("#submit-type")!;
  const title = form.querySelector<HTMLInputElement>("#submit-title")!;
  const major = form.querySelector<HTMLSelectElement>("#submit-chapter-major")!;
  const minor = form.querySelector<HTMLSelectElement>("#submit-chapter-minor")!;
  let siteRoot = new URL("../", document.baseURI);
  try {
    const config = JSON.parse(document.getElementById("__config")?.textContent || "{}");
    if (typeof config.base === "string") siteRoot = new URL(config.base, document.baseURI);
  } catch {
    /* Keep the submit page's parent path. */
  }
  const key = `plw:submission-draft:v1:${siteRoot.pathname}`;
  const panel = document.createElement("div");
  panel.className = "submit-draft";
  const notice = document.createElement("p");
  notice.setAttribute("role", "status");
  const restore = document.createElement("button");
  restore.type = "button";
  restore.textContent = "恢复草稿";
  const discard = document.createElement("button");
  discard.type = "button";
  discard.textContent = "清除草稿";
  panel.append(notice, restore, discard);
  form.prepend(panel);
  let pending: SubmissionDraft | undefined;
  let dirty = false;
  let completed = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const snapshot = (): SubmissionDraft => ({
    schemaVersion: 1,
    type: type.value,
    title: title.value,
    content: editor.instance.value(),
    majorChapter: major.value,
    minorChapter: minor.value,
    updatedAt: Date.now()
  });
  const storageError = () => {
    notice.textContent = "无法在此浏览器保存草稿，请自行备份正文；仍可继续投稿．";
  };
  const updateButtons = () => {
    restore.hidden = !pending;
    discard.hidden = !pending && !dirty;
  };
  try {
    const raw = window.localStorage.getItem(key);
    pending = raw ? parseDraft(raw) : undefined;
    if (raw && !pending) {
      notice.textContent = "草稿损坏或版本不兼容，可清除后继续编辑．";
      discard.hidden = false;
    } else
      notice.textContent = pending
        ? "发现本机草稿．恢复会替换当前内容；恢复或清除后启用自动保存．"
        : "草稿仅保存在当前浏览器，可随时清除；联系方式和署名不会保存．";
    restore.hidden = !pending;
    if (!raw) discard.hidden = true;
  } catch {
    restore.hidden = true;
    discard.hidden = true;
    storageError();
  }
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (!dirty || pending || completed) return;
    try {
      const draft = snapshot();
      if (draft.title || draft.content || draft.type || draft.majorChapter) {
        window.localStorage.setItem(key, JSON.stringify(draft));
        notice.textContent = "草稿已保存在当前浏览器．";
        discard.hidden = false;
      } else {
        window.localStorage.removeItem(key);
        notice.textContent = "草稿已清除．";
        discard.hidden = true;
      }
      dirty = false;
    } catch {
      storageError();
    }
  };
  const changed = () => {
    if (disposed || completed) return;
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 500);
  };
  form.addEventListener(
    "input",
    event => {
      if ([title, type, major, minor].includes(event.target as HTMLInputElement)) changed();
    },
    { signal }
  );
  for (const field of [type, major, minor]) field.addEventListener("change", changed, { signal });
  editor.instance.codemirror.on("change", changed);
  restore.addEventListener(
    "click",
    () => {
      if (!pending) return;
      const draft = pending;
      pending = undefined;
      type.value = draft.type;
      type.dispatchEvent(new Event("change", { bubbles: true }));
      title.value = draft.title;
      editor.instance.value(draft.content);
      major.value = draft.majorChapter;
      major.dispatchEvent(new Event("change", { bubbles: true }));
      if (Array.from(minor.options).some(option => option.value === draft.minorChapter))
        minor.value = draft.minorChapter;
      minor.dispatchEvent(new Event("change", { bubbles: true }));
      dirty = true;
      updateButtons();
      flush();
    },
    { signal }
  );
  discard.addEventListener(
    "click",
    () => {
      try {
        window.localStorage.removeItem(key);
        pending = undefined;
        dirty = false;
        if (timer) clearTimeout(timer);
        timer = undefined;
        updateButtons();
        notice.textContent = "草稿已清除；当前表单内容保留．";
      } catch {
        storageError();
      }
    },
    { signal }
  );
  window.addEventListener("pagehide", flush, { signal });
  const dispose = () => {
    if (disposed) return;
    flush();
    disposed = true;
    editor.instance.codemirror.off("change", changed);
    signal.removeEventListener("abort", dispose);
  };
  signal.addEventListener("abort", dispose, { once: true });
  return {
    snapshot,
    dispose,
    clearSubmitted(submitted) {
      const current = snapshot();
      if (sameDraft(current, submitted)) {
        completed = true;
        dirty = false;
        if (timer) clearTimeout(timer);
      } else flush();
      try {
        const raw = window.localStorage.getItem(key);
        const stored = raw ? parseDraft(raw) : undefined;
        if (stored && sameDraft(stored, submitted)) window.localStorage.removeItem(key);
      } catch {
        storageError();
      }
    }
  };
}
