import { TopicTree } from "../../quiz/src/topics.js";
import { fillTopicSelect } from "../../quiz/src/topic-select.js";
import type { TaxonomyCatalog } from "../../quiz/src/types.js";

/** Restore the canonical topic last; older drafts only contain this field. */
export function restoreQuestionTopics(form: HTMLFormElement, fields: Record<string, string | boolean>): void {
  const root = form.querySelector<HTMLSelectElement>("#q-submit-topic-root");
  const value = form.querySelector<HTMLInputElement>("#q-submit-topic");
  if (!root || !value) return;
  const rootId = typeof fields["q-submit-topic-root"] === "string" ? fields["q-submit-topic-root"] : "";
  if (rootId && !Array.from(root.options).some(option => option.value === rootId)) {
    const option = form.ownerDocument.createElement("option");
    option.value = option.textContent = rootId;
    root.append(option);
  }
  root.value = rootId;
  value.value = typeof fields["q-submit-topic"] === "string" ? fields["q-submit-topic"] : "";
  value.dispatchEvent(new Event("change", { bubbles: true }));
}

export function questionTopicError(form: HTMLFormElement): string | undefined {
  const root = form.querySelector<HTMLSelectElement>("#q-submit-topic-root");
  const value = form.querySelector<HTMLInputElement>("#q-submit-topic");
  if (root && !root.disabled && root.value && !value?.value) {
    return "请选择子主题，或将主题设为未指定．";
  }
}

export async function mountQuestionTopics(form: HTMLFormElement, signal: AbortSignal): Promise<void> {
  const root = form.querySelector<HTMLSelectElement>("#q-submit-topic-root");
  const child = form.querySelector<HTMLSelectElement>("#q-submit-subtopic");
  const value = form.querySelector<HTMLInputElement>("#q-submit-topic");
  const notice = form.querySelector<HTMLElement>("#q-submit-topic-status");
  if (!root || !child || !value || !notice || signal.aborted) return;
  let tree: TopicTree | undefined;
  let failed = false;

  const sync = () => {
    if (!tree) {
      notice.textContent = value.value
        ? `已保留原主题：${value.value}．${failed ? "主题分类暂不可用．" : "正在加载分类．"}`
        : failed
        ? "主题分类暂不可用，可暂不指定，由维护者归类．"
        : "";
      return;
    }
    const storedRoot = tree.rootOf(value.value);
    const classified = storedRoot && storedRoot !== value.value;
    fillTopicSelect(root, tree.roots, "未指定（由维护者归类）", classified ? storedRoot : root.value, "");
    root.disabled = tree.roots.length === 0;
    fillTopicSelect(
      child,
      tree.subtopics(root.value),
      root.value ? "请选择子主题" : "请先选择主题",
      classified ? value.value : "",
      ""
    );
    child.disabled = root.disabled || !root.value;
    child.required = !child.disabled;
    notice.textContent = value.value && !classified ? `已保留原主题：${value.value}．当前分类中未找到对应子主题．` : "";
  };
  root.addEventListener(
    "change",
    () => {
      value.value = "";
      value.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { signal }
  );
  child.addEventListener(
    "change",
    () => {
      value.value = child.value;
      value.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { signal }
  );
  child.addEventListener("invalid", () => (notice.textContent = questionTopicError(form) ?? ""), { signal });
  value.addEventListener("change", sync, { signal });
  fillTopicSelect(root, [], "正在加载主题…", "", "");
  fillTopicSelect(child, [], "请先选择主题", "", "");
  root.disabled = child.disabled = true;

  try {
    const manifestUrl = new URL(
      form.dataset.manifestUrl ?? "../../_generated/question-bank/manifest.json",
      form.ownerDocument.baseURI
    );
    const response = await fetch(manifestUrl, { cache: "no-cache", signal });
    if (!response.ok) throw new Error("Unable to load manifest");
    const manifest = (await response.json()) as { catalogs?: { taxonomy?: string } };
    if (!manifest.catalogs?.taxonomy) throw new Error("Missing taxonomy catalog");
    const taxonomyResponse = await fetch(new URL(manifest.catalogs.taxonomy, manifestUrl), { signal });
    if (!taxonomyResponse.ok) throw new Error("Unable to load taxonomy");
    const taxonomy = (await taxonomyResponse.json()) as TaxonomyCatalog;
    if (!taxonomy.topics) throw new Error("Missing topic registry");
    if (signal.aborted) return;
    tree = new TopicTree(taxonomy);
  } catch {
    if (signal.aborted) return;
    failed = true;
    const pendingRoot = root.value;
    fillTopicSelect(
      root,
      pendingRoot ? [{ id: pendingRoot, title: pendingRoot }] : [],
      "主题分类暂不可用",
      pendingRoot,
      ""
    );
  }
  sync();
}
