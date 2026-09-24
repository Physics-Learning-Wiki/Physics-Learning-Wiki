export type FeatureDisposer = () => void | Promise<void>;

export interface FeatureMountContext {
  signal: AbortSignal;
}

export interface FeatureModule {
  mount(root: ParentNode, context: FeatureMountContext): void | FeatureDisposer | Promise<void | FeatureDisposer>;
}

export interface FeatureDefinition {
  stylesheet?: string | ((root: ParentNode) => string | undefined);
  moduleUrl?: string | ((root: ParentNode) => string | undefined);
  load?: () => Promise<FeatureModule>;
}

export type FeatureRegistry = Record<string, FeatureDefinition>;

interface PageInstance {
  controller: AbortController;
  disposers: FeatureDisposer[];
}

interface LifecycleObservable {
  subscribe(observer: (document: Document) => void): { unsubscribe?: () => void } | (() => void);
}

interface RuntimeOptions {
  document: Document;
  registry: FeatureRegistry;
  loadModule?: (name: string, definition: FeatureDefinition) => Promise<FeatureModule>;
  ensureStylesheet?: (href: string, document: Document) => Promise<void>;
  getSiteRoot?: (document: Document) => URL;
  onError?: (message: string, error?: unknown) => void;
}

const FEATURE_ORDER = new Map(
  ["math", "mermaid", "quiz", "submit", "question-contribute"].map((name, index) => [name, index])
);

export function getSiteRoot(document: Document): URL {
  const configElement = document.getElementById("__config");
  if (configElement?.textContent) {
    try {
      const config = JSON.parse(configElement.textContent) as { base?: unknown };
      if (typeof config.base === "string" && config.base.length > 0) {
        return new URL(config.base, document.baseURI);
      }
    } catch {
      // Fall through when Material's runtime config is absent or malformed.
    }
  }

  return new URL(".", document.baseURI);
}

export function readCurrentFeatures(document: Document): { root: ParentNode; features: string[] } | undefined {
  const root = document.querySelector("article.md-content__inner.md-typeset");
  if (!root) return undefined;

  const value = root.getAttribute("data-plw-features") ?? "";
  const features = [...new Set(value.split(/\s+/).filter(Boolean))].sort((left, right) => {
    const leftOrder = FEATURE_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = FEATURE_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.localeCompare(right);
  });
  return { root, features };
}

export function ensureStylesheet(href: string, document: Document): Promise<void> {
  const absoluteHref = new URL(href, document.baseURI).href;
  const existing = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')].find(link => {
    try {
      return new URL(link.href || link.getAttribute("href") || "", document.baseURI).href === absoluteHref;
    } catch {
      return false;
    }
  });
  if (existing) return Promise.resolve();

  return new Promise(resolve => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = absoluteHref;
    const finish = () => {
      link.removeEventListener("load", finish);
      link.removeEventListener("error", finish);
      resolve();
    };
    link.addEventListener("load", finish, { once: true });
    link.addEventListener("error", finish, { once: true });
    document.head.append(link);
  });
}

function loadFeatureModule(name: string, definition: FeatureDefinition, document: Document): Promise<FeatureModule> {
  if (definition.load) return definition.load();
  const root = document.querySelector("article.md-content__inner.md-typeset") ?? document.body;
  const moduleUrl = typeof definition.moduleUrl === "function" ? definition.moduleUrl(root) : definition.moduleUrl;
  if (!moduleUrl) return Promise.reject(new Error(`Feature "${name}" has no module URL or loader`));
  const absoluteUrl = new URL(moduleUrl, getSiteRoot(document)).href;
  // The feature entry is a separately-built ESM file copied beside the site.
  return import(absoluteUrl) as Promise<FeatureModule>;
}

export function createFeatureRuntime(options: RuntimeOptions) {
  let currentPage: PageInstance | undefined;
  let navigationEpoch = 0;
  let pendingDisposal: Promise<void> = Promise.resolve();
  const modulePromises = new Map<string, Promise<FeatureModule>>();
  const stylesheetPromises = new Map<string, Promise<void>>();
  const reportError = options.onError ?? ((message: string, error?: unknown) => console.error(message, error));

  const disposePage = async () => {
    const page = currentPage;
    currentPage = undefined;
    if (!page) {
      await pendingDisposal;
      return;
    }

    page.controller.abort();
    const disposal = (async () => {
      for (const dispose of page.disposers.splice(0).reverse()) {
        try {
          await dispose();
        } catch (error) {
          reportError("PLW feature disposer failed", error);
        }
      }
    })();
    pendingDisposal = Promise.all([pendingDisposal, disposal]).then(() => undefined);
    await pendingDisposal;
  };

  const isCurrent = (page: PageInstance, epoch: number) =>
    currentPage === page && !page.controller.signal.aborted && navigationEpoch === epoch;

  const ensureModule = (name: string, definition: FeatureDefinition) => {
    const cached = modulePromises.get(name);
    if (cached) return cached;

    const promise = (
      options.loadModule ?? ((featureName, feature) => loadFeatureModule(featureName, feature, options.document))
    )(name, definition);
    modulePromises.set(name, promise);
    promise.catch(() => {
      if (modulePromises.get(name) === promise) modulePromises.delete(name);
    });
    return promise;
  };

  const ensureFeatureStylesheet = (name: string, definition: FeatureDefinition, root: ParentNode) => {
    const href = typeof definition.stylesheet === "function" ? definition.stylesheet(root) : definition.stylesheet;
    if (!href) return Promise.resolve();
    const absoluteHref = new URL(href, (options.getSiteRoot ?? getSiteRoot)(options.document)).href;
    const cached = stylesheetPromises.get(absoluteHref);
    if (cached) return cached;
    const promise = (options.ensureStylesheet ?? ((url, document) => ensureStylesheet(url, document)))(
      absoluteHref,
      options.document
    );
    stylesheetPromises.set(absoluteHref, promise);
    return promise;
  };

  const mountFeature = async (name: string, root: ParentNode, page: PageInstance, epoch: number) => {
    const definition = options.registry[name];
    if (!definition) {
      reportError(`No PLW feature registered for "${name}"`);
      return;
    }

    try {
      await ensureFeatureStylesheet(name, definition, root);
      if (!isCurrent(page, epoch)) return;

      const module = await ensureModule(name, definition);
      if (!isCurrent(page, epoch)) return;

      const disposer = await module.mount(root, { signal: page.controller.signal });
      if (typeof disposer !== "function") return;
      if (isCurrent(page, epoch)) {
        page.disposers.push(disposer);
      } else {
        try {
          await disposer();
        } catch (error) {
          reportError(`Late disposer for PLW feature "${name}" failed`, error);
        }
      }
    } catch (error) {
      if (!page.controller.signal.aborted) reportError(`PLW feature "${name}" failed to mount`, error);
    }
  };

  const mountDocument = async (document: Document = options.document) => {
    const epoch = ++navigationEpoch;
    await disposePage();
    if (epoch !== navigationEpoch) return;

    const pageContent = readCurrentFeatures(document);
    if (!pageContent) return;

    const page: PageInstance = { controller: new AbortController(), disposers: [] };
    currentPage = page;
    for (const feature of pageContent.features) {
      void mountFeature(feature, pageContent.root, page, epoch);
    }
  };

  return {
    mountDocument,
    disposeCurrentPage: disposePage,
    get moduleCacheSize() {
      return modulePromises.size;
    },
    get currentSignal() {
      return currentPage?.controller.signal;
    }
  };
}

export function subscribeDocumentLifecycle(
  lifecycle: LifecycleObservable | undefined,
  document: Document,
  onDocument: (document: Document) => void
): () => void {
  if (lifecycle && typeof lifecycle.subscribe === "function") {
    const subscription = lifecycle.subscribe(onDocument);
    return typeof subscription === "function" ? subscription : () => subscription.unsubscribe?.();
  }

  let active = true;
  const onReady = () => {
    if (active) onDocument(document);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    queueMicrotask(onReady);
  }
  return () => {
    active = false;
    document.removeEventListener("DOMContentLoaded", onReady);
  };
}

const featureRegistry: FeatureRegistry = {};

function startRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const runtime = createFeatureRuntime({ document, registry: featureRegistry });
  const lifecycle = (window as Window & { document$?: LifecycleObservable }).document$;
  subscribeDocumentLifecycle(lifecycle, document, currentDocument => {
    void runtime.mountDocument(currentDocument);
  });
}

startRuntime();
