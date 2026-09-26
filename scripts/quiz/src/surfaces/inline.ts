import { loadManifest, loadSetBundle, loadTaxonomyCatalog, resolveSiteUrl } from "../data.js";
import { createAbortScope } from "../abort-scope.js";
import { countProgress, isAnswerComplete, makeResult } from "../grading.js";
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
import { selectSetQuestions } from "../selection.js";
import { generateSessionId } from "../session.js";
import { QuizStore } from "../storage.js";
import type { Attempt, Manifest, Question, QuestionResult, SetBundle, TaxonomyCatalog, UserAnswer } from "../types.js";

export class InlineSurface {
  private readonly abort: AbortController;
  private readonly releaseAbortScope: () => void;
  private manifestUrl!: URL;
  private manifest!: Manifest;
  private bundle!: SetBundle;
  private questions: Question[] = [];
  private seed: string = newSeed();
  private sessionId: string = generateSessionId();
  private answers: Record<string, UserAnswer> = {};
  private locked: Record<string, boolean> = {};
  private submitted = false;
  private attemptSaved = false;
  private store!: QuizStore;

  constructor(private readonly root: HTMLElement, parentSignal: AbortSignal) {
    const scope = createAbortScope(parentSignal);
    this.abort = scope.controller;
    this.releaseAbortScope = scope.release;
  }

  async start(): Promise<void> {
    const setId = this.root.dataset.setId;
    if (!setId) return;

    try {
      const manifestPath = this.root.dataset.manifestUrl ?? resolveSiteUrl("_generated/question-bank/manifest.json");
      this.manifestUrl = new URL(manifestPath, window.location.href);
      this.manifest = await loadManifest(this.manifestUrl, this.abort.signal);
      this.store = new QuizStore(window.localStorage, this.manifest.preview);

      const setMeta = this.manifest.sets[setId];
      if (!setMeta) {
        this.renderNotice("未找到此自测集合", "error");
        return;
      }

      if (setMeta.status === "draft" && !this.manifest.preview) {
        // Do not render draft in production
        this.root.style.display = "none";
        return;
      }

      this.bundle = await loadSetBundle(this.manifestUrl, setMeta.bundle, this.abort.signal);
      if (!this.bundle.runnable) {
        this.renderNotice(this.bundle.unavailableReason ?? "当前自测题组暂不可用", "warning");
        return;
      }

      let taxonomy: TaxonomyCatalog | undefined;
      if (this.bundle.set.selection.type === "query" && this.manifest.catalogs.taxonomy) {
        try {
          taxonomy = await loadTaxonomyCatalog(this.manifestUrl, this.manifest.catalogs.taxonomy, this.abort.signal);
        } catch {
          // ignore
        }
      }

      if (this.abort.signal.aborted) return;
      this.questions = selectSetQuestions(this.bundle, this.seed, taxonomy);
      this.render();
    } catch (err) {
      if (this.abort.signal.aborted) return;
      this.renderNotice(`自测加载失败：${err instanceof Error ? err.message : String(err)}`, "error");
    }
  }

  destroy(): void {
    this.abort.abort();
    this.releaseAbortScope();
    this.root.innerHTML = "";
  }

  private render(): void {
    this.root.innerHTML = "";
    const container = document.createElement("section");
    container.className = "plw-quiz-inline";

    const title = this.root.dataset.title || this.bundle.set.title;
    const runnerUrl = `${resolveSiteUrl("quiz/play/")}?set=${encodeURIComponent(this.bundle.set.id)}`;

    // 1. Draft banner if preview
    if (this.bundle.preview && this.bundle.set.status === "draft") {
      const draftNotice = document.createElement("div");
      draftNotice.className = "plw-quiz-preview";
      draftNotice.textContent = "草稿预览：本组小测题目未经正式发布审核，仅供体验。";
      container.append(draftNotice);
    }

    // 2. Header
    const header = document.createElement("div");
    header.className = "plw-quiz-inline__header";
    header.innerHTML = `
      <div class="plw-quiz-inline__title-row">
        <h4>${escapeHtml(title)}</h4>
        <a class="plw-quiz-inline__runner-link" href="${escapeHtml(
          runnerUrl
        )}" target="_blank" rel="noopener">全屏作答 ↗</a>
      </div>
    `;
    container.append(header);

    // 3. UX Hint for long or deferred inline set
    if (this.questions.length > 4 || this.bundle.set.feedback_mode === "deferred") {
      const hint = document.createElement("div");
      hint.className = "plw-quiz-inline__hint";
      hint.innerHTML = `💡 提示：本自测包含 <strong>${this.questions.length}</strong> 道题目${
        this.bundle.set.feedback_mode === "deferred" ? "（整卷提交模式）" : ""
      }。建议在阅读完整体内容后，前往 <a href="${escapeHtml(runnerUrl)}">全屏答题运行器</a> 作答以获得更好的沉浸体验。`;
      container.append(hint);
    }

    // 4. Questions list
    const questionsContainer = document.createElement("div");
    questionsContainer.className = "plw-quiz-inline__questions";

    this.questions.forEach((question, index) => {
      const card = document.createElement("div");
      card.className = "plw-quiz-inline__card plw-quiz-question";
      card.dataset.questionId = question.id;

      const qHeader = document.createElement("div");
      qHeader.className = "plw-quiz-inline__q-header";
      qHeader.innerHTML = `<span class="plw-quiz-inline__q-num">第 ${index + 1} 题</span>`;
      card.append(qHeader);

      card.append(renderQuestionStem(question));

      const answer = this.answers[question.id] ?? null;
      const isLocked = Boolean(this.locked[question.id]) || this.submitted;

      const control = renderAnswerControl({
        question,
        answer,
        locked: isLocked,
        onAnswerChange: nextAnswer => {
          this.answers[question.id] = nextAnswer;
          if (checkBtn) {
            checkBtn.disabled = !isAnswerComplete(question, nextAnswer);
          }
        },
        inputName: `inline-${this.sessionId}-${question.id}`
      });
      card.append(control);

      const hints = renderHints(question);
      if (hints) card.append(hints);

      // Check button in immediate mode
      let checkBtn: HTMLButtonElement | undefined;
      if (this.bundle.set.feedback_mode === "immediate" && !isLocked) {
        checkBtn = document.createElement("button");
        checkBtn.type = "button";
        checkBtn.className = "plw-quiz-btn--primary plw-quiz-btn--sm plw-quiz-inline__check-btn";
        checkBtn.textContent = "检查答案";
        checkBtn.disabled = !isAnswerComplete(question, answer);
        checkBtn.addEventListener("click", () => {
          this.locked[question.id] = true;
          this.checkInlineCompletion();
          this.render();
        });
        card.append(checkBtn);
      }

      if (isLocked) {
        const feedback = renderFeedback({
          question,
          answer,
          showSolution: true
        });
        card.append(feedback);
      }

      questionsContainer.append(card);
    });

    container.append(questionsContainer);

    // 5. Footer actions
    const footer = document.createElement("div");
    footer.className = "plw-quiz-inline__footer";

    if (this.bundle.set.feedback_mode === "deferred" && !this.submitted) {
      const submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.className = "plw-quiz-btn--primary";
      submitBtn.textContent = "提交自测并查看结果";
      submitBtn.addEventListener("click", () => this.requestSubmit());
      footer.append(submitBtn);
    }

    if (this.isAllAnsweredOrChecked()) {
      const resultsBar = document.createElement("div");
      resultsBar.className = "plw-quiz-inline__summary";
      const results = this.questions.map(q => makeResult(q, this.answers[q.id] ?? null, false));
      const pointsEarned = results.reduce(
        (sum, result) => sum + (result.evaluation?.score ?? (result.correct ? 1 : 0)),
        0
      );
      const pointsAvailable = results.reduce((sum, result) => sum + (result.evaluation?.maxScore ?? 1), 0);
      const selfAssessedCount = results.filter(result => result.evaluation?.mode === "self_assessed").length;

      resultsBar.innerHTML = `
        <div class="plw-quiz-inline__score" tabindex="-1">自测完成：<strong>${pointsEarned} / ${pointsAvailable}</strong> 分${
        selfAssessedCount > 0 ? `（含 ${selfAssessedCount} 道自评题）` : ""
      }</div>
      `;

      const restartBtn = document.createElement("button");
      restartBtn.type = "button";
      restartBtn.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
      restartBtn.textContent = "重新自测";
      restartBtn.addEventListener("click", () => {
        this.seed = newSeed();
        this.sessionId = generateSessionId();
        this.answers = {};
        this.locked = {};
        this.submitted = false;
        this.attemptSaved = false;
        this.render();
      });
      resultsBar.append(restartBtn);
      footer.append(resultsBar);
    }

    container.append(footer);
    this.root.append(container);
    hydrateAssets(container, this.questions, this.manifestUrl);
    typeset(container);
  }

  private requestSubmit(): void {
    const progress = countProgress(this.questions, this.answers, {});
    const complete = () => {
      this.submitted = true;
      this.checkInlineCompletion();
      this.render();
      this.root.querySelector<HTMLElement>(".plw-quiz-inline__score")?.focus();
    };
    if (progress.unanswered === 0) {
      complete();
      return;
    }

    const returnFocus = document.activeElement as HTMLElement | null;
    const backdrop = document.createElement("div");
    backdrop.className = "plw-quiz-modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "plw-inline-submit-title");
    backdrop.innerHTML = `
      <div class="plw-quiz-modal">
        <h3 id="plw-inline-submit-title">提交前核对</h3>
        <p>已作答 <strong>${progress.answered}</strong> / ${this.questions.length} 题，仍有 <strong>${progress.unanswered}</strong> 题未作答。未作答题不会得分。</p>
        <div class="plw-quiz-modal__actions">
          <button type="button" class="plw-quiz-btn--secondary" data-plw-modal-cancel>返回作答</button>
          <button type="button" class="plw-quiz-btn--primary" data-plw-modal-confirm>确认提交</button>
        </div>
      </div>
    `;
    const close = () => {
      backdrop.remove();
      if (returnFocus?.isConnected) returnFocus.focus();
    };
    backdrop.querySelector("[data-plw-modal-cancel]")?.addEventListener("click", close);
    backdrop.querySelector("[data-plw-modal-confirm]")?.addEventListener("click", () => {
      backdrop.remove();
      complete();
    });
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) close();
    });
    backdrop.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "Tab") {
        const buttons = Array.from(backdrop.querySelectorAll<HTMLButtonElement>("button"));
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (event.shiftKey && current === 0) {
          event.preventDefault();
          buttons[buttons.length - 1].focus();
        } else if (!event.shiftKey && current === buttons.length - 1) {
          event.preventDefault();
          buttons[0].focus();
        }
      }
    });
    this.root.append(backdrop);
    backdrop.querySelector<HTMLButtonElement>("[data-plw-modal-cancel]")?.focus();
  }

  private isAllAnsweredOrChecked(): boolean {
    if (this.submitted) return true;
    return this.questions.every(q => Boolean(this.locked[q.id]));
  }

  private checkInlineCompletion(): void {
    if (!this.isAllAnsweredOrChecked() || this.attemptSaved) return;
    this.attemptSaved = true;

    // Record attempt idempotently
    const questionResults: QuestionResult[] = this.questions.map(q => {
      const ans = this.answers[q.id] ?? null;
      return makeResult(q, ans, false);
    });
    const score = questionResults.filter(r => r.correct).length;
    const pointsEarned = questionResults.reduce(
      (sum, result) => sum + (result.evaluation?.score ?? (result.correct ? 1 : 0)),
      0
    );
    const pointsAvailable = questionResults.reduce((sum, result) => sum + (result.evaluation?.maxScore ?? 1), 0);
    const selfAssessedCount = questionResults.filter(result => result.evaluation?.mode === "self_assessed").length;
    const pageId = this.root.dataset.pageId;

    const attempt: Attempt = {
      sessionId: this.sessionId,
      source: { type: "set", id: this.bundle.set.id },
      seed: this.seed,
      bankFingerprint: this.bundle.bankFingerprint,
      completedAt: new Date().toISOString(),
      score,
      total: this.questions.length,
      pointsEarned,
      pointsAvailable,
      selfAssessedCount,
      questionResults,
      context: { surface: "inline", pageId }
    };
    this.store.saveAttempt(attempt);
  }

  private renderNotice(message: string, severity: "warning" | "error"): void {
    this.root.innerHTML = `
      <div class="plw-quiz-inline-diagnostic ${severity}">
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }
}
