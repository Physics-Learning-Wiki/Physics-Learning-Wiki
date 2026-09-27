import type { QuizStore } from "./storage.js";
import { formatAiPrompt, formatQuestionMarkdown } from "./question-copy.js";
import type { Question, UserAnswer } from "./types.js";

export interface QuestionToolsOptions {
  manifestUrl?: URL;
  getAnswer?: () => UserAnswer;
}
export function createQuestionTools(
  question: Question,
  store: QuizStore,
  signal: AbortSignal,
  options: QuestionToolsOptions = {}
): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "plw-quiz-question-tools";
  const save = document.createElement("button");
  save.type = "button";
  save.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
  const organize = document.createElement("button");
  organize.type = "button";
  organize.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
  organize.textContent = "整理收藏夹";
  const status = document.createElement("span");
  status.className = "plw-quiz-tools-status";
  status.setAttribute("role", "status");
  const update = () => {
    const saved = !!store.read().library.savedQuestions[question.id];
    save.textContent = saved ? "★ 已收藏" : "☆ 收藏";
    save.setAttribute("aria-pressed", String(saved));
    save.classList.toggle("is-active", saved);
  };
  update();
  const unsubscribe = store.subscribe(update);
  signal.addEventListener("abort", unsubscribe, { once: true });
  save.addEventListener("click", async () => {
    save.disabled = true;
    const snapshot = store.read();
    const saved = !!snapshot.library.savedQuestions[question.id];
    if (
      saved &&
      snapshot.library.savedQuestions[question.id].collectionIds.length &&
      !window.confirm("取消收藏后，该题也会从所有收藏夹中移除。")
    ) {
      save.disabled = false;
      return;
    }
    const result = await store.setSaved(question.id, question.version, !saved, snapshot.profileEpoch);
    status.textContent = result.ok ? (saved ? "已取消收藏" : "已收藏") : `未保存：${result.reason}`;
    save.disabled = false;
    update();
  });
  organize.addEventListener("click", () => showCollectionPicker(question, store, status, signal));
  bar.append(save, organize);
  if (options.manifestUrl && question.source) {
    const copyQuestion = document.createElement("button");
    copyQuestion.type = "button";
    copyQuestion.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
    copyQuestion.textContent = "复制题目";
    const copyPrompt = document.createElement("button");
    copyPrompt.type = "button";
    copyPrompt.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
    copyPrompt.textContent = "复制 AI 提问";
    let includeAnswer: HTMLInputElement | undefined;
    if (options.getAnswer) {
      const label = document.createElement("label");
      label.className = "plw-quiz-tools-checkbox";
      includeAnswer = document.createElement("input");
      includeAnswer.type = "checkbox";
      label.append(includeAnswer, document.createTextNode("附加当前作答"));
      bar.append(label);
    }
    copyQuestion.addEventListener("click", () => {
      void copyText(formatQuestionMarkdown(question, options.manifestUrl!), status, signal);
    });
    copyPrompt.addEventListener("click", () => {
      const answer = includeAnswer?.checked ? options.getAnswer?.() : undefined;
      void copyText(formatAiPrompt(question, options.manifestUrl!, answer), status, signal);
    });
    const deepseek = document.createElement("a");
    deepseek.href = "https://chat.deepseek.com/";
    deepseek.target = "_blank";
    deepseek.rel = "noopener noreferrer";
    deepseek.className = "plw-quiz-btn--secondary plw-quiz-btn--sm plw-quiz-btn--external";
    deepseek.textContent = "打开 DeepSeek ↗";
    bar.append(copyQuestion, copyPrompt, deepseek);
  }
  bar.append(status);
  return bar;
}

async function copyText(value: string, status: HTMLElement, signal: AbortSignal): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    status.textContent = "已复制到剪贴板";
  } catch {
    status.textContent = "自动复制失败，请从文本框手动复制。";
    const dialog = document.createElement("dialog");
    const title = document.createElement("p");
    title.textContent = "手动复制文本";
    const area = document.createElement("textarea");
    area.value = value;
    area.rows = 12;
    area.style.width = "min(90vw, 40rem)";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "关闭";
    close.addEventListener("click", () => dialog.close());
    const closeDialog = () => {
      if (dialog.open) dialog.close();
    };
    dialog.addEventListener(
      "close",
      () => {
        signal.removeEventListener("abort", closeDialog);
        dialog.remove();
      },
      { once: true }
    );
    signal.addEventListener("abort", closeDialog, { once: true });
    dialog.append(title, area, close);
    document.body.append(dialog);
    dialog.showModal();
    area.select();
  }
}

function showCollectionPicker(question: Question, store: QuizStore, status: HTMLElement, signal: AbortSignal): void {
  const snapshot = store.read();
  const saved = snapshot.library.savedQuestions[question.id];
  const backdrop = document.createElement("div");
  backdrop.className = "plw-quiz-modal-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-labelledby", "plw-collection-picker-title");
  const panel = document.createElement("div");
  panel.className = "plw-quiz-modal";
  const title = document.createElement("h3");
  title.id = "plw-collection-picker-title";
  title.textContent = `整理 ${question.id}`;
  panel.append(title);
  const form = document.createElement("div");
  for (const collection of Object.values(snapshot.library.collections).sort((a, b) => a.name.localeCompare(b.name))) {
    const label = document.createElement("label");
    label.className = "plw-quiz-collection-choice";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = collection.id;
    input.checked = !!saved?.collectionIds.includes(collection.id);
    label.append(input, document.createTextNode(collection.name));
    form.append(label);
  }
  panel.append(form);
  const nameLabel = document.createElement("label");
  nameLabel.textContent = "新建收藏夹（可选）";
  const name = document.createElement("input");
  name.type = "text";
  name.maxLength = 40;
  nameLabel.append(name);
  panel.append(nameLabel);
  const error = document.createElement("p");
  error.setAttribute("role", "alert");
  panel.append(error);
  const actions = document.createElement("div");
  actions.className = "plw-quiz-modal__actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "取消";
  cancel.className = "plw-quiz-btn--secondary";
  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.textContent = "保存整理";
  confirm.className = "plw-quiz-btn--primary";
  actions.append(cancel, confirm);
  panel.append(actions);
  backdrop.append(panel);
  const returnFocus = document.activeElement as HTMLElement | null;
  const close = () => {
    signal.removeEventListener("abort", close);
    backdrop.remove();
    if (returnFocus?.isConnected) returnFocus.focus();
  };
  signal.addEventListener("abort", close, { once: true });
  cancel.addEventListener("click", close);
  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) close();
  });
  backdrop.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      const controls = Array.from(backdrop.querySelectorAll<HTMLElement>("input, button")).filter(
        control => !(control as HTMLButtonElement).disabled
      );
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        controls[controls.length - 1]?.focus();
      } else if (!event.shiftKey && index === controls.length - 1) {
        event.preventDefault();
        controls[0]?.focus();
      }
    }
  });
  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    const ids = Array.from(form.querySelectorAll<HTMLInputElement>("input:checked")).map(input => input.value);
    const result = await store.organizeQuestion(
      question.id,
      question.version,
      ids,
      name.value,
      snapshot.profileEpoch,
      saved,
      snapshot.library.collections
    );
    if (!result.ok) {
      error.textContent =
        result.reason === "conflict" ? "档案已变化，请关闭后重新打开并检查选择。" : `保存失败：${result.reason}`;
      confirm.disabled = false;
      return;
    }
    status.textContent = "收藏夹已更新";
    close();
  });
  document.body.append(backdrop);
  name.focus();
}
