import {
  loadManifest,
  loadQuestionCatalog,
  loadSetBundle,
  loadSetCatalog,
  loadTaxonomyCatalog,
  readRunnerParameters,
  resolveSiteUrl
} from "./data.js";
import { createAbortScope } from "./abort-scope.js";
import { escapeHtml } from "./question-renderer.js";
import { newSeed } from "./random.js";
import { selectSetQuestions } from "./selection.js";
import type { PlaySurfaceOptions } from "./surfaces/play.js";
import { PlaySurface } from "./surfaces/play.js";
import { QuizStore } from "./storage.js";
import { clearPracticeLaunch, readPracticeLaunch } from "./practice-launcher.js";
import { createSession } from "./session.js";
import type { Manifest, Question, QuizSource, Session, SetBundle, SetCatalogItem, TaxonomyCatalog } from "./types.js";
import { InlineSurface } from "./surfaces/inline.js";
import { QuestionsSurface } from "./surfaces/questions.js";
import { SetsSurface } from "./surfaces/sets.js";
import { LibrarySurface } from "./surfaces/library.js";

class QuizApp {
  private readonly abort: AbortController;
  private readonly releaseAbortScope: () => void;
  private routeScope?: ReturnType<typeof createAbortScope>;
  private routeEpoch = 0;
  private routeRequestId = 0;
  private manifestUrl!: URL;
  private manifest!: Manifest;
  private store!: QuizStore;
  private currentPlaySurface?: PlaySurface;
  private currentPlayUrl?: string;

  constructor(private readonly root: HTMLElement, parentSignal: AbortSignal) {
    const scope = createAbortScope(parentSignal);
    this.abort = scope.controller;
    this.releaseAbortScope = scope.release;
    this.root.addEventListener("click", this.handleClick, { signal: this.abort.signal });
    window.addEventListener("popstate", this.handlePopState, { signal: this.abort.signal });
  }

  async start(): Promise<void> {
    try {
      const manifestPath = this.root.dataset.manifestUrl ?? resolveSiteUrl("_generated/question-bank/manifest.json");
      this.manifestUrl = new URL(manifestPath, window.location.href);
      this.manifest = await loadManifest(this.manifestUrl, this.abort.signal);
      if (this.abort.signal.aborted) return;
      this.store = new QuizStore(window.localStorage, this.manifest.preview);
      await this.store.ready();

      await this.route();
    } catch (error) {
      if (this.abort.signal.aborted) return;
      this.renderError(error instanceof Error ? error.message : "加载题库清单失败");
    }
  }

  destroy(): void {
    this.store?.destroy();
    this.abort.abort();
    this.releaseAbortScope();
    this.routeScope?.controller.abort();
    this.routeScope?.release();
    this.routeScope = undefined;
    this.currentPlaySurface?.destroy();
    this.currentPlaySurface = undefined;
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
    void this.route();
  };

  private handlePopState = (): void => {
    void this.route();
  };

  private async route(): Promise<void> {
    const requestId = ++this.routeRequestId;
    if (this.currentPlaySurface) {
      const saved = await this.currentPlaySurface.flushBeforeNavigation();
      if (requestId !== this.routeRequestId) return;
      if (!saved) {
        if (this.currentPlayUrl) history.replaceState(null, "", this.currentPlayUrl);
        return;
      }
    }
    this.routeScope?.controller.abort();
    this.routeScope?.release();
    this.routeScope = undefined;
    this.currentPlaySurface?.destroy();
    this.currentPlaySurface = undefined;
    this.currentPlayUrl = undefined;
    if (this.abort.signal.aborted) return;

    const routeScope = createAbortScope(this.abort.signal);
    this.routeScope = routeScope;
    const signal = routeScope.controller.signal;
    const epoch = ++this.routeEpoch;

    const params = readRunnerParameters();
    const query = new URL(window.location.href).searchParams;
    const launchId = query.get("launch");
    const sessionId = query.get("session");
    if ([Boolean(params.setId), Boolean(launchId), Boolean(sessionId)].filter(Boolean).length > 1) {
      this.renderError("练习路由参数冲突，请从入口重新打开。");
      return;
    }
    if (launchId) {
      await this.startLaunch(launchId, signal, epoch);
      return;
    }
    if (sessionId) {
      await this.startLocalSession(sessionId, signal, epoch);
      return;
    }
    if (params.setId) {
      await this.startSetRunner(params.setId, params.seed, signal, epoch);
      return;
    }

    // If no setId specified
    const isPlayRoute = window.location.pathname.includes("/quiz/play");
    if (isPlayRoute) {
      this.renderNoSetSelected();
    } else {
      this.renderLanding();
    }
  }

  private async startLaunch(id: string, signal: AbortSignal, routeEpoch: number): Promise<void> {
    const payload = readPracticeLaunch(id, this.manifest.preview);
    if (!payload) {
      this.renderError("练习启动信息不存在、无效或已过期，请回到我的题库重新开始。");
      return;
    }
    if (
      payload.bankFingerprint !== this.manifest.bankFingerprint ||
      payload.selectionAlgorithmVersion !== this.manifest.selectionAlgorithmVersion
    ) {
      this.renderError("题库已更新，请回到我的题库重新开始练习。");
      return;
    }
    this.renderStatus("正在创建本地练习...");
    let catalog: Question[];
    try {
      catalog = await loadQuestionCatalog(this.manifestUrl, this.manifest.catalogs.questions, signal);
    } catch {
      if (!signal.aborted) this.renderError("加载题库失败，请刷新重试。启动信息已保留。");
      return;
    }
    if (!this.isCurrentRoute(signal, routeEpoch)) return;
    const byId = new Map(catalog.map(q => [q.id, q]));
    const questions = payload.questionRefs.map(ref => byId.get(ref.id));
    if (
      questions.some(
        (q, index) =>
          !q ||
          q.version !== payload.questionRefs[index].version ||
          (q.status !== "published" && !this.manifest.preview)
      )
    ) {
      this.renderError("所选题目已更新或不可用，请回到我的题库重新开始。");
      return;
    }
    const selected = questions as Question[];
    const session = createSession(
      { type: "adhoc", questionIds: selected.map(q => q.id) },
      payload.seed,
      payload.bankFingerprint,
      payload.selectionAlgorithmVersion,
      payload.preview,
      selected,
      { surface: "runner", origin: payload.origin },
      payload.profileEpoch
    );
    session.sessionId = payload.sessionId;
    const created = await this.store.createSession(session, payload.creationBaseRevision);
    if (!this.isCurrentRoute(signal, routeEpoch)) return;
    if (!created.ok) {
      this.renderError(`无法保存练习：${created.reason}。启动信息已保留，可刷新重试。`);
      return;
    }
    const launchUrl = new URL(window.location.href);
    const url = new URL(launchUrl.href);
    url.searchParams.delete("launch");
    url.searchParams.set("session", payload.sessionId);
    try {
      history.replaceState(null, "", url.href);
    } catch {
      this.renderError("练习已保存，但路由更新失败。请刷新重试。");
      return;
    }
    if (!clearPracticeLaunch(id, this.manifest.preview)) {
      try {
        history.replaceState(null, "", launchUrl.href);
      } catch {
        // The session route remains guarded by the outstanding launch payload.
      }
      this.renderError("练习已保存，但启动信息未能清理。请刷新重试。");
      return;
    }
    await this.startLocalSession(payload.sessionId, signal, routeEpoch, catalog);
  }

  private async startLocalSession(
    id: string,
    signal: AbortSignal,
    routeEpoch: number,
    loadedCatalog?: Question[]
  ): Promise<void> {
    if (readPracticeLaunch(id, this.manifest.preview)) {
      this.renderError("练习启动信息尚未清理，请使用原启动链接刷新重试。");
      return;
    }
    const session = this.store.getActiveSessionById(id);
    if (!session || session.profileEpoch !== this.store.read().profileEpoch) {
      this.renderError("未找到可继续的练习进度。它可能已经完成、清理或恢复为另一份档案。");
      return;
    }
    if (session.source.type !== "adhoc") {
      this.renderError("练习来源无效。");
      return;
    }
    this.renderStatus("正在恢复练习...");
    let catalog: Question[];
    try {
      catalog =
        loadedCatalog ?? (await loadQuestionCatalog(this.manifestUrl, this.manifest.catalogs.questions, signal));
    } catch {
      if (!signal.aborted) this.renderError("加载题库失败，已保存的进度仍在本地。请刷新重试。");
      return;
    }
    if (!this.isCurrentRoute(signal, routeEpoch)) return;
    const byId = new Map(catalog.map(q => [q.id, q]));
    const questions = session.questionRefs.map(ref => byId.get(ref.id));
    if (
      session.bankFingerprint !== this.manifest.bankFingerprint ||
      session.selectionAlgorithmVersion !== this.manifest.selectionAlgorithmVersion ||
      questions.some((q, index) => !q || q.version !== session.questionRefs[index].version)
    ) {
      this.renderError("题库已变化，此练习进度暂不能恢复；本地进度仍保留，可从学习数据导出。");
      return;
    }
    const selected = questions as Question[];
    const bundle: SetBundle = {
      schemaVersion: 3,
      bankFingerprint: this.manifest.bankFingerprint,
      selectionAlgorithmVersion: this.manifest.selectionAlgorithmVersion,
      preview: this.manifest.preview,
      set: {
        schema_version: 1,
        id: `local.${id}`,
        title: session.context?.origin?.type === "mistakes" ? "错题重练" : "我的题库练习",
        status: "published",
        feedback_mode: "immediate",
        selection: { type: "fixed", questions: selected.map(q => q.id), order: "fixed" }
      },
      runnable: true,
      unavailableReason: null,
      questions: selected
    };
    this.mountPlaySurface({
      root: this.root,
      manifestUrl: this.manifestUrl,
      bundle,
      questions: selected,
      seed: session.seed,
      source: session.source,
      store: this.store,
      signal,
      onExit: () => this.exitToLanding(),
      onRestart: () => this.exitToLanding()
    });
  }

  private async startSetRunner(
    setId: string,
    seedParam: string | null,
    signal: AbortSignal,
    epoch: number
  ): Promise<void> {
    this.renderStatus("正在加载测试集合题目...");

    const source: QuizSource = { type: "set", id: setId };
    const activeSessions = this.store.getActiveSessions(source);
    const activeSession = seedParam
      ? activeSessions.find(s => s.seed === seedParam) ?? null
      : activeSessions[0] ?? null;

    const setMeta = this.manifest.sets[setId];
    if (!setMeta) {
      if (activeSession) {
        this.renderStaleSetNotice(source, "该小测集合已删除、退役或不再发布", activeSession);
        return;
      }
      this.renderError(`未找到指定测试集合：${setId}`);
      return;
    }

    if (setMeta.status === "retired") {
      if (activeSession) {
        this.renderStaleSetNotice(source, "该小测集合已退役", activeSession);
        return;
      }
      this.renderError("该小测集合已退役，无法进行答题。");
      return;
    }

    if (setMeta.status === "draft" && !this.manifest.preview) {
      this.renderError("该测试集合目前处于草稿阶段，仅在预览模式下可用。");
      return;
    }

    let seed = seedParam;
    if (!seed) {
      seed = newSeed();
      const current = new URL(window.location.href);
      current.searchParams.set("set", setId);
      current.searchParams.set("seed", seed);
      history.replaceState(null, "", current.href);
    }

    let bundle: SetBundle;
    try {
      bundle = await loadSetBundle(this.manifestUrl, setMeta.bundle, signal);
    } catch (err) {
      if (signal.aborted) return;
      this.renderError(`加载测试数据失败：${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    if (!this.isCurrentRoute(signal, epoch)) return;

    if (!bundle.runnable) {
      const runnableActiveSession = this.store.getActiveSessions(source).find(s => s.seed === seed) ?? activeSession;
      if (runnableActiveSession) {
        this.renderStaleSetNotice(source, bundle.unavailableReason ?? "题目不足或约束无法满足", runnableActiveSession);
        return;
      }
      this.renderError(`测试集合暂不可用：${bundle.unavailableReason ?? "题目不足或约束无法满足"}`);
      return;
    }

    let taxonomy: TaxonomyCatalog | undefined;
    if (this.manifest.catalogs.taxonomy) {
      try {
        taxonomy = await loadTaxonomyCatalog(this.manifestUrl, this.manifest.catalogs.taxonomy, signal);
      } catch {
        // Taxonomy optional if not strictly needed
      }
    }
    if (!this.isCurrentRoute(signal, epoch)) return;

    let questions: Question[];
    try {
      questions = selectSetQuestions(bundle, seed, taxonomy);
    } catch (err) {
      this.renderError(`选题失败：${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    this.mountPlaySurface({
      root: this.root,
      manifestUrl: this.manifestUrl,
      bundle,
      questions,
      taxonomy,
      seed,
      source,
      store: this.store,
      signal,
      onExit: () => this.exitToLanding(),
      onRestart: (newSeedVal: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set("set", setId);
        url.searchParams.set("seed", newSeedVal);
        history.pushState(null, "", url.href);
        void this.route();
      },
      onAdhoc: (adhocBundle: SetBundle, adhocQuestions: Question[]) => {
        this.mountPlaySurface({
          root: this.root,
          manifestUrl: this.manifestUrl,
          bundle: adhocBundle,
          questions: adhocQuestions,
          taxonomy,
          seed: newSeed(),
          source: { type: "adhoc", questionIds: adhocQuestions.map(q => q.id) },
          store: this.store,
          signal,
          onExit: () => this.exitToLanding(),
          onRestart: (newSeedVal: string) => {
            const url = new URL(window.location.href);
            url.searchParams.set("set", setId);
            url.searchParams.set("seed", newSeedVal);
            history.pushState(null, "", url.href);
            void this.route();
          }
        });
      }
    });
  }

  private mountPlaySurface(options: PlaySurfaceOptions): void {
    if (!this.isCurrentRoute(options.signal, this.routeEpoch)) return;
    this.currentPlaySurface?.destroy();
    this.currentPlaySurface = new PlaySurface(options);
    this.currentPlayUrl = window.location.href;
    void this.currentPlaySurface.start();
  }

  private isCurrentRoute(signal: AbortSignal, epoch: number): boolean {
    return !signal.aborted && this.routeScope?.controller.signal === signal && this.routeEpoch === epoch;
  }

  private renderLanding(): void {
    this.root.innerHTML = "";
    const container = document.createElement("div");
    container.className = "plw-quiz-landing";

    // 0. Storage reset notice banner
    const resetReason = this.store.consumeResetReason();
    let noticeHtml = "";
    if (resetReason) {
      const msg =
        resetReason === "version_mismatch"
          ? "检测到由其他版本生成的学习数据，当前版本无法安全读取。原始数据未被修改。"
          : "本地学习数据损坏，已进入只读状态。原始数据未被修改。";
      noticeHtml = `
        <div class="plw-quiz-notice plw-quiz-notice--dismissible" role="status">
          <span>⚠️ ${escapeHtml(msg)}</span>
          <button type="button" class="plw-quiz-notice__close" aria-label="关闭通知">&times;</button>
        </div>
      `;
    }

    // 1. Active sessions section
    const allActive = this.store.getAllActiveSessions();
    const activeEntries = Object.entries(allActive).filter(([_, list]) => list.length > 0);

    let activeHtml = "";
    if (activeEntries.length > 0) {
      activeHtml = `
        <section class="plw-quiz-landing__resume">
          <h2 class="plw-quiz-landing__subtitle">继续上次未完成的作答</h2>
          <div class="plw-quiz-landing__grid">
            ${activeEntries
              .flatMap(([srcKey, sessions]) =>
                sessions.map(s => {
                  const setId = s.source.type === "set" ? s.source.id : "";
                  const title = s.source.type === "set" ? this.manifest.sets[setId]?.title ?? setId : "我的题库练习";
                  const answered = Object.values(s.answers).filter(v => v != null).length;
                  const total = s.questionRefs.length;
                  const playUrl =
                    s.source.type === "set"
                      ? `${resolveSiteUrl("quiz/play/")}?set=${encodeURIComponent(setId)}&seed=${encodeURIComponent(
                          s.seed
                        )}`
                      : `${resolveSiteUrl("quiz/play/")}?session=${encodeURIComponent(s.sessionId)}`;
                  return `
                      <div class="plw-quiz-landing__card">
                        <div>
                          <h3>${escapeHtml(title)}</h3>
                          <p class="plw-quiz-landing__card-meta">进度：${answered} / ${total} 题已作答 · 上次更新：${new Date(
                    s.updatedAt
                  ).toLocaleDateString()}</p>
                        </div>
                        <div class="plw-quiz-landing__links">
                          <a class="plw-quiz-landing__btn" href="${playUrl}">继续作答</a>
                        </div>
                      </div>
                    `;
                })
              )
              .join("")}
          </div>
        </section>
      `;
    }

    // 2. Available sets section
    const sets = Object.entries(this.manifest.sets).filter(
      ([_, s]) => this.manifest.preview || s.status === "published"
    );

    const setsHtml = `
      <section class="plw-quiz-landing__sets">
        <h2 class="plw-quiz-landing__subtitle">可用测试集合</h2>
        <div class="plw-quiz-landing__grid">
          ${sets
            .map(([setId, s]) => {
              const playUrl = `${resolveSiteUrl("quiz/play/")}?set=${encodeURIComponent(setId)}`;
              const draftBadge = s.status === "draft" ? `<span class="plw-quiz-badge--warning">草稿</span>` : "";
              return `
                <div class="plw-quiz-landing__card">
                  <div>
                    <h3>${escapeHtml(s.title)} ${draftBadge}</h3>
                    <p class="plw-quiz-landing__card-meta">标识符：<code>${escapeHtml(setId)}</code></p>
                  </div>
                  <div class="plw-quiz-landing__links">
                    <a class="plw-quiz-landing__btn" href="${playUrl}">开始小测</a>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;

    container.innerHTML = `
      ${noticeHtml}
      ${activeHtml}
      ${setsHtml}
    `;

    container.querySelector(".plw-quiz-notice__close")?.addEventListener("click", e => {
      (e.currentTarget as HTMLElement).closest(".plw-quiz-notice")?.remove();
    });

    this.root.append(container);
  }

  private renderNoSetSelected(): void {
    this.root.innerHTML = `
      <div class="plw-quiz-empty">
        <h2>未指定测试集合</h2>
        <p>答题运行器需要指定 <code>?set=&lt;set-id&gt;</code> 才能启动。</p>
        <p><a class="plw-quiz-landing__btn" href="${resolveSiteUrl("quiz/")}">浏览测试集合</a></p>
      </div>
    `;
  }

  private exitToLanding(): void {
    window.location.assign(resolveSiteUrl("quiz/"));
  }

  private renderStatus(message: string): void {
    this.root.innerHTML = `<p role="status">${escapeHtml(message)}</p>`;
  }

  private renderError(message: string): void {
    this.root.innerHTML = `
      <div class="plw-quiz-error" role="alert">
        <h2>无法开始小测</h2>
        <p>${escapeHtml(message)}</p>
        <p><a class="plw-quiz-landing__btn" href="${resolveSiteUrl("quiz/")}">返回小测首页</a></p>
      </div>
    `;
  }

  private renderStaleSetNotice(source: QuizSource, reason: string, session: Session): void {
    this.root.innerHTML = "";
    const container = document.createElement("div");
    container.className = "plw-quiz-runner";
    const answeredCount = Object.values(session.answers).filter(v => v != null).length;

    container.innerHTML = `
      <div class="plw-quiz-error" role="alert" style="max-width: 600px; margin: 2rem auto;">
        <h2>作答进度已失效</h2>
        <p>你之前在此测试中已作答 <strong>${answeredCount}</strong> / ${
      session.questionRefs.length
    } 题，但由于<strong>${escapeHtml(reason)}</strong>，先前的本地作答记录已不能继续恢复。</p>
        <div class="plw-quiz-modal__actions" style="margin-top: 1.5rem; justify-content: center; gap: 1rem;">
          <button type="button" class="plw-quiz-btn--danger" id="plw-btn-discard-stale">
            清空此失效进度并返回
          </button>
          <button type="button" class="plw-quiz-btn--secondary" id="plw-btn-back-stale">
            返回小测发现页
          </button>
        </div>
      </div>
    `;

    container.querySelector("#plw-btn-discard-stale")?.addEventListener("click", async () => {
      const result = await this.store.discardSession(session);
      if (result.ok) this.exitToLanding();
      else this.renderError(`清理进度失败：${result.reason}`);
    });

    container.querySelector("#plw-btn-back-stale")?.addEventListener("click", () => {
      this.exitToLanding();
    });

    this.root.append(container);
  }
}

class HomeSurface {
  private readonly abort: AbortController;
  private store?: QuizStore;
  private readonly releaseAbortScope: () => void;

  constructor(private readonly root: HTMLElement, parentSignal: AbortSignal) {
    const scope = createAbortScope(parentSignal);
    this.abort = scope.controller;
    this.releaseAbortScope = scope.release;
  }

  async start(): Promise<void> {
    try {
      const manifestPath = this.root.dataset.manifestUrl ?? resolveSiteUrl("_generated/question-bank/manifest.json");
      const manifestUrl = new URL(manifestPath, window.location.href);
      const manifest = await loadManifest(manifestUrl, this.abort.signal);
      if (this.abort.signal.aborted) return;
      const setCatalog = await loadSetCatalog(manifestUrl, manifest.catalogs.sets, this.abort.signal).catch(
        () => [] as SetCatalogItem[]
      );
      if (this.abort.signal.aborted) return;
      const setDetails = new Map(setCatalog.map(item => [item.id, item]));
      const displayTitle = (id: string, fallback: string): string => {
        const subject = setDetails.get(id)?.tags.find(tag => !["快速检查", "综合练习"].includes(tag));
        return subject ? `${subject} · ${fallback}` : fallback;
      };
      const store = new QuizStore(window.localStorage, manifest.preview);
      this.store = store;
      await store.ready();

      const resetReason = store.consumeResetReason();
      let noticeHtml = "";
      if (resetReason) {
        const msg =
          resetReason === "version_mismatch"
            ? "检测到由其他版本生成的学习数据，当前版本无法安全读取。原始数据未被修改。"
            : "本地学习数据损坏，已进入只读状态。原始数据未被修改。";
        noticeHtml = `
          <div class="plw-quiz-notice plw-quiz-notice--dismissible" role="status">
            <span>⚠️ ${escapeHtml(msg)}</span>
            <button type="button" class="plw-quiz-notice__close" aria-label="关闭通知">&times;</button>
          </div>
        `;
      }

      const allActive = store.getAllActiveSessions();
      const activeEntries = Object.entries(allActive).filter(([_, list]) => list.length > 0);

      this.root.innerHTML = "";
      const container = document.createElement("div");
      container.className = "plw-quiz-home-dynamic";

      if (noticeHtml) {
        const noticeWrap = document.createElement("div");
        noticeWrap.innerHTML = noticeHtml;
        noticeWrap.querySelector(".plw-quiz-notice__close")?.addEventListener("click", e => {
          (e.currentTarget as HTMLElement).closest(".plw-quiz-notice")?.remove();
        });
        if (noticeWrap.firstElementChild) {
          container.append(noticeWrap.firstElementChild);
        }
      }

      // 1. Unfinished active sessions
      if (activeEntries.length > 0) {
        const resumeSec = document.createElement("section");
        resumeSec.className = "plw-quiz-landing__resume";
        resumeSec.innerHTML = `
          <h2 class="plw-quiz-landing__subtitle">继续上次未完成的作答</h2>
          <div class="plw-quiz-landing__grid">
            ${activeEntries
              .flatMap(([_, sessions]) =>
                sessions.map(s => {
                  const setId = s.source.type === "set" ? s.source.id : "";
                  const title =
                    s.source.type === "set"
                      ? displayTitle(setId, manifest.sets[setId]?.title ?? setId)
                      : "我的题库练习";
                  const answered = Object.values(s.answers).filter(v => v != null).length;
                  const total = s.questionRefs.length;
                  const playUrl =
                    s.source.type === "set"
                      ? `${resolveSiteUrl("quiz/play/")}?set=${encodeURIComponent(setId)}&seed=${encodeURIComponent(
                          s.seed
                        )}`
                      : `${resolveSiteUrl("quiz/play/")}?session=${encodeURIComponent(s.sessionId)}`;
                  return `
                      <div class="plw-quiz-landing__card">
                        <div>
                          <h3>${escapeHtml(title)}</h3>
                          <p class="plw-quiz-landing__card-meta">进度：${answered} / ${total} 题已作答</p>
                        </div>
                        <div class="plw-quiz-landing__links">
                          <a class="plw-quiz-landing__btn" href="${playUrl}">继续作答</a>
                        </div>
                      </div>
                    `;
                })
              )
              .join("")}
          </div>
        `;
        container.append(resumeSec);
      }

      // 2. Featured sets section
      const featuredConfig = this.root.dataset.featuredSets;
      let targetSetEntries: [string, (typeof manifest.sets)[string]][];
      if (featuredConfig) {
        const configuredIds = featuredConfig
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
        targetSetEntries = configuredIds
          .map(id => [id, manifest.sets[id]] as [string, (typeof manifest.sets)[string]])
          .filter(([_, s]) => s && (manifest.preview || s.status === "published"));
      } else {
        targetSetEntries = Object.entries(manifest.sets)
          .filter(([_, s]) => manifest.preview || s.status === "published")
          .slice(0, 4);
      }

      if (targetSetEntries.length > 0) {
        const featuredSec = document.createElement("section");
        featuredSec.className = "plw-quiz-home-featured";
        featuredSec.innerHTML = `
          <h2 class="plw-quiz-landing__subtitle">精选测试推荐</h2>
          <div class="plw-quiz-landing__grid">
            ${targetSetEntries
              .map(([setId, s]) => {
                const playUrl = `${resolveSiteUrl("quiz/play/")}?set=${encodeURIComponent(setId)}`;
                const draftBadge = s.status === "draft" ? `<span class="plw-quiz-badge--warning">草稿</span>` : "";
                const item = setDetails.get(setId);
                const title = displayTitle(setId, s.title);
                const mode = item?.feedbackMode === "deferred" ? "整卷提交" : "即时反馈";
                const estimate = item?.estimatedMinutes ? ` · 预计约 ${item.estimatedMinutes} 分钟` : "";
                return `
                  <div class="plw-quiz-landing__card">
                    <div>
                      <h3>${escapeHtml(title)} ${draftBadge}</h3>
                      ${
                        item?.description ? `<p class="plw-quiz-landing__desc">${escapeHtml(item.description)}</p>` : ""
                      }
                      ${
                        item
                          ? `<p class="plw-quiz-landing__card-meta">${item.questionCount} 题 · ${mode}${estimate}</p>`
                          : ""
                      }
                    </div>
                    <div class="plw-quiz-landing__links">
                      <a class="plw-quiz-landing__btn" href="${playUrl}">开始小测</a>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        `;
        container.append(featuredSec);
      }

      this.root.append(container);
    } catch {
      if (this.abort.signal.aborted) return;
      this.root.innerHTML = "";
    }
  }

  destroy(): void {
    this.store?.destroy();
    this.abort.abort();
    this.releaseAbortScope();
    this.root.innerHTML = "";
  }
}

function findRoot<T extends HTMLElement>(root: ParentNode, selector: string): T | null {
  if (root instanceof Element && root.matches(selector)) return root as T;
  return root.querySelector<T>(selector);
}

function findRoots<T extends HTMLElement>(root: ParentNode, selector: string): T[] {
  const roots = Array.from(root.querySelectorAll<T>(selector));
  if (root instanceof Element && root.matches(selector)) roots.unshift(root as T);
  return roots;
}

export interface QuizMountContext {
  signal: AbortSignal;
}

export function mount(root: ParentNode, context: QuizMountContext): () => void {
  if (context.signal.aborted) return () => undefined;

  const surfaces: Array<{ destroy(): void }> = [];
  const runnerRoot = findRoot<HTMLElement>(root, "#plw-quiz-root");
  if (runnerRoot) {
    const surface = new QuizApp(runnerRoot, context.signal);
    surfaces.push(surface);
    void surface.start();
  }

  const setsRoot = findRoot<HTMLElement>(root, "#plw-quiz-sets-root");
  if (setsRoot) {
    const surface = new SetsSurface(setsRoot, context.signal);
    surfaces.push(surface);
    void surface.start();
  }

  const questionsRoot = findRoot<HTMLElement>(root, "#plw-quiz-questions-root");
  if (questionsRoot) {
    const surface = new QuestionsSurface(questionsRoot, context.signal);
    surfaces.push(surface);
    void surface.start();
  }

  const libraryRoot = findRoot<HTMLElement>(root, "#plw-quiz-library-root");
  if (libraryRoot) {
    const surface = new LibrarySurface(libraryRoot, context.signal);
    surfaces.push(surface);
    void surface.start();
  }

  const homeRoot = findRoot<HTMLElement>(root, "#plw-quiz-home-root");
  if (homeRoot) {
    const surface = new HomeSurface(homeRoot, context.signal);
    surfaces.push(surface);
    void surface.start();
  }

  for (const inlineRoot of findRoots<HTMLElement>(root, ".plw-quiz-inline-root")) {
    const surface = new InlineSurface(inlineRoot, context.signal);
    surfaces.push(surface);
    void surface.start();
  }

  let mounted = true;
  return () => {
    if (!mounted) return;
    mounted = false;
    for (const surface of surfaces.reverse()) surface.destroy();
    surfaces.length = 0;
  };
}
