import { isAnswerComplete, makeResult } from "./grading.js";
import type { Question, SelfAssessedAnswer, UserAnswer } from "./types.js";

export function escapeHtml(value: string): string {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

export function renderQuestionStem(question: Question): HTMLElement {
  const stem = document.createElement("div");
  stem.className = "plw-quiz-stem";
  stem.innerHTML = question.stemHtml;
  return stem;
}

export interface AnswerControlOptions {
  question: Question;
  answer: UserAnswer;
  locked: boolean;
  onAnswerChange: (answer: UserAnswer) => void;
  inputName?: string;
}

export function renderAnswerControl(options: AnswerControlOptions): HTMLElement {
  const { question, answer, locked, onAnswerChange, inputName = "answer" } = options;
  const fieldset = document.createElement("fieldset");
  fieldset.className = "plw-quiz-choice-group";
  const legend = document.createElement("legend");
  legend.className = "plw-quiz-choice-group__legend";
  legend.textContent = "请选择或填写答案：";
  fieldset.append(legend);

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  if (question.type === "single_choice" || question.type === "multiple_choice") {
    let currentMultiple: string[] = Array.isArray(answer) ? [...answer] : [];

    question.choices.forEach((choice, index) => {
      const badgeLetter = letters[index] ?? String(index + 1);
      const label = document.createElement("label");
      label.className = "plw-quiz-choice";
      const selected = Array.isArray(answer) ? answer.includes(choice.id) : answer === choice.id;
      if (selected) label.classList.add("is-selected");

      label.innerHTML = `
        <span class="plw-quiz-choice__badge">${badgeLetter}</span>
        <input type="${question.type === "single_choice" ? "radio" : "checkbox"}" name="${escapeHtml(
        inputName
      )}" value="${choice.id}" ${selected ? "checked" : ""} ${locked ? "disabled" : ""}>
        <div class="plw-quiz-choice__content">${choice.contentHtml}</div>
      `;

      label.querySelector("input")?.addEventListener("change", e => {
        if (question.type === "single_choice") {
          fieldset.querySelectorAll(".plw-quiz-choice").forEach(c => c.classList.remove("is-selected"));
          label.classList.add("is-selected");
          onAnswerChange(choice.id);
        } else {
          const isChecked = (e.target as HTMLInputElement).checked;
          label.classList.toggle("is-selected", isChecked);
          if (isChecked) {
            if (!currentMultiple.includes(choice.id)) {
              currentMultiple = [...currentMultiple, choice.id];
            }
          } else {
            currentMultiple = currentMultiple.filter(item => item !== choice.id);
          }
          const finalAnswer = currentMultiple.length ? currentMultiple : null;
          onAnswerChange(finalAnswer);
        }
      });
      fieldset.append(label);
    });
  } else if (question.type === "true_false") {
    const optionsList = [
      { label: "正确", value: true, badge: "A" },
      { label: "错误", value: false, badge: "B" }
    ];
    optionsList.forEach(item => {
      const label = document.createElement("label");
      label.className = "plw-quiz-choice";
      const selected = answer === item.value;
      if (selected) label.classList.add("is-selected");

      label.innerHTML = `
        <span class="plw-quiz-choice__badge">${item.badge}</span>
        <input type="radio" name="${escapeHtml(inputName)}" ${selected ? "checked" : ""} ${locked ? "disabled" : ""}>
        <div class="plw-quiz-choice__content">${item.label}</div>
      `;
      label.querySelector("input")?.addEventListener("change", () => {
        fieldset.querySelectorAll(".plw-quiz-choice").forEach(c => c.classList.remove("is-selected"));
        label.classList.add("is-selected");
        onAnswerChange(item.value);
      });
      fieldset.append(label);
    });
  } else if (question.type === "free_response") {
    const current: SelfAssessedAnswer = isSelfAssessedAnswer(answer) ? answer : { text: "", levelId: null };
    const textarea = document.createElement("textarea");
    textarea.className = "plw-quiz-free-response-input";
    textarea.rows = question.response.rows ?? 8;
    textarea.maxLength = question.response.maxChars ?? 20000;
    textarea.placeholder = question.response.placeholder ?? "请写下你的答案……";
    textarea.value = current.text;
    textarea.disabled = locked;
    textarea.setAttribute("aria-label", "文字答案");
    const updateText = () => onAnswerChange({ text: textarea.value, levelId: current.levelId });
    textarea.addEventListener("input", updateText);
    const wrap = document.createElement("div");
    wrap.className = "plw-quiz-free-response-wrap";
    wrap.append(textarea);

    const reference = document.createElement("details");
    reference.className = "plw-quiz-self-assessment__reference";
    reference.innerHTML = `<summary>查看参考答案</summary><div>${
      question.referenceAnswerHtml ?? question.solutionHtml
    }</div>`;
    wrap.append(reference);

    const rubric = document.createElement("div");
    rubric.className = "plw-quiz-self-assessment";
    rubric.innerHTML = "<strong>完成作答后，请根据参考答案选择自评：</strong>";
    question.grading.rubric.forEach(level => {
      const label = document.createElement("label");
      label.className = "plw-quiz-self-assessment__option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `${inputName}-level`;
      input.value = level.id;
      input.checked = current.levelId === level.id;
      input.disabled = locked;
      input.addEventListener("change", () => onAnswerChange({ text: textarea.value, levelId: level.id }));
      label.append(input, document.createTextNode(` ${level.label}`));
      rubric.append(label);
    });
    wrap.append(rubric);
    fieldset.append(wrap);
  } else {
    const current = isNumericAnswer(answer) ? answer : { value: "", unit: "" };
    const wrap = document.createElement("div");
    wrap.className = "plw-quiz-numeric-wrap";

    const input = document.createElement("input");
    input.className = "plw-quiz-numeric-input";
    input.type = "text";
    input.inputMode = "decimal";
    input.placeholder = "输入数值计算结果";
    input.value = current.value;
    input.disabled = locked;
    input.setAttribute("aria-label", "数值答案");

    const unit = document.createElement("select");
    unit.className = "plw-quiz-numeric-unit";
    unit.disabled = locked;
    unit.setAttribute("aria-label", "单位");
    unit.innerHTML = `<option value="">选择单位</option>${question.answer.unit.accepted
      .map(item => `<option ${current.unit === item ? "selected" : ""}>${escapeHtml(item)}</option>`)
      .join("")}`;

    const update = () => {
      const updatedAnswer = input.value.trim() ? { value: input.value, unit: unit.value } : null;
      onAnswerChange(updatedAnswer);
    };

    input.addEventListener("input", update);
    unit.addEventListener("change", update);
    wrap.append(input, unit);
    fieldset.append(wrap);
  }

  return fieldset;
}

function isSelfAssessedAnswer(answer: UserAnswer): answer is SelfAssessedAnswer {
  return Boolean(
    answer &&
      typeof answer === "object" &&
      !Array.isArray(answer) &&
      "text" in answer &&
      typeof answer.text === "string" &&
      "levelId" in answer
  );
}

function isNumericAnswer(answer: UserAnswer): answer is { value: string; unit?: string } {
  return Boolean(
    answer &&
      typeof answer === "object" &&
      !Array.isArray(answer) &&
      "value" in answer &&
      typeof answer.value === "string"
  );
}

export function renderHints(question: Question): HTMLElement | null {
  if (!question.hintsHtml || question.hintsHtml.length === 0) return null;
  const hints = document.createElement("details");
  hints.className = "plw-quiz-hints";
  hints.innerHTML = `<summary><span>💡 查看解题提示 (${
    question.hintsHtml.length
  })</span></summary><div class="plw-quiz-hints__body">${question.hintsHtml
    .map((hint, index) => `<div><strong>提示 ${index + 1}</strong>${hint}</div>`)
    .join("")}</div>`;
  return hints;
}

export interface FeedbackOptions {
  question: Question;
  answer: UserAnswer;
  uncertain?: boolean;
  reportUrl?: string;
  showSolution?: boolean;
  announce?: boolean;
}

function answerLabel(question: Question, answer: UserAnswer): string {
  if (answer === null) return "未作答";
  if (question.type === "single_choice" || question.type === "multiple_choice") {
    const ids = Array.isArray(answer) ? answer : typeof answer === "string" ? [answer] : [];
    if (ids.length === 0) return "未作答";
    return `<ul class="plw-quiz-answer-list">${ids
      .map(id => {
        const index = question.choices.findIndex(choice => choice.id === id);
        const choice = question.choices[index];
        return `<li><strong>${index >= 0 ? `选项 ${String.fromCharCode(65 + index)}` : escapeHtml(id)}</strong>${
          choice ? choice.contentHtml : ""
        }</li>`;
      })
      .join("")}</ul>`;
  }
  if (question.type === "true_false") return answer === true ? "正确" : "错误";
  if (question.type === "free_response") {
    if (!isSelfAssessedAnswer(answer)) return "未作答";
    const level = question.grading.rubric.find(item => item.id === answer.levelId);
    return `<div class="plw-quiz-free-response-answer">${escapeHtml(
      answer.text || "未填写文字答案"
    )}<br><strong>自评：</strong>${escapeHtml(level?.label ?? "未完成自评")}</div>`;
  }
  if (!isNumericAnswer(answer)) return "未作答";
  return `${escapeHtml(answer.value || "未填写数值")}${
    answer.unit ? ` ${escapeHtml(answer.unit)}` : question.answer.unit.required ? "（未选择单位）" : ""
  }`;
}

export function renderFeedback(options: FeedbackOptions): HTMLElement {
  const { question, answer, uncertain = false, reportUrl, showSolution = true, announce = true } = options;
  const result = makeResult(question, answer, uncertain);
  const selfAssessed = question.type === "free_response";
  const area = document.createElement("div");
  area.className = `plw-quiz-feedback ${
    selfAssessed
      ? result.unanswered
        ? "is-unanswered"
        : "is-self-assessed"
      : result.correct
      ? "is-correct"
      : result.unanswered
      ? "is-unanswered"
      : "is-incorrect"
  }`;
  if (announce) area.setAttribute("role", "status");

  let targeted = "";
  if (question.feedback?.choicesHtml && (typeof answer === "string" || Array.isArray(answer))) {
    const selected = Array.isArray(answer) ? answer : [answer];
    const explanations = selected
      .map(id =>
        question.feedback?.choicesHtml?.[id]
          ? `<li><strong>${escapeHtml(id)}：</strong>${question.feedback.choicesHtml[id]}</li>`
          : ""
      )
      .filter(Boolean);
    if (explanations.length > 0)
      targeted = `<div class="plw-quiz-choice-feedback"><strong>所选选项解析：</strong><ul>${explanations.join(
        ""
      )}</ul></div>`;
  }

  const correctAnswer: UserAnswer =
    question.type === "single_choice"
      ? question.answer.choice
      : question.type === "multiple_choice"
      ? question.answer.choices
      : question.type === "true_false"
      ? question.answer.value
      : question.type === "free_response"
      ? { text: "", levelId: null }
      : {
          value: String(question.answer.value),
          unit: question.answer.unit.canonical ?? question.answer.unit.accepted[0] ?? ""
        };

  const solutionBlock = showSolution
    ? `<details class="plw-quiz-solution-details">
        <summary class="plw-quiz-solution-details__summary">
          <span class="plw-quiz-solution-details__title">📖 查看完整考点解析</span>
        </summary>
        <div class="plw-quiz-solution-details__body">
          <div class="plw-quiz-solution-text">${question.solutionHtml || "<p>暂无文字解析</p>"}</div>
        </div>
      </details>`
    : "";

  const defaultFeedback = selfAssessed
    ? "已记录你的自评，请结合参考答案和评分标准继续复习。"
    : result.correct
    ? "回答正确！"
    : "回答有误，请复习相关考点解析。";
  const feedbackHtml = result.correct
    ? question.feedback?.correctHtml ?? defaultFeedback
    : question.feedback?.incorrectHtml ?? defaultFeedback;

  const isSelfAssessed = question.type === "free_response";
  area.innerHTML = `
    <h3 tabindex="-1">${
      selfAssessed
        ? result.unanswered
          ? "待完成自评"
          : "已记录自评"
        : result.correct
        ? "回答正确"
        : result.unanswered
        ? "未作答"
        : "需要复习"
    }</h3>
    <div class="plw-quiz-answer-comparison">
      <div><strong>你的答案：</strong>${answerLabel(question, answer)}</div>
      ${
        isSelfAssessed
          ? `<div><strong>参考答案：</strong>${question.referenceAnswerHtml ?? question.solutionHtml}</div>`
          : `<div><strong>正确答案：</strong>${answerLabel(question, correctAnswer)}</div>`
      }
    </div>
    ${targeted}
    <div class="plw-quiz-feedback-text">${feedbackHtml}</div>
    ${solutionBlock}
  `;

  if (reportUrl) {
    const report = document.createElement("a");
    report.className = "plw-quiz-report";
    report.href = reportUrl;
    report.textContent = "发现题目有误？点击报告问题";
    area.append(report);
  }

  return area;
}

export function hydrateAssets(container: HTMLElement, questions: readonly Question[], manifestUrl: URL): void {
  const scopes: HTMLElement[] = container.dataset.questionId ? [container] : [];
  scopes.push(...Array.from(container.querySelectorAll<HTMLElement>("[data-question-id]")));
  for (const scope of scopes) {
    const question = questions.find(item => item.id === scope.dataset.questionId);
    if (!question) continue;
    for (const image of Array.from(scope.querySelectorAll<HTMLImageElement>("img[data-plw-asset]"))) {
      const relative = question.assets[image.dataset.plwAsset ?? ""];
      if (relative) image.src = new URL(relative, manifestUrl).href;
    }
  }
}
