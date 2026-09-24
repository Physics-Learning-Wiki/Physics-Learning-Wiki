import { createEditor, createEditorToolbar, type EditorHandle } from "./editor.js";
import { queryInRoot } from "./dom.js";
import { NAV_TREE, type NavigationItem } from "./nav-tree.js";
import { mountTurnstile } from "./turnstile.js";
import type { FeatureDisposer, FeatureMountContext, MountedTurnstile } from "./types.js";

const SUBMIT_ENDPOINT = "https://submit.folderrewind.top";
const TYPE_HINTS: Record<string, string> = {
  "full-page": "请包含：问题引入 → 核心概念 → 公式推导 → 例题 → 易错点",
  notes: "半成品也没关系！把你的课堂笔记、复习提纲、思维导图粘贴进来即可",
  errata: "请指出：具体章节或题目 ID → 哪段文字/公式 → 错误描述 → 正确版本",
  suggestion: "对网站结构、内容方向、功能改进的任何想法都欢迎"
};
const TYPE_LABELS: Record<string, string> = {
  "full-page": "完整页面",
  notes: "笔记/提纲",
  errata: "勘误纠错",
  question: "题目投稿",
  suggestion: "建议/想法"
};

function appendOptions(items: NavigationItem[], select: HTMLSelectElement, prefix = ""): void {
  for (const item of items) {
    const label = prefix ? `${prefix} > ${item.label}` : item.label;
    const option = document.createElement("option");
    option.value = label;
    option.textContent = label;
    select.append(option);
    if (item.children) appendOptions(item.children, select, label);
  }
}

function populateChapterSelect(form: HTMLFormElement, signal: AbortSignal): void {
  const majorSelect = form.querySelector<HTMLSelectElement>("#submit-chapter-major");
  const minorSelect = form.querySelector<HTMLSelectElement>("#submit-chapter-minor");
  const hiddenInput = form.querySelector<HTMLInputElement>("#submit-chapter");

  if (!majorSelect || !minorSelect || !hiddenInput) {
    const legacySelect = form.querySelector<HTMLSelectElement>("#submit-chapter");
    if (!legacySelect) return;
    legacySelect.replaceChildren();
    appendOptions(NAV_TREE, legacySelect);
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- 可选，帮助编辑组归类 --";
    legacySelect.insertBefore(defaultOption, legacySelect.firstChild);
    return;
  }

  majorSelect.innerHTML = '<option value="">-- 一级分类（选填） --</option>';
  minorSelect.innerHTML = '<option value="">-- 请先选择一级分类 --</option>';
  minorSelect.disabled = true;
  hiddenInput.value = "";
  for (const item of NAV_TREE) {
    const option = document.createElement("option");
    option.value = item.label;
    option.textContent = item.label;
    majorSelect.append(option);
  }

  const updateMinor = () => {
    const selectedMajor = majorSelect.value;
    minorSelect.replaceChildren();
    if (!selectedMajor) {
      minorSelect.disabled = true;
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "-- 请先选择一级分类 --";
      minorSelect.append(option);
      hiddenInput.value = "";
      return;
    }

    const majorNode = NAV_TREE.find(item => item.label === selectedMajor);
    if (!majorNode?.children?.length) {
      minorSelect.disabled = true;
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "-- 该分类下无子小节 --";
      minorSelect.append(option);
      hiddenInput.value = selectedMajor;
      return;
    }

    minorSelect.disabled = false;
    const defaultOption = document.createElement("option");
    defaultOption.value = selectedMajor;
    defaultOption.textContent = "-- 全部/模块通论 --";
    minorSelect.append(defaultOption);
    for (const child of majorNode.children) {
      if (child.children?.length) {
        for (const leaf of child.children) {
          const option = document.createElement("option");
          option.value = `${selectedMajor} > ${child.label} > ${leaf.label}`;
          option.textContent = `${child.label} > ${leaf.label}`;
          minorSelect.append(option);
        }
      } else {
        const option = document.createElement("option");
        option.value = `${selectedMajor} > ${child.label}`;
        option.textContent = child.label;
        minorSelect.append(option);
      }
    }
    hiddenInput.value = minorSelect.value || selectedMajor;
  };

  majorSelect.addEventListener("change", updateMinor, { signal });
  minorSelect.addEventListener(
    "change",
    () => {
      hiddenInput.value = minorSelect.value || majorSelect.value || "";
    },
    { signal }
  );
}

function setAttribution(form: HTMLFormElement, signal: AbortSignal): void {
  const namedRadio = form.querySelector<HTMLInputElement>('input[name="attribution-type"][value="named"]');
  const anonymousRadio = form.querySelector<HTMLInputElement>('input[name="attribution-type"][value="anonymous"]');
  const attributionInput = form.querySelector<HTMLInputElement>("#submit-attribution");
  if (!namedRadio || !anonymousRadio || !attributionInput) return;

  const update = () => {
    if (anonymousRadio.checked) {
      attributionInput.disabled = true;
      attributionInput.value = "";
      attributionInput.placeholder = "将显示为「匿名同学」";
    } else {
      attributionInput.disabled = false;
      attributionInput.placeholder = "你希望在页面上显示的署名";
    }
  };
  namedRadio.addEventListener("change", update, { signal });
  anonymousRadio.addEventListener("change", update, { signal });
  update();
}

function setError(status: HTMLElement, message: string): void {
  status.textContent = message;
  status.className = "error";
}

export async function mount(root: ParentNode, { signal }: FeatureMountContext): Promise<FeatureDisposer> {
  const form = queryInRoot<HTMLFormElement>(root, "#submission-form");
  if (!form || signal.aborted) return () => undefined;

  const status = form.querySelector<HTMLElement>("#submit-status");
  const submitButton = form.querySelector<HTMLButtonElement>("#submit-btn");
  const typeSelect = form.querySelector<HTMLSelectElement>("#submit-type");
  const titleInput = form.querySelector<HTMLInputElement>("#submit-title");
  const chapterSelect = form.querySelector<HTMLInputElement>("#submit-chapter");
  const attributionInput = form.querySelector<HTMLInputElement>("#submit-attribution");
  const contactInput = form.querySelector<HTMLInputElement>("#submit-contact");
  const contactPublic = form.querySelector<HTMLInputElement>("#submit-contact-public");
  const anonymousRadio = form.querySelector<HTMLInputElement>('input[name="attribution-type"][value="anonymous"]');
  const hint = form.querySelector<HTMLElement>("#submit-hint");
  const editorTextarea = form.querySelector<HTMLTextAreaElement>("#submit-content");
  const turnstileContainer = form.querySelector<HTMLElement>("#turnstile-widget");
  const success = queryInRoot<HTMLElement>(root, "#submit-success");
  const issueLink = queryInRoot<HTMLAnchorElement>(root, "#submit-issue-link");
  if (!status || !submitButton || !typeSelect || !titleInput || !chapterSelect || !editorTextarea)
    return () => undefined;

  let editor: EditorHandle | undefined;
  let widget: MountedTurnstile | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", dispose);
    widget?.dispose();
    editor?.dispose();
  };
  signal.addEventListener("abort", dispose, { once: true });

  populateChapterSelect(form, signal);
  setAttribution(form, signal);
  const updateTypeHint = () => {
    if (hint) hint.textContent = TYPE_HINTS[typeSelect.value] ?? "";
  };
  typeSelect.addEventListener("change", updateTypeHint, { signal });
  updateTypeHint();

  editor = createEditor(
    editorTextarea,
    {
      spellChecker: false,
      placeholder: "在这里写你的内容... 支持 Markdown 和 LaTeX 公式",
      toolbar: createEditorToolbar(true),
      renderingConfig: { singleLineBreaks: false, codeSyntaxHighlighting: true }
    },
    signal
  );

  const parameters = new URL(window.location.href).searchParams;
  if (parameters.get("type") === "errata") {
    typeSelect.value = "errata";
    titleInput.value = parameters.get("title") || "";
    const prefill = [
      `题目 ID：${parameters.get("question_id") || ""}`,
      `题目版本：${parameters.get("question_version") || ""}`,
      "",
      "问题描述："
    ].join("\n");
    editor?.instance.value(prefill);
    updateTypeHint();
  }

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();
      status.textContent = "";
      status.className = "";
      if (!editor) {
        setError(status, "编辑器尚未初始化，请刷新页面后重试");
        return;
      }

      const content = editor.instance.value().trim();
      const title = titleInput.value.trim();
      const type = typeSelect.value;
      if (!title || !content || !type) {
        setError(status, "请填写标题、正文和投稿类型");
        return;
      }
      if (contactInput?.value.trim() && !contactPublic?.checked) {
        setError(status, "联系方式会公开显示；请勾选公开同意，或清空联系方式");
        return;
      }
      if (!widget?.token) {
        setError(status, "请完成人机验证");
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "提交中...";
      try {
        const response = await fetch(SUBMIT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            title,
            content,
            type,
            typeLabel: TYPE_LABELS[type] || type,
            chapter: chapterSelect.value,
            attribution: anonymousRadio?.checked ? "匿名" : attributionInput?.value.trim() || "匿名",
            contact: contactInput?.value.trim() || "",
            contactPublicConsent: Boolean(contactPublic?.checked),
            turnstileToken: widget.token
          })
        });
        if (!response.ok) {
          let errorMessage = "提交失败";
          try {
            const data = (await response.json()) as { error?: string };
            errorMessage = data.error || errorMessage;
          } catch {
            // Keep the generic error message for non-JSON responses.
          }
          throw new Error(errorMessage);
        }

        const data = (await response.json()) as { issueUrl: string };
        if (signal.aborted) return;
        form.style.display = "none";
        if (success) success.style.display = "block";
        if (issueLink) {
          issueLink.href = data.issueUrl;
          issueLink.textContent = data.issueUrl;
        }
      } catch (error) {
        if (signal.aborted) return;
        setError(
          status,
          error instanceof Error ? error.message : "提交失败，请稍后重试。也可直接发送邮件至 submit@folderrewind.top"
        );
        submitButton.disabled = false;
        submitButton.textContent = "提交投稿";
        widget?.reset();
      }
    },
    { signal }
  );

  if (turnstileContainer) {
    try {
      widget = await mountTurnstile(turnstileContainer, signal, message => setError(status, message));
    } catch (error) {
      if (!signal.aborted) setError(status, "人机验证加载失败，请检查网络后重试");
    }
  }
  if (signal.aborted) {
    dispose();
    return () => undefined;
  }
  return dispose;
}
