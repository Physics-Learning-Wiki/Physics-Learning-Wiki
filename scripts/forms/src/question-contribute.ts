import { createEditor, createEditorToolbar, type EditorHandle } from "./editor.js";
import { queryInRoot } from "./dom.js";
import { mountTurnstile } from "./turnstile.js";
import { parsePairs } from "./parse-pairs.js";
import type { FeatureDisposer, FeatureMountContext, MountedTurnstile } from "./types.js";

const SUBMIT_ENDPOINT = "https://submit.folderrewind.top";

function setError(status: HTMLElement, message: string): void {
  status.textContent = message;
  status.className = "error";
}

function updateQuestionTypeUi(form: HTMLFormElement): void {
  const typeSelect = form.querySelector<HTMLSelectElement>("#q-submit-type");
  if (!typeSelect) return;
  const isChoice = typeSelect.value === "single_choice" || typeSelect.value === "multiple_choice";
  form.querySelectorAll<HTMLElement>(".q-submit-choice-only").forEach(element => {
    element.hidden = !isChoice;
  });

  const answerInput = form.querySelector<HTMLInputElement>("#q-submit-answer");
  if (!answerInput) return;
  if (typeSelect.value === "single_choice") {
    answerInput.placeholder = "填入正确选项大写字母，如 A";
  } else if (typeSelect.value === "multiple_choice") {
    answerInput.placeholder = "填入正确选项，以逗号分隔，如 A, C";
  } else if (typeSelect.value === "true_false") {
    answerInput.placeholder = "正确填 true，错误填 false";
  } else if (typeSelect.value === "numeric") {
    answerInput.placeholder = "填入有效数字（如 9.8 或 3.14）";
  }
}

function setAttribution(form: HTMLFormElement, signal: AbortSignal): void {
  const namedRadio = form.querySelector<HTMLInputElement>('input[name="q-attribution-type"][value="named"]');
  const anonymousRadio = form.querySelector<HTMLInputElement>('input[name="q-attribution-type"][value="anonymous"]');
  const attributionInput = form.querySelector<HTMLInputElement>("#q-submit-attribution");
  if (!namedRadio || !anonymousRadio || !attributionInput) return;

  const update = () => {
    if (anonymousRadio.checked) {
      attributionInput.disabled = true;
      attributionInput.value = "";
      attributionInput.placeholder = "将显示为「匿名同学」";
    } else {
      attributionInput.disabled = false;
      attributionInput.placeholder = "你希望在题目署名中显示的名称";
    }
  };
  namedRadio.addEventListener("change", update, { signal });
  anonymousRadio.addEventListener("change", update, { signal });
  update();
}

async function loadTaxonomyTopics(form: HTMLFormElement, signal: AbortSignal): Promise<void> {
  const topicSelect = form.querySelector<HTMLSelectElement>("#q-submit-topic");
  if (!topicSelect || signal.aborted) return;

  try {
    const manifestPath = form.dataset.manifestUrl ?? "../../_generated/question-bank/manifest.json";
    const manifestUrl = new URL(manifestPath, window.location.href);
    const response = await fetch(manifestUrl, { cache: "no-cache", signal });
    if (!response.ok || signal.aborted) return;
    const manifest = (await response.json()) as {
      catalogs?: { taxonomy?: string };
    };
    if (signal.aborted || !manifest.catalogs?.taxonomy) return;

    const taxonomyResponse = await fetch(new URL(manifest.catalogs.taxonomy, manifestUrl), { signal });
    if (!taxonomyResponse.ok || signal.aborted) return;
    const taxonomy = (await taxonomyResponse.json()) as {
      topics?: Record<string, { title?: string }>;
    };
    if (signal.aborted) return;

    topicSelect.innerHTML = '<option value="">-- 未指定（由维护者归类） --</option>';
    for (const [topicId, topic] of Object.entries(taxonomy.topics ?? {})) {
      const option = document.createElement("option");
      option.value = topicId;
      option.textContent = `${topic.title ?? topicId} (${topicId})`;
      topicSelect.append(option);
    }
  } catch {
    // Taxonomy is optional; leave the manual "unspecified" option available.
  }
}

export async function mount(root: ParentNode, { signal }: FeatureMountContext): Promise<FeatureDisposer> {
  const form = queryInRoot<HTMLFormElement>(root, "#plw-question-contribute-form");
  if (!form || signal.aborted) return () => undefined;

  const status = form.querySelector<HTMLElement>("#q-submit-status");
  const submitButton = form.querySelector<HTMLButtonElement>("#q-submit-btn");
  const stemTextarea = form.querySelector<HTMLTextAreaElement>("#q-submit-stem");
  const solutionTextarea = form.querySelector<HTMLTextAreaElement>("#q-submit-solution");
  const typeSelect = form.querySelector<HTMLSelectElement>("#q-submit-type");
  const turnstileContainer = form.querySelector<HTMLElement>("#turnstile-widget");
  const success = queryInRoot<HTMLElement>(root, "#q-submit-success");
  const issueLink = queryInRoot<HTMLAnchorElement>(root, "#q-submit-issue-link");
  if (!status || !submitButton || !stemTextarea || !solutionTextarea || !typeSelect) return () => undefined;

  let stemEditor: EditorHandle | undefined;
  let solutionEditor: EditorHandle | undefined;
  let widget: MountedTurnstile | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", dispose);
    widget?.dispose();
    solutionEditor?.dispose();
    stemEditor?.dispose();
  };
  signal.addEventListener("abort", dispose, { once: true });

  setAttribution(form, signal);
  typeSelect.addEventListener("change", () => updateQuestionTypeUi(form), { signal });
  updateQuestionTypeUi(form);

  const toolbar = createEditorToolbar(true);
  stemEditor = createEditor(
    stemTextarea,
    {
      spellChecker: false,
      placeholder: "输入题目题干，支持 Markdown 格式与 LaTeX 公式（如 $F=ma$）...",
      toolbar,
      renderingConfig: { singleLineBreaks: false, codeSyntaxHighlighting: true }
    },
    signal
  );
  solutionEditor = createEditor(
    solutionTextarea,
    {
      spellChecker: false,
      placeholder: "输入参考答案与考点深度解析，支持 LaTeX 公式推导...",
      toolbar,
      renderingConfig: { singleLineBreaks: false, codeSyntaxHighlighting: true }
    },
    signal
  );

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();
      status.textContent = "";
      status.className = "";

      const stem = stemEditor?.instance.value().trim() || stemTextarea.value.trim();
      const solution = solutionEditor?.instance.value().trim() || solutionTextarea.value.trim();
      const type = typeSelect.value;
      if (!stem || !solution || !type) {
        setError(status, "请完整填写题型、题干与参考解析");
        return;
      }

      const licenseCheck = form.querySelector<HTMLInputElement>("#q-submit-license");
      if (!licenseCheck?.checked) {
        setError(status, "请确认您有权按 CC BY-SA 4.0 协议分享本题目");
        return;
      }
      const contactInput = form.querySelector<HTMLInputElement>("#q-submit-contact");
      const contactPublic = form.querySelector<HTMLInputElement>("#q-submit-contact-public");
      if (contactInput?.value.trim() && !contactPublic?.checked) {
        setError(status, "若填写公开联系方式，请勾选同意公开展示");
        return;
      }
      if (!widget?.token) {
        setError(status, "请完成人机验证");
        return;
      }

      const answerInput = form.querySelector<HTMLInputElement>("#q-submit-answer");
      const answerText = answerInput?.value.trim() ?? "";
      let answer: Record<string, unknown> | undefined;
      let choices: Array<{ id: string; content: string }> | undefined;
      try {
        if (type === "single_choice" || type === "multiple_choice") {
          const rawChoices = form.querySelector<HTMLTextAreaElement>("#q-submit-choices")?.value.trim() ?? "";
          const choiceMap = parsePairs(rawChoices, "选项");
          const choiceIds = Object.keys(choiceMap);
          if (choiceIds.length < 2) throw new Error("选择题至少需要提供两个选项");
          choices = choiceIds.map(id => ({ id, content: choiceMap[id] }));
          if (type === "single_choice") {
            const choiceAnswer = answerText.toUpperCase();
            if (!choiceIds.includes(choiceAnswer)) {
              throw new Error(`正确答案「${choiceAnswer}」必须是选项列表中的某一项`);
            }
            answer = { choice: choiceAnswer };
          } else {
            const correctChoices = answerText
              .split(/[,，\s]+/)
              .map(value => value.trim().toUpperCase())
              .filter(Boolean);
            if (!correctChoices.length) throw new Error("多选题必须指定至少一个正确答案");
            for (const choice of correctChoices) {
              if (!choiceIds.includes(choice)) throw new Error(`正确答案「${choice}」不是有效选项`);
            }
            answer = { choices: correctChoices };
          }
        } else if (type === "true_false") {
          const lower = answerText.toLowerCase();
          if (lower !== "true" && lower !== "false") throw new Error("判断题答案必须填写 true 或 false");
          answer = { value: lower === "true" };
        } else if (type === "numeric") {
          const numericValue = Number(answerText);
          if (!Number.isFinite(numericValue)) throw new Error("数值计算题答案必须是有限数字");
          answer = {
            value: numericValue,
            tolerance: { type: "absolute", value: 0.01 },
            unit: { required: false, accepted: [] }
          };
        }
      } catch (error) {
        setError(status, error instanceof Error ? error.message : "答案或选项格式错误");
        return;
      }

      const correctFeedback = form.querySelector<HTMLInputElement>("#q-submit-correct-feedback")?.value.trim();
      const incorrectFeedback = form.querySelector<HTMLInputElement>("#q-submit-incorrect-feedback")?.value.trim();
      const rawChoiceFeedback = form.querySelector<HTMLTextAreaElement>("#q-submit-choice-feedback")?.value.trim();
      let choiceFeedback: Record<string, string> | undefined;
      if ((type === "single_choice" || type === "multiple_choice") && rawChoiceFeedback) {
        try {
          choiceFeedback = parsePairs(rawChoiceFeedback, "逐项反馈");
        } catch (error) {
          setError(status, error instanceof Error ? error.message : "逐项反馈格式错误");
          return;
        }
      }
      const feedback =
        correctFeedback || incorrectFeedback || choiceFeedback
          ? {
              ...(correctFeedback ? { correct: correctFeedback } : {}),
              ...(incorrectFeedback ? { incorrect: incorrectFeedback } : {}),
              ...(choiceFeedback ? { choices: choiceFeedback } : {})
            }
          : undefined;

      const selectedTopic = form.querySelector<HTMLSelectElement>("#q-submit-topic")?.value.trim();
      const rawConcepts = form.querySelector<HTMLInputElement>("#q-submit-concepts")?.value.trim() ?? "";
      const concepts = rawConcepts
        ? rawConcepts
            .split(/[,，\s]+/)
            .map(value => value.trim())
            .filter(Boolean)
        : undefined;
      const rawDifficulty = form.querySelector<HTMLSelectElement>("#q-submit-diff")?.value;
      const rawCognitive = form.querySelector<HTMLSelectElement>("#q-submit-cognitive")?.value;
      const rawStyle = form.querySelector<HTMLSelectElement>("#q-submit-style")?.value;
      const rawSeconds = form.querySelector<HTMLInputElement>("#q-submit-seconds")?.value;
      const anonymousRadio = form.querySelector<HTMLInputElement>(
        'input[name="q-attribution-type"][value="anonymous"]'
      );
      const attributionInput = form.querySelector<HTMLInputElement>("#q-submit-attribution");
      const attribution = anonymousRadio?.checked ? "匿名" : attributionInput?.value.trim() || "匿名";
      const imageUrl = form.querySelector<HTMLInputElement>("#q-submit-img-url")?.value.trim();
      const externalMedia = imageUrl
        ? [
            {
              url: imageUrl,
              alt: form.querySelector<HTMLInputElement>("#q-submit-img-alt")?.value.trim() || "题目插图",
              rights_note:
                form.querySelector<HTMLInputElement>("#q-submit-img-rights")?.value.trim() || "自主绘制 / 原创"
            }
          ]
        : undefined;
      const questionPayload = {
        type,
        stem,
        choices,
        answer,
        feedback,
        solution,
        topics: selectedTopic ? [selectedTopic] : undefined,
        concepts,
        difficulty: rawDifficulty ? Number(rawDifficulty) : undefined,
        cognitive_level: rawCognitive || undefined,
        style: rawStyle || undefined,
        estimated_seconds: rawSeconds ? Number(rawSeconds) : undefined,
        attribution,
        ai_assisted: Boolean(form.querySelector<HTMLInputElement>("#q-submit-ai")?.checked),
        external_media: externalMedia
      };

      const titlePreview =
        stem
          .replace(/[#*`$\n]/g, " ")
          .trim()
          .slice(0, 40) || "物理小测题目";
      submitButton.disabled = true;
      submitButton.textContent = "正在提交题目...";
      try {
        const response = await fetch(SUBMIT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            title: `[题目] ${titlePreview}`,
            content: stem,
            type: "question",
            typeLabel: "题目投稿",
            attribution,
            contact: contactInput?.value.trim() ?? "",
            contactPublicConsent: Boolean(contactPublic?.checked),
            question: questionPayload,
            turnstileToken: widget.token
          })
        });
        if (!response.ok) {
          let message = "提交失败";
          try {
            const data = (await response.json()) as { error?: string };
            message = data.error || message;
          } catch {
            // Use the generic error for non-JSON responses.
          }
          throw new Error(message);
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
        submitButton.textContent = "提交题目投稿";
        widget?.reset();
      }
    },
    { signal }
  );

  const taxonomyPromise = loadTaxonomyTopics(form, signal);
  const turnstilePromise = turnstileContainer
    ? mountTurnstile(turnstileContainer, signal, message => setError(status, message))
        .then(mounted => {
          if (signal.aborted) mounted?.dispose();
          else widget = mounted;
        })
        .catch(() => {
          if (!signal.aborted) setError(status, "人机验证加载失败，请检查网络后重试");
        })
    : Promise.resolve();
  await Promise.all([taxonomyPromise, turnstilePromise]);
  if (signal.aborted) {
    dispose();
    return () => undefined;
  }
  return dispose;
}
