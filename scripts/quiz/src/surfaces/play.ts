import { resolveSiteUrl } from "../data.js";
import { createAbortScope } from "../abort-scope.js";
import { countProgress, isAnswerComplete, makeResult, summarizeConcepts, summarizeObjectives } from "../grading.js";
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
import { createSession, findRestorableSession, inspectSessionStatus } from "../session.js";
import type { QuizStore } from "../storage.js";
import type {
  Attempt,
  Question,
  QuestionResult,
  QuizSource,
  Session,
  SetBundle,
  TaxonomyCatalog,
  UserAnswer
} from "../types.js";

export interface PlaySurfaceOptions {
  root: HTMLElement;
  manifestUrl: URL;
  bundle: SetBundle;
  questions: Question[];
  taxonomy?: TaxonomyCatalog;
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
  private readonly taxonomy?: TaxonomyCatalog;
  private readonly seed: string;
  private readonly source: QuizSource;
  private readonly store: QuizStore;
  private readonly abort: AbortController;
  private readonly releaseAbortScope: () => void;
  private readonly onExit: () => void;
  private readonly onRestart: (newSeed: string) => void;
  private readonly onAdhoc?: (adhocBundle: SetBundle, questions: Question[]) => void;

  private session!: Session;
  private confirmButtonElement?: HTMLButtonElement;

  constructor(options: PlaySurfaceOptions) {
    this.root = options.root;
    this.manifestUrl = options.manifestUrl;
    this.bundle = options.bundle;
    this.questions = options.questions;
    this.taxonomy = options.taxonomy;
    this.seed = options.seed;
    this.source = options.source;
    this.store = options.store;
    const scope = createAbortScope(options.signal);
    this.abort = scope.controller;
    this.releaseAbortScope = scope.release;
    this.onExit = options.onExit;
    this.onRestart = options.onRestart;
    this.onAdhoc = options.onAdhoc;

    document.addEventListener("keydown", this.handleKeyDown, { signal: this.abort.signal });
  }

  start(): void {
    if (this.source.type !== "set") {
      this.startFresh();
      return;
    }

    const status = inspectSessionStatus(
      this.store.getActiveSessions(this.source),
      this.source,
      this.seed,
      this.bundle.bankFingerprint,
      this.bundle.selectionAlgorithmVersion,
      this.questions
    );

    if (status.status === "restorable") {
      this.session = status.session;
      this.root.classList.add("plw-quiz-in-progress");
      this.renderQuestion();
    } else if (status.status === "stale") {
      this.renderStaleNotice(status.reason, status.session);
    } else {
      this.startFresh();
    }
  }

  private startFresh(): void {
    this.session = createSession(
      this.source,
      this.seed,
      this.bundle.bankFingerprint,
      this.bundle.selectionAlgorithmVersion,
      this.bundle.preview,
      this.questions,
      { surface: "runner" }
    );
    if (this.source.type === "set") {
      this.store.saveSession(this.session);
    }
    this.root.classList.add("plw-quiz-in-progress");
    this.renderQuestion();
  }

  private renderStaleNotice(reason: string, staleSession: Session): void {
    this.root.innerHTML = "";
    const container = document.createElement("div");
    container.className = "plw-quiz-runner";

    const answeredCount = Object.values(staleSession.answers).filter(v => v != null).length;
    const isRunnable = this.bundle.runnable;

    container.innerHTML = `
      <div class="plw-quiz-error" role="alert" style="max-width: 600px; margin: 2rem auto;">
        <h2>作答进度已失效</h2>
        <p>你之前在此测试中已作答 <strong>${answeredCount}</strong> / ${
      staleSession.questionRefs.length
    } 题，但由于<strong>${escapeHtml(reason)}</strong>，先前的本地作答记录已不能继续恢复。</p>
        ${
          !isRunnable
            ? `<p class="plw-quiz-badge--warning">当前测试集合暂不可用（${escapeHtml(
                this.bundle.unavailableReason ?? ""
              )}），无法重新开始。</p>`
            : ""
        }
        <div class="plw-quiz-modal__actions" style="margin-top: 1.5rem; justify-content: center; gap: 1rem;">
          <button type="button" class="plw-quiz-btn--primary" id="plw-btn-restart-force" ${
            !isRunnable ? "disabled" : ""
          }>
            清空旧进度并重新开始
          </button>
          <button type="button" class="plw-quiz-btn--secondary" id="plw-btn-exit-stale">
            返回小测发现页
          </button>
        </div>
      </div>
    `;

    container.querySelector("#plw-btn-restart-force")?.addEventListener("click", () => {
      this.store.discardSession(this.source, this.seed);
      this.startFresh();
    });

    container.querySelector("#plw-btn-exit-stale")?.addEventListener("click", () => {
      this.store.discardSession(this.source, this.seed);
      this.onExit();
    });

    this.root.append(container);
  }

  destroy(): void {
    this.abort.abort();
    this.releaseAbortScope();
    this.root.classList.remove("plw-quiz-in-progress");
  }

  private persist(): void {
    if (!this.session || this.source.type !== "set") return;
    this.session.updatedAt = new Date().toISOString();
    this.store.saveSession(this.session);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    if (!target || !this.root.contains(target)) return;
    if (this.session?.state === "completed") return;

    if (event.key === "Escape") {
      const modal = this.root.querySelector<HTMLElement>(".plw-quiz-modal-backdrop");
      if (modal) {
        event.preventDefault();
        modal.querySelector<HTMLButtonElement>("[data-plw-modal-cancel]")?.click();
        return;
      }
      event.preventDefault();
      this.handleExit();
      return;
    }

    if (this.root.querySelector(".plw-quiz-modal-backdrop")) return;
    if (!this.session || this.questions.length === 0) return;
    const question = this.questions[this.session.currentIndex];
    if (!question) return;

    if (target.closest('button, a, input, select, textarea, summary, [contenteditable="true"]')) return;
    const locked = Boolean(this.session.locked[question.id]);
    const immediate = this.bundle.set.feedback_mode === "immediate";

    // 1. ArrowLeft / ArrowRight navigation
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

    // 2. Enter key for confirm or next / submit
    if (event.key === "Enter") {
      event.preventDefault();
      if (immediate && !locked) {
        const answer = this.session.answers[question.id] ?? null;
        if (isAnswerComplete(question, answer)) {
          this.confirmImmediate(question);
        }
      } else if (this.session.currentIndex < this.questions.length - 1) {
        this.move(1);
      } else {
        this.requestSubmit();
      }
      return;
    }

    // 3. Option shortcuts (A-D, 1-4)
    if (!locked) {
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

    const container = document.createElement("section");
    container.className = "plw-quiz-runner plw-quiz-question";
    container.dataset.questionId = question.id;

    // 1. Header with Title, Mode Badge, and Exit CTA
    const header = document.createElement("header");
    header.className = "plw-quiz-header";

    const previewBanner = this.bundle.preview
      ? `<div class="plw-quiz-preview" role="note">草稿预览模式：当前小测包含未发布草稿内容，作答仅供检查</div>`
      : "";

    const feedbackText = this.bundle.set.feedback_mode === "immediate" ? "即时反馈" : "整卷提交";
    header.innerHTML = `
      ${previewBanner}
      <div class="plw-quiz-header__meta">
        <strong>${escapeHtml(this.bundle.set.title)}</strong>
        <span class="plw-quiz-badge-tag">${escapeHtml(feedbackText)}</span>
      </div>
      <div class="plw-quiz-header__status">
        <span class="plw-quiz-progress-text">${this.session.currentIndex + 1} / ${this.questions.length}</span>
        <button type="button" class="plw-quiz-btn--secondary plw-quiz-btn--sm" id="plw-btn-exit">保存并退出</button>
      </div>
    `;

    header.querySelector("#plw-btn-exit")?.addEventListener("click", () => this.handleExit());
    container.append(header);

    // 2. Segmented Stepper Bar
    const stepper = document.createElement("nav");
    stepper.className = "plw-quiz-stepper";
    stepper.setAttribute("aria-label", "题目导航");

    this.questions.forEach((q, idx) => {
      const stepBtn = document.createElement("button");
      stepBtn.type = "button";
      stepBtn.className = "plw-quiz-step-btn";
      if (idx === this.session.currentIndex) stepBtn.classList.add("is-current");
      if (this.session.answers[q.id] != null) stepBtn.classList.add("is-answered");
      if (this.session.uncertain[q.id]) stepBtn.classList.add("is-uncertain");

      if (this.session.locked[q.id]) {
        const res = makeResult(q, this.session.answers[q.id] ?? null, false);
        stepBtn.classList.add(res.correct ? "is-correct" : "is-incorrect");
      }

      stepBtn.textContent = String(idx + 1);
      stepBtn.setAttribute("aria-label", `第 ${idx + 1} 题`);
      stepBtn.addEventListener("click", () => {
        this.session.currentIndex = idx;
        this.persist();
        this.renderQuestion();
      });
      stepper.append(stepBtn);
    });
    container.append(stepper);

    // 3. Question Meta Bar (Type tag + Decoupled Uncertainty Pill)
    const typeLabels: Record<string, string> = {
      single_choice: "单选题",
      multiple_choice: "多选题",
      true_false: "判断题",
      numeric: "填空计算题",
      free_response: "自由作答题"
    };
    const typeTitle = typeLabels[question.type] ?? "题目";

    const metaBar = document.createElement("div");
    metaBar.className = "plw-quiz-meta-bar";

    const typeInfo = document.createElement("div");
    typeInfo.className = "plw-quiz-type-info";
    typeInfo.innerHTML = `
      <span class="plw-quiz-type-tag">${typeTitle}</span>
      <h2 tabindex="-1" style="display:inline; margin: 0; font-size: 1.25rem;">第 ${
        this.session.currentIndex + 1
      } 题</h2>
    `;
    metaBar.append(typeInfo);

    const locked = Boolean(this.session.locked[question.id]);
    const uncertainty = document.createElement("label");
    uncertainty.className = "plw-quiz-uncertainty-pill";
    uncertainty.innerHTML = `<input type="checkbox" ${this.session.uncertain[question.id] ? "checked" : ""} ${
      locked ? "disabled" : ""
    }><span>🤔 标记存疑</span>`;
    uncertainty.querySelector("input")?.addEventListener("change", event => {
      const checked = (event.target as HTMLInputElement).checked;
      this.session.uncertain[question.id] = checked;
      this.persist();
      const currentBtn = stepper.children[this.session.currentIndex] as HTMLElement | undefined;
      currentBtn?.classList.toggle("is-uncertain", checked);
    });
    metaBar.append(uncertainty);
    container.append(metaBar);

    // 4. Question Body (Stem & Answer Controls)
    const body = document.createElement("main");
    body.className = "plw-quiz-question-card";

    // Question stem
    body.append(renderQuestionStem(question));

    // Answer controls
    const answer = this.session.answers[question.id] ?? null;
    const immediate = this.bundle.set.feedback_mode === "immediate";

    const control = renderAnswerControl({
      question,
      answer,
      locked,
      onAnswerChange: nextAnswer => {
        this.setAnswer(question.id, nextAnswer, false);
        const currentBtn = stepper.children[this.session.currentIndex] as HTMLElement | undefined;
        currentBtn?.classList.toggle("is-answered", nextAnswer != null);
      }
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

    // 5. Actions Bar
    const actions = document.createElement("div");
    actions.className = "plw-quiz-actions";

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
        confirmBtn.textContent = "检查答案 (Enter)";
        confirmBtn.disabled = !isAnswerComplete(question, answer);
        confirmBtn.addEventListener("click", () => this.confirmImmediate(question));
        this.confirmButtonElement = confirmBtn;
        actions.append(confirmBtn);
      } else if (this.session.currentIndex < this.questions.length - 1) {
        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "plw-quiz-btn--primary";
        nextBtn.textContent = "下一题 (Enter)";
        nextBtn.addEventListener("click", () => this.move(1));
        actions.append(nextBtn);
      } else {
        const submitBtn = document.createElement("button");
        submitBtn.type = "button";
        submitBtn.className = "plw-quiz-btn--primary";
        submitBtn.textContent = "查看结果";
        submitBtn.addEventListener("click", () => this.requestSubmit());
        actions.append(submitBtn);
      }
    } else {
      // Deferred mode
      if (this.session.currentIndex < this.questions.length - 1) {
        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "plw-quiz-btn--primary";
        nextBtn.textContent = "下一题 (Enter)";
        nextBtn.addEventListener("click", () => this.move(1));
        actions.append(nextBtn);
      }
      const submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.className =
        this.session.currentIndex === this.questions.length - 1 ? "plw-quiz-btn--primary" : "plw-quiz-btn--secondary";
      submitBtn.textContent = "完成并交卷";
      submitBtn.addEventListener("click", () => this.requestSubmit());
      actions.append(submitBtn);
    }

    container.append(actions);

    this.root.append(container);
    hydrateAssets(container, this.questions, this.manifestUrl);
    typeset(container);
    container.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }

  private requestSubmit(): void {
    const progress = countProgress(this.questions, this.session.answers, this.session.uncertain);
    if (this.bundle.set.feedback_mode === "immediate" && progress.unanswered === 0 && progress.uncertain === 0) {
      this.submit();
      return;
    }

    const returnFocus = document.activeElement as HTMLElement | null;
    const backdrop = document.createElement("div");
    backdrop.className = "plw-quiz-modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "plw-submit-modal-title");

    const reviewIndex = this.questions.findIndex(
      question =>
        !isAnswerComplete(question, this.session.answers[question.id] ?? null) || this.session.uncertain[question.id]
    );
    backdrop.innerHTML = `
      <div class="plw-quiz-modal">
        <h3 id="plw-submit-modal-title">交卷前核对</h3>
        <p>已作答 <strong>${progress.answered}</strong> / ${this.questions.length} 题，未作答 <strong>${
      progress.unanswered
    }</strong> 题，标记存疑 <strong>${progress.uncertain}</strong> 题。${
      progress.unanswered > 0 ? "未作答题将计为未答，不获得分数。" : ""
    }</p>
        <div class="plw-quiz-modal__actions">
          ${
            reviewIndex >= 0
              ? '<button type="button" class="plw-quiz-btn--secondary" id="plw-submit-review">前往待处理题</button>'
              : ""
          }
          <button type="button" class="plw-quiz-btn--secondary" data-plw-modal-cancel>继续作答</button>
          <button type="button" class="plw-quiz-btn--primary" id="plw-submit-confirm">确认交卷</button>
        </div>
      </div>
    `;
    const close = () => {
      backdrop.remove();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
    backdrop.querySelector("[data-plw-modal-cancel]")?.addEventListener("click", close);
    backdrop.querySelector("#plw-submit-review")?.addEventListener("click", () => {
      backdrop.remove();
      this.session.currentIndex = reviewIndex;
      this.persist();
      this.renderQuestion();
    });
    backdrop.querySelector("#plw-submit-confirm")?.addEventListener("click", () => {
      backdrop.remove();
      this.submit();
    });
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) close();
    });
    this.root.append(backdrop);
    this.focusModal(backdrop, backdrop.querySelector<HTMLButtonElement>("#plw-submit-review, [data-plw-modal-cancel]"));
  }

  private focusModal(backdrop: HTMLElement, initial: HTMLButtonElement | null): void {
    backdrop.addEventListener("keydown", event => {
      if (event.key !== "Tab") return;
      const buttons = Array.from(backdrop.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
      if (buttons.length === 0) return;
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (event.shiftKey && current <= 0) {
        event.preventDefault();
        buttons[buttons.length - 1].focus();
      } else if (!event.shiftKey && current === buttons.length - 1) {
        event.preventDefault();
        buttons[0].focus();
      }
    });
    initial?.focus();
  }

  private submit(): void {
    const questionResults: QuestionResult[] = this.questions.map(q => {
      const answer = this.session.answers[q.id] ?? null;
      const uncertain = Boolean(this.session.uncertain[q.id]);
      return makeResult(q, answer, uncertain);
    });

    const score = questionResults.filter(r => r.correct).length;
    const pointsEarned = questionResults.reduce(
      (sum, result) => sum + (result.evaluation?.score ?? (result.correct ? 1 : 0)),
      0
    );
    const pointsAvailable = questionResults.reduce((sum, result) => sum + (result.evaluation?.maxScore ?? 1), 0);
    const selfAssessedCount = questionResults.filter(result => result.evaluation?.mode === "self_assessed").length;
    const attempt: Attempt = {
      sessionId: this.session.sessionId,
      source: this.session.source,
      seed: this.session.seed,
      bankFingerprint: this.session.bankFingerprint,
      completedAt: new Date().toISOString(),
      score,
      total: this.questions.length,
      pointsEarned,
      pointsAvailable,
      selfAssessedCount,
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

    const pointsEarned = attempt.pointsEarned ?? attempt.score;
    const pointsAvailable = attempt.pointsAvailable ?? attempt.total;
    const percent = pointsAvailable > 0 ? Math.round((pointsEarned / pointsAvailable) * 100) : 0;
    const conceptSummary = summarizeConcepts(attempt.questionResults);
    const objectiveSummary = summarizeObjectives(attempt.questionResults);
    const objectiveDetails = new Map(
      this.questions.flatMap(question => question.objectivesDetail ?? []).map(detail => [detail.id, detail] as const)
    );
    const answeredCount = attempt.questionResults.filter(result => !result.unanswered).length;
    const unansweredCount = attempt.total - answeredCount;
    const uncertainCount = attempt.questionResults.filter(result => result.uncertain).length;

    const incorrectResults = attempt.questionResults.filter(r => !r.correct && r.evaluation?.mode !== "self_assessed");
    const reviewSuggestions =
      answeredCount > 0
        ? Object.entries(objectiveSummary)
            .filter(([, stat]) => stat.correct < stat.total)
            .sort((a, b) => b[1].total - b[1].correct - (a[1].total - a[1].correct))
            .slice(0, 3)
            .map(([id]) => {
              const detail = objectiveDetails.get(id);
              if (!detail) return `<li>回顾本次答错题目的解析</li>`;
              const url = new URL(detail.url, this.manifestUrl);
              url.hash = detail.anchor;
              return `<li><a href="${escapeHtml(url.href)}">${escapeHtml(detail.title)}</a></li>`;
            })
            .join("")
        : "";

    let conceptsHtml = "";
    if (Object.keys(conceptSummary).length > 0) {
      conceptsHtml = `
        <div class="plw-quiz-result__breakdown">
          <h3>考查核心概念分布</h3>
          <div class="plw-quiz-result__summary-grid">
            ${Object.entries(conceptSummary)
              .map(
                ([cid, stat]) => `
                <div class="plw-quiz-result__summary-card">
                  <span class="plw-quiz-result__summary-id">${escapeHtml(
                    this.taxonomy?.concepts[cid]?.title ?? (cid === "other" ? "其他概念" : cid)
                  )}</span>
                  <span class="plw-quiz-result__summary-stat">${stat.correct} / ${
                  stat.total - stat.selfAssessed
                } 自动正确${stat.selfAssessed > 0 ? ` · ${stat.selfAssessed} 题自评` : ""}${
                  stat.uncertain > 0 ? ` (${stat.uncertain} 题存疑)` : ""
                }</span>
                </div>
              `
              )
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
              .map(
                ([oid, stat]) => `
                <div class="plw-quiz-result__summary-card">
                  <span class="plw-quiz-result__summary-id">${escapeHtml(
                    objectiveDetails.get(oid)?.title ?? (oid === "general" ? "综合学习目标" : oid)
                  )}</span>
                  <span class="plw-quiz-result__summary-stat">${stat.correct} / ${
                  stat.total - stat.selfAssessed
                } 自动正确${stat.selfAssessed > 0 ? ` · ${stat.selfAssessed} 题自评` : ""}${
                  stat.uncertain > 0 ? ` (${stat.uncertain} 题存疑)` : ""
                }</span>
                </div>
              `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <section class="plw-quiz-result__card">
        <h2 tabindex="-1">${escapeHtml(this.bundle.set.title)} — 测试完成</h2>
        <div class="plw-quiz-result__score-wrap">
          <div class="plw-quiz-result__score-circle">
            <span class="plw-quiz-result__score-value">${percent}%</span>
            <span class="plw-quiz-result__score-label">${pointsEarned} / ${pointsAvailable} 分${
      (attempt.selfAssessedCount ?? 0) > 0 ? `（含 ${attempt.selfAssessedCount} 道自评题）` : ""
    }</span>
          </div>
        </div>
        <p class="plw-quiz-result__progress">已作答 ${answeredCount} / ${
      attempt.total
    } 题 · 未作答 ${unansweredCount} 题 · 标记存疑 ${uncertainCount} 题</p>
        ${
          reviewSuggestions
            ? `<div class="plw-quiz-result__next"><h3>建议优先复习</h3><ul>${reviewSuggestions}</ul></div>`
            : ""
        }
        <div class="plw-quiz-result__actions plw-quiz-actions">
          <button type="button" class="plw-quiz-btn--primary" id="plw-btn-restart-new">再测一次（换一组题目）</button>
          <button type="button" class="plw-quiz-btn--secondary" id="plw-btn-restart-same">再做一次（同组题目）</button>
          ${
            incorrectResults.length > 0
              ? `<button type="button" class="plw-quiz-btn--danger" id="plw-btn-retry-wrong">重做错题与未答题 (${incorrectResults.length} 题)</button>`
              : ""
          }
          <button type="button" class="plw-quiz-btn--secondary" id="plw-btn-exit-landing">返回小测列表</button>
        </div>
        <details class="plw-quiz-result__details">
          <summary>查看完整知识点统计</summary>
          ${conceptsHtml}
          ${objectivesHtml}
        </details>
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
      const selfAssessed = result.evaluation?.mode === "self_assessed";
      itemCard.className = `plw-quiz-review-card ${
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
      itemCard.dataset.questionId = q.id;

      const badgeText = selfAssessed
        ? result.unanswered
          ? "待完成自评"
          : `已自评 ${result.evaluation?.score ?? 0} / ${result.evaluation?.maxScore ?? 1} 分`
        : result.correct
        ? "回答正确"
        : result.unanswered
        ? "未作答"
        : "回答错误";
      const uncertainBadge = result.uncertain ? `<span class="plw-quiz-badge--warning">作答时标记存疑</span>` : "";

      itemCard.innerHTML = `
        <div class="plw-quiz-review-card__header">
          <span class="plw-quiz-review-card__index">第 ${idx + 1} 题 (${q.id})</span>
          <span class="plw-quiz-badge ${
            selfAssessed
              ? result.unanswered
                ? "is-unanswered"
                : "is-self-assessed"
              : result.correct
              ? "is-correct"
              : result.unanswered
              ? "is-unanswered"
              : "is-incorrect"
          }">${badgeText}</span>
          ${uncertainBadge}
        </div>
      `;

      itemCard.append(renderQuestionStem(q));
      const feedback = renderFeedback({
        question: q,
        answer: result.answer,
        uncertain: result.uncertain,
        reportUrl: this.reportLink(q),
        showSolution: true,
        announce: false
      });
      itemCard.append(feedback);
      reviewList.append(itemCard);
    });

    this.root.append(container);
    hydrateAssets(container, this.questions, this.manifestUrl);
    typeset(container);
    container.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    container.scrollIntoView({ block: "start", behavior: "auto" });
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
    if (!this.session || this.source.type !== "set") {
      this.onExit();
      return;
    }
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
    const returnFocus = document.activeElement as HTMLElement | null;
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
        <button type="button" class="plw-quiz-btn--secondary" id="plw-exit-cancel" data-plw-modal-cancel>继续作答</button>
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

    const close = () => {
      backdrop.remove();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
    modal.querySelector("#plw-exit-cancel")?.addEventListener("click", close);

    backdrop.addEventListener("click", e => {
      if (e.target === backdrop) close();
    });

    this.root.append(backdrop);
    this.focusModal(backdrop, modal.querySelector<HTMLButtonElement>("#plw-exit-save"));
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
