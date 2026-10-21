import EasyMDE from "easymde";
import { sanitizePreviewHtml } from "./sanitizer.js";
import { loadPreviewMathJax } from "./math-preview.js";
import {
  renderAnswerControl,
  renderFeedback,
  renderQuestionStem,
  hydrateAssets
} from "../../quiz/src/question-renderer.js";
import { makeResult } from "../../quiz/src/grading.js";
import { newSeed, shuffle } from "../../quiz/src/random.js";
import { withShuffledChoices } from "../../quiz/src/selection.js";
import type { Question, UserAnswer } from "../../quiz/src/types.js";
import type { QuizSetSource } from "../../../contracts/envelope.js";

export function renderDraftMarkdown(value: unknown): string {
  const renderer = EasyMDE.prototype as unknown as { markdown(this: unknown, value: string): string };
  return sanitizePreviewHtml(
    renderer.markdown.call({ options: { renderingConfig: { singleLineBreaks: false } } }, String(value || ""))
  );
}

export function previewQuestion(id: string, q: Record<string, any>): Question {
  return {
    id,
    version: 1,
    status: "draft",
    type: q.type,
    choiceOrder: q.choice_order || (["single_choice", "multiple_choice"].includes(q.type) ? "shuffle" : "fixed"),
    topicIds: q.topics || [],
    conceptIds: q.concepts || [],
    objectiveIds: q.objectives || [],
    relatedPages: q.related_pages || [],
    stemHtml: renderDraftMarkdown(q.stem),
    solutionHtml: renderDraftMarkdown(q.solution),
    choices: q.choices?.map((c: any) => ({ id: c.id, contentHtml: renderDraftMarkdown(c.content) })),
    answer: q.answer,
    response: q.response
      ? {
          format: "plain_text",
          required: q.response.required,
          rows: q.response.rows,
          minChars: q.response.min_chars,
          maxChars: q.response.max_chars,
          placeholder: q.response.placeholder
        }
      : undefined,
    grading: q.grading,
    referenceAnswerHtml: renderDraftMarkdown(q.reference_answer),
    feedback: {
      correctHtml: renderDraftMarkdown(q.feedback?.correct),
      incorrectHtml: renderDraftMarkdown(q.feedback?.incorrect),
      choicesHtml: Object.fromEntries(
        Object.entries(q.feedback?.choices || {}).map(([k, v]) => [k, renderDraftMarkdown(v)])
      )
    },
    assets: {},
    hintsHtml: (q.hints || []).map(renderDraftMarkdown)
  } as Question;
}

export function trialSet(
  root: HTMLElement,
  source: QuizSetSource,
  catalog: Map<string, Question>,
  manifestUrl: URL,
  signal: AbortSignal,
  onExit: () => void
): void {
  const seed = newSeed();
  let questions = source.selection.items.map(item => {
    if (item.kind === "existing") {
      const q = catalog.get(item.questionId);
      if (!q || q.status !== "published") throw new Error("引用题目已不可用，请返回编排替换．");
      return q;
    }
    const q = source.newQuestions.find(entry => entry.clientId === item.clientId);
    if (!q) throw new Error("引用的新题不存在．");
    return previewQuestion(item.clientId, q.question);
  });
  if (!questions.length) throw new Error("请先加入题目．");
  questions = questions.map(q => withShuffledChoices(q, "contribution-preview", seed));
  if (source.selection.order === "shuffle") questions = shuffle(questions, seed);
  const answers = new Map<string, UserAnswer>();
  let index = 0,
    renderScope = new AbortController();
  const button = (label: string, action: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", action, { signal: renderScope.signal });
    return b;
  };
  const render = (results = false) => {
    renderScope.abort();
    renderScope = new AbortController();
    root.replaceChildren();
    root.append(
      button("返回题集编辑", () => {
        dispose();
        signal.removeEventListener("abort", dispose);
        onExit();
      })
    );
    const note = document.createElement("p");
    note.textContent = "题集试做仅在本页暂存，不写入学习记录．";
    root.append(note);
    if (results) {
      const summary = document.createElement("p");
      summary.textContent = `试做完成：${
        questions.filter(q => makeResult(q, answers.get(q.id) ?? null, false).correct).length
      } / ${questions.length} 题达到标准．`;
      root.append(summary);
      questions.forEach(q =>
        root.append(renderQuestionStem(q), renderFeedback({ question: q, answer: answers.get(q.id) ?? null }))
      );
    } else {
      const q = questions[index];
      const heading = document.createElement("h3");
      heading.textContent = `第 ${index + 1} / ${questions.length} 题`;
      root.append(heading);
      root.dataset.questionId = q.id;
      root.append(
        renderQuestionStem(q),
        renderAnswerControl({
          question: q,
          answer: answers.get(q.id) ?? null,
          inputName: "set-trial-answer",
          locked: false,
          onAnswerChange: value => answers.set(q.id, value)
        })
      );
      if (source.feedbackMode === "immediate")
        root.append(
          button("查看本题反馈", () => {
            root.append(renderFeedback({ question: q, answer: answers.get(q.id) ?? null }));
            typeset();
          })
        );
      if (index > 0)
        root.append(
          button("上一题", () => {
            index--;
            render();
          })
        );
      if (index + 1 < questions.length)
        root.append(
          button("下一题", () => {
            index++;
            render();
          })
        );
      root.append(button("交卷并查看结果", () => render(true)));
    }
    hydrateAssets(root, questions, manifestUrl);
    typeset();
  };
  const typeset = () => {
    void loadPreviewMathJax(signal)
      .then(m => {
        if (!signal.aborted && root.isConnected) return m.typesetPromise?.([root]);
      })
      .catch(() => {});
  };
  const dispose = () => renderScope.abort();
  signal.addEventListener("abort", dispose, { once: true });
  render();
}
