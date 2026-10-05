import assert from "node:assert/strict";
import test from "node:test";
import {
  createFeatureRuntime,
  ensureStylesheet,
  getSiteRoot,
  isStylesheetLinkReady,
  mathFeatureDefinition,
  subscribeDocumentLifecycle,
  waitForStylesheetLink,
  type FeatureModule
} from "../src/loader.ts";

function makeArticle(features: string) {
  return {
    getAttribute(name: string) {
      return name === "data-plw-features" ? features : null;
    }
  } as unknown as Element;
}

function makeDocument(article: Element, baseURI = "https://example.test/Physics-Learning-Wiki/intro/about/") {
  return {
    baseURI,
    getElementById: () => ({ textContent: JSON.stringify({ base: "../.." }) }),
    querySelector: () => article
  } as unknown as Document;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => (resolve = done));
  return { promise, resolve };
}

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

class StylesheetLink extends EventTarget {
  rel = "stylesheet";
  href = "";
  sheet: object | null = null;

  getAttribute(name: string) {
    return name === "href" ? this.href : name === "rel" ? this.rel : null;
  }

  load() {
    this.sheet = {};
    this.dispatchEvent(new Event("load"));
  }
}

function makeStylesheetDocument(article: () => Element, autoLoad = true) {
  const links: StylesheetLink[] = [];
  const createdLinks: StylesheetLink[] = [];
  const document = {
    baseURI: "https://example.test/Physics-Learning-Wiki/",
    getElementById: () => null,
    querySelector: () => article(),
    querySelectorAll: () => links,
    createElement: () => new StylesheetLink(),
    head: {
      append(link: StylesheetLink) {
        links.push(link);
        createdLinks.push(link);
        if (autoLoad) queueMicrotask(() => link.load());
      }
    }
  } as unknown as Document;
  return { document, links, createdLinks };
}

test("site root honors Material's base under a GitHub Pages subpath", () => {
  const document = makeDocument(makeArticle(""));
  assert.equal(getSiteRoot(document).href, "https://example.test/Physics-Learning-Wiki/");
});

test("stylesheet URLs are deduplicated by their normalized full URL including query strings", async () => {
  const links: Array<{
    rel: string;
    href: string;
    listeners: Map<string, () => void>;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string) => void;
  }> = [];
  const document = {
    baseURI: "https://example.test/Physics-Learning-Wiki/intro/about/",
    querySelectorAll: () => links,
    head: {
      append(link: (typeof links)[number]) {
        links.push(link);
        queueMicrotask(() => link.listeners.get("load")?.());
      }
    },
    createElement: () => {
      const listeners = new Map<string, () => void>();
      return {
        rel: "",
        href: "",
        listeners,
        addEventListener(type: string, listener: () => void) {
          listeners.set(type, listener);
        },
        removeEventListener(type: string) {
          listeners.delete(type);
        }
      };
    }
  } as unknown as Document;
  await Promise.all([
    ensureStylesheet("../../_static/css/quiz.css?hash=abc", document),
    ensureStylesheet("https://example.test/Physics-Learning-Wiki/_static/css/quiz.css?hash=abc", document)
  ]);
  assert.equal(links.length, 1);
  assert.equal(links[0].href, "https://example.test/Physics-Learning-Wiki/_static/css/quiz.css?hash=abc");
});

test("feature modules are cached and previous page disposers run before the next page mounts", async () => {
  let currentArticle = makeArticle("quiz quiz");
  const document = {
    baseURI: "https://example.test/Physics-Learning-Wiki/",
    getElementById: () => null,
    querySelector: () => currentArticle
  } as unknown as Document;
  let imports = 0;
  let mounts = 0;
  let disposals = 0;
  const order: string[] = [];
  const module: FeatureModule = {
    mount() {
      mounts += 1;
      order.push("mount");
      return () => {
        disposals += 1;
        order.push("dispose");
      };
    }
  };
  const runtime = createFeatureRuntime({
    document,
    registry: { quiz: {} },
    ensureStylesheet: async () => undefined,
    loadModule: async () => {
      imports += 1;
      return module;
    }
  });

  await runtime.mountDocument(document);
  await flushMicrotasks();
  const firstSignal = runtime.currentSignal;
  assert.equal(mounts, 1);
  assert.equal(imports, 1);

  currentArticle = makeArticle("");
  await runtime.mountDocument(document);
  assert.equal(firstSignal?.aborted, true);
  assert.equal(disposals, 1);

  currentArticle = makeArticle("quiz");
  await runtime.mountDocument(document);
  await flushMicrotasks();
  assert.equal(imports, 1);
  assert.equal(mounts, 2);
  assert.deepEqual(order, ["mount", "dispose", "mount"]);
  await runtime.disposeCurrentPage();
  assert.equal(disposals, 2);
});

test("a stylesheet-only feature does not attempt to import a JavaScript module", async () => {
  let currentArticle = {
    getAttribute(name: string) {
      if (name === "data-plw-features") return "math";
      if (name === "data-plw-math-css") return "assets/stylesheets/mathjax.css?hash=abc";
      return null;
    },
    querySelector(selector: string) {
      return selector === "mjx-container" ? {} : null;
    }
  } as unknown as Element;
  const document = {
    baseURI: "https://example.test/Physics-Learning-Wiki/",
    getElementById: () => null,
    querySelector: () => currentArticle
  } as unknown as Document;
  const stylesheets: string[] = [];
  const errors: string[] = [];
  const runtime = createFeatureRuntime({
    document,
    registry: { math: mathFeatureDefinition },
    ensureStylesheet: async href => {
      stylesheets.push(href);
    },
    onError: message => errors.push(message)
  });

  await runtime.mountDocument(document);
  await flushMicrotasks();
  currentArticle = {
    getAttribute(name: string) {
      if (name === "data-plw-features") return "math";
      if (name === "data-plw-math-css") return "assets/stylesheets/mathjax.css?hash=abc";
      return null;
    },
    querySelector(selector: string) {
      return selector === "mjx-container" ? {} : null;
    }
  } as unknown as Element;
  await runtime.mountDocument(document);
  await flushMicrotasks();
  assert.deepEqual(stylesheets, [
    "https://example.test/Physics-Learning-Wiki/assets/stylesheets/mathjax.css?hash=abc",
    "https://example.test/Physics-Learning-Wiki/assets/stylesheets/mathjax.css?hash=abc"
  ]);
  assert.deepEqual(errors, []);

  currentArticle = {
    getAttribute: (name: string) => (name === "data-plw-features" ? "math" : null),
    querySelector(selector: string) {
      return selector === ".arithmatex" ? {} : null;
    }
  } as unknown as Element;
  await runtime.mountDocument(document);
  await flushMicrotasks();
  assert.equal(stylesheets.length, 2, "client-side MathJax pages do not request production CSS");
});

test("instant navigation reuses the initial site root for a versioned math stylesheet", async () => {
  let currentArticle = makeArticle("");
  let currentBaseURI = "https://example.test/Physics-Learning-Wiki/intro/about/";
  const document = {
    get baseURI() {
      return currentBaseURI;
    },
    // Material keeps the initial config element during instant navigation.
    getElementById: () => ({ textContent: JSON.stringify({ base: "../.." }) }),
    querySelector: () => currentArticle
  } as unknown as Document;
  const stylesheets: string[] = [];
  const runtime = createFeatureRuntime({
    document,
    registry: { math: mathFeatureDefinition },
    ensureStylesheet: async href => {
      stylesheets.push(href);
    }
  });

  await runtime.mountDocument(document);
  currentBaseURI = "https://example.test/Physics-Learning-Wiki/mechanics/";
  currentArticle = {
    getAttribute(name: string) {
      if (name === "data-plw-features") return "math";
      if (name === "data-plw-math-css") return "assets/stylesheets/mathjax.css?hash=def";
      return null;
    },
    querySelector(selector: string) {
      return selector === "mjx-container" ? {} : null;
    }
  } as unknown as Element;
  await runtime.mountDocument(document);
  await flushMicrotasks();

  assert.deepEqual(stylesheets, ["https://example.test/Physics-Learning-Wiki/assets/stylesheets/mathjax.css?hash=def"]);
});

test("a disposer returned after navigation is run immediately and cannot attach to the new page", async () => {
  let currentArticle = makeArticle("quiz");
  const document = {
    baseURI: "https://example.test/Physics-Learning-Wiki/",
    getElementById: () => null,
    querySelector: () => currentArticle
  } as unknown as Document;
  const lateMount = deferred<(() => void) | undefined>();
  let oldSignal: AbortSignal | undefined;
  let oldDisposals = 0;
  let newMounts = 0;
  let activeListeners = 0;
  let activeRequests = 0;
  const runtime = createFeatureRuntime({
    document,
    registry: { quiz: {}, math: {} },
    ensureStylesheet: async () => undefined,
    loadModule: async name => ({
      mount(_root, context) {
        if (name === "quiz") {
          oldSignal = context.signal;
          activeListeners += 1;
          activeRequests += 1;
          let active = true;
          const abortWork = () => {
            if (!active) return;
            active = false;
            activeListeners -= 1;
            activeRequests -= 1;
          };
          context.signal.addEventListener("abort", abortWork, { once: true });
          return lateMount.promise;
        }
        newMounts += 1;
      }
    })
  });

  await runtime.mountDocument(document);
  await flushMicrotasks();
  assert.equal(oldSignal?.aborted, false);

  currentArticle = makeArticle("math");
  await runtime.mountDocument(document);
  await flushMicrotasks();
  assert.equal(oldSignal?.aborted, true);
  assert.equal(newMounts, 1);
  assert.equal(activeListeners, 0);
  assert.equal(activeRequests, 0);

  lateMount.resolve(() => {
    oldDisposals += 1;
  });
  await flushMicrotasks();
  assert.equal(oldDisposals, 1);
  await runtime.disposeCurrentPage();
  assert.equal(oldDisposals, 1);
});

test("document lifecycle subscribes immediately to ReplaySubject-like streams", () => {
  const document = makeDocument(makeArticle(""));
  let seen = 0;
  const unsubscribe = subscribeDocumentLifecycle(
    {
      subscribe(observer) {
        observer(document);
        return { unsubscribe() {} };
      }
    },
    document,
    value => {
      assert.equal(value, document);
      seen += 1;
    }
  );

  assert.equal(seen, 1);
  unsubscribe();
});

test("DOMContentLoaded is used when Material document$ is missing", () => {
  let readyListener: (() => void) | undefined;
  let removed = false;
  let seen = 0;
  const document = {
    readyState: "loading",
    addEventListener(type: string, listener: () => void) {
      if (type === "DOMContentLoaded") readyListener = listener;
    },
    removeEventListener(type: string) {
      if (type === "DOMContentLoaded") removed = true;
    }
  } as unknown as Document;
  const unsubscribe = subscribeDocumentLifecycle(undefined, document, () => (seen += 1));

  readyListener?.();
  unsubscribe();
  assert.equal(seen, 1);
  assert.equal(removed, true);
});

test("existing link with ready sheet resolves immediately", async () => {
  const link = {
    rel: "stylesheet",
    href: "https://example.test/style.css",
    sheet: {},
    getAttribute: (name: string) => (name === "href" ? "https://example.test/style.css" : null),
    setAttribute: () => {}
  } as unknown as HTMLLinkElement;
  const document = {
    baseURI: "https://example.test/",
    querySelectorAll: () => [link]
  } as unknown as Document;

  let loaded = false;
  await ensureStylesheet("style.css", document).then(() => {
    loaded = true;
  });
  assert.equal(loaded, true);
  assert.equal(isStylesheetLinkReady(link), true);
});

test("waiting for a stylesheet does not change its DOM attributes", async () => {
  const attributes = new Map([
    ["rel", "stylesheet"],
    ["href", "https://example.test/style.css"]
  ]);
  let loadCallback: (() => void) | undefined;
  const link = {
    href: attributes.get("href"),
    sheet: null,
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    addEventListener(type: string, callback: () => void) {
      if (type === "load") loadCallback = callback;
    },
    removeEventListener: () => {}
  } as unknown as HTMLLinkElement;
  const before = [...attributes];

  const pending = waitForStylesheetLink(link);
  assert.ok(loadCallback);
  loadCallback();
  await pending;
  await waitForStylesheetLink(link);
  assert.deepEqual([...attributes], before);
});

test("existing link without sheet waits for load before resolving", async () => {
  let loadCallback: (() => void) | undefined;
  const link = {
    rel: "stylesheet",
    href: "https://example.test/style.css",
    sheet: null,
    getAttribute: (name: string) => (name === "href" ? "https://example.test/style.css" : null),
    setAttribute: () => {},
    addEventListener: (type: string, cb: () => void) => {
      if (type === "load") loadCallback = cb;
    },
    removeEventListener: () => {}
  } as unknown as HTMLLinkElement;
  const document = {
    baseURI: "https://example.test/",
    querySelectorAll: () => [link]
  } as unknown as Document;

  let resolved = false;
  const promise = ensureStylesheet("style.css", document).then(() => {
    resolved = true;
  });
  await flushMicrotasks();
  assert.equal(resolved, false);
  assert.ok(loadCallback);
  loadCallback!();
  await promise;
  assert.equal(resolved, true);
});

test("waitForStylesheetLink resolves immediately if sheet becomes ready during listener registration", async () => {
  const link: any = {
    rel: "stylesheet",
    href: "https://example.test/style.css",
    sheet: null,
    getAttribute: () => null,
    setAttribute: () => {},
    addEventListener: () => {
      link.sheet = {};
    },
    removeEventListener: () => {}
  };
  let resolved = false;
  await waitForStylesheetLink(link).then(() => {
    resolved = true;
  });
  assert.equal(resolved, true);
});

test("stylesheet error prevents Quiz module mount and reports error", async () => {
  let mounted = false;
  const errors: string[] = [];
  const article = {
    getAttribute(name: string) {
      if (name === "data-plw-features") return "quiz";
      if (name === "data-plw-math-css") return "assets/stylesheets/mathjax.css?hash=abc";
      return null;
    }
  } as unknown as Element;
  const document = {
    baseURI: "https://example.test/Physics-Learning-Wiki/",
    getElementById: () => null,
    querySelector: () => article
  } as unknown as Document;

  const runtime = createFeatureRuntime({
    document,
    registry: {
      quiz: {
        stylesheets: [
          "_static/css/quiz.css?v=4",
          root => (root as Element).getAttribute("data-plw-math-css") ?? undefined
        ],
        moduleUrl: "_static/js/features/quiz.js"
      }
    },
    ensureStylesheet: async href => {
      if (href.includes("mathjax.css")) {
        throw new Error("Network error loading mathjax.css");
      }
    },
    loadModule: async () => ({
      mount() {
        mounted = true;
      }
    }),
    onError: message => errors.push(message)
  });

  await runtime.mountDocument(document);
  await flushMicrotasks();
  assert.equal(mounted, false);
  assert.ok(errors.some(msg => msg.includes('PLW feature "quiz" failed to mount')));
});

test("math and quiz request the same versioned MathJax stylesheet only once", async () => {
  const article = {
    getAttribute(name: string) {
      if (name === "data-plw-features") return "math quiz";
      if (name === "data-plw-math-css") return "assets/stylesheets/mathjax.css?hash=shared123";
      return null;
    },
    querySelector(selector: string) {
      return selector === "mjx-container" ? {} : null;
    }
  } as unknown as Element;
  const { document, links, createdLinks } = makeStylesheetDocument(() => article, false);
  let mounted = false;

  const runtime = createFeatureRuntime({
    document,
    registry: {
      math: mathFeatureDefinition,
      quiz: {
        stylesheets: [
          "_static/css/quiz.css?v=4",
          root => (root as Element).getAttribute("data-plw-math-css") ?? undefined
        ],
        load: async () => ({
          mount: () => {
            mounted = true;
          }
        })
      }
    }
  });

  await runtime.mountDocument(document);
  await flushMicrotasks();

  const mathLinks = links.filter(link => link.href.includes("mathjax.css"));
  assert.equal(mathLinks.length, 1);
  assert.equal(createdLinks.length, 2);
  assert.equal(mounted, false);
  assert.equal(
    mathLinks[0].href,
    "https://example.test/Physics-Learning-Wiki/assets/stylesheets/mathjax.css?hash=shared123"
  );
  mathLinks[0].load();
  await flushMicrotasks();
  assert.equal(mounted, false, "Quiz also waits for its own stylesheet");
  links.find(link => link.href.includes("quiz.css"))!.load();
  await flushMicrotasks();
  assert.equal(mounted, true);
});

test("instant navigation between quiz pages does not duplicate stylesheet requests", async () => {
  let currentArticle = {
    getAttribute(name: string) {
      if (name === "data-plw-features") return "quiz";
      if (name === "data-plw-math-css") return "assets/stylesheets/mathjax.css?hash=shared123";
      return null;
    }
  } as unknown as Element;
  const { document, links, createdLinks } = makeStylesheetDocument(() => currentArticle);

  const runtime = createFeatureRuntime({
    document,
    registry: {
      quiz: {
        stylesheets: [
          "_static/css/quiz.css?v=4",
          root => (root as Element).getAttribute("data-plw-math-css") ?? undefined
        ],
        load: async () => ({ mount: () => {} })
      }
    }
  });

  await runtime.mountDocument(document);
  await flushMicrotasks();
  const firstCount = createdLinks.length;

  // Navigate to another quiz page with the same stylesheets
  currentArticle = {
    getAttribute(name: string) {
      if (name === "data-plw-features") return "quiz";
      if (name === "data-plw-math-css") return "assets/stylesheets/mathjax.css?hash=shared123";
      return null;
    }
  } as unknown as Element;
  await runtime.mountDocument(document);
  await flushMicrotasks();

  assert.equal(createdLinks.length, firstCount, "Ready links still in the document should be reused");
  assert.equal(links.length, 2);
});

for (const change of ["removed", "replaced"] as const) {
  test(`navigation waits for the current stylesheet when a loaded link is ${change}`, async () => {
    let article = makeArticle("quiz");
    const { document, links, createdLinks } = makeStylesheetDocument(() => article, false);
    let mounts = 0;
    let imports = 0;
    const runtime = createFeatureRuntime({
      document,
      registry: { quiz: { stylesheet: "assets/stylesheets/mathjax.css?hash=abc" } },
      loadModule: async () => {
        imports += 1;
        return {
          mount: () => {
            mounts += 1;
          }
        };
      }
    });
    await runtime.mountDocument();
    links[0].load();
    await flushMicrotasks();
    assert.equal(mounts, 1);
    const previousLink = links.pop()!;
    if (change === "replaced") {
      const replacement = new StylesheetLink();
      replacement.href = previousLink.href;
      links.push(replacement);
    }
    article = makeArticle("quiz");
    await runtime.mountDocument();
    await flushMicrotasks();
    assert.equal(mounts, 1, "A previous load does not make the current link ready");
    assert.equal(links.length, 1);
    assert.notEqual(links[0], previousLink);
    links[0].load();
    await flushMicrotasks();
    assert.equal(mounts, 2);
    assert.equal(imports, 1, "Module caching survives stylesheet replacement");
    assert.equal(createdLinks.length, change === "removed" ? 2 : 1);
  });
}

test("navigation replaces a pending stylesheet and never mounts the aborted page", async () => {
  let article = makeArticle("quiz");
  const firstArticle = article;
  const { document, links } = makeStylesheetDocument(() => article, false);
  const mountedRoots: ParentNode[] = [];
  const runtime = createFeatureRuntime({
    document,
    registry: { quiz: { stylesheet: "assets/stylesheets/mathjax.css?hash=abc" } },
    loadModule: async () => ({
      mount: root => {
        mountedRoots.push(root);
      }
    })
  });
  await runtime.mountDocument();
  const firstSignal = runtime.currentSignal;
  const detachedLink = links.pop()!;
  article = makeArticle("quiz");
  await runtime.mountDocument();
  assert.equal(firstSignal?.aborted, true);
  detachedLink.load();
  await flushMicrotasks();
  assert.deepEqual(mountedRoots, []);
  assert.equal(links.length, 1);
  links[0].load();
  await flushMicrotasks();
  assert.deepEqual(mountedRoots, [article]);
  assert.notEqual(mountedRoots[0], firstArticle);
});

test("stylesheet load errors reject all waiters", async () => {
  const link = new StylesheetLink() as unknown as HTMLLinkElement;
  const pending = waitForStylesheetLink(link);
  assert.equal(waitForStylesheetLink(link), pending);
  const rejected = assert.rejects(pending, /Stylesheet failed to load/);
  link.dispatchEvent(new Event("error"));
  await rejected;
  await assert.rejects(waitForStylesheetLink(link), /Stylesheet failed to load/);
});

test("a stylesheet timeout prevents module import and mount", async () => {
  const { document } = makeStylesheetDocument(() => makeArticle("quiz"), false);
  const error = deferred<string>();
  let imports = 0;
  const runtime = createFeatureRuntime({
    document,
    registry: { quiz: { stylesheet: "assets/stylesheets/mathjax.css" } },
    ensureStylesheet: (href, document) => ensureStylesheet(href, document, { timeoutMs: 10 }),
    loadModule: async () => {
      imports += 1;
      return { mount: () => {} };
    },
    onError: (_message, reason) => error.resolve(String(reason))
  });
  await runtime.mountDocument();
  assert.match(await error.promise, /Stylesheet timed out/);
  assert.equal(imports, 0);
});
