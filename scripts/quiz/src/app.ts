import {
  loadManifest,
  loadSetBundle,
  loadTaxonomyCatalog,
  readRunnerParameters,
  resolveSiteUrl
} from "./data.js";
import { escapeHtml } from "./question-renderer.js";
import { newSeed } from "./random.js";
import { selectSetQuestions } from "./selection.js";
import type { PlaySurfaceOptions } from "./surfaces/play.js";
import { PlaySurface } from "./surfaces/play.js";
import { QuizStore, sourceKey } from "./storage.js";
import type { Manifest, Question, QuizSource, SetBundle, TaxonomyCatalog } from "./types.js";

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

    const setMeta = this.manifest.sets[setId];
    if (!setMeta) {
      this.renderError(`未找到指定测试集合：${setId}`);
      return;
    }

    if (setMeta.status === "retired") {
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
      this.renderError(`测试集合暂不可用：${bundle.unavailableReason ?? "题目不足或约束无法满足"}`);
      return;
    }

    let taxonomy: TaxonomyCatalog | undefined;
    if (bundle.set.selection.type === "query" && this.manifest.catalogs.taxonomy) {
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

    const source: QuizSource = { type: "set", id: setId };
    this.mountPlaySurface({
      root: this.root,
      manifestUrl: this.manifestUrl,
      bundle,
      questions,
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
                  const title = s.source.type === "set" ? (this.manifest.sets[s.source.id]?.title ?? s.source.id) : "错题重做";
                  const answered = Object.values(s.answers).filter(v => v != null).length;
                  const total = s.questionRefs.length;
                  const playUrl = s.source.type === "set"
                    ? `${resolveSiteUrl("quiz/play/")}?set=${encodeURIComponent(s.source.id)}&seed=${encodeURIComponent(s.seed)}`
                    : "#";
                  return `
                    <div class="plw-quiz-landing__card">
                      <div>
                        <h3>${escapeHtml(title)}</h3>
                        <p class="plw-quiz-landing__card-meta">进度：${answered} / ${total} 题已作答 · 上次更新：${new Date(s.updatedAt).toLocaleDateString()}</p>
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
    const sets = Object.entries(this.manifest.sets).filter(([_, s]) => this.manifest.preview || s.status === "published");

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
      ${activeHtml}
      ${setsHtml}
    `;

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

      const allActive = store.getAllActiveSessions();
      const activeEntries = Object.entries(allActive).filter(([_, list]) => list.length > 0);

      this.root.innerHTML = "";
      const container = document.createElement("div");
      container.className = "plw-quiz-home-dynamic";

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
                  const title =
                    s.source.type === "set" ? manifest.sets[s.source.id]?.title ?? s.source.id : "错题重做";
                  const answered = Object.values(s.answers).filter(v => v != null).length;
                  const total = s.questionRefs.length;
                  const playUrl =
                    s.source.type === "set"
                      ? `${resolveSiteUrl("quiz/play/")}?set=${encodeURIComponent(s.source.id)}&seed=${encodeURIComponent(s.seed)}`
                      : "#";
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
        const configuredIds = featuredConfig.split(",").map(s => s.trim()).filter(Boolean);
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

