import { createBackup, parseBackup, serializeBackup, MAX_BACKUP_FILE_BYTES } from "../backup.js";
import { createAbortScope } from "../abort-scope.js";
import { loadManifest, loadQuestionCatalog, resolveSiteUrl } from "../data.js";
import { typeset } from "../math.js";
import { escapeHtml, hydrateAssets, renderQuestionStem } from "../question-renderer.js";
import { createQuestionTools } from "../question-tools.js";
import { QuizStore } from "../storage.js";
import { launchLocalPractice } from "../practice-launcher.js";
import type { Manifest, Question, QuizStorageData } from "../types.js";

type View = "mistakes" | "saved" | "data";
export class LibrarySurface {
  private readonly abort: AbortController;
  private readonly releaseAbortScope: () => void;
  private store!: QuizStore;
  private questions = new Map<string, Question>();
  private catalogError = "";
  private manifestUrl?: URL;
  private manifest?: Manifest;
  private unsubscribe?: () => void;
  private flash = "";
  private cardAbort = new AbortController();
  constructor(private readonly root: HTMLElement, parentSignal: AbortSignal) {
    const scope = createAbortScope(parentSignal);
    this.abort = scope.controller;
    this.releaseAbortScope = scope.release;
  }
  async start(): Promise<void> {
    try {
      const url = this.root.dataset.manifestUrl ?? resolveSiteUrl("_generated/question-bank/manifest.json");
      this.manifestUrl = new URL(url, window.location.href);
      const manifest = await loadManifest(this.manifestUrl, this.abort.signal);
      this.manifest = manifest;
      this.store = new QuizStore(window.localStorage, manifest.preview);
      await this.store.ready();
      this.unsubscribe = this.store.subscribe(() => this.render());
      if (this.route().view === "data") {
        this.render();
        void loadQuestionCatalog(this.manifestUrl, manifest.catalogs.questions, this.abort.signal)
          .then(catalog => {
            this.questions = new Map(catalog.map(q => [q.id, q]));
          })
          .catch(error => {
            this.catalogError = error instanceof Error ? error.message : String(error);
          });
      } else {
        try {
          const catalog = await loadQuestionCatalog(this.manifestUrl, manifest.catalogs.questions, this.abort.signal);
          this.questions = new Map(catalog.map(q => [q.id, q]));
        } catch (error) {
          this.catalogError = error instanceof Error ? error.message : String(error);
        }
        if (!this.abort.signal.aborted) this.render();
      }
    } catch (error) {
      if (this.abort.signal.aborted) return;
      this.catalogError = error instanceof Error ? error.message : String(error);
      this.store = new QuizStore(window.localStorage, false);
      await this.store.ready();
      this.unsubscribe = this.store.subscribe(() => this.render());
      this.render();
    }
    window.addEventListener("popstate", () => this.render(), { signal: this.abort.signal });
  }
  destroy(): void {
    this.cardAbort.abort();
    this.store?.destroy();
    this.abort.abort();
    this.releaseAbortScope();
    this.unsubscribe?.();
    this.root.innerHTML = "";
  }
  private route(): { view: View; state: string; collection: string; q: string; sort: string; notice: string } {
    const params = new URL(window.location.href).searchParams;
    const rawView = params.get("view");
    const view: View = rawView === "saved" || rawView === "data" ? rawView : "mistakes";
    let notice = rawView && !["mistakes", "saved", "data"].includes(rawView) ? "未知视图，已显示错题本。" : "";
    const rawState = params.get("state");
    const state = ["learning", "mastered", "all"].includes(rawState ?? "") ? rawState! : "learning";
    if (rawState && state !== rawState) notice = "未知错题状态，已显示待巩固。";
    let collection = params.get("collection") ?? "all";
    if (collection === "all") collection = "all";
    else if (collection !== "unfiled" && !this.store.read().library.collections[collection]) {
      collection = "all";
      notice = "收藏夹已不可用，已显示全部收藏。";
    }
    return {
      view,
      state,
      collection,
      q: params.get("q")?.trim().toLowerCase() ?? "",
      sort: params.get("sort") === "id" ? "id" : "recent",
      notice
    };
  }
  private navigate(values: Record<string, string | null>): void {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    history.pushState(null, "", url.href);
    this.render();
  }
  private render(): void {
    if (!this.store || this.abort.signal.aborted) return;
    this.cardAbort.abort();
    this.cardAbort = new AbortController();
    const snapshot = this.store.read();
    const route = this.route();
    this.root.innerHTML = "";
    const shell = document.createElement("div");
    shell.className = "plw-quiz-library";

    // Top Segmented Navigation Tabs
    const tabs = document.createElement("nav");
    tabs.className = "plw-quiz-library__tabs";
    tabs.setAttribute("aria-label", "我的题库视图");
    tabs.setAttribute("role", "tablist");
    const wrongCount = Object.values(snapshot.learning.questions).filter(r => !!r.wrongBook).length;
    const savedCount = Object.keys(snapshot.library.savedQuestions).length;
    const links: Array<[View, string, number | null]> = [
      ["mistakes", "错题本", wrongCount],
      ["saved", "收藏", savedCount],
      ["data", "学习数据", null]
    ];
    for (const [view, label, count] of links) {
      const link = document.createElement("a");
      link.href = `?view=${view}`;
      link.className = "plw-quiz-tab-item";
      if (count !== null) {
        link.innerHTML = `<span class="plw-quiz-tab-label">${escapeHtml(
          label
        )}</span> <span class="plw-quiz-tab-badge">${count}</span>`;
      } else {
        link.innerHTML = `<span class="plw-quiz-tab-label">${escapeHtml(label)}</span>`;
      }
      if (route.view === view) {
        link.setAttribute("aria-current", "page");
        link.classList.add("is-active");
      }
      link.addEventListener("click", event => {
        event.preventDefault();
        this.navigate({ view, state: null, collection: null, q: null, sort: null });
      });
      tabs.append(link);
    }
    shell.append(tabs);

    // Global Notice / Flash Alert
    if (route.notice || this.flash || this.store.getStatus() !== "ready" || this.catalogError) {
      const note = document.createElement("div");
      note.className = "plw-quiz-notice plw-quiz-library__notice";
      note.setAttribute("role", "status");
      const status = this.store.getStatus();
      note.textContent = [
        route.notice,
        this.flash,
        status === "corrupt_data" ? "本地数据损坏，原文已保留，当前只读。" : "",
        status === "version_mismatch" ? "当前版本无法读取较新或未知格式，原文已保留，当前只读。" : "",
        status === "unavailable" ? "浏览器存储不可用，本地学习档案不可写。" : "",
        this.catalogError ? `题库暂不可用：${this.catalogError}` : ""
      ]
        .filter(Boolean)
        .join(" ");
      shell.append(note);
    }
    this.flash = "";

    if (route.view === "data") this.renderData(shell, snapshot);
    else this.renderQuestions(shell, snapshot, route);
    this.root.append(shell);
  }

  private renderQuestions(
    shell: HTMLElement,
    snapshot: QuizStorageData,
    route: ReturnType<LibrarySurface["route"]>
  ): void {
    if (route.view === "mistakes") {
      const subNav = document.createElement("nav");
      subNav.className = "plw-quiz-library__sub-filters";
      subNav.setAttribute("aria-label", "错题状态筛选");
      for (const [state, label] of [
        ["learning", "待巩固"],
        ["mastered", "已掌握"],
        ["all", "全部"]
      ] as const) {
        const link = document.createElement("a");
        link.href = `?view=mistakes&state=${state}`;
        link.className = "plw-quiz-filter-chip";
        link.textContent = label;
        if (route.state === state) {
          link.setAttribute("aria-current", "page");
          link.classList.add("is-active");
        }
        link.addEventListener("click", event => {
          event.preventDefault();
          this.navigate({ state });
        });
        subNav.append(link);
      }
      shell.append(subNav);
      if (snapshot.learning.historyCoverage === "partial_legacy") {
        const hint = document.createElement("div");
        hint.className = "plw-quiz-library__hint-banner";
        hint.innerHTML = `<span aria-hidden="true">ℹ️</span> <span>升级前仅恢复现存记录，历史统计可能不完整。</span>`;
        shell.append(hint);
      }
    } else {
      const toolbar = document.createElement("div");
      toolbar.className = "plw-quiz-library__collection-toolbar";

      const selectWrap = document.createElement("div");
      selectWrap.className = "plw-quiz-select-wrap";
      const select = document.createElement("select");
      select.className = "plw-quiz-filter-select";
      select.setAttribute("aria-label", "选择收藏夹");
      const options: Array<[string, string]> = [
        ["all", "全部收藏"],
        ["unfiled", "未分类"],
        ...Object.values(snapshot.library.collections)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map(c => [c.id, c.name] as [string, string])
      ];
      for (const [id, name] of options) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = name;
        select.append(option);
      }
      select.value = route.collection;
      select.addEventListener("change", () =>
        this.navigate({ collection: select.value === "all" ? null : select.value })
      );
      selectWrap.append(select);
      toolbar.append(selectWrap);

      const actions = document.createElement("div");
      actions.className = "plw-quiz-library__collection-actions";
      const add = document.createElement("button");
      add.type = "button";
      add.textContent = "+ 新建收藏夹";
      add.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
      add.addEventListener("click", async () => {
        const name = window.prompt("收藏夹名称（最多 40 字）");
        if (name === null) return;
        const result = await this.store.createCollection(name, snapshot.profileEpoch);
        this.flash = result.ok ? "收藏夹已创建。" : `创建失败：${result.reason}`;
        this.render();
      });
      actions.append(add);

      if (route.collection !== "all" && route.collection !== "unfiled") {
        const rename = document.createElement("button");
        rename.type = "button";
        rename.textContent = "改名";
        rename.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
        rename.addEventListener("click", async () => {
          const name = window.prompt("新名称", snapshot.library.collections[route.collection].name);
          if (name === null) return;
          const result = await this.store.renameCollection(route.collection, name, snapshot.profileEpoch);
          this.flash = result.ok ? "已改名。" : `改名失败：${result.reason}`;
          this.render();
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "删除收藏夹";
        remove.className = "plw-quiz-btn--danger plw-quiz-btn--sm";
        remove.addEventListener("click", async () => {
          if (!window.confirm("删除收藏夹后，其中题目仍保持收藏，并进入未分类或其他收藏夹。")) return;
          const result = await this.store.deleteCollection(route.collection, snapshot.profileEpoch);
          this.flash = result.ok ? "收藏夹已删除，题目仍保持收藏。" : `删除失败：${result.reason}`;
          if (result.ok) this.navigate({ collection: null });
          else this.render();
        });
        actions.append(rename, remove);
      }
      toolbar.append(actions);
      shell.append(toolbar);
    }

    // Search and Sort Control Bar
    const searchBar = document.createElement("div");
    searchBar.className = "plw-quiz-library__search-bar";

    const searchWrap = document.createElement("div");
    searchWrap.className = "plw-quiz-search-wrap";
    const searchIcon = document.createElement("span");
    searchIcon.className = "plw-quiz-search-icon";
    searchIcon.setAttribute("aria-hidden", "true");
    searchIcon.textContent = "🔍";
    const search = document.createElement("input");
    search.type = "search";
    search.className = "plw-quiz-search-input";
    search.placeholder = "搜索题号或题干...";
    search.value = route.q;
    search.setAttribute("aria-label", "搜索我的题库");
    search.addEventListener("change", () => this.navigate({ q: search.value.trim() || null }));
    searchWrap.append(searchIcon, search);

    const sortWrap = document.createElement("div");
    sortWrap.className = "plw-quiz-select-wrap";
    const sort = document.createElement("select");
    sort.className = "plw-quiz-filter-select";
    sort.setAttribute("aria-label", "排序");
    for (const [id, name] of [
      ["recent", "最近更新"],
      ["id", "题目编号"]
    ]) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = name;
      sort.append(option);
    }
    sort.value = route.sort;
    sort.addEventListener("change", () => this.navigate({ sort: sort.value }));
    sortWrap.append(sort);

    const items =
      route.view === "mistakes"
        ? Object.entries(snapshot.learning.questions).filter(
            ([, r]) => r.wrongBook && (route.state === "all" || r.wrongBook.status === route.state)
          )
        : Object.entries(snapshot.library.savedQuestions).filter(
            ([, r]) =>
              route.collection === "all" ||
              (route.collection === "unfiled"
                ? r.collectionIds.length === 0
                : r.collectionIds.includes(route.collection))
          );
    const filtered = items.filter(([id]) => {
      const q = this.questions.get(id);
      return !route.q || `${id} ${q?.stemHtml ?? ""}`.toLowerCase().includes(route.q);
    });
    filtered.sort((a, b) =>
      route.sort === "id"
        ? a[0].localeCompare(b[0])
        : ("updatedAt" in b[1] ? b[1].updatedAt : "").localeCompare("updatedAt" in a[1] ? a[1].updatedAt : "")
    );

    const countBadge = document.createElement("div");
    countBadge.className = "plw-quiz-library__count-badge";
    const countSpan = document.createElement("span");
    countSpan.className = "plw-quiz-badge";
    countSpan.setAttribute("role", "status");
    countSpan.textContent = `共 ${filtered.length} 道题`;
    countBadge.append(countSpan);

    searchBar.append(searchWrap, sortWrap, countBadge);
    shell.append(searchBar);

    const available = filtered
      .map(([id]) => this.questions.get(id))
      .filter((q): q is Question => !!q && (q.status === "published" || !!this.manifest?.preview));

    // Practice Launcher Panel
    if (this.manifest && available.length) {
      const practice = document.createElement("div");
      practice.className = "plw-quiz-practice-banner";

      const header = document.createElement("div");
      header.className = "plw-quiz-practice-banner__header";
      header.innerHTML = `
        <span class="plw-quiz-practice-banner__title">⚡ 快速专项练习</span>
        <span class="plw-quiz-practice-banner__desc">从当前筛选的 <strong>${available.length}</strong> 道可用题目中抽取：</span>
      `;
      practice.append(header);

      const actions = document.createElement("div");
      actions.className = "plw-quiz-practice-banner__actions";

      const stepAmounts = [5, 10, 20].filter(count => count < available.length);
      for (const count of stepAmounts) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
        btn.textContent = `练习 ${count} 题`;
        btn.addEventListener("click", () => this.startBatchPractice(available, count, route, snapshot));
        actions.append(btn);
      }

      const allBtn = document.createElement("button");
      allBtn.type = "button";
      allBtn.className = "plw-quiz-btn--primary plw-quiz-btn--sm";
      allBtn.textContent = `练习全部 (${available.length} 题)`;
      allBtn.addEventListener("click", () => this.startBatchPractice(available, available.length, route, snapshot));
      actions.append(allBtn);

      practice.append(actions);
      shell.append(practice);
    }

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "plw-quiz-empty";
      empty.innerHTML = `<p>${
        route.view === "mistakes" ? "这里还没有符合条件的错题。" : "这里还没有符合条件的收藏题。"
      }</p>`;
      shell.append(empty);
    }

    // Question Cards List
    const list = document.createElement("div");
    list.className = "plw-quiz-library__list";

    for (const [id] of filtered.slice(0, 100)) {
      const card = document.createElement("article");
      card.className = "plw-quiz-library__card plw-quiz-question";
      card.id = `library-${id}`;

      // Card Header
      const cardHeader = document.createElement("div");
      cardHeader.className = "plw-quiz-library__card-header";

      const metaLeft = document.createElement("div");
      metaLeft.className = "plw-quiz-library__card-meta-left";

      const title = document.createElement("h3");
      title.className = "plw-quiz-library__card-title";
      const permalinkUrl = `${resolveSiteUrl("quiz/questions/")}?q=${encodeURIComponent(id)}`;
      title.innerHTML = `<a class="plw-quiz-question-browser__permalink" href="${escapeHtml(
        permalinkUrl
      )}" title="点击查看题目详情与解析"><code>${escapeHtml(id)}</code> 🔗</a>`;
      metaLeft.append(title);

      const q = this.questions.get(id);
      if (q) {
        const typeMap: Record<string, string> = {
          single_choice: "单选",
          multiple_choice: "多选",
          fill_in_blank: "填空",
          free_response: "简答"
        };
        const tags = document.createElement("div");
        tags.className = "plw-quiz-card-tags";
        const diffBadge =
          q.difficulty != null
            ? `<span class="plw-quiz-badge">${"★".repeat(Math.max(1, Math.min(3, q.difficulty)))}</span>`
            : "";
        tags.innerHTML = `
          <span class="plw-quiz-badge">${escapeHtml(typeMap[q.type] ?? q.type)}</span>
          ${diffBadge}
          ${this.manifest?.preview && q.status === "draft" ? `<span class="plw-quiz-badge--warning">草稿</span>` : ""}
        `;
        metaLeft.append(tags);
      }
      cardHeader.append(metaLeft);

      if (route.view === "mistakes") {
        const metaRight = document.createElement("div");
        metaRight.className = "plw-quiz-library__card-meta-right";
        const record = snapshot.learning.questions[id];
        if (record) {
          const statusBadge = document.createElement("span");
          statusBadge.className =
            record.wrongBook?.status === "mastered"
              ? "plw-quiz-badge is-correct"
              : "plw-quiz-badge plw-quiz-badge--warning";
          statusBadge.textContent = record.wrongBook?.status === "mastered" ? "✓ 已掌握" : "待巩固";
          const statsSpan = document.createElement("span");
          statsSpan.className = "plw-quiz-library__card-stats";
          statsSpan.textContent = `作答 ${record.answeredCount} 次 · 客观错 ${record.incorrectCount} 次`;
          metaRight.append(statusBadge, statsSpan);
        }
        cardHeader.append(metaRight);
      }
      card.append(cardHeader);

      // Card Body
      if (q && q.status !== "retired") {
        card.append(renderQuestionStem(q));
        card.append(createQuestionTools(q, this.store, this.cardAbort.signal, { manifestUrl: this.manifestUrl }));
        if (this.manifestUrl) {
          hydrateAssets(card, [q], this.manifestUrl);
          typeset(card);
        }
      } else {
        const tombstone = document.createElement("p");
        tombstone.className = "plw-quiz-library__tombstone";
        tombstone.textContent = "该题当前版本已不可用；本地记录已保留。";
        card.append(tombstone);
      }

      // Card Action Toolbar
      const actionsRow = document.createElement("div");
      actionsRow.className = "plw-quiz-library__card-actions";

      const leftActions = document.createElement("div");
      leftActions.className = "plw-quiz-library__card-actions-left";

      if (q && q.status !== "retired" && this.manifest) {
        const practiceOne = document.createElement("button");
        practiceOne.type = "button";
        practiceOne.textContent = "练习此题";
        practiceOne.className = "plw-quiz-btn--primary plw-quiz-btn--sm";
        practiceOne.addEventListener("click", () => {
          const result = launchLocalPractice({
            questions: [q],
            count: 1,
            title: `练习 ${id}`,
            origin: route.view === "mistakes" ? { type: "mistakes" } : { type: "saved" },
            manifest: this.manifest!,
            store: this.store
          });
          if (!result.ok) {
            this.flash = result.reason;
            this.render();
          }
        });
        leftActions.append(practiceOne);

        const viewLink = document.createElement("a");
        viewLink.href = `${resolveSiteUrl("quiz/questions/")}?q=${encodeURIComponent(id)}`;
        viewLink.textContent = "查看题目与解析";
        viewLink.className = "plw-quiz-btn--secondary plw-quiz-btn--sm plw-quiz-btn--link";
        leftActions.append(viewLink);
      }
      actionsRow.append(leftActions);

      const rightActions = document.createElement("div");
      rightActions.className = "plw-quiz-library__card-actions-right";

      if (route.view === "mistakes") {
        const record = snapshot.learning.questions[id];
        const statusBtn = document.createElement("button");
        statusBtn.type = "button";
        statusBtn.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
        statusBtn.textContent = record?.wrongBook?.status === "mastered" ? "重新学习" : "标记已掌握";
        statusBtn.disabled = !q || q.status === "retired";
        statusBtn.addEventListener("click", async () => {
          if (!q) return;
          const next = record?.wrongBook?.status === "mastered" ? "learning" : "mastered";
          const result = await this.store.setWrongStatus(id, next, q.version, snapshot.profileEpoch);
          this.flash = result.ok ? "错题状态已更新。" : `更新失败：${result.reason}`;
          this.render();
        });

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "plw-quiz-btn--secondary plw-quiz-btn--sm plw-quiz-btn--ghost-danger";
        removeBtn.textContent = "移出错题本";
        removeBtn.addEventListener("click", async () => {
          const result = await this.store.setWrongStatus(id, "removed", q?.version ?? 1, snapshot.profileEpoch);
          this.flash = result.ok ? "已移出错题本，作答统计仍保留。" : `移出失败：${result.reason}`;
          this.render();
        });
        rightActions.append(statusBtn, removeBtn);
      } else if (route.view === "saved") {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "plw-quiz-btn--secondary plw-quiz-btn--sm plw-quiz-btn--ghost-danger";
        removeBtn.textContent = "取消收藏";
        removeBtn.addEventListener("click", async () => {
          const result = await this.store.setSaved(
            id,
            snapshot.library.savedQuestions[id]?.savedQuestionVersion ?? 1,
            false,
            snapshot.profileEpoch
          );
          this.flash = result.ok ? "已取消收藏。" : `取消失败：${result.reason}`;
          this.render();
        });
        rightActions.append(removeBtn);
      }
      actionsRow.append(rightActions);
      card.append(actionsRow);

      list.append(card);
    }
    shell.append(list);

    if (filtered.length > 100) {
      const hint = document.createElement("p");
      hint.className = "plw-quiz-library__hint";
      hint.textContent = "仅显示前 100 道题，请缩小搜索范围。";
      shell.append(hint);
    }
  }

  private startBatchPractice(
    available: Question[],
    count: number,
    route: ReturnType<LibrarySurface["route"]>,
    snapshot: QuizStorageData
  ): void {
    const origin =
      route.view === "mistakes"
        ? { type: "mistakes" as const }
        : route.collection !== "all" && route.collection !== "unfiled"
        ? {
            type: "collection" as const,
            collectionId: route.collection,
            collectionName: snapshot.library.collections[route.collection].name
          }
        : { type: "saved" as const };
    const result = launchLocalPractice({
      questions: available,
      count,
      title: route.view === "mistakes" ? "错题重练" : "收藏练习",
      origin,
      manifest: this.manifest!,
      store: this.store
    });
    if (!result.ok) {
      this.flash = result.reason;
      this.render();
    }
  }

  private renderData(shell: HTMLElement, snapshot: QuizStorageData): void {
    const status = this.store.getStatus();

    // 1. Metric Stat Cards Grid
    const statsGrid = document.createElement("div");
    statsGrid.className = "plw-quiz-library__stats-grid";
    const statItems = [
      { icon: "📝", value: Object.keys(snapshot.learning.questions).length, label: "学习记录" },
      { icon: "⭐", value: Object.keys(snapshot.library.savedQuestions).length, label: "收藏题目" },
      { icon: "📁", value: Object.keys(snapshot.library.collections).length, label: "收藏夹" },
      { icon: "⏱️", value: snapshot.attempts.length, label: "近期作答" },
      { icon: "🔄", value: Object.values(snapshot.activeSessions).flat().length, label: "未完成练习" }
    ];
    for (const item of statItems) {
      const statCard = document.createElement("div");
      statCard.className = "plw-quiz-stat-card";
      statCard.innerHTML = `
        <span class="plw-quiz-stat-card__icon" aria-hidden="true">${item.icon}</span>
        <span class="plw-quiz-stat-card__value">${item.value}</span>
        <span class="plw-quiz-stat-card__label">${escapeHtml(item.label)}</span>
      `;
      statsGrid.append(statCard);
    }
    shell.append(statsGrid);

    // 2. Info Banner
    const hint = document.createElement("div");
    hint.className = "plw-quiz-library__hint-banner";
    hint.innerHTML = `<span aria-hidden="true">ℹ️</span> <span>学习档案仅保存在当前浏览器本地。导出的是已保存记录；站点题库仍需联网加载。覆盖恢复会使其他已打开页面的旧作答失效。</span>`;
    shell.append(hint);

    // 3. Panels
    if (status === "corrupt_data" || status === "version_mismatch") {
      const rawPanel = document.createElement("div");
      rawPanel.className = "plw-quiz-data-panel plw-quiz-data-panel--danger";
      rawPanel.innerHTML = `
        <h3>数据异常降级模式</h3>
        <p>当前本地学习档案损坏或属于未知版本，为保护数据已切换至只读模式。您可以导出原始 JSON 数据进行排查。</p>
      `;
      const rawBtn = document.createElement("button");
      rawBtn.type = "button";
      rawBtn.className = "plw-quiz-btn--secondary";
      rawBtn.textContent = "导出原始数据";
      rawBtn.addEventListener("click", () => {
        const data = this.store.getRawData();
        if (data !== null) this.download(data, "physics-learning-wiki-quiz-raw.json");
      });
      rawPanel.append(rawBtn);
      shell.append(rawPanel);
    } else {
      // Backup and Restore Panels Grid
      const dataGrid = document.createElement("div");
      dataGrid.className = "plw-quiz-library__data-grid";

      // Export Panel
      const exportPanel = document.createElement("div");
      exportPanel.className = "plw-quiz-data-panel";
      exportPanel.innerHTML = `
        <h3>📥 导出备份</h3>
        <p>将当前浏览器的学习档案导出为标准 JSON 备份文件，可用于跨设备同步或数据留存。</p>
      `;
      const exportButton = document.createElement("button");
      exportButton.type = "button";
      exportButton.className = "plw-quiz-btn--primary";
      exportButton.textContent = "导出学习档案";
      exportButton.disabled = status !== "ready";
      exportButton.addEventListener("click", () => {
        try {
          const backup = serializeBackup(createBackup(this.store.read(), this.store.preview));
          const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
          this.download(backup, `physics-learning-wiki-quiz-backup-${stamp}.json`);
        } catch (error) {
          this.flash = error instanceof Error ? error.message : String(error);
          this.render();
        }
      });
      exportPanel.append(exportButton);
      dataGrid.append(exportPanel);

      // Restore Panel
      const restorePanel = document.createElement("div");
      restorePanel.className = "plw-quiz-data-panel";
      restorePanel.innerHTML = `
        <h3>📤 恢复备份</h3>
        <p>选择已导出的学习档案 JSON 备份文件。系统将在确认覆盖前显示档案版本与条目比对。</p>
      `;
      const pickerWrap = document.createElement("div");
      pickerWrap.className = "plw-quiz-file-picker-wrap";

      const fileLabel = document.createElement("label");
      fileLabel.className = "plw-quiz-btn--secondary plw-quiz-file-upload-btn";
      fileLabel.innerHTML = `<span>📂 选择备份文件</span>`;

      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.className = "plw-quiz-file-input";
      fileLabel.append(input);

      const fileNameDisplay = document.createElement("span");
      fileNameDisplay.className = "plw-quiz-file-name";
      fileNameDisplay.textContent = "未选择任何文件";

      pickerWrap.append(fileLabel, fileNameDisplay);
      restorePanel.append(pickerWrap);

      const preview = document.createElement("div");
      preview.className = "plw-quiz-backup-preview-wrap";
      restorePanel.append(preview);

      input.addEventListener("change", async () => {
        preview.replaceChildren();
        const file = input.files?.[0];
        if (!file) {
          fileNameDisplay.textContent = "未选择任何文件";
          return;
        }
        fileNameDisplay.textContent = file.name;
        if (file.size > MAX_BACKUP_FILE_BYTES) {
          preview.innerHTML = `<p class="plw-quiz-save-error">文件超过 5 MiB 上限。</p>`;
          return;
        }
        const parsed = parseBackup(await file.text(), this.store.preview);
        if (!parsed.ok) {
          preview.innerHTML = `<p class="plw-quiz-save-error">备份无效：${escapeHtml(parsed.error)}</p>`;
          return;
        }
        const base = this.store.read();
        const backup = parsed.backup;

        const previewBox = document.createElement("div");
        previewBox.className = "plw-quiz-backup-preview";
        previewBox.innerHTML = `
          <h4>备份文件对比</h4>
          <div class="plw-quiz-backup-diff-grid">
            <div>导出时间：<strong>${escapeHtml(backup.exportedAt)}</strong></div>
            <div>学习记录：当前 <strong>${Object.keys(base.learning.questions).length}</strong> 条 → 备份中 <strong>${
          Object.keys(backup.data.learning.questions).length
        }</strong> 条</div>
            <div>收藏题目：当前 <strong>${
              Object.keys(base.library.savedQuestions).length
            }</strong> 条 → 备份中 <strong>${Object.keys(backup.data.library.savedQuestions).length}</strong> 条</div>
          </div>
          <div class="plw-quiz-backup-warning">⚠️ 覆盖将替换当前已保存档案，其他标签页须重新加载；未完成练习可能因题库变化而失效。</div>
        `;

        const confirm = document.createElement("button");
        confirm.type = "button";
        confirm.className = "plw-quiz-btn--danger";
        confirm.textContent = "覆盖并恢复";
        confirm.addEventListener("click", async () => {
          confirm.disabled = true;
          const result = await this.store.restoreProfile(backup.data, base.profileEpoch, base.revision);
          this.flash = result.ok
            ? "学习档案已恢复，请重新打开旧练习页面。"
            : result.reason === "conflict"
            ? "当前档案已变化，请重新选择备份并核对。"
            : `恢复失败：${result.reason}`;
          this.render();
        });
        previewBox.append(confirm);
        preview.append(previewBox);
      });

      dataGrid.append(restorePanel);
      shell.append(dataGrid);
    }

    // 4. Reset Panel (Danger Zone)
    const resetPanel = document.createElement("div");
    resetPanel.className = "plw-quiz-data-panel plw-quiz-data-panel--danger";
    resetPanel.innerHTML = `
      <h3>⚠️ 危险操作</h3>
      <p>重置将永久清空当前浏览器中已保存的所有小测学习进度、错题本与收藏。此操作不可逆，建议先导出备份。</p>
    `;
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "plw-quiz-btn--danger";
    reset.textContent = "重置本地学习档案";
    const expectedRaw = this.store.getRawProfile();
    reset.addEventListener("click", async () => {
      if (!window.confirm("重置将删除当前浏览器中已保存的学习、错题、收藏和练习进度。建议先导出。是否继续？")) return;
      if (!window.confirm("再次确认：永久重置当前本地学习档案？")) return;
      const result = await this.store.resetProfile(expectedRaw);
      this.flash = result.ok ? "本地学习档案已重置，其他已打开页面须重新加载。" : `重置失败：${result.reason}`;
      this.render();
    });
    resetPanel.append(reset);
    shell.append(resetPanel);
  }
  private download(raw: string, name: string): void {
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
