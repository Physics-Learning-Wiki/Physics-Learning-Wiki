import { resolveSiteUrl } from "../data.js";
import { isAnswerComplete, makeResult, summarizeConcepts, summarizeObjectives } from "../grading.js";
import { typeset } from "../math.js";
import {
  escapeHtml,
  hydrateAssets,
  renderAnswerControl,
  renderFeedback,
  renderHints,
  renderQuestionStem
} from "../question-renderer.js";
import { newSeed } from "../random.js";
import { selectRetry } from "../selection.js";
import { createSession, findRestorableSession } from "../session.js";
import type { QuizStore } from "../storage.js";
import type { Attempt, Question, QuestionResult, QuizSource, Session, SetBundle, UserAnswer } from "../types.js";

export interface PlaySurfaceOptions {
  root: HTMLElement;
  manifestUrl: URL;
  bundle: SetBundle;
  questions: Question[];
  seed: string;
  source: QuizSource;
  store: QuizStore;
  signal: AbortSignal;
  onExit: () => void;
  onRestart: (newSeed: string) => void;
  onAdhoc?: (adhocBundle: SetBundle, questions: Question[]) => void;
}

export class PlaySurface {
  private readonly root: HTMLElement;
  private readonly manifestUrl: URL;
  private readonly bundle: SetBundle;
  private readonly questions: Question[];
  private readonly seed: string;
  private readonly source: QuizSource;
  private readonly store: QuizStore;
  private readonly signal: AbortSignal;
  private readonly onExit: () => void;
  private readonly onRestart: (newSeed: string) => void;
  private readonly onAdhoc?: (adhocBundle: SetBundle, questions: Question[]) => void;

  private session: Session;
  private confirmButtonElement?: HTMLButtonElement;

  constructor(options: PlaySurfaceOptions) {
    this.root = options.root;
    this.manifestUrl = options.manifestUrl;
    this.bundle = options.bundle;
    this.questions = options.questions;
    this.seed = options.seed;
    this.source = options.source;
    this.store = options.store;
    this.signal = options.signal;
    this.onExit = options.onExit;
    this.onRestart = options.onRestart;
    this.onAdhoc = options.onAdhoc;

    // Restore or create session
    const existing = findRestorableSession(
      this.store.getActiveSessions(this.source),
      this.source,
      this.seed,
      this.bundle.bankFingerprint,
      this.bundle.selectionAlgorithmVersion,
      this.questions
    );

    if (existing) {
      this.session = existing;
    } else {
      this.session = createSession(
        this.source,
        this.seed,
        this.bundle.bankFingerprint,
        this.bundle.selectionAlgorithmVersion,
        this.bundle.preview,
        this.questions,
        { surface: "runner" }
      );
      this.store.saveSession(this.session);
    }

    document.addEventListener("keydown", this.handleKeyDown, { signal: this.signal });
  }

  start(): void {
    this.root.classList.add("plw-quiz-in-progress");
    this.renderQuestion();
  }

  destroy(): void {
    this.root.classList.remove("plw-quiz-in-progress");
  }

  private persist(): void {
    this.session.updatedAt = new Date().toISOString();
    this.store.saveSession(this.session);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing) return;
    const target = event.target as HTMLElement | null;
    const isTextInput =
      target &&
      ((target.tagName === "INPUT" && (target as HTMLInputElement).type === "text") || target.tagName === "TEXTAREA");

    if (event.key === "Escape") {
      const modal = this.root.querySelector<HTMLElement>(".plw-quiz-modal-backdrop");
      if (modal) {
        event.preventDefault();
        modal.remove();
        return;
      }
      event.preventDefault();
      this.handleExit();
      return;
    }

    if (this.questions.length === 0) return;
    const question = this.questions[this.session.currentIndex];
    if (!question) return;

    const locked = Boolean(this.session.locked[question.id]);
    const immediate = this.bundle.set.feedback_mode === "immediate";

    // 1. ArrowLeft / ArrowRight navigation
    if (!isTextInput) {
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        if (this.session.currentIndex > 0) {
          event.preventDefault();
          this.move(-1);
          return;
        }
      }
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        if (this.session.currentIndex < this.questions.length - 1) {
          event.preventDefault();
          this.move(1);
          return;
        }
      }
    }

    // 2. Enter key for confirm or next / submit
    if (event.key === "Enter" && !isTextInput) {
      event.preventDefault();
      if (immediate && !locked) {
        const answer = this.session.answers[question.id] ?? null;
        if (isAnswerComplete(question, answer)) {
          this.confirmImmediate(question);
        }
      } else if (this.session.currentIndex < this.questions.length - 1) {
        this.move(1);
      } else {
        this.submit();
      }
      return;
    }

    // 3. Option shortcuts (A-D, 1-4)
    if (!isTextInput && !locked) {
      let selectedIndex = -1;
      const key = event.key.toUpperCase();
      if (key >= "A" && key <= "Z") {
        selectedIndex = key.charCodeAt(0) - 65;
      } else if (key >= "1" && key <= "9") {
        selectedIndex = parseInt(key, 10) - 1;
      }

      if (selectedIndex >= 0) {
        const choiceLabels = this.root.querySelectorAll<HTMLLabelElement>(".plw-quiz-choice");
        if (selectedIndex < choiceLabels.length) {
          event.preventDefault();
          const targetInput = choiceLabels[selectedIndex].querySelector<HTMLInputElement>("input");
          if (targetInput) {
            targetInput.click();
          }
        }
      }
    }
  };

  private move(delta: number): void {
    this.session.currentIndex = Math.max(0, Math.min(this.questions.length - 1, this.session.currentIndex + delta));
    this.persist();
    this.renderQuestion();
  }

  private setAnswer(questionId: string, answer: UserAnswer, render = true): void {
    if (this.session.locked[questionId]) return;
    this.session.answers[questionId] = answer;
    this.persist();
    if (render) {
      this.renderQuestion();
    } else {
      this.updateControlsState();
    }
  }

  private toggleUncertain(questionId: string): void {
    this.session.uncertain[questionId] = !this.session.uncertain[questionId];
    this.persist();
    this.renderQuestion();
  }

  private confirmImmediate(question: Question): void {
    this.session.locked[question.id] = true;
    this.persist();
    this.renderQuestion();
  }

  private updateControlsState(): void {
    const question = this.questions[this.session.currentIndex];
    if (!question) return;
    const answer = this.session.answers[question.id] ?? null;
    const complete = isAnswerComplete(question, answer);
    if (this.confirmButtonElement) {
      this.confirmButtonElement.disabled = !complete;
    }
  }

  private renderQuestion(): void {
    const question = this.questions[this.session.currentIndex];
    if (!question) return;

    this.root.innerHTML = "";

    const container = document.createElement("div");
    container.className = "plw-quiz-runner";
    container.dataset.questionId = question.id;

    // 1. Header
    const header = document.createElement("header");
    header.className = "plw-quiz-runner__header";

    const previewBanner = this.bundle.preview
      ? `<div class="plw-quiz-preview" role="note">草稿预览模式：当前小测包含未发布草稿内容，作答仅供检查</div>`
      : "";

    const feedbackText = this.bundle.set.feedback_mode === "immediate" ? "即时反馈" : "整卷提交";
    header.innerHTML = `
      ${previewBanner}
      <div class="plw-quiz-runner__title-row">
        <div>
          <h2 class="plw-quiz-runner__title">${escapeHtml(this.bundle.set.title)}</h2>
          <div class="plw-quiz-runner__meta">
            <span class="plw-quiz-badge">${feedbackText}</span>
            <span>题目 ${this.session.currentIndex + 1} / ${this.questions.length}</span>
          </div>
        </div>
        <button type="button" class="plw-quiz-btn--secondary plw-quiz-btn--sm" id="plw-btn-exit">保存并退出</button>
      </div>
    `;

    header.querySelector("#plw-btn-exit")?.addEventListener("click", () => this.handleExit());
    container.append(header);

    // 2. Stepper
    const stepper = document.createElement("nav");
    stepper.className = "plw-quiz-stepper";
    stepper.setAttribute("aria-label", "题目导航");

    this.questions.forEach((q, idx) => {
      const stepBtn = document.createElement("button");
      stepBtn.type = "button";
      stepBtn.className = "plw-quiz-stepper__item";
      if (idx === this.session.currentIndex) stepBtn.classList.add("is-current");
      if (this.session.answers[q.id] != null) stepBtn.classList.add("is-answered");
      if (this.session.uncertain[q.id]) stepBtn.classList.add("is-uncertain");

      if (this.session.locked[q.id]) {
        const res = makeResult(q, this.session.answers[q.id] ?? null, false);
        stepBtn.classList.add(res.correct ? "is-correct" : "is-incorrect");
      }

      stepBtn.textContent = String(idx + 1);
      stepBtn.setAttribute("aria-label", `跳转到第 ${idx + 1} 题`);
      stepBtn.addEventListener("click", () => {
        this.session.currentIndex = idx;
        this.persist();
        this.renderQuestion();
      });
      stepper.append(stepBtn);
    });
    container.append(stepper);

    // 3. Question Body
    const body = document.createElement("main");
    body.className = "plw-quiz-question-card";

    // Question stem
    body.append(renderQuestionStem(question));

    // Answer controls
    const answer = this.session.answers[question.id] ?? null;
    const locked = Boolean(this.session.locked[question.id]);
    const immediate = this.bundle.set.feedback_mode === "immediate";

    const control = renderAnswerControl({
      question,
      answer,
      locked,
      onAnswerChange: nextAnswer => this.setAnswer(question.id, nextAnswer, false)
    });
    body.append(control);

    // Hints
    const hints = renderHints(question);
    if (hints) body.append(hints);

    // Feedback (if locked in immediate mode)
    if (immediate && locked) {
      const feedback = renderFeedback({
        question,
        answer,
        uncertain: Boolean(this.session.uncertain[question.id]),
        reportUrl: this.reportLink(question),
        showSolution: true
      });
      body.append(feedback);
    }

    container.append(body);

    // 4. Footer controls
    const footer = document.createElement("footer");
    footer.className = "plw-quiz-runner__footer";

    // Uncertain checkbox
    const uncertainWrap = document.createElement("label");
    uncertainWrap.className = "plw-quiz-uncertain-toggle";
    uncertainWrap.innerHTML = `
      <input type="checkbox" ${this.session.uncertain[question.id] ? "checked" : ""}>
      <span>标记此题不确定</span>
    `;
    uncertainWrap.querySelector("input")?.addEventListener("change", () => this.toggleUncertain(question.id));
    footer.append(uncertainWrap);

    // Actions
    const actions = document.createElement("div");
    actions.className = "plw-quiz-runner__actions";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "plw-quiz-btn--secondary";
    prevBtn.textContent = "上一题";
    prevBtn.disabled = this.session.currentIndex === 0;
    prevBtn.addEventListener("click", () => this.move(-1));
    actions.append(prevBtn);

    if (immediate) {
      if (!locked) {
        const confirmBtn = document.createElement("button");
        confirmBtn.type = "button";
        confirmBtn.className = "plw-quiz-btn--primary";
        confirmBtn.textContent = "检查答案";
        confirmBtn.disabled = !isAnswerComplete(question, answer);
        confirmBtn.addEventListener("click", () => this.confirmImmediate(question));
        this.confirmButtonElement = confirmBtn;
        actions.append(confirmBtn);
      } else if (this.session.currentIndex < this.questions.length - 1) {
        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "plw-quiz-btn--primary";
        nextBtn.textContent = "下一题";
        nextBtn.addEventListener("click", () => this.move(1));
        actions.append(nextBtn);
      } else {
        const submitBtn = document.createElement("button");
        submitBtn.type = "button";
        submitBtn.className = "plw-quiz-btn--primary";
        submitBtn.textContent = "查看结果";
        submitBtn.addEventListener("click", () => this.submit());
        actions.append(submitBtn);
      }
    } else {
      // Deferred mode
      if (this.session.currentIndex < this.questions.length - 1) {
        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "plw-quiz-btn--primary";
        nextBtn.textContent = "下一题";
        nextBtn.addEventListener("click", () => this.move(1));
        actions.append(nextBtn);
      }
      const submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.className = this.session.currentIndex === this.questions.length - 1 ? "plw-quiz-btn--primary" : "plw-quiz-btn--secondary";
      submitBtn.textContent = "完成并交卷";
      submitBtn.addEventListener("click", () => this.submit());
      actions.append(submitBtn);
    }

    footer.append(actions);
    container.append(footer);

    this.root.append(container);
    hydrateAssets(container, this.questions, this.manifestUrl);
    typeset(container);
  }

  private submit(): void {
    const questionResults: QuestionResult[] = this.questions.map(q => {
      const answer = this.session.answers[q.id] ?? null;
      const uncertain = Boolean(this.session.uncertain[q.id]);
      return makeResult(q, answer, uncertain);
    });

    const score = questionResults.filter(r => r.correct).length;
    const attempt: Attempt = {
      sessionId: this.session.sessionId,
      source: this.session.source,
      seed: this.session.seed,
      bankFingerprint: this.session.bankFingerprint,
      completedAt: new Date().toISOString(),
      score,
      total: this.questions.length,
      questionResults,
      context: this.session.context
    };

    this.session.state = "completed";
    this.store.saveAttempt(attempt);
    this.renderResult(attempt);
  }

  private renderResult(attempt: Attempt): void {
    this.root.innerHTML = "";
    const container = document.createElement("div");
    container.className = "plw-quiz-result";

    const percent = Math.round((attempt.score / attempt.total) * 100);
    const conceptSummary = summarizeConcepts(attempt.questionResults);
    const objectiveSummary = summarizeObjectives(attempt.questionResults);

    const incorrectResults = attempt.questionResults.filter(r => !r.correct);

    let conceptsHtml = "";
    if (Object.keys(conceptSummary).length > 0) {
      conceptsHtml = `
        <div class="plw-quiz-result__breakdown">
          <h3>考查核心概念分布</h3>
          <div class="plw-quiz-result__summary-grid">
            ${Object.entries(conceptSummary)
              .map(([cid, stat]) => `
                <div class="plw-quiz-result__summary-card">
                  <span class="plw-quiz-result__summary-id">${escapeHtml(cid)}</span>
                  <span class="plw-quiz-result__summary-stat">${stat.correct} / ${stat.total} 正确${
                    stat.uncertain > 0 ? ` (${stat.uncertain} 题存疑)` : ""
                  }</span>
                </div>
              `)
              .join("")}
          </div>
        </div>
      `;
    }

    let objectivesHtml = "";
    if (Object.keys(objectiveSummary).length > 0) {
      objectivesHtml = `
        <div class="plw-quiz-result__breakdown">
          <h3>学习目标达成情况</h3>
          <div class="plw-quiz-result__summary-grid">
            ${Object.entries(objectiveSummary)
              .map(([oid, stat]) => `
                <div class="plw-quiz-result__summary-card">
                  <span class="plw-quiz-result__summary-id">${escapeHtml(oid)}</span>
                  <span class="plw-quiz-result__summary-stat">${stat.correct} / ${stat.total} 正确${
                    stat.uncertain > 0 ? ` (${stat.uncertain} 题存疑)` : ""
                  }</span>
                </div>
              `)
              .join("")}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <section class="plw-quiz-result__card">
        <h2>${escapeHtml(this.bundle.set.title)} — 测试完成</h2>
        <div class="plw-quiz-result__score-wrap">
          <div class="plw-quiz-result__score-circle">
            <span class="plw-quiz-result__score-value">${percent}%</span>
            <span class="plw-quiz-result__score-label">${attempt.score} / ${attempt.total} 题正确</span>
          </div>
        </div>
        ${conceptsHtml}
        ${objectivesHtml}
        <div class="plw-quiz-result__actions">
          <button type="button" class="plw-quiz-btn--primary" id="plw-btn-restart-new">再测一次（换一组题目）</button>
          <button type="button" class="plw-quiz-btn--secondary" id="plw-btn-restart-same">再做一次（同组题目）</button>
          ${
            incorrectResults.length > 0
              ? `<button type="button" class="plw-quiz-btn--danger" id="plw-btn-retry-wrong">重做本次错题 (${incorrectResults.length} 题)</button>`
              : ""
          }
          <button type="button" class="plw-quiz-btn--secondary" id="plw-btn-exit-landing">返回小测列表</button>
        </div>
      </section>

      <section class="plw-quiz-result__review">
        <h3>逐题回顾与考点解析</h3>
        <div class="plw-quiz-result__review-list"></div>
      </section>
    `;

    container.querySelector("#plw-btn-restart-new")?.addEventListener("click", () => {
      this.onRestart(newSeed());
    });

    container.querySelector("#plw-btn-restart-same")?.addEventListener("click", () => {
      this.onRestart(this.seed);
    });

    container.querySelector("#plw-btn-retry-wrong")?.addEventListener("click", () => {
      const wrongIds = incorrectResults.map(r => r.questionId);
      this.handleRetryWrong(wrongIds);
    });

    container.querySelector("#plw-btn-exit-landing")?.addEventListener("click", () => {
      this.onExit();
    });

    const reviewList = container.querySelector<HTMLElement>(".plw-quiz-result__review-list")!;
    attempt.questionResults.forEach((result, idx) => {
      const q = this.questions.find(item => item.id === result.questionId);
      if (!q) return;

      const itemCard = document.createElement("div");
      itemCard.className = `plw-quiz-review-card ${result.correct ? "is-correct" : "is-incorrect"}`;
      itemCard.dataset.questionId = q.id;

      const badgeText = result.correct ? "回答正确" : result.unanswered ? "未作答" : "回答错误";
      const uncertainBadge = result.uncertain ? `<span class="plw-quiz-badge--warning">作答时标记存疑</span>` : "";

      itemCard.innerHTML = `
        <div class="plw-quiz-review-card__header">
          <span class="plw-quiz-review-card__index">第 ${idx + 1} 题 (${q.id})</span>
          <span class="plw-quiz-badge ${result.correct ? "is-correct" : "is-incorrect"}">${badgeText}</span>
          ${uncertainBadge}
        </div>
      `;

      itemCard.append(renderQuestionStem(q));
      const feedback = renderFeedback({
        question: q,
        answer: result.answer,
        uncertain: result.uncertain,
        reportUrl: this.reportLink(q),
        showSolution: true
      });
      itemCard.append(feedback);
      reviewList.append(itemCard);
    });

    this.root.append(container);
    hydrateAssets(container, this.questions, this.manifestUrl);
    typeset(container);
  }

  private handleRetryWrong(wrongIds: string[]): void {
    const wrongQuestions = selectRetry(this.bundle.questions, wrongIds, this.bundle.set.id, newSeed());
    if (wrongQuestions.length === 0) {
      alert("错题已不可用或已更新");
      return;
    }

    const adhocBundle: SetBundle = {
      schemaVersion: 3,
      bankFingerprint: this.bundle.bankFingerprint,
      selectionAlgorithmVersion: 1,
      preview: this.bundle.preview,
      set: {
        schema_version: 1,
        id: `adhoc-${Date.now()}`,
        title: `错题重做 (${wrongQuestions.length} 题)`,
        description: `重做 ${this.bundle.set.title} 中回答错误的题目`,
        status: "published",
        feedback_mode: "immediate",
        selection: {
          type: "fixed",
          questions: wrongQuestions.map(q => q.id),
          order: "fixed"
        }
      },
      runnable: true,
      unavailableReason: null,
      questions: wrongQuestions
    };

    if (this.onAdhoc) {
      this.onAdhoc(adhocBundle, wrongQuestions);
    }
  }

  private handleExit(): void {
    const answeredCount = Object.keys(this.session.answers).filter(id => this.session.answers[id] != null).length;

    if (answeredCount === 0) {
      this.onExit();
      return;
    }

    this.showExitModal(answeredCount);
  }

  private showExitModal(answeredCount: number): void {
    const existingModal = this.root.querySelector<HTMLElement>(".plw-quiz-modal-backdrop");
    if (existingModal) existingModal.remove();

    const backdrop = document.createElement("div");
    backdrop.className = "plw-quiz-modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "plw-exit-modal-title");

    const modal = document.createElement("div");
    modal.className = "plw-quiz-modal";

    modal.innerHTML = `
      <h3 id="plw-exit-modal-title">退出本次小测？</h3>
      <p>当前已作答 <strong>${answeredCount}</strong> 道题目。你的作答进度已自动保存在本地浏览器中，你可以选择保存后退出，稍后随时返回继续作答，或放弃本次小测记录。</p>
      <div class="plw-quiz-modal__actions">
        <button type="button" class="plw-quiz-btn--primary" id="plw-exit-save">保存并退出</button>
        <button type="button" class="plw-quiz-btn--danger" id="plw-exit-discard">放弃作答并退出</button>
        <button type="button" class="plw-quiz-btn--secondary" id="plw-exit-cancel">继续作答</button>
      </div>
    `;

    backdrop.append(modal);

    modal.querySelector("#plw-exit-save")?.addEventListener("click", () => {
      this.persist();
      backdrop.remove();
      this.onExit();
    });

    modal.querySelector("#plw-exit-discard")?.addEventListener("click", () => {
      this.store.discardSession(this.session.source, this.session.seed);
      backdrop.remove();
      this.onExit();
    });

    modal.querySelector("#plw-exit-cancel")?.addEventListener("click", () => {
      backdrop.remove();
    });

    backdrop.addEventListener("click", e => {
      if (e.target === backdrop) backdrop.remove();
    });

    this.root.append(backdrop);
    modal.querySelector<HTMLButtonElement>("#plw-exit-save")?.focus();
  }

  private reportLink(question: Question): string {
    const url = new URL(resolveSiteUrl("submit/"), window.location.href);
    url.search = new URLSearchParams({
      type: "errata",
      question_id: question.id,
      question_version: String(question.version),
      set_id: this.bundle.set.id,
      title: `[题目勘误] ${question.id}`
    }).toString();
    return url.href;
  }
}
