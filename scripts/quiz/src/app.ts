import { loadBundle, loadManifest, readParameters } from "./data.js";
import { isAnswerComplete, makeResult, summarizeObjectives } from "./grading.js";
import { typeset } from "./math.js";
import { newSeed } from "./random.js";
import { selectQuestions, selectRetry } from "./selection.js";
import { QuizStore } from "./storage.js";
import type { Attempt, Manifest, PageBundle, Question, QuizMode, Session, UserAnswer } from "./types.js";

declare global {
  interface Window {
    document$?: { subscribe(callback: () => void): { unsubscribe?: () => void } | void };
    __plwQuizDestroy?: () => void;
  }
}

class QuizApp {
  private readonly abort = new AbortController();
  private readonly store = new QuizStore(window.localStorage);
  private manifestUrl!: URL;
  private manifest!: Manifest;
  private bundle?: PageBundle;
  private questions: Question[] = [];
  private session?: Session;

  constructor(private readonly root: HTMLElement) {}

  destroy(): void {
    this.abort.abort();
    this.root.replaceChildren();
  }

  async start(): Promise<void> {
    this.renderStatus("正在加载题库……");
    try {
      this.manifestUrl = new URL(
        this.root.dataset.manifestUrl ?? "../_generated/question-bank/manifest.json",
        document.baseURI
      );
      this.manifest = await loadManifest(this.manifestUrl, this.abort.signal);
      const parameters = readParameters();
      if (!parameters.pageId && !parameters.mode) return this.renderLanding();
      if (!parameters.pageId || !parameters.mode || parameters.mode === "retry")
        return this.renderError("小测参数无效，请返回小测首页重新选择。");
      const page = this.manifest.pages[parameters.pageId];
      if (!page) return this.renderError("找不到指定学习页面的小测。");
      this.bundle = await loadBundle(this.manifestUrl, page.bundle, this.abort.signal);
      if (!this.bundle.preview && page.status !== "available")
        return this.renderConstruction(page.title, page.publishedQuestionCount);
      if (this.bundle.questions.length === 0) return this.renderConstruction(page.title, page.publishedQuestionCount);
      const seed = parameters.seed ?? newSeed();
      if (!parameters.seed) this.replaceQuery(parameters.pageId, parameters.mode, seed);
      this.questions = selectQuestions(this.bundle, parameters.mode, seed);
      this.session = this.restoreOrCreate(parameters.pageId, parameters.mode, seed);
      this.renderQuestion();
    } catch (error) {
      if (!this.abort.signal.aborted)
        this.renderError(`题库数据加载失败：${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  private renderLanding(): void {
    const container = document.createElement("section");
    container.className = "plw-quiz-landing";
    container.innerHTML =
      '<h2 tabindex="-1">知识小测</h2><p>选择一个已经开放或可预览的章节。作答记录仅保存在当前浏览器。</p>';
    if (this.manifest.preview)
      container.insertAdjacentHTML(
        "beforeend",
        '<p class="plw-quiz-preview" role="status">草稿预览模式：题目未经人工审核，不代表正式发布内容。</p>'
      );
    const list = document.createElement("ul");
    for (const [pageId, page] of Object.entries(this.manifest.pages)) {
      const item = document.createElement("li");
      const usable = page.status === "available" || (this.manifest.preview && page.previewQuestionCount > 0);
      if (usable) {
        const quick = this.quizLink(pageId, "quick", newSeed());
        const full = this.quizLink(pageId, "full", newSeed());
        const quickTitle = page.modes.quick?.title ?? "快速检查";
        const fullTitle = page.modes.full?.title ?? "完整小测";
        item.innerHTML = `<strong>${escapeHtml(page.title)}</strong> — <a data-no-instant href="${quick}">${escapeHtml(
          quickTitle
        )}</a> · <a data-no-instant href="${full}">${escapeHtml(fullTitle)}</a>`;
      } else {
        item.textContent = `${page.title}（题库建设中：${page.publishedQuestionCount}/24）`;
      }
      list.append(item);
    }
    container.append(list);
    const data = this.store.read();
    if (data.attempts.length)
      container.insertAdjacentHTML(
        "beforeend",
        `<p>本地最近完成：${data.attempts[0].score}/${data.attempts[0].total}</p>`
      );
    this.root.replaceChildren(container);
    container.querySelector<HTMLElement>("h2")?.focus();
  }

  private renderQuestion(): void {
    if (!this.session || !this.bundle) return;
    const question = this.questions[this.session.currentIndex];
    const answer = this.session.answers[question.id] ?? null;
    const locked = Boolean(this.session.locked[question.id]);
    const quick = this.session.mode === "quick" || this.session.mode === "retry";
    const modeTitle =
      this.session.mode === "retry"
        ? "错题重做"
        : this.bundle.blueprint.modes[this.session.mode]?.title ?? (quick ? "快速检查" : "完整小测");
    const section = document.createElement("section");
    section.className = "plw-quiz-question";
    section.dataset.questionId = question.id;
    section.innerHTML = `${
      this.bundle.preview ? '<p class="plw-quiz-preview" role="status">草稿预览：题目未经人工审核。</p>' : ""
    }<p>${escapeHtml(this.bundle.page.title)} · ${escapeHtml(modeTitle)}</p><progress value="${
      this.session.currentIndex + 1
    }" max="${this.questions.length}"></progress><p>${this.session.currentIndex + 1}/${
      this.questions.length
    }</p><h2 tabindex="-1">第 ${this.session.currentIndex + 1} 题</h2><div class="plw-quiz-stem">${
      question.stemHtml
    }</div>`;
    let confirmButton: HTMLButtonElement | undefined;
    section.append(
      this.answerControl(question, answer, locked, updatedAnswer => {
        if (confirmButton) confirmButton.disabled = !isAnswerComplete(question, updatedAnswer);
      })
    );
    const uncertainty = document.createElement("label");
    uncertainty.className = "plw-quiz-uncertain";
    uncertainty.innerHTML = `<input type="checkbox" ${this.session.uncertain[question.id] ? "checked" : ""} ${
      locked ? "disabled" : ""
    }> 我不确定`;
    uncertainty.querySelector("input")?.addEventListener("change", event => {
      this.session!.uncertain[question.id] = (event.target as HTMLInputElement).checked;
      this.persist();
    });
    section.append(uncertainty);
    if (question.hintsHtml.length) {
      const hints = document.createElement("details");
      hints.className = "plw-quiz-hints";
      hints.innerHTML = `<summary>查看提示</summary>${question.hintsHtml
        .map((hint, index) => `<div><strong>提示 ${index + 1}</strong>${hint}</div>`)
        .join("")}`;
      section.append(hints);
    }
    if (locked) section.append(this.feedback(question, answer));
    const actions = document.createElement("div");
    actions.className = "plw-quiz-actions";
    actions.append(this.button("上一题", () => this.move(-1), this.session.currentIndex === 0));
    if (quick && !locked) {
      confirmButton = this.button("确认答案", () => this.confirmQuick(question), !isAnswerComplete(question, answer));
      actions.append(confirmButton);
    } else if (this.session.currentIndex < this.questions.length - 1) {
      actions.append(this.button("下一题", () => this.move(1)));
    } else {
      actions.append(this.button(quick ? "查看结果" : "提交小测", () => this.submit(false)));
    }
    section.append(actions);
    if (!this.store.persistent)
      section.insertAdjacentHTML("beforeend", '<p role="status">浏览器存储不可用，本次进度不会持久保存。</p>');
    this.root.replaceChildren(section);
    this.hydrateAssets(section);
    section.querySelector<HTMLElement>("h2")?.focus();
    void typeset(section);
  }

  private answerControl(
    question: Question,
    answer: UserAnswer,
    locked: boolean,
    onAnswerChange: (answer: UserAnswer) => void
  ): HTMLElement {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = "请选择或填写答案";
    fieldset.append(legend);
    if (question.type === "single_choice" || question.type === "multiple_choice") {
      for (const choice of question.choices) {
        const label = document.createElement("label");
        label.className = "plw-quiz-choice";
        const selected = Array.isArray(answer) ? answer.includes(choice.id) : answer === choice.id;
        label.innerHTML = `<input type="${
          question.type === "single_choice" ? "radio" : "checkbox"
        }" name="answer" value="${choice.id}" ${selected ? "checked" : ""} ${locked ? "disabled" : ""}><span>${
          choice.contentHtml
        }</span>`;
        label.querySelector("input")?.addEventListener("change", () => {
          if (question.type === "single_choice") this.setAnswer(question.id, choice.id);
          else {
            const current = Array.isArray(this.session!.answers[question.id])
              ? (this.session!.answers[question.id] as string[])
              : [];
            this.setAnswer(
              question.id,
              selected ? current.filter(item => item !== choice.id) : [...current, choice.id]
            );
          }
        });
        fieldset.append(label);
      }
    } else if (question.type === "true_false") {
      for (const [labelText, value] of [
        ["正确", true],
        ["错误", false]
      ] as const) {
        const label = document.createElement("label");
        label.className = "plw-quiz-choice";
        label.innerHTML = `<input type="radio" name="answer" ${answer === value ? "checked" : ""} ${
          locked ? "disabled" : ""
        }><span>${labelText}</span>`;
        label.querySelector("input")?.addEventListener("change", () => this.setAnswer(question.id, value));
        fieldset.append(label);
      }
    } else {
      const current = typeof answer === "object" && answer && !Array.isArray(answer) ? answer : { value: "", unit: "" };
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "decimal";
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
        this.setAnswer(question.id, updatedAnswer, false);
        onAnswerChange(updatedAnswer);
      };
      input.addEventListener("input", update);
      unit.addEventListener("change", update);
      fieldset.append(input, unit);
    }
    return fieldset;
  }

  private feedback(question: Question, answer: UserAnswer): HTMLElement {
    const result = makeResult(question, answer, Boolean(this.session?.uncertain[question.id]));
    const area = document.createElement("div");
    area.className = result.correct ? "plw-quiz-feedback is-correct" : "plw-quiz-feedback is-incorrect";
    area.setAttribute("role", "status");
    let targeted = "";
    if (question.feedback.choicesHtml && typeof answer === "string")
      targeted = question.feedback.choicesHtml[answer] ?? "";
    area.innerHTML = `<h3>${result.correct ? "回答正确" : "需要复习"}</h3>${targeted}${
      result.correct ? question.feedback.correctHtml : question.feedback.incorrectHtml
    }<details><summary>查看解析</summary>${question.solutionHtml}</details>`;
    const report = document.createElement("a");
    report.className = "plw-quiz-report";
    report.href = this.reportLink(question);
    report.textContent = "报告这道题的问题";
    area.append(report);
    return area;
  }

  private confirmQuick(question: Question): void {
    if (!this.session || this.session.answers[question.id] == null) return;
    this.session.locked[question.id] = true;
    this.persist();
    this.renderQuestion();
  }

  private submit(confirmed: boolean): void {
    if (!this.session || !this.bundle) return;
    const unanswered = this.questions.filter(question => this.session!.answers[question.id] == null).length;
    if (unanswered && !confirmed && this.session.mode === "full") {
      const alert = document.createElement("div");
      alert.className = "plw-quiz-confirm";
      alert.setAttribute("role", "alert");
      alert.innerHTML = `<p>还有 ${unanswered} 道题未作答，提交后将计为错误。</p>`;
      alert.append(
        this.button("仍然提交", () => this.submit(true)),
        this.button("继续作答", () => this.renderQuestion())
      );
      this.root.replaceChildren(alert);
      return;
    }
    const results = this.questions.map(question =>
      makeResult(question, this.session!.answers[question.id] ?? null, Boolean(this.session!.uncertain[question.id]))
    );
    const score = results.filter(result => result.correct).length;
    const attempt: Attempt = {
      pageId: this.session.pageId,
      mode: this.session.mode,
      seed: this.session.seed,
      bankFingerprint: this.session.bankFingerprint,
      completedAt: new Date().toISOString(),
      score,
      total: results.length,
      questionResults: results
    };
    this.store.saveAttempt(attempt);
    this.renderResults(attempt);
  }

  private renderResults(attempt: Attempt): void {
    if (!this.bundle || !this.session) return;
    const section = document.createElement("section");
    section.className = "plw-quiz-results";
    section.innerHTML = `<h2 tabindex="-1">本次结果：${attempt.score}/${attempt.total}</h2><p>本结果只反映本次题组表现，不等同于正式考试成绩。</p>`;
    const summary = summarizeObjectives(attempt.questionResults);
    const list = document.createElement("ul");
    for (const objective of this.bundle.page.objectives) {
      const value = summary[objective.id];
      const item = document.createElement("li");
      if (!value) item.textContent = `${objective.title}：本次未覆盖`;
      else {
        const status =
          value.correct === value.total && value.uncertain === 0
            ? "本次表现良好"
            : value.correct / value.total >= 0.6
            ? "基本掌握，建议复习错题"
            : "需要复习";
        const link = new URL(`${this.bundle.page.url}#${objective.anchor}`, this.manifestUrl).href;
        item.innerHTML = `${escapeHtml(objective.title)}：${value.correct}/${
          value.total
        }，${status} <a href="${link}">回看</a>`;
      }
      list.append(item);
    }
    section.append(list);
    attempt.questionResults.forEach((result, index) => {
      const question = this.questions[index];
      const article = document.createElement("article");
      article.className = "plw-quiz-review";
      article.dataset.questionId = question.id;
      article.innerHTML = `<h3>第 ${index + 1} 题：${result.correct ? "正确" : result.unanswered ? "未作答" : "错误"}${
        result.uncertain ? "（不确定）" : ""
      }</h3>${question.stemHtml}`;
      article.append(this.feedback(question, result.answer));
      section.append(article);
    });
    const actions = document.createElement("div");
    actions.className = "plw-quiz-actions";
    const wrong = attempt.questionResults.filter(result => !result.correct).map(result => result.questionId);
    if (wrong.length) actions.append(this.button("只重做错题", () => this.startRetry(wrong)));
    actions.append(
      this.button("重做同一组", () => this.restart(false)),
      this.button("换一组题", () => this.restart(true))
    );
    const back = document.createElement("a");
    back.href = new URL(this.bundle.page.url, this.manifestUrl).href;
    back.textContent = "返回学习页面";
    actions.append(back);
    section.append(actions);
    this.root.replaceChildren(section);
    this.hydrateAssets(section);
    section.querySelector<HTMLElement>("h2")?.focus();
    void typeset(section);
  }

  private startRetry(ids: string[]): void {
    if (!this.bundle || !this.session) return;
    this.questions = selectRetry(this.bundle, ids, this.session.seed);
    this.session = this.newSession(this.session.pageId, "retry", this.session.seed);
    this.renderQuestion();
  }

  private restart(newGroup: boolean): void {
    if (!this.bundle || !this.session) return;
    const mode: "quick" | "full" = this.session.mode === "full" ? "full" : "quick";
    const seed = newGroup ? newSeed() : this.session.seed;
    this.questions = selectQuestions(this.bundle, mode, seed);
    this.session = this.newSession(this.session.pageId, mode, seed);
    this.replaceQuery(this.session.pageId, mode, seed);
    this.renderQuestion();
  }

  private move(delta: number): void {
    if (!this.session) return;
    this.session.currentIndex = Math.max(0, Math.min(this.questions.length - 1, this.session.currentIndex + delta));
    this.persist();
    this.renderQuestion();
  }

  private setAnswer(questionId: string, answer: UserAnswer, render = true): void {
    if (!this.session || this.session.locked[questionId]) return;
    this.session.answers[questionId] = answer;
    this.persist();
    if (render) this.renderQuestion();
  }

  private persist(): void {
    if (!this.session) return;
    this.session.updatedAt = new Date().toISOString();
    this.store.saveSession(this.session);
  }

  private restoreOrCreate(pageId: string, mode: QuizMode, seed: string): Session {
    const candidates = this.store.read().activeSessions[pageId] ?? [];
    const found = candidates.find(
      item =>
        item.mode === mode &&
        item.seed === seed &&
        item.bankFingerprint === this.bundle!.bankFingerprint &&
        item.questionRefs.every(reference =>
          this.questions.some(question => question.id === reference.id && question.version === reference.version)
        )
    );
    return found ?? this.newSession(pageId, mode, seed);
  }

  private newSession(pageId: string, mode: QuizMode, seed: string): Session {
    const now = new Date().toISOString();
    const session: Session = {
      pageId,
      mode,
      seed,
      bankFingerprint: this.bundle!.bankFingerprint,
      questionRefs: this.questions.map(({ id, version }) => ({ id, version })),
      answers: {},
      uncertain: {},
      locked: {},
      currentIndex: 0,
      startedAt: now,
      updatedAt: now
    };
    this.store.saveSession(session);
    return session;
  }

  private renderConstruction(title: string, count: number): void {
    this.root.innerHTML = `<section class="plw-quiz-empty"><h2 tabindex="-1">${escapeHtml(
      title
    )}题库正在建设</h2><p>目前有 ${count}/24 道已审核题目，暂未开启正式小测。</p><p><a href="${new URL(
      "./",
      document.baseURI
    )}">返回知识小测</a></p></section>`;
    this.root.querySelector<HTMLElement>("h2")?.focus();
  }

  private renderStatus(message: string): void {
    this.root.innerHTML = `<p role="status">${escapeHtml(message)}</p>`;
  }

  private renderError(message: string): void {
    this.root.innerHTML = `<div class="plw-quiz-error" role="alert"><h2>无法开始小测</h2><p>${escapeHtml(
      message
    )}</p><p><a href="${new URL("./", document.baseURI)}">返回知识小测</a></p></div>`;
  }

  private button(label: string, action: () => void, disabled = false): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", action);
    return button;
  }

  private quizLink(pageId: string, mode: "quick" | "full", seed: string): string {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ page_id: pageId, mode, seed }).toString();
    return url.href;
  }

  private reportLink(question: Question): string {
    const url = new URL("../../submit/", this.manifestUrl);
    url.search = new URLSearchParams({
      type: "errata",
      question_id: question.id,
      question_version: String(question.version),
      page_id: this.bundle?.page.id ?? "",
      title: `[题目勘误] ${question.id}`
    }).toString();
    return url.href;
  }

  private hydrateAssets(container: HTMLElement): void {
    if (!this.bundle) return;
    const scopes: HTMLElement[] = container.dataset.questionId ? [container] : [];
    scopes.push(...Array.from(container.querySelectorAll<HTMLElement>("[data-question-id]")));
    for (const scope of scopes) {
      const question = this.bundle.questions.find(item => item.id === scope.dataset.questionId);
      if (!question) continue;
      for (const image of Array.from(scope.querySelectorAll<HTMLImageElement>("img[data-plw-asset]"))) {
        const relative = question.assets[image.dataset.plwAsset ?? ""];
        if (relative) image.src = new URL(relative, this.manifestUrl).href;
      }
    }
  }

  private replaceQuery(pageId: string, mode: QuizMode, seed: string): void {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ page_id: pageId, mode, seed }).toString();
    history.replaceState(history.state, "", url);
  }
}

function escapeHtml(value: string): string {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function initialize(): void {
  window.__plwQuizDestroy?.();
  const root = document.querySelector<HTMLElement>("#plw-quiz-root");
  if (!root) {
    window.__plwQuizDestroy = undefined;
    return;
  }
  const app = new QuizApp(root);
  window.__plwQuizDestroy = () => app.destroy();
  void app.start();
}

if (window.document$) window.document$.subscribe(initialize);
else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
else initialize();
