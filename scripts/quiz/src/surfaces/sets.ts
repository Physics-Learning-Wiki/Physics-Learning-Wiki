import { loadManifest, loadSetCatalog, loadTaxonomyCatalog, resolveSiteUrl } from "../data.js";
import { escapeHtml } from "../question-renderer.js";
import type { Manifest, SetCatalogItem, TaxonomyCatalog } from "../types.js";

export class SetsSurface {
  private readonly abort = new AbortController();
  private manifestUrl!: URL;
  private manifest!: Manifest;
  private catalog: SetCatalogItem[] = [];
  private taxonomy?: TaxonomyCatalog;

  private keyword = "";
  private selectedTopic = "all";
  private selectedFeedbackMode = "all";
  private selectedTag = "all";

  constructor(private readonly root: HTMLElement) {}

  async start(): Promise<void> {
    try {
      const manifestPath = this.root.dataset.manifestUrl ?? resolveSiteUrl("_generated/question-bank/manifest.json");
      this.manifestUrl = new URL(manifestPath, window.location.href);
      this.manifest = await loadManifest(this.manifestUrl, this.abort.signal);

      this.catalog = await loadSetCatalog(this.manifestUrl, this.manifest.catalogs.sets, this.abort.signal);

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
    this.root.innerHTML = "";
  }

  private render(): void {
    this.root.innerHTML = "";
    const container = document.createElement("div");
    container.className = "plw-quiz-sets";

    // 1. Available topics and tags
    const allTopics = new Set<string>();
    const allTags = new Set<string>();

    const visibleItems = this.catalog.filter(
      item => this.manifest.preview || item.status === "published"
    );

    for (const item of visibleItems) {
      for (const tid of item.topicIds) allTopics.add(tid);
      for (const tag of item.tags) allTags.add(tag);
    }

    // 2. Filter Bar
    const filterBar = document.createElement("div");
    filterBar.className = "plw-quiz-filter-bar";

    filterBar.innerHTML = `
      <div class="plw-quiz-filter-row">
        <div class="plw-quiz-search-wrap">
          <input type="search" class="plw-quiz-search-input" placeholder="按测试名称或描述搜索..." value="${escapeHtml(
            this.keyword
          )}">
        </div>
        <div class="plw-quiz-select-wrap">
          <select class="plw-quiz-filter-select" id="plw-select-topic" aria-label="按主题筛选">
            <option value="all">所有物理主题</option>
            ${Array.from(allTopics)
              .sort()
              .map(tid => {
                const title = this.taxonomy?.topics[tid]?.title ?? tid;
                return `<option value="${escapeHtml(tid)}" ${
                  this.selectedTopic === tid ? "selected" : ""
                }>${escapeHtml(title)}</option>`;
              })
              .join("")}
          </select>
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
                  `<option value="${escapeHtml(tag)}" ${
                    this.selectedTag === tag ? "selected" : ""
                  }>${escapeHtml(tag)}</option>`
              )
              .join("")}
          </select>
        </div>
      </div>
    `;

    filterBar.querySelector(".plw-quiz-search-input")?.addEventListener("input", e => {
      this.keyword = (e.target as HTMLInputElement).value.trim().toLowerCase();
      this.renderList(cardsGrid, countNotice);
    });

    filterBar.querySelector("#plw-select-topic")?.addEventListener("change", e => {
      this.selectedTopic = (e.target as HTMLSelectElement).value;
      this.renderList(cardsGrid, countNotice);
    });

    filterBar.querySelector("#plw-select-mode")?.addEventListener("change", e => {
      this.selectedFeedbackMode = (e.target as HTMLSelectElement).value;
      this.renderList(cardsGrid, countNotice);
    });

    filterBar.querySelector("#plw-select-tag")?.addEventListener("change", e => {
      this.selectedTag = (e.target as HTMLSelectElement).value;
      this.renderList(cardsGrid, countNotice);
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

    const filtered = this.catalog.filter(item => {
      if (!this.manifest.preview && item.status !== "published") return false;

      if (this.keyword) {
        const text = `${item.title} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
        if (!text.includes(this.keyword)) return false;
      }

      if (this.selectedTopic !== "all") {
        if (!item.topicIds.includes(this.selectedTopic)) return false;
      }

      if (this.selectedFeedbackMode !== "all") {
        if (item.feedbackMode !== this.selectedFeedbackMode) return false;
      }

      if (this.selectedTag !== "all") {
        if (!item.tags.includes(this.selectedTag)) return false;
      }

      return true;
    });

    countNotice.textContent = `共显示 ${filtered.length} 个测试集合`;

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

      const tagsHtml = item.tags.length > 0
        ? `<div class="plw-quiz-card-tags">${item.tags
            .map(t => `<span class="plw-quiz-badge">${escapeHtml(t)}</span>`)
            .join("")}</div>`
        : "";

      card.innerHTML = `
        <div>
          <h3>${escapeHtml(item.title)} ${draftBadge}</h3>
          ${item.description ? `<p class="plw-quiz-landing__desc">${escapeHtml(item.description)}</p>` : ""}
          <p class="plw-quiz-landing__card-meta">
            <span>题量：${item.questionCount} 题</span> · 
            <span>模式：${modeText}</span>
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
