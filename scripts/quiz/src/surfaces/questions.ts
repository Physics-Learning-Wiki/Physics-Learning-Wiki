import {
  loadManifest,
  loadQuestionCatalog,
  loadTaxonomyCatalog,
  readQuestionsParameters,
  resolveSiteUrl
} from "../data.js";
import { isAnswerComplete } from "../grading.js";
import { typeset } from "../math.js";
import {
  escapeHtml,
  hydrateAssets,
  renderAnswerControl,
  renderFeedback,
  renderQuestionStem
} from "../question-renderer.js";
import { createAbortScope } from "../abort-scope.js";
import type { Manifest, Question, TaxonomyCatalog, UserAnswer } from "../types.js";

export class QuestionsSurface {
  private readonly abort: AbortController;
  private readonly releaseAbortScope: () => void;
  private manifestUrl!: URL;
  private manifest!: Manifest;
  private questions: Question[] = [];
  private taxonomy?: TaxonomyCatalog;

  private keyword = "";
  private selectedTopic = "all";
  private selectedConcept = "all";
  private selectedType = "all";
  private selectedDifficulty = "all";
  private selectedCognitive = "all";
  private selectedStyle = "all";
  private visibleLimit = 10;
  private pendingTargetFocus = false;
  private filterMediaCleanup?: () => void;

  private targetQuestionId: string | null = null;
  private answers: Record<string, UserAnswer> = {};
  private locked: Record<string, boolean> = {};

  constructor(private readonly root: HTMLElement, parentSignal: AbortSignal) {
    const scope = createAbortScope(parentSignal);
    this.abort = scope.controller;
    this.releaseAbortScope = scope.release;
  }

  async start(): Promise<void> {
    try {
      const manifestPath = this.root.dataset.manifestUrl ?? resolveSiteUrl("_generated/question-bank/manifest.json");
      this.manifestUrl = new URL(manifestPath, window.location.href);
      this.manifest = await loadManifest(this.manifestUrl, this.abort.signal);

      this.questions = await loadQuestionCatalog(this.manifestUrl, this.manifest.catalogs.questions, this.abort.signal);

      if (this.manifest.catalogs.taxonomy) {
        try {
          this.taxonomy = await loadTaxonomyCatalog(
            this.manifestUrl,
            this.manifest.catalogs.taxonomy,
            this.abort.signal
          );
        } catch {
          // optional
        }
      }

      if (this.abort.signal.aborted) return;
      const params = readQuestionsParameters();
      this.targetQuestionId = params.questionId;
      this.pendingTargetFocus = Boolean(params.questionId);

      this.render();
      window.addEventListener("popstate", this.handlePopState, { signal: this.abort.signal });
    } catch (err) {
      if (this.abort.signal.aborted) return;
      this.root.innerHTML = `<div class="plw-quiz-error" role="alert"><h2>加载题库失败</h2><p>${escapeHtml(
        err instanceof Error ? err.message : String(err)
      )}</p></div>`;
    }
  }

  destroy(): void {
    this.abort.abort();
    this.releaseAbortScope();
    this.filterMediaCleanup?.();
    this.root.innerHTML = "";
  }

  private handlePopState = (): void => {
    const params = readQuestionsParameters();
    if (params.questionId === this.targetQuestionId) return;
    this.targetQuestionId = params.questionId;
    this.pendingTargetFocus = Boolean(params.questionId);
    this.render();
  };

  private render(): void {
    this.root.innerHTML = "";
    const container = document.createElement("div");
    container.className = "plw-quiz-question-browser";

    // Collect available filter options
    const allTopics = new Set<string>();

    for (const q of this.questions) {
      for (const t of q.topicIds ?? []) allTopics.add(t);
    }

    // 1. Filter Bar
    const filterBar = document.createElement("div");
    filterBar.className = "plw-quiz-filter-bar plw-quiz-filter-bar--grid";

    filterBar.innerHTML = `
      <div class="plw-quiz-filter-row">
        <div class="plw-quiz-search-wrap">
          <input type="search" class="plw-quiz-search-input" id="plw-filter-keyword" placeholder="搜索题目编号、题干关键词或选项..." value="${escapeHtml(
            this.keyword
          )}">
        </div>
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-filter-topic" aria-label="主题">
            <option value="all">所有主题</option>
            ${Array.from(allTopics)
              .sort()
              .map(tid => {
                const title = this.taxonomy?.topics[tid]?.title ?? tid;
                return `<option value="${escapeHtml(tid)}" ${this.selectedTopic === tid ? "selected" : ""}>${escapeHtml(
                  title
                )}</option>`;
              })
              .join("")}
          </select>
        </div>
      </div>
      <details class="plw-quiz-filter-more">
        <summary>更多筛选</summary>
        <div class="plw-quiz-filter-row">
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-filter-concept" aria-label="概念">
          </select>
        </div>
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-filter-type" aria-label="题型">
            <option value="all" ${this.selectedType === "all" ? "selected" : ""}>所有题型</option>
            <option value="single_choice" ${this.selectedType === "single_choice" ? "selected" : ""}>单选题</option>
            <option value="multiple_choice" ${this.selectedType === "multiple_choice" ? "selected" : ""}>多选题</option>
            <option value="true_false" ${this.selectedType === "true_false" ? "selected" : ""}>判断题</option>
            <option value="numeric" ${this.selectedType === "numeric" ? "selected" : ""}>数值计算题</option>
          </select>
        </div>
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-filter-diff" aria-label="难度">
            <option value="all" ${this.selectedDifficulty === "all" ? "selected" : ""}>所有难度</option>
            <option value="1" ${this.selectedDifficulty === "1" ? "selected" : ""}>难度 1 (★☆☆)</option>
            <option value="2" ${this.selectedDifficulty === "2" ? "selected" : ""}>难度 2 (★★☆)</option>
            <option value="3" ${this.selectedDifficulty === "3" ? "selected" : ""}>难度 3 (★★★)</option>
          </select>
        </div>
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-filter-cog" aria-label="认知层级">
            <option value="all" ${this.selectedCognitive === "all" ? "selected" : ""}>所有认知层级</option>
            <option value="remember" ${this.selectedCognitive === "remember" ? "selected" : ""}>识记 (Remember)</option>
            <option value="understand" ${
              this.selectedCognitive === "understand" ? "selected" : ""
            }>理解 (Understand)</option>
            <option value="apply" ${this.selectedCognitive === "apply" ? "selected" : ""}>应用 (Apply)</option>
            <option value="analyze" ${this.selectedCognitive === "analyze" ? "selected" : ""}>分析 (Analyze)</option>
          </select>
        </div>
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-filter-style" aria-label="考查风格">
            <option value="all" ${this.selectedStyle === "all" ? "selected" : ""}>所有考查风格</option>
            <option value="conceptual" ${this.selectedStyle === "conceptual" ? "selected" : ""}>概念辨析</option>
            <option value="graphical" ${this.selectedStyle === "graphical" ? "selected" : ""}>图像分析</option>
            <option value="computational" ${
              this.selectedStyle === "computational" ? "selected" : ""
            }>数值/代数计算</option>
            <option value="modeling" ${this.selectedStyle === "modeling" ? "selected" : ""}>物理建模</option>
          </select>
        </div>
        <button type="button" class="plw-quiz-btn--secondary plw-quiz-btn--sm" id="plw-btn-reset-filters">重置筛选</button>
        </div>
      </details>
    `;

    const more = filterBar.querySelector<HTMLDetailsElement>(".plw-quiz-filter-more")!;
    const compactMedia = window.matchMedia("(max-width: 700px)");
    more.open = !compactMedia.matches;
    this.filterMediaCleanup?.();
    const onCompactChange = (event: MediaQueryListEvent) => {
      more.open = !event.matches;
    };
    compactMedia.addEventListener("change", onCompactChange);
    this.filterMediaCleanup = () => compactMedia.removeEventListener("change", onCompactChange);
    this.updateConceptOptions(filterBar.querySelector<HTMLSelectElement>("#plw-filter-concept")!);

    const refresh = () => {
      this.visibleLimit = 10;
      this.updateList(listContainer, countNotice);
    };

    filterBar.querySelector("#plw-filter-keyword")?.addEventListener("input", e => {
      this.keyword = (e.target as HTMLInputElement).value.trim().toLowerCase();
      refresh();
    });

    filterBar.querySelector("#plw-filter-topic")?.addEventListener("change", e => {
      this.selectedTopic = (e.target as HTMLSelectElement).value;
      this.updateConceptOptions(filterBar.querySelector<HTMLSelectElement>("#plw-filter-concept")!);
      refresh();
    });

    filterBar.querySelector("#plw-filter-concept")?.addEventListener("change", e => {
      this.selectedConcept = (e.target as HTMLSelectElement).value;
      refresh();
    });

    filterBar.querySelector("#plw-filter-type")?.addEventListener("change", e => {
      this.selectedType = (e.target as HTMLSelectElement).value;
      refresh();
    });

    filterBar.querySelector("#plw-filter-diff")?.addEventListener("change", e => {
      this.selectedDifficulty = (e.target as HTMLSelectElement).value;
      refresh();
    });

    filterBar.querySelector("#plw-filter-cog")?.addEventListener("change", e => {
      this.selectedCognitive = (e.target as HTMLSelectElement).value;
      refresh();
    });

    filterBar.querySelector("#plw-filter-style")?.addEventListener("change", e => {
      this.selectedStyle = (e.target as HTMLSelectElement).value;
      refresh();
    });

    filterBar.querySelector("#plw-btn-reset-filters")?.addEventListener("click", () => {
      this.keyword = "";
      this.selectedTopic = "all";
      this.selectedConcept = "all";
      this.selectedType = "all";
      this.selectedDifficulty = "all";
      this.selectedCognitive = "all";
      this.selectedStyle = "all";
      this.visibleLimit = 10;
      this.render();
    });

    container.append(filterBar);

    // 2. Count notice & deep link diagnostic
    const countNotice = document.createElement("div");
    countNotice.className = "plw-quiz-questions__count-wrap";
    container.append(countNotice);

    // 3. Question Cards List
    const listContainer = document.createElement("div");
    listContainer.className = "plw-quiz-questions__list";
    container.append(listContainer);

    this.updateList(listContainer, countNotice);
    this.root.append(container);
    this.focusTargetQuestion();
  }

  private updateConceptOptions(select: HTMLSelectElement): void {
    const concepts = new Set(
      this.questions
        .filter(question => this.selectedTopic === "all" || question.topicIds?.includes(this.selectedTopic))
        .flatMap(question => question.conceptIds ?? [])
    );
    if (this.selectedConcept !== "all" && !concepts.has(this.selectedConcept)) {
      this.selectedConcept = "all";
    }
    select.innerHTML = `<option value="all">所有核心概念</option>${Array.from(concepts)
      .sort()
      .map(id => `<option value="${escapeHtml(id)}">${escapeHtml(this.taxonomy?.concepts[id]?.title ?? id)}</option>`)
      .join("")}`;
    select.value = this.selectedConcept;
  }

  private updateList(listContainer: HTMLElement, countNotice: HTMLElement): void {
    listContainer.innerHTML = "";

    const filtered = this.questions.filter(q => {
      if (this.keyword) {
        const topicNames = (q.topicIds ?? []).map(t => this.taxonomy?.topics[t]?.title ?? t).join(" ");
        const conceptNames = (q.conceptIds ?? []).map(c => this.taxonomy?.concepts[c]?.title ?? c).join(" ");
        const choicesText =
          "choices" in q && Array.isArray((q as { choices?: Array<{ contentHtml?: string }> }).choices)
            ? (q as { choices: Array<{ contentHtml?: string }> }).choices.map(c => c.contentHtml ?? "").join(" ")
            : "";
        const text = `${q.id} ${q.stemHtml ?? ""} ${topicNames} ${conceptNames} ${choicesText} ${(
          q.conceptIds ?? []
        ).join(" ")} ${(q.topicIds ?? []).join(" ")}`.toLowerCase();
        if (!text.includes(this.keyword)) return false;
      }

      if (this.selectedTopic !== "all") {
        if (!q.topicIds || !q.topicIds.includes(this.selectedTopic)) return false;
      }

      if (this.selectedConcept !== "all") {
        if (!q.conceptIds || !q.conceptIds.includes(this.selectedConcept)) return false;
      }

      if (this.selectedType !== "all") {
        if (q.type !== this.selectedType) return false;
      }

      if (this.selectedDifficulty !== "all") {
        if (String(q.difficulty ?? "") !== this.selectedDifficulty) return false;
      }

      if (this.selectedCognitive !== "all") {
        if (q.cognitiveLevel !== this.selectedCognitive) return false;
      }

      if (this.selectedStyle !== "all") {
        if (q.style !== this.selectedStyle) return false;
      }

      return true;
    });

    let notFoundBanner = "";
    if (this.targetQuestionId && !this.questions.some(q => q.id === this.targetQuestionId)) {
      notFoundBanner = `<div class="plw-quiz-error" role="alert"><p>未在题库中找到指定题目：<code>${escapeHtml(
        this.targetQuestionId
      )}</code></p></div>`;
    }

    const filterBar = listContainer.parentElement?.querySelector<HTMLElement>(".plw-quiz-filter-bar");
    const filters: Array<[string, string]> = [];
    if (this.keyword) {
      filters.push(["keyword", `关键词：${this.keyword.slice(0, 18)}${this.keyword.length > 18 ? "…" : ""}`]);
    }
    for (const [key, value, selector, label] of [
      ["topic", this.selectedTopic, "#plw-filter-topic", "主题"],
      ["concept", this.selectedConcept, "#plw-filter-concept", "概念"],
      ["type", this.selectedType, "#plw-filter-type", "题型"],
      ["difficulty", this.selectedDifficulty, "#plw-filter-diff", "难度"],
      ["cognitive", this.selectedCognitive, "#plw-filter-cog", "认知层级"],
      ["style", this.selectedStyle, "#plw-filter-style", "考查风格"]
    ]) {
      if (value === "all") continue;
      const select = filterBar?.querySelector<HTMLSelectElement>(selector);
      filters.push([key, `${label}：${select?.selectedOptions[0]?.textContent ?? value}`]);
    }
    const advancedCount = filters.filter(([key]) => !["keyword", "topic"].includes(key)).length;
    const moreSummary = filterBar?.querySelector(".plw-quiz-filter-more summary");
    if (moreSummary) moreSummary.textContent = advancedCount ? `更多筛选（${advancedCount}）` : "更多筛选";

    countNotice.innerHTML = `
      ${notFoundBanner}
      <p class="plw-quiz-sets__count-notice" role="status">共检索到 <strong>${
        filtered.length
      }</strong> 道题目（全库共 ${this.questions.length} 道）</p>
      ${
        filters.length
          ? `<div class="plw-quiz-active-filters" aria-label="已启用的筛选条件">${filters
              .map(
                ([key, label]) =>
                  `<button type="button" class="plw-quiz-filter-chip" data-clear-filter="${key}" aria-label="清除${escapeHtml(
                    label
                  )}">${escapeHtml(label)} ×</button>`
              )
              .join(
                ""
              )}<button type="button" class="plw-quiz-filter-clear" data-clear-filter="all">清除全部</button></div>`
          : ""
      }
    `;
    countNotice.querySelectorAll<HTMLButtonElement>("[data-clear-filter]").forEach(button => {
      button.addEventListener("click", () => {
        const key = button.dataset.clearFilter;
        if (key === "all") {
          this.keyword = "";
          this.selectedTopic =
            this.selectedConcept =
            this.selectedType =
            this.selectedDifficulty =
            this.selectedCognitive =
            this.selectedStyle =
              "all";
        } else {
          switch (key) {
            case "keyword":
              this.keyword = "";
              break;
            case "topic":
              this.selectedTopic = "all";
              break;
            case "concept":
              this.selectedConcept = "all";
              break;
            case "type":
              this.selectedType = "all";
              break;
            case "difficulty":
              this.selectedDifficulty = "all";
              break;
            case "cognitive":
              this.selectedCognitive = "all";
              break;
            case "style":
              this.selectedStyle = "all";
              break;
          }
        }
        const moreWasOpen = filterBar?.querySelector<HTMLDetailsElement>(".plw-quiz-filter-more")?.open;
        this.visibleLimit = 10;
        this.render();
        const nextMore = this.root.querySelector<HTMLDetailsElement>(".plw-quiz-filter-more");
        if (nextMore && moreWasOpen !== undefined) nextMore.open = moreWasOpen;
        this.root.querySelector<HTMLInputElement>("#plw-filter-keyword")?.focus();
      });
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `<div class="plw-quiz-empty"><p>没有找到符合当前筛选条件的题目，请尝试放宽筛选条件。</p></div>`;
      return;
    }

    const targetIndex = filtered.findIndex(question => question.id === this.targetQuestionId);
    if (this.pendingTargetFocus && targetIndex >= this.visibleLimit) {
      this.visibleLimit = targetIndex + 1;
    }
    for (const q of filtered.slice(0, this.visibleLimit)) {
      const renderCard = (): HTMLElement => {
        const card = document.createElement("article");
        card.className = "plw-quiz-question-browser__card plw-quiz-question";
        card.id = `q-${q.id}`;
        card.tabIndex = -1;
        card.dataset.questionId = q.id;

        if (this.targetQuestionId === q.id) {
          card.classList.add("is-targeted");
        }

        // 1. Header
        const qHeader = document.createElement("header");
        qHeader.className = "plw-quiz-question-browser__header";

        const typeMap: Record<string, string> = {
          single_choice: "单选题",
          multiple_choice: "多选题",
          true_false: "判断题",
          numeric: "数值计算题"
        };
        const cognitiveMap: Record<string, string> = {
          remember: "识记",
          understand: "理解",
          apply: "应用",
          analyze: "分析"
        };
        const styleMap: Record<string, string> = {
          conceptual: "概念辨析",
          graphical: "图像分析",
          computational: "数值／代数计算",
          modeling: "物理建模"
        };

        const diffBadge =
          q.difficulty != null
            ? `<span class="plw-quiz-badge">${"★".repeat(Math.max(1, Math.min(3, q.difficulty)))}</span>`
            : "";
        const typeText = typeMap[q.type] ?? q.type;

        const permalinkUrl = `${resolveSiteUrl("quiz/questions/")}?q=${encodeURIComponent(q.id)}`;

        qHeader.innerHTML = `
        <div class="plw-quiz-question-browser__id-row">
          <a class="plw-quiz-question-browser__permalink" href="${escapeHtml(permalinkUrl)}" title="点击获取单题链接">
            <code>${escapeHtml(q.id)}</code> 🔗
          </a>
          <div class="plw-quiz-card-tags">
            <span class="plw-quiz-badge">${escapeHtml(typeText)}</span>
            ${diffBadge}
            ${
              q.cognitiveLevel
                ? `<span class="plw-quiz-badge">${escapeHtml(cognitiveMap[q.cognitiveLevel])}</span>`
                : ""
            }
            ${q.style ? `<span class="plw-quiz-badge">${escapeHtml(styleMap[q.style])}</span>` : ""}
            ${this.manifest.preview && q.status === "draft" ? `<span class="plw-quiz-badge--warning">草稿</span>` : ""}
          </div>
        </div>
      `;

        const permalink = qHeader.querySelector<HTMLAnchorElement>(".plw-quiz-question-browser__permalink");
        permalink?.addEventListener("click", e => {
          e.preventDefault();
          this.targetQuestionId = q.id;
          this.pendingTargetFocus = false;
          window.history.pushState(null, "", permalinkUrl);
          for (const el of Array.from(listContainer.querySelectorAll(".plw-quiz-question-browser__card"))) {
            el.classList.remove("is-targeted");
          }
          card.classList.add("is-targeted");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.focus({ preventScroll: true });
          if (navigator.clipboard) {
            navigator.clipboard
              .writeText(permalink.href)
              .then(() => {
                const notice = card.querySelector<HTMLElement>(".plw-quiz-question-browser__copy-status");
                if (notice) notice.textContent = "链接已复制";
              })
              .catch(() => {});
          }
        });
        const copyStatus = document.createElement("span");
        copyStatus.className = "plw-quiz-question-browser__copy-status";
        copyStatus.setAttribute("role", "status");
        qHeader.querySelector(".plw-quiz-question-browser__id-row")?.append(copyStatus);

        card.append(qHeader);

        // 2. Body: Stem
        card.append(renderQuestionStem(q));

        // 3. Interactive trial control
        const answer = this.answers[q.id] ?? null;
        const isLocked = Boolean(this.locked[q.id]);

        let trialBtn: HTMLButtonElement | undefined;

        const control = renderAnswerControl({
          question: q,
          answer,
          locked: isLocked,
          onAnswerChange: nextAnswer => {
            this.answers[q.id] = nextAnswer;
            if (trialBtn) {
              trialBtn.disabled = !isAnswerComplete(q, nextAnswer);
            }
          },
          inputName: `trial-${q.id}`
        });
        card.append(control);

        // 4. Trial check button
        const trialActions = document.createElement("div");
        trialActions.className = "plw-quiz-question-browser__trial-actions plw-quiz-actions";

        if (!isLocked) {
          trialBtn = document.createElement("button");
          trialBtn.type = "button";
          trialBtn.className = "plw-quiz-btn--primary plw-quiz-btn--sm";
          trialBtn.textContent = "试答并检验";
          trialBtn.disabled = !isAnswerComplete(q, answer);
          trialBtn.addEventListener("click", () => {
            this.locked[q.id] = true;
            const replacement = renderCard();
            card.replaceWith(replacement);
            hydrateAssets(replacement, [q], this.manifestUrl);
            typeset(replacement);
            replacement.querySelector<HTMLElement>(".plw-quiz-feedback h3")?.focus({ preventScroll: true });
          });
          trialActions.append(trialBtn);
        } else {
          const resetBtn = document.createElement("button");
          resetBtn.type = "button";
          resetBtn.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
          resetBtn.textContent = "清除作答重新试答";
          resetBtn.addEventListener("click", () => {
            delete this.answers[q.id];
            delete this.locked[q.id];
            const replacement = renderCard();
            card.replaceWith(replacement);
            hydrateAssets(replacement, [q], this.manifestUrl);
            typeset(replacement);
            replacement.querySelector<HTMLElement>("fieldset input, fieldset select")?.focus({ preventScroll: true });
          });
          trialActions.append(resetBtn);
        }
        card.append(trialActions);

        // 5. Feedback if locked
        if (isLocked) {
          const feedback = renderFeedback({
            question: q,
            answer,
            showSolution: false
          });
          card.append(feedback);
        }

        // 6. Collapsible full solution
        const details = document.createElement("details");
        details.className = "plw-quiz-question-details plw-quiz-solution-details";
        details.innerHTML = `
        <summary class="plw-quiz-solution-details__summary">
          <span class="plw-quiz-solution-details__title">📖 查看参考答案与考点解析</span>
        </summary>
        <div class="plw-quiz-solution-details__body">
          <div class="plw-quiz-solution-text">${q.solutionHtml || "<p>暂无文字解析</p>"}</div>
        </div>
      `;
        card.append(details);

        // 7. Errata link
        const reportLink = document.createElement("a");
        reportLink.className = "plw-quiz-report";
        reportLink.href = this.reportLink(q);
        reportLink.textContent = "报告题目错误 / 提出改进建议";
        card.append(reportLink);

        return card;
      };
      listContainer.append(renderCard());
    }

    if (filtered.length > this.visibleLimit) {
      const loadMore = document.createElement("button");
      loadMore.type = "button";
      loadMore.className = "plw-quiz-btn--secondary plw-quiz-question-browser__load-more";
      loadMore.textContent = `再显示 ${Math.min(10, filtered.length - this.visibleLimit)} 道题目`;
      loadMore.addEventListener("click", () => {
        const previousLimit = this.visibleLimit;
        this.visibleLimit += 10;
        this.updateList(listContainer, countNotice);
        const nextCard = listContainer.querySelectorAll<HTMLElement>(".plw-quiz-question-browser__card")[previousLimit];
        nextCard?.focus();
      });
      listContainer.append(loadMore);
    }

    hydrateAssets(listContainer, this.questions, this.manifestUrl);
    typeset(listContainer);

    this.focusTargetQuestion();
  }

  private focusTargetQuestion(): void {
    if (!this.targetQuestionId || !this.pendingTargetFocus) return;
    const target = document.getElementById(`q-${this.targetQuestionId}`);
    if (!target || !this.root.contains(target)) return;
    this.pendingTargetFocus = false;
    requestAnimationFrame(() => {
      if (!target.isConnected) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus({ preventScroll: true });
    });
  }

  private reportLink(question: Question): string {
    const url = new URL(resolveSiteUrl("submit/"), window.location.href);
    url.search = new URLSearchParams({
      type: "errata",
      question_id: question.id,
      question_version: String(question.version),
      title: `[题目勘误] ${question.id}`
    }).toString();
    return url.href;
  }
}
