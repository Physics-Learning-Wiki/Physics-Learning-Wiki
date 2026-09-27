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
    const heading = document.createElement("h2");
    heading.textContent = "我的题库";
    shell.append(heading);
    const tabs = document.createElement("nav");
    tabs.className = "plw-quiz-library__tabs";
    tabs.setAttribute("aria-label", "我的题库视图");
    const wrongCount = Object.values(snapshot.learning.questions).filter(r => !!r.wrongBook).length;
    const links: Array<[View, string]> = [
      ["mistakes", `错题本 ${wrongCount}`],
      ["saved", `收藏 ${Object.keys(snapshot.library.savedQuestions).length}`],
      ["data", "学习数据"]
    ];
    for (const [view, label] of links) {
      const link = document.createElement("a");
      link.href = `?view=${view}`;
      link.textContent = label;
      if (route.view === view) link.setAttribute("aria-current", "page");
      link.addEventListener("click", event => {
        event.preventDefault();
        this.navigate({ view, state: null, collection: null, q: null, sort: null });
      });
      tabs.append(link);
    }
    shell.append(tabs);
    if (route.notice || this.flash || this.store.getStatus() !== "ready" || this.catalogError) {
      const note = document.createElement("p");
      note.className = "plw-quiz-library__notice";
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
      const nav = document.createElement("nav");
      nav.className = "plw-quiz-library__filters";
      for (const [state, label] of [
        ["learning", "待巩固"],
        ["mastered", "已掌握"],
        ["all", "全部"]
      ] as const) {
        const link = document.createElement("a");
        link.href = `?view=mistakes&state=${state}`;
        link.textContent = label;
        if (route.state === state) link.setAttribute("aria-current", "page");
        link.addEventListener("click", event => {
          event.preventDefault();
          this.navigate({ state });
        });
        nav.append(link);
      }
      shell.append(nav);
      if (snapshot.learning.historyCoverage === "partial_legacy") {
        const hint = document.createElement("p");
        hint.textContent = "升级前仅恢复现存记录，历史统计可能不完整。";
        shell.append(hint);
      }
    } else {
      const select = document.createElement("select");
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
      shell.append(select);
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
      shell.append(add);
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
        shell.append(rename, remove);
      }
    }
    const filters = document.createElement("div");
    filters.className = "plw-quiz-library__search";
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "搜索题号或题干";
    search.value = route.q;
    search.setAttribute("aria-label", "搜索我的题库");
    search.addEventListener("change", () => this.navigate({ q: search.value.trim() || null }));
    const sort = document.createElement("select");
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
    filters.append(search, sort);
    shell.append(filters);
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
    const count = document.createElement("p");
    count.setAttribute("role", "status");
    count.textContent = `当前显示 ${filtered.length} 道题`;
    shell.append(count);
    const available = filtered
      .map(([id]) => this.questions.get(id))
      .filter((q): q is Question => !!q && (q.status === "published" || !!this.manifest?.preview));
    if (this.manifest && available.length) {
      const practice = document.createElement("div");
      practice.className = "plw-quiz-library__filters";
      const label = document.createElement("span");
      label.textContent = `从当前筛选的 ${available.length} 道可用题中抽取：`;
      practice.append(label);
      for (const requested of [5, 10, 20, 50]) {
        const amount = Math.min(requested, available.length);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
        button.textContent = requested === 50 ? `随机练习 ${amount} 题` : `练习 ${amount} 题`;
        button.addEventListener("click", () => {
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
            count: requested,
            title: route.view === "mistakes" ? "错题重练" : "收藏练习",
            origin,
            manifest: this.manifest!,
            store: this.store
          });
          if (!result.ok) {
            this.flash = result.reason;
            this.render();
          }
        });
        practice.append(button);
      }
      shell.append(practice);
    }
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.textContent = route.view === "mistakes" ? "这里还没有符合条件的错题。" : "这里还没有符合条件的收藏题。";
      shell.append(empty);
    }
    for (const [id] of filtered.slice(0, 100)) {
      const card = document.createElement("article");
      card.className = "plw-quiz-library__card plw-quiz-question";
      const title = document.createElement("h3");
      title.textContent = id;
      card.append(title);
      const q = this.questions.get(id);
      if (q && q.status !== "retired") {
        card.append(renderQuestionStem(q));
        card.append(createQuestionTools(q, this.store, this.cardAbort.signal, { manifestUrl: this.manifestUrl }));
        if (this.manifest) {
          const practiceOne = document.createElement("button");
          practiceOne.type = "button";
          practiceOne.textContent = "练习此题";
          practiceOne.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
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
          card.append(practiceOne);
        }
        if (this.manifestUrl) {
          hydrateAssets(card, [q], this.manifestUrl);
          typeset(card);
        }
        const link = document.createElement("a");
        link.href = `${resolveSiteUrl("quiz/questions/")}?q=${encodeURIComponent(id)}`;
        link.textContent = "查看题目与解析";
        card.append(link);
      } else {
        const tombstone = document.createElement("p");
        tombstone.textContent = "该题当前版本已不可用；本地记录已保留。";
        card.append(tombstone);
      }
      if (route.view === "mistakes") {
        const record = snapshot.learning.questions[id];
        const detail = document.createElement("p");
        detail.textContent =
          `已知作答 ${record.answeredCount} 次，客观答错 ${record.incorrectCount} 次。` +
          (record.wrongBook?.legacyImported ? "旧版错题记录，原因与版本可能不完整。" : "");
        card.append(detail);
        const status = document.createElement("button");
        status.type = "button";
        status.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
        status.textContent = record.wrongBook?.status === "mastered" ? "重新学习" : "标记已掌握";
        status.disabled = !q || q.status === "retired";
        status.addEventListener("click", async () => {
          if (!q) return;
          const next = record.wrongBook?.status === "mastered" ? "learning" : "mastered";
          const result = await this.store.setWrongStatus(id, next, q.version, snapshot.profileEpoch);
          this.flash = result.ok ? "错题状态已更新。" : `更新失败：${result.reason}`;
          this.render();
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "plw-quiz-btn--secondary plw-quiz-btn--sm";
        remove.textContent = "移出错题本";
        remove.addEventListener("click", async () => {
          const result = await this.store.setWrongStatus(id, "removed", q?.version ?? 1, snapshot.profileEpoch);
          this.flash = result.ok ? "已移出错题本，作答统计仍保留。" : `移出失败：${result.reason}`;
          this.render();
        });
        card.append(status, remove);
      } else if (!q || q.status === "retired") {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "取消收藏";
        remove.addEventListener("click", async () => {
          const result = await this.store.setSaved(
            id,
            snapshot.library.savedQuestions[id].savedQuestionVersion,
            false,
            snapshot.profileEpoch
          );
          this.flash = result.ok ? "已取消收藏。" : `取消失败：${result.reason}`;
          this.render();
        });
        card.append(remove);
      }
      shell.append(card);
    }
    if (filtered.length > 100) {
      const hint = document.createElement("p");
      hint.textContent = "仅显示前 100 道题，请缩小搜索范围。";
      shell.append(hint);
    }
  }
  private renderData(shell: HTMLElement, snapshot: QuizStorageData): void {
    const status = this.store.getStatus();
    const info = document.createElement("p");
    info.textContent = `学习记录 ${Object.keys(snapshot.learning.questions).length} · 收藏 ${
      Object.keys(snapshot.library.savedQuestions).length
    } · 收藏夹 ${Object.keys(snapshot.library.collections).length} · 近期作答 ${
      snapshot.attempts.length
    } · 未完成练习 ${Object.values(snapshot.activeSessions).flat().length}`;
    shell.append(info);
    const description = document.createElement("p");
    description.textContent =
      "学习档案仅保存在此浏览器。导出的是已保存内容；站点题库仍需联网加载。覆盖恢复会使其他已打开页面的旧作答失效。";
    shell.append(description);
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
    shell.append(exportButton);
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
    if (status === "corrupt_data" || status === "version_mismatch") {
      const raw = document.createElement("button");
      raw.type = "button";
      raw.textContent = "导出原始数据";
      raw.addEventListener("click", () => {
        const data = this.store.getRawData();
        if (data !== null) this.download(data, "physics-learning-wiki-quiz-raw.json");
      });
      shell.append(raw);
      shell.append(reset);
      return;
    }
    const label = document.createElement("label");
    label.textContent = "选择学习档案备份文件";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    label.append(input);
    shell.append(label);
    const preview = document.createElement("div");
    shell.append(preview);
    input.addEventListener("change", async () => {
      preview.replaceChildren();
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > MAX_BACKUP_FILE_BYTES) {
        preview.textContent = "文件超过 5 MiB 上限。";
        return;
      }
      const parsed = parseBackup(await file.text(), this.store.preview);
      if (!parsed.ok) {
        preview.textContent = `备份无效：${parsed.error}`;
        return;
      }
      const base = this.store.read();
      const backup = parsed.backup;
      const details = document.createElement("p");
      details.textContent = `备份时间 ${backup.exportedAt}。当前：${
        Object.keys(base.learning.questions).length
      } 条学习记录、${Object.keys(base.library.savedQuestions).length} 条收藏；备份：${
        Object.keys(backup.data.learning.questions).length
      } 条学习记录、${Object.keys(backup.data.library.savedQuestions).length} 条收藏。`;
      preview.append(details);
      const warning = document.createElement("p");
      warning.textContent = "覆盖将替换当前已保存档案，其他标签页须重新加载；未完成练习可能因题库变化而失效。";
      preview.append(warning);
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
      preview.append(confirm);
    });
    shell.append(reset);
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
