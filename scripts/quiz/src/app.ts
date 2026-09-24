import { loadManifest, loadSetBundle, loadTaxonomyCatalog, readRunnerParameters, resolveSiteUrl } from "./data.js";
import { escapeHtml } from "./question-renderer.js";
import { newSeed } from "./random.js";
import { selectSetQuestions } from "./selection.js";
import type { PlaySurfaceOptions } from "./surfaces/play.js";
import { PlaySurface } from "./surfaces/play.js";
import { QuizStore, sourceKey } from "./storage.js";
import type { Manifest, Question, QuizSource, Session, SetBundle, TaxonomyCatalog } from "./types.js";

declare global {
  interface Window {
    document$?: { subscribe(callback: () => void): { unsubscribe?: () => void } | void };
    __plwQuizDestroy?: () => void;
  }
}

class QuizApp {
  private readonly abort = new AbortController();
  private manifestUrl!: URL;
  private manifest!: Manifest;
  private store!: QuizStore;
  private currentPlaySurface?: PlaySurface;

  constructor(private readonly root: HTMLElement) {
    this.root.addEventListener("click", this.handleClick, { signal: this.abort.signal });
  }

  async start(): Promise<void> {
    try {
      const manifestPath = this.root.dataset.manifestUrl ?? resolveSiteUrl("_generated/question-bank/manifest.json");
      this.manifestUrl = new URL(manifestPath, window.location.href);
      this.manifest = await loadManifest(this.manifestUrl, this.abort.signal);
      this.store = new QuizStore(window.localStorage, this.manifest.preview);

      await this.route();
    } catch (error) {
      if (this.abort.signal.aborted) return;
      this.renderError(error instanceof Error ? error.message : "加载题库清单失败");
    }
  }

  destroy(): void {
    this.abort.abort();
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

  private async route(): Promise<void> {
    this.currentPlaySurface?.destroy();
    this.currentPlaySurface = undefined;

    const params = readRunnerParameters();
    if (params.setId) {
      await this.startSetRunner(params.setId, params.seed);
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

  private async startSetRunner(setId: string, seedParam: string | null): Promise<void> {
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
      bundle = await loadSetBundle(this.manifestUrl, setMeta.bundle, this.abort.signal);
    } catch (err) {
      this.renderError(`加载测试数据失败：${err instanceof Error ? err.message : String(err)}`);
      return;
    }

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
        taxonomy = await loadTaxonomyCatalog(this.manifestUrl, this.manifest.catalogs.taxonomy, this.abort.signal);
      } catch {
        // Taxonomy optional if not strictly needed
      }
    }

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
      signal: this.abort.signal,
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
          signal: this.abort.signal,
          onExit: () => this.exitToLanding(),
          onRestart: (newSeedVal: string) => {
            void this.startSetRunner(setId, newSeedVal);
          }
        });
      }
    });
  }

  private mountPlaySurface(options: PlaySurfaceOptions): void {
    this.currentPlaySurface?.destroy();
    this.currentPlaySurface = new PlaySurface(options);
    this.currentPlaySurface.start();
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
          ? "已升级答题引擎版本，先前的旧版本地作答进度已自动安全重置。"
          : "检测到损坏的本地小测作答记录，已自动安全重置。";
      noticeHtml = `
        <div class="plw-quiz-notice plw-quiz-notice--dismissible" role="status">
          <span>⚠️ ${escapeHtml(msg)}</span>
          <button type="button" class="plw-quiz-notice__close" aria-label="关闭通知">&times;</button>
        </div>
      `;
    }

    // 1. Active sessions section (only set sources)
    const allActive = this.store.getAllActiveSessions();
    const activeEntries = Object.entries(allActive).filter(([_, list]) => list.some(s => s.source.type === "set"));

    let activeHtml = "";
    if (activeEntries.length > 0) {
      activeHtml = `
        <section class="plw-quiz-landing__resume">
          <h2 class="plw-quiz-landing__subtitle">继续上次未完成的作答</h2>
          <div class="plw-quiz-landing__grid">
            ${activeEntries
              .flatMap(([srcKey, sessions]) =>
                sessions
                  .filter(s => s.source.type === "set")
                  .map(s => {
                    const setId = (s.source as { type: "set"; id: string }).id;
                    const title = this.manifest.sets[setId]?.title ?? setId;
                    const answered = Object.values(s.answers).filter(v => v != null).length;
                    const total = s.questionRefs.length;
                    const playUrl = `${resolveSiteUrl("quiz/play/")}?set=${encodeURIComponent(
                      setId
                    )}&seed=${encodeURIComponent(s.seed)}`;
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

    container.querySelector("#plw-btn-discard-stale")?.addEventListener("click", () => {
      this.store.discardSession(source, session.seed);
      this.exitToLanding();
    });

    container.querySelector("#plw-btn-back-stale")?.addEventListener("click", () => {
      this.exitToLanding();
    });

    this.root.append(container);
  }
}

import { InlineSurface } from "./surfaces/inline.js";
import { QuestionsSurface } from "./surfaces/questions.js";
import { SetsSurface } from "./surfaces/sets.js";

class HomeSurface {
  private readonly abort = new AbortController();

  constructor(private readonly root: HTMLElement) {}

  async start(): Promise<void> {
    try {
      const manifestPath = this.root.dataset.manifestUrl ?? resolveSiteUrl("_generated/question-bank/manifest.json");
      const manifestUrl = new URL(manifestPath, window.location.href);
      const manifest = await loadManifest(manifestUrl, this.abort.signal);
      const store = new QuizStore(window.localStorage, manifest.preview);

      const resetReason = store.consumeResetReason();
      let noticeHtml = "";
      if (resetReason) {
        const msg =
          resetReason === "version_mismatch"
            ? "已升级答题引擎版本，先前的旧版本地作答进度已自动安全重置。"
            : "检测到损坏的本地小测作答记录，已自动安全重置。";
        noticeHtml = `
          <div class="plw-quiz-notice plw-quiz-notice--dismissible" role="status">
            <span>⚠️ ${escapeHtml(msg)}</span>
            <button type="button" class="plw-quiz-notice__close" aria-label="关闭通知">&times;</button>
          </div>
        `;
      }

      const allActive = store.getAllActiveSessions();
      const activeEntries = Object.entries(allActive).filter(([_, list]) => list.some(s => s.source.type === "set"));

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
                sessions
                  .filter(s => s.source.type === "set")
                  .map(s => {
                    const setId = (s.source as { type: "set"; id: string }).id;
                    const title = manifest.sets[setId]?.title ?? setId;
                    const answered = Object.values(s.answers).filter(v => v != null).length;
                    const total = s.questionRefs.length;
                    const playUrl = `${resolveSiteUrl("quiz/play/")}?set=${encodeURIComponent(
                      setId
                    )}&seed=${encodeURIComponent(s.seed)}`;
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
    this.abort.abort();
    this.root.innerHTML = "";
  }
}

let runnerApp: QuizApp | undefined;
let setsSurface: SetsSurface | undefined;
let questionsSurface: QuestionsSurface | undefined;
let homeSurface: HomeSurface | undefined;
const inlineSurfaces: InlineSurface[] = [];

function initialize(): void {
  runnerApp?.destroy();
  runnerApp = undefined;

  setsSurface?.destroy();
  setsSurface = undefined;

  questionsSurface?.destroy();
  questionsSurface = undefined;

  homeSurface?.destroy();
  homeSurface = undefined;

  for (const s of inlineSurfaces) s.destroy();
  inlineSurfaces.length = 0;

  window.__plwQuizDestroy = () => {
    runnerApp?.destroy();
    runnerApp = undefined;
    setsSurface?.destroy();
    setsSurface = undefined;
    questionsSurface?.destroy();
    questionsSurface = undefined;
    homeSurface?.destroy();
    homeSurface = undefined;
    for (const s of inlineSurfaces) s.destroy();
    inlineSurfaces.length = 0;
  };

  // 1. Runner root
  const quizRoot = document.querySelector<HTMLElement>("#plw-quiz-root");
  if (quizRoot) {
    runnerApp = new QuizApp(quizRoot);
    void runnerApp.start();
  }

  // 2. Sets catalog root
  const setsRoot = document.querySelector<HTMLElement>("#plw-quiz-sets-root");
  if (setsRoot) {
    setsSurface = new SetsSurface(setsRoot);
    void setsSurface.start();
  }

  // 3. Questions catalog root
  const questionsRoot = document.querySelector<HTMLElement>("#plw-quiz-questions-root");
  if (questionsRoot) {
    questionsSurface = new QuestionsSurface(questionsRoot);
    void questionsSurface.start();
  }

  // 4. Home root
  const homeRoot = document.querySelector<HTMLElement>("#plw-quiz-home-root");
  if (homeRoot) {
    homeSurface = new HomeSurface(homeRoot);
    void homeSurface.start();
  }

  // 5. Inline roots
  const inlineRoots = document.querySelectorAll<HTMLElement>(".plw-quiz-inline-root");
  for (const inlineRoot of Array.from(inlineRoots)) {
    const s = new InlineSurface(inlineRoot);
    inlineSurfaces.push(s);
    void s.start();
  }
}

if (typeof window !== "undefined") {
  if (window.document$) {
    window.document$.subscribe(initialize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.addEventListener("popstate", () => {
    initialize();
  });

  const observer = new MutationObserver(() => {
    const quizRoot = document.querySelector<HTMLElement>("#plw-quiz-root");
    const setsRoot = document.querySelector<HTMLElement>("#plw-quiz-sets-root");
    const questionsRoot = document.querySelector<HTMLElement>("#plw-quiz-questions-root");
    const homeRoot = document.querySelector<HTMLElement>("#plw-quiz-home-root");
    const inlineRoots = document.querySelectorAll<HTMLElement>(".plw-quiz-inline-root");

    const hasUninitialized =
      (quizRoot && quizRoot.children.length === 0) ||
      (setsRoot && setsRoot.children.length === 0) ||
      (questionsRoot && questionsRoot.children.length === 0) ||
      (homeRoot && homeRoot.children.length === 0) ||
      (inlineRoots.length > 0 && inlineSurfaces.length === 0);

    if (hasUninitialized) {
      initialize();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
