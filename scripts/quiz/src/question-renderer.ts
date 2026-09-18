import { isAnswerComplete, makeResult } from "./grading.js";
import type { Question, UserAnswer } from "./types.js";

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
  const legend = document.createElement("legend");
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
        <span class="plw-quiz-choice__content">${choice.contentHtml}</span>
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
        <span class="plw-quiz-choice__content">${item.label}</span>
      `;
      label.querySelector("input")?.addEventListener("change", () => {
        fieldset.querySelectorAll(".plw-quiz-choice").forEach(c => c.classList.remove("is-selected"));
        label.classList.add("is-selected");
        onAnswerChange(item.value);
      });
      fieldset.append(label);
    });
  } else {
    const current = typeof answer === "object" && answer && !Array.isArray(answer) ? answer : { value: "", unit: "" };
    const wrap = document.createElement("div");
    wrap.className = "plw-quiz-numeric-wrap";

    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.placeholder = "输入数值计算结果";
    input.value = current.value;
    input.disabled = locked;
    input.setAttribute("aria-label", "数值答案");

    const unit = document.createElement("select");
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

export function renderHints(question: Question): HTMLElement | null {
  if (!question.hintsHtml || question.hintsHtml.length === 0) return null;
  const hints = document.createElement("details");
  hints.className = "plw-quiz-hints";
  hints.innerHTML = `<summary>💡 查看解题提示 (${
    question.hintsHtml.length
  })</summary><div class="plw-quiz-hints__body">${question.hintsHtml
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
}

export function renderFeedback(options: FeedbackOptions): HTMLElement {
  const { question, answer, uncertain = false, reportUrl, showSolution = true } = options;
  const result = makeResult(question, answer, uncertain);
  const area = document.createElement("div");
  area.className = result.correct ? "plw-quiz-feedback is-correct" : "plw-quiz-feedback is-incorrect";
  area.setAttribute("role", "status");

  let targeted = "";
  if (question.feedback.choicesHtml && typeof answer === "string") {
    targeted = question.feedback.choicesHtml[answer]
      ? `<p><strong>针对你的选择：</strong>${question.feedback.choicesHtml[answer]}</p>`
      : "";
  }

  const solutionBlock = showSolution
    ? `<details>
        <summary>📖 查看完整考点解析</summary>
        <div style="margin-top: 0.5rem; line-height: 1.6;">${question.solutionHtml}</div>
      </details>`
    : "";

  area.innerHTML = `
    <h3>${result.correct ? "回答正确" : "需要复习"}</h3>
    ${targeted}
    <div class="plw-quiz-feedback-text">${
      result.correct ? question.feedback.correctHtml : question.feedback.incorrectHtml
    }</div>
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
