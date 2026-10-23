import type { EditorHandle } from "./editor.js";
import { downloadJson } from "./downloads.js";
import { siteRoot } from "./submission-client.js";
import { restoreQuestionTopics } from "./question-topics.js";

const FIELDS = [
  "q-submit-type",
  "q-submit-stem",
  "q-submit-solution",
  "q-submit-choices",
  "q-submit-answer",
  "q-submit-rubric",
  "q-submit-choice-feedback",
  "q-submit-correct-feedback",
  "q-submit-incorrect-feedback",
  "q-submit-topic-root",
  "q-submit-topic",
  "q-submit-concepts",
  "q-submit-diff",
  "q-submit-cognitive",
  "q-submit-style",
  "q-submit-seconds",
  "q-submit-img-url",
  "q-submit-img-alt",
  "q-submit-img-rights",
  "q-submit-ai",
  "q-submit-tolerance-type",
  "q-submit-tolerance",
  "q-submit-unit-required",
  "q-submit-unit-canonical",
  "q-submit-unit-accepted",
  "submission-source-kind",
  "submission-source-note",
  "submission-source-url",
  "submission-source-permission"
] as const;
export interface QuestionDraft {
  schemaVersion: 1;
  kind: "question";
  updatedAt: number;
  fields: Record<string, string | boolean>;
}
export function parseQuestionDraft(raw: string): QuestionDraft | undefined {
  try {
    if (raw.length > 131072) return;
    const data = JSON.parse(raw);
    if (
      data?.schemaVersion !== 1 ||
      data.kind !== "question" ||
      !Number.isFinite(data.updatedAt) ||
      !data.fields ||
      typeof data.fields !== "object" ||
      Array.isArray(data.fields)
    )
      return;
    const fields: Record<string, string | boolean> = {};
    for (const id of FIELDS) {
      const value = data.fields[id];
      if (value !== undefined && typeof value !== "string" && typeof value !== "boolean") return;
      if (typeof value === "string" && value.length > 50000) return;
      if (value !== undefined) fields[id] = value;
    }
    return { schemaVersion: 1, kind: "question", updatedAt: data.updatedAt, fields };
  } catch {
    return;
  }
}
export function mountQuestionDraft(form: HTMLFormElement, editors: Record<string, EditorHandle>, signal: AbortSignal) {
  const document = form.ownerDocument,
    window = document.defaultView!;
  const key = "plw:question-draft:v1:" + siteRoot(document).pathname;
  const panel = document.createElement("section");
  panel.className = "submit-draft";
  const notice = document.createElement("p");
  notice.setAttribute("role", "status");
  const button = (text: string) => {
    const node = document.createElement("button");
    node.type = "button";
    node.textContent = text;
    return node;
  };
  const restore = button("恢复题目草稿"),
    discard = button("清除题目草稿"),
    exported = button("导出题目草稿");
  const imported = document.createElement("input");
  imported.type = "file";
  imported.accept = "application/json,.json";
  imported.setAttribute("aria-label", "导入题目草稿");
  panel.append(notice, restore, discard, exported, imported);
  form.prepend(panel);
  let pending: QuestionDraft | undefined,
    dirty = false,
    disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const snapshot = (): QuestionDraft => {
    const fields: Record<string, string | boolean> = {};
    for (const id of FIELDS) {
      const node = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("#" + id);
      if (!node) continue;
      fields[id] =
        editors[id]?.instance.value() ??
        (node instanceof HTMLInputElement && node.type === "checkbox" ? node.checked : node.value);
    }
    return { schemaVersion: 1, kind: "question", updatedAt: Date.now(), fields };
  };
  const same = (a: QuestionDraft, b: QuestionDraft) => JSON.stringify(a.fields) === JSON.stringify(b.fields);
  const unavailable = () => {
    notice.textContent = "浏览器无法保存草稿，请使用导出备份；仍可继续编辑．";
  };
  try {
    const value = window.localStorage.getItem(key);
    pending = value ? parseQuestionDraft(value) : undefined;
    notice.textContent = pending
      ? "发现本机题目草稿．点击恢复将替换当前输入，恢复或清除后启用自动保存．"
      : "题目草稿仅存于本机；署名、授权勾选、验证令牌和管理凭证不会保存．";
    restore.hidden = !pending;
  } catch {
    unavailable();
    restore.hidden = true;
  }
  const flush = () => {
    if (timer) clearTimeout(timer);
    if (!dirty || pending || disposed) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(snapshot()));
      dirty = false;
      notice.textContent = "题目草稿已自动保存在本机．";
    } catch {
      unavailable();
    }
  };
  const changed = () => {
    if (disposed) return;
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 500);
  };
  form.addEventListener(
    "input",
    event => {
      if (FIELDS.includes((event.target as HTMLElement).id as (typeof FIELDS)[number])) changed();
    },
    { signal }
  );
  form.addEventListener(
    "change",
    event => {
      if (FIELDS.includes((event.target as HTMLElement).id as (typeof FIELDS)[number])) changed();
    },
    { signal }
  );
  for (const editor of Object.values(editors)) editor.instance.codemirror.on("change", changed);
  restore.addEventListener(
    "click",
    () => {
      if (!pending) return;
      const value = pending;
      pending = undefined;
      for (const [id, field] of Object.entries(value.fields)) {
        const node = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("#" + id);
        if (!node) continue;
        if (editors[id]) editors[id].instance.value(String(field));
        else if (node instanceof HTMLInputElement && node.type === "checkbox") node.checked = Boolean(field);
        else {
          if (
            node instanceof HTMLSelectElement &&
            !Array.from(node.options).some(option => option.value === String(field))
          ) {
            const option = document.createElement("option");
            option.value = String(field);
            option.textContent = String(field);
            node.append(option);
          }
          node.value = String(field);
        }
        node.dispatchEvent(new Event("change", { bubbles: true }));
      }
      restoreQuestionTopics(form, value.fields);
      form.querySelectorAll<HTMLInputElement>('input[id$="-license"]').forEach(node => {
        node.checked = false;
      });
      restore.hidden = true;
      dirty = true;
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
        restore.hidden = true;
        if (timer) clearTimeout(timer);
        notice.textContent = "题目草稿已清除，当前输入保留．";
      } catch {
        unavailable();
      }
    },
    { signal }
  );
  exported.addEventListener("click", () => downloadJson(document, "plw-question-draft.json", snapshot()), { signal });
  imported.addEventListener(
    "change",
    () => {
      void (async () => {
        const file = imported.files?.[0];
        if (!file || file.size > 131072) {
          notice.textContent = "草稿文件超过 128 KiB 或未选择文件．";
          return;
        }
        const value = parseQuestionDraft(await file.text());
        if (!value) {
          notice.textContent = "草稿文件格式或版本不兼容．";
          return;
        }
        pending = value;
        restore.hidden = false;
        notice.textContent = "草稿已读入，点击恢复确认后替换当前输入．";
      })();
    },
    { signal }
  );
  window.addEventListener("pagehide", flush, { signal });
  const dispose = () => {
    if (disposed) return;
    flush();
    disposed = true;
    if (timer) clearTimeout(timer);
    for (const editor of Object.values(editors)) editor.instance.codemirror.off("change", changed);
  };
  signal.addEventListener("abort", dispose, { once: true });
  return {
    snapshot,
    dispose,
    clearSubmitted(submitted: QuestionDraft) {
      try {
        if (same(snapshot(), submitted)) {
          dirty = false;
          if (timer) clearTimeout(timer);
          const stored = window.localStorage.getItem(key);
          const saved = stored ? parseQuestionDraft(stored) : undefined;
          if (!saved || same(saved, submitted)) window.localStorage.removeItem(key);
        } else {
          dirty = true;
          flush();
        }
      } catch {
        unavailable();
      }
    }
  };
}
