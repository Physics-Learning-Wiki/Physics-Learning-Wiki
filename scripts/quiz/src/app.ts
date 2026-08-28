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

  constructor(private readonly root: HTMLElement) {
    this.root.addEventListener("click", this.handleClick, { signal: this.abort.signal });
    document.addEventListener("keydown", this.handleKeyDown, { signal: this.abort.signal });
  }

  private handleClick = (event: MouseEvent): void => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest<HTMLAnchorElement>("a");
    if (!anchor || !anchor.href) return;
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download")) return;

    let targetUrl: URL;
    let currentUrl: URL;
    try {
      targetUrl = new URL(anchor.href, window.location.href);
      currentUrl = new URL(window.location.href);
    } catch {
      return;
    }

    if (targetUrl.origin !== currentUrl.origin || targetUrl.pathname !== currentUrl.pathname) {
      return;
    }

    event.preventDefault();
    if (targetUrl.href !== currentUrl.href) {
      history.pushState(null, "", targetUrl.href);
    }
    initialize();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing) return;
    const target = event.target as HTMLElement | null;
    const isTextInput =
      target &&
      ((target.tagName === "INPUT" && (target as HTMLInputElement).type === "text") || target.tagName === "TEXTAREA");

    if (!this.session || !this.bundle || this.questions.length === 0) return;
    const question = this.questions[this.session.currentIndex];
    if (!question) return;

    const locked = Boolean(this.session.locked[question.id]);
    const quick = this.session.mode === "quick" || this.session.mode === "retry";

    // 1. 方向键 / 翻页键 切换上一题 / 下一题
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

    // 2. Enter 键快捷确认 / 下一步 / 提交
    if (event.key === "Enter" && !isTextInput) {
      event.preventDefault();
      if (quick && !locked) {
        const answer = this.session.answers[question.id] ?? null;
        if (isAnswerComplete(question, answer)) {
          this.confirmQuick(question);
        }
      } else if (this.session.currentIndex < this.questions.length - 1) {
        this.move(1);
      } else {
        this.submit(false);
      }
      return;
    }

    // 3. A-D / 1-4 快捷选项
    if (!isTextInput && !locked) {
      let selectedIndex = -1;
      const key = event.key.toUpperCase();
      if (key >= "A" && key <= "Z") {
        selectedIndex = key.charCodeAt(0) - 65;
      } else if (key >= "1" && key <= "9") {
        selectedIndex = parseInt(key, 10) - 1;
      }

      if (selectedIndex >= 0) {
        if (question.type === "single_choice" && selectedIndex < question.choices.length) {
          event.preventDefault();
          this.setAnswer(question.id, question.choices[selectedIndex].id);
        } else if (question.type === "multiple_choice" && selectedIndex < question.choices.length) {
          event.preventDefault();
          const choiceId = question.choices[selectedIndex].id;
          const current = Array.isArray(this.session.answers[question.id])
            ? (this.session.answers[question.id] as string[])
            : [];
          const isSelected = current.includes(choiceId);
          this.setAnswer(question.id, isSelected ? current.filter(item => item !== choiceId) : [...current, choiceId]);
        } else if (question.type === "true_false" && selectedIndex < 2) {
          event.preventDefault();
          this.setAnswer(question.id, selectedIndex === 0);
        }
      }
    }
  };

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
      '<h2 tabindex="-1">知识小测</h2><p>选择一个已经开放或可预览的章节。作答记录仅保存在当前浏览器，用于自我评估与查漏补缺。</p>';
    if (this.manifest.preview)
      container.insertAdjacentHTML(
        "beforeend",
        '<p class="plw-quiz-preview" role="status">草稿预览模式：题目未经人工审核，不代表正式发布内容。</p>'
      );

    const grid = document.createElement("ul");
    grid.className = "plw-quiz-landing__grid";

    for (const [pageId, page] of Object.entries(this.manifest.pages)) {
      const item = document.createElement("li");
      item.className = "plw-quiz-landing__card";
      const usable = page.status === "available" || (this.manifest.preview && page.previewQuestionCount > 0);

      if (usable) {
        const quick = this.quizLink(pageId, "quick", newSeed());
        const full = this.quizLink(pageId, "full", newSeed());
        const quickTitle = page.modes.quick?.title ?? "快速检查";
        const fullTitle = page.modes.full?.title ?? "完整小测";
        item.innerHTML = `
          <div>
            <h3>${escapeHtml(page.title)}</h3>
            <div class="plw-quiz-landing__card-meta">题库包含 ${page.publishedQuestionCount} 道已审核题</div>
          </div>
          <div class="plw-quiz-landing__links">
            <a class="plw-quiz-landing__btn" data-no-instant href="${quick}">${escapeHtml(quickTitle)} (3题)</a>
            <a class="plw-quiz-landing__btn" data-no-instant href="${full}">${escapeHtml(fullTitle)} (8题)</a>
          </div>
        `;
      } else {
        item.innerHTML = `
          <div>
            <h3>${escapeHtml(page.title)}</h3>
            <div class="plw-quiz-landing__card-meta">题库建设中：${page.publishedQuestionCount}/24 题</div>
          </div>
        `;
      }
      grid.append(item);
    }
    container.append(grid);

    const data = this.store.read();
    if (data.attempts.length) {
      const last = data.attempts[0];
      const dateStr = new Date(last.completedAt).toLocaleDateString("zh-CN");
      container.insertAdjacentHTML(
        "beforeend",
        `<p class="plw-quiz-landing__card-meta">本地最近完成小测：得分 <strong>${last.score}/${last.total}</strong>（${dateStr}）</p>`
      );
    }

    this.root.replaceChildren(container);
    container.querySelector<HTMLElement>("h2")?.focus();
  }

  private renderQuestion(): void {
    if (!this.session || !this.bundle) return;
    const question = this.questions[this.session.currentIndex];
    if (!question) return;

    const answer = this.session.answers[question.id] ?? null;
    const locked = Boolean(this.session.locked[question.id]);
    const quick = this.session.mode === "quick" || this.session.mode === "retry";
    const modeTitle =
      this.session.mode === "retry"
        ? "错题重做"
        : this.bundle.blueprint.modes[this.session.mode]?.title ?? (quick ? "快速检查" : "完整小测");

    const typeLabels: Record<string, string> = {
      single_choice: "单选题",
      multiple_choice: "多选题",
      true_false: "判断题",
      numeric: "填空计算题"
    };
    const typeTitle = typeLabels[question.type] ?? "题目";

    const section = document.createElement("section");
    section.className = "plw-quiz-question";
    section.dataset.questionId = question.id;

    if (this.bundle.preview) {
      section.insertAdjacentHTML(
        "beforeend",
        '<p class="plw-quiz-preview" role="status">草稿预览：题目未经人工审核。</p>'
      );
    }

    // 1. Header with Page Title & Mode Tag
    const header = document.createElement("div");
    header.className = "plw-quiz-header";
    header.innerHTML = `
      <div class="plw-quiz-header__meta">
        <strong>${escapeHtml(this.bundle.page.title)}</strong>
        <span class="plw-quiz-badge-tag">${escapeHtml(modeTitle)}</span>
      </div>
      <div class="plw-quiz-header__status">
        <span class="plw-quiz-progress-text">${this.session.currentIndex + 1} / ${this.questions.length}</span>
      </div>
    `;
    section.append(header);

    // 2. Segmented Stepper Bar
    const stepper = document.createElement("nav");
    stepper.className = "plw-quiz-stepper";
    stepper.setAttribute("aria-label", "题目导航");
    this.questions.forEach((q, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "plw-quiz-step-btn";
      btn.textContent = String(idx + 1);
      btn.setAttribute("aria-label", `第 ${idx + 1} 题`);

      if (idx === this.session!.currentIndex) {
        btn.classList.add("is-current");
      }
      const qAnswer = this.session!.answers[q.id];
      if (qAnswer != null) {
        btn.classList.add("is-answered");
      }
      if (this.session!.uncertain[q.id]) {
        btn.classList.add("is-uncertain");
      }
      if (this.session!.locked[q.id]) {
        const qResult = makeResult(q, qAnswer, Boolean(this.session!.uncertain[q.id]));
        btn.classList.add(qResult.correct ? "is-correct" : "is-incorrect");
      }

      btn.addEventListener("click", () => {
        this.goTo(idx);
      });
      stepper.append(btn);
    });
    section.append(stepper);

    // 3. Question Meta Bar (Type tag + Decoupled Uncertainty Pill)
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

    const uncertainty = document.createElement("label");
    uncertainty.className = "plw-quiz-uncertainty-pill";
    uncertainty.innerHTML = `<input type="checkbox" ${this.session.uncertain[question.id] ? "checked" : ""} ${
      locked ? "disabled" : ""
    }><span>🤔 标记存疑</span>`;
    uncertainty.querySelector("input")?.addEventListener("change", event => {
      const checked = (event.target as HTMLInputElement).checked;
      this.session!.uncertain[question.id] = checked;
      this.persist();
      const currentBtn = stepper.children[this.session!.currentIndex] as HTMLElement | undefined;
      currentBtn?.classList.toggle("is-uncertain", checked);
    });
    metaBar.append(uncertainty);
    section.append(metaBar);

    // 4. Question Stem
    const stem = document.createElement("div");
    stem.className = "plw-quiz-stem";
    stem.innerHTML = question.stemHtml;
    section.append(stem);

    // 5. Answer Choices
    let confirmButton: HTMLButtonElement | undefined;
    section.append(
      this.answerControl(question, answer, locked, updatedAnswer => {
        if (confirmButton) confirmButton.disabled = !isAnswerComplete(question, updatedAnswer);
      })
    );

    // 6. Hints Accordion
    if (question.hintsHtml.length) {
      const hints = document.createElement("details");
      hints.className = "plw-quiz-hints";
      hints.innerHTML = `<summary>💡 查看解题提示 (${
        question.hintsHtml.length
      })</summary><div class="plw-quiz-hints__body">${question.hintsHtml
        .map((hint, index) => `<div><strong>提示 ${index + 1}</strong>${hint}</div>`)
        .join("")}</div>`;
      section.append(hints);
    }

    // 7. Feedback when locked
    if (locked) section.append(this.feedback(question, answer));

    // 8. Action Buttons
    const actions = document.createElement("div");
    actions.className = "plw-quiz-actions";

    const prevBtn = this.button("上一题", () => this.move(-1), this.session.currentIndex === 0);
    prevBtn.classList.add("plw-quiz-btn--secondary");
    actions.append(prevBtn);

    if (quick && !locked) {
      confirmButton = this.button(
        "确认答案 (Enter)",
        () => this.confirmQuick(question),
        !isAnswerComplete(question, answer)
      );
      confirmButton.classList.add("plw-quiz-btn--primary");
      actions.append(confirmButton);
    } else if (this.session.currentIndex < this.questions.length - 1) {
      const nextBtn = this.button("下一题 (Enter)", () => this.move(1));
      nextBtn.classList.add("plw-quiz-btn--primary");
      actions.append(nextBtn);
    } else {
      const submitBtn = this.button(quick ? "查看结果" : "提交小测", () => this.submit(false));
      submitBtn.classList.add("plw-quiz-btn--primary");
      actions.append(submitBtn);
    }
    section.append(actions);

    if (!this.store.persistent)
      section.insertAdjacentHTML("beforeend", '<p role="status">浏览器存储不可用，本次进度不会持久保存。</p>');

    this.root.replaceChildren(section);
    this.hydrateAssets(section);
    section.querySelector<HTMLElement>("h2")?.focus();
    void typeset(section);
  }

  private goTo(index: number): void {
    if (!this.session) return;
    if (index < 0 || index >= this.questions.length) return;
    this.session.currentIndex = index;
    this.persist();
    this.renderQuestion();
  }

  private answerControl(
    question: Question,
    answer: UserAnswer,
    locked: boolean,
    onAnswerChange: (answer: UserAnswer) => void
  ): HTMLElement {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = "请选择或填写答案：";
    fieldset.append(legend);

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    if (question.type === "single_choice" || question.type === "multiple_choice") {
      question.choices.forEach((choice, index) => {
        const badgeLetter = letters[index] ?? String(index + 1);
        const label = document.createElement("label");
        label.className = "plw-quiz-choice";
        const selected = Array.isArray(answer) ? answer.includes(choice.id) : answer === choice.id;
        label.innerHTML = `
          <span class="plw-quiz-choice__badge">${badgeLetter}</span>
          <input type="${question.type === "single_choice" ? "radio" : "checkbox"}" name="answer" value="${
          choice.id
        }" ${selected ? "checked" : ""} ${locked ? "disabled" : ""}>
          <span class="plw-quiz-choice__content">${choice.contentHtml}</span>
        `;
        label.querySelector("input")?.addEventListener("change", () => {
          if (question.type === "single_choice") {
            this.setAnswer(question.id, choice.id);
            onAnswerChange(choice.id);
          } else {
            const current = Array.isArray(this.session!.answers[question.id])
              ? (this.session!.answers[question.id] as string[])
              : [];
            const updated = selected ? current.filter(item => item !== choice.id) : [...current, choice.id];
            this.setAnswer(question.id, updated);
            onAnswerChange(updated);
          }
        });
        fieldset.append(label);
      });
    } else if (question.type === "true_false") {
      const options = [
        { label: "正确", value: true, badge: "A" },
        { label: "错误", value: false, badge: "B" }
      ];
      options.forEach(item => {
        const label = document.createElement("label");
        label.className = "plw-quiz-choice";
        label.innerHTML = `
          <span class="plw-quiz-choice__badge">${item.badge}</span>
          <input type="radio" name="answer" ${answer === item.value ? "checked" : ""} ${locked ? "disabled" : ""}>
          <span class="plw-quiz-choice__content">${item.label}</span>
        `;
        label.querySelector("input")?.addEventListener("change", () => {
          this.setAnswer(question.id, item.value);
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
        this.setAnswer(question.id, updatedAnswer, false);
        onAnswerChange(updatedAnswer);
      };

      input.addEventListener("input", update);
      unit.addEventListener("change", update);
      wrap.append(input, unit);
      fieldset.append(wrap);
    }
    return fieldset;
  }

  private feedback(question: Question, answer: UserAnswer): HTMLElement {
    const result = makeResult(question, answer, Boolean(this.session?.uncertain[question.id]));
    const area = document.createElement("div");
    area.className = result.correct ? "plw-quiz-feedback is-correct" : "plw-quiz-feedback is-incorrect";
    area.setAttribute("role", "status");

    let targeted = "";
    if (question.feedback.choicesHtml && typeof answer === "string") {
      targeted = question.feedback.choicesHtml[answer]
        ? `<p><strong>针对你的选择：</strong>${question.feedback.choicesHtml[answer]}</p>`
        : "";
    }

    area.innerHTML = `
      <h3>${result.correct ? "回答正确" : "需要复习"}</h3>
      ${targeted}
      <div class="plw-quiz-feedback-text">${
        result.correct ? question.feedback.correctHtml : question.feedback.incorrectHtml
      }</div>
      <details>
        <summary>📖 查看完整考点解析</summary>
        <div style="margin-top: 0.5rem; line-height: 1.6;">${question.solutionHtml}</div>
      </details>
    `;

    const report = document.createElement("a");
    report.className = "plw-quiz-report";
    report.href = this.reportLink(question);
    report.textContent = "发现题目有误？点击报告问题";
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
      alert.innerHTML = `<h3>提示</h3><p>还有 <strong>${unanswered}</strong> 道题尚未作答，直接提交将记为未作答（计0分）。</p>`;
      const btnGroup = document.createElement("div");
      btnGroup.className = "plw-quiz-actions";
      const forceSubmit = this.button("仍然提交", () => this.submit(true));
      forceSubmit.classList.add("plw-quiz-btn--primary");
      const continueBtn = this.button("继续作答", () => this.renderQuestion());
      continueBtn.classList.add("plw-quiz-btn--secondary");
      btnGroup.append(forceSubmit, continueBtn);
      alert.append(btnGroup);
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

    const percentage = Math.round((attempt.score / attempt.total) * 100);
    const wrongCount = attempt.total - attempt.score;
    const uncertainCount = attempt.questionResults.filter(r => r.uncertain).length;

    let evaluation = "📖 建议巩固复习";
    if (percentage === 100) evaluation = "🌟 满分掌握！太棒了";
    else if (percentage >= 80) evaluation = "🎉 掌握优秀，表现出色";
    else if (percentage >= 60) evaluation = "👍 基本掌握，建议回看错题";

    section.innerHTML = `
      <h2 tabindex="-1">小测结果：${evaluation}</h2>
      <p style="color: var(--md-default-fg-color--light);">本结果基于本次题组的自测表现，帮助针对性查漏补缺。</p>
      
      <div class="plw-quiz-dashboard">
        <div class="plw-quiz-stat-card">
          <div class="plw-quiz-stat-card__val">${percentage}%</div>
          <div class="plw-quiz-stat-card__label">得分率 (${attempt.score}/${attempt.total} 题正确)</div>
        </div>
        <div class="plw-quiz-stat-card">
          <div class="plw-quiz-stat-card__val" style="color: ${wrongCount ? "#ef4444" : "#10b981"};">${wrongCount}</div>
          <div class="plw-quiz-stat-card__label">待复习错题数</div>
        </div>
        <div class="plw-quiz-stat-card">
          <div class="plw-quiz-stat-card__val" style="color: #f59e0b;">${uncertainCount}</div>
          <div class="plw-quiz-stat-card__label">存疑作答数</div>
        </div>
      </div>
    `;

    // 知识目标掌握度
    const summary = summarizeObjectives(attempt.questionResults);
    const objSection = document.createElement("div");
    objSection.innerHTML = '<h3 style="margin-top: 1.5rem;">📚 章节知识目标达成度</h3>';
    const objList = document.createElement("ul");
    objList.className = "plw-quiz-objectives";

    for (const objective of this.bundle.page.objectives) {
      const val = summary[objective.id];
      const item = document.createElement("li");
      item.className = "plw-quiz-objective-item";

      if (!val) {
        item.innerHTML = `
          <div class="plw-quiz-objective-item__info">
            <strong>${escapeHtml(objective.title)}</strong>
          </div>
          <span class="plw-quiz-objective-tag" style="background: var(--md-code-bg-color);">本次未覆盖</span>
        `;
      } else {
        const isGood = val.correct === val.total && val.uncertain === 0;
        const link = new URL(`${this.bundle.page.url}#${objective.anchor}`, this.manifestUrl).href;
        item.innerHTML = `
          <div class="plw-quiz-objective-item__info">
            <strong>${escapeHtml(objective.title)}</strong>
            <span class="plw-quiz-objective-tag ${isGood ? "is-good" : "is-review"}">
              ${isGood ? "掌握良好" : "建议复习"} (${val.correct}/${val.total})
            </span>
          </div>
          <a class="plw-quiz-landing__btn" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;" href="${link}">回看章节内容 ↗</a>
        `;
      }
      objList.append(item);
    }
    objSection.append(objList);
    section.append(objSection);

    // 错题与存疑过滤 Tabs
    const filterTabs = document.createElement("div");
    filterTabs.className = "plw-quiz-filter-tabs";
    filterTabs.innerHTML = `
      <button type="button" class="plw-quiz-filter-tab is-active" data-filter="all">全部题目 (${attempt.total})</button>
      <button type="button" class="plw-quiz-filter-tab" data-filter="wrong">仅看错题 (${wrongCount})</button>
      <button type="button" class="plw-quiz-filter-tab" data-filter="uncertain">存疑题目 (${uncertainCount})</button>
    `;
    section.append(filterTabs);

    // 题目回顾列表
    const reviewContainer = document.createElement("div");
    reviewContainer.className = "plw-quiz-reviews-container";

    attempt.questionResults.forEach((result, index) => {
      const question = this.questions[index];
      const article = document.createElement("article");
      article.className = "plw-quiz-review";
      article.dataset.questionId = question.id;
      article.dataset.correct = String(result.correct);
      article.dataset.uncertain = String(result.uncertain);

      let statusBadge = result.correct
        ? '<span style="color: #10b981; font-weight: bold;">✓ 正确</span>'
        : result.unanswered
        ? '<span style="color: #ef4444; font-weight: bold;">✕ 未作答</span>'
        : '<span style="color: #ef4444; font-weight: bold;">✕ 错误</span>';
      if (result.uncertain) {
        statusBadge +=
          ' <span class="plw-quiz-uncertainty-pill" style="padding: 0.1rem 0.4rem; font-size: 0.75rem;">🤔 标记存疑</span>';
      }

      article.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h3 style="margin: 0;">第 ${index + 1} 题</h3>
          <div>${statusBadge}</div>
        </div>
        <div class="plw-quiz-stem">${question.stemHtml}</div>
      `;
      article.append(this.feedback(question, result.answer));
      reviewContainer.append(article);
    });
    section.append(reviewContainer);

    // Filter Tab 切换逻辑
    filterTabs.addEventListener("click", event => {
      const target = event.target as HTMLElement | null;
      const tabBtn = target?.closest<HTMLButtonElement>(".plw-quiz-filter-tab");
      if (!tabBtn) return;
      filterTabs.querySelectorAll(".plw-quiz-filter-tab").forEach(tab => tab.classList.remove("is-active"));
      tabBtn.classList.add("is-active");

      const filter = tabBtn.dataset.filter;
      Array.from(reviewContainer.children).forEach(child => {
        const el = child as HTMLElement;
        if (filter === "all") {
          el.style.display = "";
        } else if (filter === "wrong") {
          el.style.display = el.dataset.correct === "false" ? "" : "none";
        } else if (filter === "uncertain") {
          el.style.display = el.dataset.uncertain === "true" ? "" : "none";
        }
      });
    });

    // 底部重练与回流操作栏
    const actions = document.createElement("div");
    actions.className = "plw-quiz-actions";

    const wrong = attempt.questionResults.filter(result => !result.correct).map(result => result.questionId);
    if (wrong.length) {
      const retryWrongBtn = this.button(`🔥 只重做错题 (${wrong.length})`, () => this.startRetry(wrong));
      retryWrongBtn.classList.add("plw-quiz-btn--primary");
      actions.append(retryWrongBtn);
    }

    const restartSame = this.button("重做同一组", () => this.restart(false));
    restartSame.classList.add(wrong.length ? "plw-quiz-btn--secondary" : "plw-quiz-btn--primary");
    actions.append(restartSame);

    const restartNew = this.button("换一组新题", () => this.restart(true));
    restartNew.classList.add("plw-quiz-btn--secondary");
    actions.append(restartNew);

    const back = document.createElement("a");
    back.className = "plw-quiz-btn--secondary";
    back.href = new URL(this.bundle.page.url, this.manifestUrl).href;
    back.textContent = "返回学习页面 ↗";
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
    )}题库正在建设</h2><p>目前有 ${count}/24 道已审核题目，暂未开启正式小测。</p><p><a class="plw-quiz-landing__btn" href="${new URL(
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
    )}</p><p><a class="plw-quiz-landing__btn" href="${new URL("./", document.baseURI)}">返回知识小测</a></p></div>`;
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

window.addEventListener("popstate", () => {
  if (document.querySelector<HTMLElement>("#plw-quiz-root")) {
    initialize();
  }
});
