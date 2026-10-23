import { createEditor, createEditorToolbar, type EditorHandle } from "./editor.js";
import { queryInRoot } from "./dom.js";
import { createVerification, type VerificationHandle } from "./verification.js";
import { parsePairs } from "./parse-pairs.js";
import type { FeatureDisposer, FeatureMountContext } from "./types.js";

import { createSubmissionClient, mountSourceDeclaration, sourceDeclaration } from "./submission-client.js";
import { mountQuestionDraft } from "./question-draft.js";
import { numericAnswer, mountNumericPreview } from "./numeric-fields.js";
import { validateQuestion } from "../../../contracts/validation.js";
import type { NewSetQuestion } from "../../../contracts/envelope.js";
import { loadRevisionContext, populateQuestionForm } from "./revision-context.js";
import { mountQuestionTopics, questionTopicError, restoreQuestionTopics } from "./question-topics.js";

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
  form.querySelectorAll<HTMLElement>(".q-submit-free-only").forEach(element => {
    element.hidden = typeSelect.value !== "free_response";
  });

  const numeric = typeSelect.value === "numeric";
  form.querySelectorAll<HTMLElement>(".q-submit-numeric-only").forEach(node => {
    node.hidden = !numeric;
  });
  const tolerance = form.querySelector<HTMLInputElement>("#q-submit-tolerance");
  if (tolerance) tolerance.required = numeric;
  const answerInput = form.querySelector<HTMLInputElement>("#q-submit-answer");
  if (!answerInput) return;
  answerInput.required = typeSelect.value !== "free_response";
  answerInput.hidden = typeSelect.value === "free_response";
  const answerLabel = form.querySelector<HTMLElement>("#q-submit-answer-label");
  if (answerLabel) answerLabel.hidden = typeSelect.value === "free_response";
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

export async function mountQuestionEditor(
  root: ParentNode,
  { signal }: FeatureMountContext,
  options?: {
    initial?: NewSetQuestion;
    fields?: Record<string, string | boolean>;
    onSave: (question: Record<string, unknown>, declaration: NewSetQuestion["sourceDeclaration"]) => void;
  }
): Promise<FeatureDisposer> {
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
  const taxonomyPromise = mountQuestionTopics(form, signal);

  const client = createSubmissionClient(form, signal, { editorOnly: Boolean(options) });
  mountSourceDeclaration(form, signal);
  if (options?.initial) client.setQuestionSource(options.initial.question);
  let draft: ReturnType<typeof mountQuestionDraft> | undefined;
  let stemEditor: EditorHandle | undefined;
  let solutionEditor: EditorHandle | undefined;
  let widget: VerificationHandle | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", dispose);
    draft?.dispose();
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

  if (!options && stemEditor && solutionEditor)
    draft = mountQuestionDraft(form, { "q-submit-stem": stemEditor, "q-submit-solution": solutionEditor }, signal);
  mountNumericPreview(form, signal);
  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();
      if (submitButton.disabled) return;
      status.textContent = "";
      status.className = "";

      const topicError = questionTopicError(form);
      if (topicError) {
        setError(status, topicError);
        form.querySelector<HTMLSelectElement>("#q-submit-subtopic")?.focus();
        return;
      }

      const stem = stemEditor?.instance.value().trim() || stemTextarea.value.trim();
      const solution = solutionEditor?.instance.value().trim() || solutionTextarea.value.trim();
      const type = typeSelect.value;
      if (!stem || !solution || !type) {
        setError(status, "请完整填写题型、题干与参考解析");
        return;
      }

      const licenseCheck = form.querySelector<HTMLInputElement>("#q-submit-license");
      if (!options && !licenseCheck?.checked) {
        setError(status, "请确认您有权按 CC BY-SA 4.0 协议分享本题目");
        return;
      }
      if (!options && !widget?.token) {
        setError(status, "请完成人机验证");
        return;
      }

      const answerInput = form.querySelector<HTMLInputElement>("#q-submit-answer");
      const answerText = answerInput?.value.trim() ?? "";
      let answer: Record<string, unknown> | undefined;
      let choices: Array<{ id: string; content: string }> | undefined;
      let questionPayloadGrading:
        | { mode: "self_assessed"; rubric: Array<{ id: string; label: string; points: number }> }
        | undefined;
      try {
        if (type === "single_choice" || type === "multiple_choice") {
          const rawChoices = form.querySelector<HTMLTextAreaElement>("#q-submit-choices")?.value.trim() ?? "";
          const choiceMap = parsePairs(rawChoices, "选项");
          const choiceIds = Object.keys(choiceMap);
          if (
            choiceIds.length < (type === "multiple_choice" ? 3 : 2) ||
            choiceIds.length > (type === "multiple_choice" ? 8 : 6)
          )
            throw new Error(type === "multiple_choice" ? "多选题需要 3 到 8 个选项" : "单选题需要 2 到 6 个选项");
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
            if (correctChoices.length < 2 || new Set(correctChoices).size !== correctChoices.length)
              throw new Error("多选题必须指定至少两个不重复的正确答案");
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
          answer = numericAnswer(form);
        } else if (type === "free_response") {
          const rawRubric = form.querySelector<HTMLTextAreaElement>("#q-submit-rubric")?.value.trim() ?? "";
          const rubric = rawRubric
            .split(/\r?\n/)
            .filter(Boolean)
            .map(line => {
              const [id, label, rawPoints] = line.split("|").map(value => value.trim());
              const points = Number(rawPoints);
              if (!id || !label || !Number.isFinite(points) || points < 0 || points > 1) {
                throw new Error("自评评分标准格式应为「ID|名称|0 到 1 的分数」");
              }
              return { id, label, points };
            });
          if (rubric.length < 2 || rubric.length > 5) throw new Error("自评评分标准需要 2 到 5 个等级");
          questionPayloadGrading = { mode: "self_assessed", rubric };
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

      const selectedTopic = form.querySelector<HTMLInputElement>("#q-submit-topic")?.value.trim();
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
              alt: form.querySelector<HTMLInputElement>("#q-submit-img-alt")?.value.trim() || "",
              rights_note: form.querySelector<HTMLInputElement>("#q-submit-img-rights")?.value.trim() || ""
            }
          ]
        : [];
      externalMedia.push(...(client.additionalMedia() as typeof externalMedia));
      const questionPayload = {
        type,
        stem,
        choices,
        answer,
        response:
          type === "free_response" ? { format: "plain_text", required: true, rows: 8, max_chars: 20000 } : undefined,
        grading: type === "free_response" ? questionPayloadGrading : undefined,
        reference_answer: type === "free_response" ? solution : undefined,
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
        external_media: externalMedia.length ? externalMedia : undefined,
        ...client.questionExtras(type)
      };

      if (options) {
        const error = validateQuestion(JSON.parse(JSON.stringify(questionPayload)));
        if (error) {
          setError(status, error);
          return;
        }
        options.onSave(questionPayload, sourceDeclaration(form));
        return;
      }
      const titlePreview =
        stem
          .replace(/[#*`$\n]/g, " ")
          .trim()
          .slice(0, 40) || "物理小测题目";
      const submittedDraft = draft?.snapshot();
      submitButton.disabled = true;
      submitButton.textContent = "正在提交题目...";
      try {
        const data = await client.submit({
          type: "question",
          payload: { title: "[题目] " + titlePreview, content: stem, attribution, question: questionPayload },
          licenseConsent: Boolean(licenseCheck?.checked),
          sourceDeclaration: sourceDeclaration(form),
          turnstileToken: widget!.token!
        });
        if (data.operationState === "processing") {
          status.textContent = "正在确认提交结果，请保存管理回执后查询；题目草稿继续保留．";
          submitButton.disabled = false;
          submitButton.textContent = "查询后重试原提交";
          widget?.reset();
          return;
        }
        if (signal.aborted) return;
        if (submittedDraft) draft?.clearSubmitted(submittedDraft);
        form.style.display = "none";
        if (success) success.style.display = "block";
        if (issueLink && data.issueUrl) {
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

  if (!options && turnstileContainer)
    widget = createVerification(
      turnstileContainer,
      signal,
      message => setError(status, message),
      () => {
        status.textContent = "";
        status.className = "";
      },
      "submit-question"
    );
  const turnstilePromise = widget?.ready ?? Promise.resolve();
  await Promise.all([taxonomyPromise, turnstilePromise]);
  if (!options && stemEditor && solutionEditor)
    await loadRevisionContext(
      form,
      client,
      { "q-submit-stem": stemEditor, "q-submit-solution": solutionEditor },
      signal
    );
  if (options && stemEditor && solutionEditor) {
    const editors = { "q-submit-stem": stemEditor, "q-submit-solution": solutionEditor };
    if (options.initial) {
      populateQuestionForm(form, editors, options.initial.question, String(options.initial.question.attribution || ""));
      for (const [key, value] of Object.entries(options.initial.sourceDeclaration)) {
        const id = { kind: "kind", note: "note", source: "url", permission: "permission" }[key];
        const input = form.querySelector<HTMLInputElement>("#submission-source-" + id);
        if (input) {
          input.value = value;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }
    for (const [id, value] of Object.entries(options.fields || {})) {
      const input = form.querySelector<HTMLInputElement>("#" + id);
      if (!input) continue;
      if (id in editors) editors[id as keyof typeof editors].instance.value(String(value));
      else if (input.type === "checkbox") input.checked = Boolean(value);
      else input.value = String(value);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (options.fields && ("q-submit-topic" in options.fields || "q-submit-topic-root" in options.fields)) {
      restoreQuestionTopics(form, options.fields);
    }
    submitButton.textContent = "保存到新题池";
    const license = form.querySelector<HTMLInputElement>("#q-submit-license");
    if (license) {
      license.required = false;
      license.closest("label")!.hidden = true;
    }
    for (const editor of Object.values(editors))
      editor.instance.codemirror.on("change", () => {
        stemTextarea.value = stemEditor!.instance.value();
        solutionTextarea.value = solutionEditor!.instance.value();
        form.dispatchEvent(new Event("input", { bubbles: true }));
      });
  }
  if (signal.aborted) {
    dispose();
    return () => undefined;
  }
  return dispose;
}

export async function mount(root: ParentNode, context: FeatureMountContext): Promise<FeatureDisposer> {
  return mountQuestionEditor(root, context);
}
