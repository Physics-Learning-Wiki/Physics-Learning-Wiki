import { loadManifest, loadSetCatalog, loadTaxonomyCatalog, resolveSiteUrl } from "../data.js";
import { createAbortScope } from "../abort-scope.js";
import { escapeHtml, renderLicenseNotice } from "../question-renderer.js";
import { TopicTree } from "../topics.js";
import { fillTopicSelect } from "../topic-select.js";
import type { Manifest, SetCatalogItem, TaxonomyCatalog } from "../types.js";

export class SetsSurface {
  private readonly abort: AbortController;
  private readonly releaseAbortScope: () => void;
  private manifestUrl!: URL;
  private manifest!: Manifest;
  private catalog: SetCatalogItem[] = [];
  private taxonomy?: TaxonomyCatalog;

  private keyword = "";
  private selectedTopic = "all";
  private selectedSubtopic = "all";
  private topicTree = new TopicTree();
  private selectedFeedbackMode = "all";
  private selectedTag = "all";
  private filterMediaCleanup?: () => void;

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

      const catalog = await loadSetCatalog(this.manifestUrl, this.manifest.catalogs.sets, this.abort.signal);
      if (this.abort.signal.aborted) return;
      const requiredTag = this.root.dataset.requiredTag;
      this.catalog = catalog.filter(
        item => (this.manifest.preview || item.status === "published") && (!requiredTag || item.tags.includes(requiredTag))
      );
      if (requiredTag && this.catalog.length === 0) {
        this.root.innerHTML = '<div class="plw-quiz-empty"><p role="status">暂无可作答的课程真题．</p></div>';
        return;
      }

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
      const params = new URL(window.location.href).searchParams;
      this.keyword = params.get("keyword")?.trim() ?? "";
      this.selectedTag = params.get("tag")?.trim() || "all";
      this.render();
    } catch (err) {
      if (this.abort.signal.aborted) return;
      this.root.innerHTML = `<div class="plw-quiz-error" role="alert"><h2>加载测试目录失败</h2><p>${escapeHtml(
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

  private updateSearchUrl(): void {
    const url = new URL(window.location.href);
    for (const [key, value] of [["keyword", this.keyword], ["tag", this.selectedTag === "all" ? "" : this.selectedTag]]) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    if (url.href !== window.location.href) history.replaceState(history.state, "", url);
  }

  private render(): void {
    this.root.innerHTML = "";
    const container = document.createElement("div");
    container.className = "plw-quiz-sets";

    // 1. Available topics and tags
    const allTopics = new Set<string>();
    const allTags = new Set<string>();

    for (const item of this.catalog) {
      for (const tid of item.topicIds) allTopics.add(tid);
      for (const tag of item.tags) allTags.add(tag);
    }
    allTags.delete(this.root.dataset.requiredTag ?? "");
    if (this.selectedTag !== "all") allTags.add(this.selectedTag);
    this.topicTree = new TopicTree(this.taxonomy, allTopics);

    // 2. Filter Bar
    const filterBar = document.createElement("details");
    filterBar.className = "plw-quiz-filter-bar";

    filterBar.innerHTML = `
      <summary>筛选测试集合</summary>
      <div class="plw-quiz-filter-row">
        <div class="plw-quiz-search-wrap">
          <input type="search" class="plw-quiz-search-input" placeholder="按测试名称或描述搜索..." value="${escapeHtml(
            this.keyword
          )}">
        </div>
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-select-topic" aria-label="主题"></select>
        </div>
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-select-subtopic" aria-label="子主题"></select>
        </div>
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-select-mode" aria-label="按反馈模式筛选">
            <option value="all" ${this.selectedFeedbackMode === "all" ? "selected" : ""}>所有反馈模式</option>
            <option value="immediate" ${this.selectedFeedbackMode === "immediate" ? "selected" : ""}>即时反馈</option>
            <option value="deferred" ${this.selectedFeedbackMode === "deferred" ? "selected" : ""}>整卷提交</option>
          </select>
        </div>
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-select-tag" aria-label="按标签筛选">
            <option value="all" ${this.selectedTag === "all" ? "selected" : ""}>所有测试标签</option>
            ${Array.from(allTags)
              .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
              .map(
                tag =>
                  `<option value="${escapeHtml(tag)}" ${this.selectedTag === tag ? "selected" : ""}>${escapeHtml(
                    tag
                  )}</option>`
              )
              .join("")}
          </select>
        </div>
        <button type="button" class="plw-quiz-btn--secondary plw-quiz-btn--sm" id="plw-btn-reset-sets-filters">重置筛选</button>
      </div>
    `;
    const topicSelect = filterBar.querySelector<HTMLSelectElement>("#plw-select-topic")!;
    const subtopicSelect = filterBar.querySelector<HTMLSelectElement>("#plw-select-subtopic")!;
    fillTopicSelect(
      topicSelect,
      this.topicTree.roots,
      this.taxonomy?.topics ? "所有主题" : "主题分类暂不可用",
      this.selectedTopic
    );
    topicSelect.disabled = this.topicTree.roots.length === 0;
    const updateSubtopics = () => {
      fillTopicSelect(
        subtopicSelect,
        this.topicTree.subtopics(this.selectedTopic),
        this.selectedTopic === "all" ? "请先选择主题" : "全部子主题",
        this.selectedSubtopic
      );
      subtopicSelect.disabled = topicSelect.disabled || this.selectedTopic === "all";
    };
    updateSubtopics();
    const compactMedia = window.matchMedia("(max-width: 700px)");
    filterBar.open = !compactMedia.matches;
    this.filterMediaCleanup?.();
    const onCompactChange = (event: MediaQueryListEvent) => {
      filterBar.open = !event.matches;
    };
    compactMedia.addEventListener("change", onCompactChange);
    this.filterMediaCleanup = () => compactMedia.removeEventListener("change", onCompactChange);

    const searchInput = filterBar.querySelector<HTMLInputElement>(".plw-quiz-search-input")!;
    searchInput.addEventListener("input", () => {
      this.keyword = searchInput.value.trim();
      this.renderList(cardsGrid, countNotice);
    });
    searchInput.addEventListener("change", () => this.updateSearchUrl());

    filterBar.querySelector("#plw-select-topic")?.addEventListener("change", e => {
      this.selectedTopic = (e.target as HTMLSelectElement).value;
      this.selectedSubtopic = "all";
      updateSubtopics();
      this.renderList(cardsGrid, countNotice);
    });

    subtopicSelect.addEventListener("change", () => {
      this.selectedSubtopic = subtopicSelect.value;
      this.renderList(cardsGrid, countNotice);
    });

    filterBar.querySelector("#plw-select-mode")?.addEventListener("change", e => {
      this.selectedFeedbackMode = (e.target as HTMLSelectElement).value;
      this.renderList(cardsGrid, countNotice);
    });

    filterBar.querySelector("#plw-select-tag")?.addEventListener("change", e => {
      this.selectedTag = (e.target as HTMLSelectElement).value;
      this.updateSearchUrl();
      this.renderList(cardsGrid, countNotice);
    });

    filterBar.querySelector("#plw-btn-reset-sets-filters")?.addEventListener("click", () => {
      this.keyword = "";
      this.selectedTopic = this.selectedSubtopic = this.selectedFeedbackMode = this.selectedTag = "all";
      searchInput.value = "";
      filterBar.querySelectorAll<HTMLSelectElement>("select").forEach(select => (select.value = "all"));
      updateSubtopics();
      this.updateSearchUrl();
      this.renderList(cardsGrid, countNotice);
      searchInput.focus();
    });

    container.append(filterBar);

    // 3. Count notice
    const countNotice = document.createElement("p");
    countNotice.className = "plw-quiz-sets__count-notice";
    container.append(countNotice);

    // 4. Sets Grid
    const cardsGrid = document.createElement("div");
    cardsGrid.className = "plw-quiz-landing__grid";
    container.append(cardsGrid);

    this.renderList(cardsGrid, countNotice);
    this.root.append(container);
  }

  private renderList(grid: HTMLElement, countNotice: HTMLElement): void {
    grid.innerHTML = "";

    const keyword = this.keyword.toLowerCase();
    const filtered = this.catalog.filter(item => {
      if (keyword) {
        const text = `${item.title} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
        if (!text.includes(keyword)) return false;
      }

      const topicId = this.selectedSubtopic !== "all" ? this.selectedSubtopic : this.selectedTopic;
      if (!this.topicTree.matches(item.topicIds, topicId === "all" ? undefined : topicId)) return false;

      if (this.selectedFeedbackMode !== "all") {
        if (item.feedbackMode !== this.selectedFeedbackMode) return false;
      }

      if (this.selectedTag !== "all") {
        if (!item.tags.includes(this.selectedTag)) return false;
      }

      return true;
    });

    countNotice.textContent = `共显示 ${filtered.length} 个测试集合`;
    countNotice.setAttribute("role", "status");
    const activeCount =
      Number(Boolean(this.keyword)) +
      Number(this.selectedTopic !== "all") +
      Number(this.selectedSubtopic !== "all") +
      Number(this.selectedFeedbackMode !== "all") +
      Number(this.selectedTag !== "all");
    const summary = grid.parentElement?.querySelector(".plw-quiz-filter-bar summary");
    if (summary) summary.textContent = activeCount ? `筛选测试集合（${activeCount} 项已启用）` : "筛选测试集合";

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="plw-quiz-empty"><p>没有找到符合当前筛选条件的测试集合。</p></div>`;
      return;
    }

    for (const item of filtered) {
      const card = document.createElement("div");
      card.className = "plw-quiz-landing__card";

      const playUrl = `${resolveSiteUrl("quiz/play/")}?set=${encodeURIComponent(item.id)}`;
      const draftBadge = item.status === "draft" ? `<span class="plw-quiz-badge--warning">草稿</span>` : "";
      const modeText = item.feedbackMode === "immediate" ? "即时反馈" : "整卷提交";

      const tagsHtml =
        item.tags.length > 0
          ? `<div class="plw-quiz-card-tags">${item.tags
              .map(t => `<span class="plw-quiz-badge">${escapeHtml(t)}</span>`)
              .join("")}</div>`
          : "";

      card.innerHTML = `
        <div>
          <h3>${escapeHtml(item.title)} ${draftBadge}</h3>
          ${item.description ? `<p class="plw-quiz-landing__desc">${escapeHtml(item.description)}</p>` : ""}
          ${item.authors?.length ? `<p>编排：${escapeHtml(item.authors.map(a => a.name).join("、"))}</p>` : ""}
          <p class="plw-quiz-landing__card-meta">
            <span>题量：${item.questionCount} 题</span> ·
            <span>模式：${modeText}</span>
            ${item.estimatedMinutes ? ` · <span>预计约 ${item.estimatedMinutes} 分钟</span>` : ""}
          </p>
          ${tagsHtml}
        </div>
        <div class="plw-quiz-landing__links">
          ${
            item.runnable
              ? `<a class="plw-quiz-landing__btn" href="${playUrl}">开始小测</a>`
              : `<button type="button" class="plw-quiz-landing__btn" disabled>不可用</button>`
          }
        </div>
      `;

      const licenseNotice = renderLicenseNotice(item, "题集编排");
      if (licenseNotice) card.firstElementChild?.append(licenseNotice);

      if (!item.runnable && this.manifest.preview && item.unavailableReason) {
        const reason = document.createElement("p");
        reason.className = "plw-quiz-card-reason";
        reason.textContent = item.unavailableReason;
        card.append(reason);
      }

      grid.append(card);
    }
  }
}
