export interface PagefindSubResult {
  title?: string;
  url?: string;
  excerpt?: string;
}

export interface PagefindResultData {
  url?: string;
  excerpt?: string;
  meta?: Record<string, string>;
  sub_results?: PagefindSubResult[];
}

interface PagefindResult {
  data(): Promise<PagefindResultData>;
}

export interface PagefindApi {
  options(options: { baseUrl: string }): Promise<void>;
  init(): Promise<void>;
  search(query: string): Promise<{ results: PagefindResult[] }>;
}

type PagefindImporter = (url: string) => Promise<PagefindApi>;

const importPagefind: PagefindImporter = url => import(url) as Promise<PagefindApi>;

export function shouldOpenSearchShortcut(event: {
  key: string;
  target: EventTarget | null;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey || !["/", "s", "S", "f", "F"].includes(event.key)) return false;

  const target = event.target as HTMLElement | null;
  const tagName = target?.tagName?.toLowerCase();
  if (["input", "textarea", "select", "option"].includes(tagName ?? "")) return false;
  return !target?.isContentEditable && !target?.closest?.('[contenteditable="true"], [contenteditable=""]');
}

function appendSafeExcerpt(document: Document, target: HTMLElement, excerpt: string) {
  const template = document.createElement("template");
  template.innerHTML = excerpt;

  const appendNode = (source: Node, destination: Node) => {
    if (source.nodeType === 3) {
      destination.appendChild(document.createTextNode(source.textContent ?? ""));
      return;
    }
    if (!(source instanceof Element)) return;
    if (source.tagName.toLowerCase() !== "mark") {
      destination.appendChild(document.createTextNode(source.textContent ?? ""));
      return;
    }
    const mark = document.createElement("mark");
    for (const child of [...source.childNodes]) appendNode(child, mark);
    destination.appendChild(mark);
  };

  for (const child of [...template.content.childNodes]) appendNode(child, target);
}

function resultUrl(rawUrl: string | undefined, siteRoot: URL, document: Document): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl, siteRoot);
    if (url.origin !== siteRoot.origin || !url.pathname.startsWith(siteRoot.pathname)) return undefined;
    return new URL(url.href, document.baseURI).href;
  } catch {
    return undefined;
  }
}

function createResultLink(
  document: Document,
  data: PagefindResultData,
  siteRoot: URL,
  title: string,
  excerpt: string,
  headingTag: "h1" | "h2"
): HTMLAnchorElement | undefined {
  const href = resultUrl(data.url, siteRoot, document);
  if (!href) return undefined;

  const link = document.createElement("a");
  link.className = "md-search-result__link";
  link.href = href;
  link.tabIndex = -1;

  const article = document.createElement("article");
  article.className = "md-search-result__article md-typeset";
  article.dataset.mdScore = "1";
  const heading = document.createElement(headingTag);
  heading.textContent = title || "未命名页面";
  article.append(heading);

  const context = [data.meta?.kind, data.meta?.breadcrumb].filter(Boolean).join(" · ");
  if (context) {
    const label = document.createElement("p");
    label.className = "plw-search-context";
    label.textContent = context;
    article.append(label);
  }
  if (excerpt) {
    const teaser = document.createElement("p");
    teaser.className = "md-search-result__teaser";
    if (data.meta?.description) teaser.textContent = excerpt;
    else appendSafeExcerpt(document, teaser, excerpt);
    article.append(teaser);
  }

  link.append(article);
  return link;
}

function createResultItem(document: Document, data: PagefindResultData, siteRoot: URL): HTMLLIElement | undefined {
  const title = data.meta?.title ?? "";
  const mainLink = createResultLink(
    document,
    data,
    siteRoot,
    title,
    data.meta?.description ?? data.excerpt ?? "",
    "h1"
  );
  if (!mainLink) return undefined;

  const item = document.createElement("li");
  item.className = "md-search-result__item";
  item.append(mainLink);

  const subResults = (data.sub_results ?? []).filter(result => result.url && result.url !== data.url);
  if (subResults.length > 0) {
    const details = document.createElement("details");
    details.className = "md-search-result__more";
    const summary = document.createElement("summary");
    summary.textContent = `匹配章节（${subResults.length}）`;
    details.append(summary);
    for (const subResult of subResults) {
      const subLink = createResultLink(document, { url: subResult.url }, siteRoot, subResult.title ?? title, "", "h2");
      if (subLink) {
        const subItem = document.createElement("div");
        subItem.className = "md-search-result__item";
        subItem.append(subLink);
        details.append(subItem);
      }
    }
    item.append(details);
  }

  return item;
}

export function mountSearch(
  document: Document,
  getSiteRoot: (document: Document) => URL,
  loadPagefind: PagefindImporter = importPagefind
): () => void {
  const root = document.querySelector<HTMLElement>('.md-search[data-plw-component="search"]');
  const input = root?.querySelector<HTMLInputElement>(".md-search__input");
  const resultList = root?.querySelector<HTMLOListElement>(".md-search-result__list");
  const resultMeta = root?.querySelector<HTMLElement>(".md-search-result__meta");
  const form = root?.querySelector<HTMLFormElement>(".md-search__form");
  const toggle = document.querySelector<HTMLInputElement>("#__search");
  if (!root || !input || !resultList || !resultMeta || !form || !toggle) return () => undefined;

  const controller = new AbortController();
  const { signal } = controller;
  const siteRoot = getSiteRoot(document);
  let pagefindPromise: Promise<PagefindApi> | undefined;
  let searchTimer: number | undefined;
  let searchSequence = 0;
  resultMeta.setAttribute("aria-live", "polite");
  resultMeta.textContent = "输入关键词开始搜索";

  const getPagefind = () => {
    if (!pagefindPromise) {
      const pagefindUrl = new URL("pagefind/pagefind.js", siteRoot);
      pagefindPromise = loadPagefind(pagefindUrl.href).then(async pagefind => {
        await pagefind.options({ baseUrl: siteRoot.pathname });
        await pagefind.init();
        return pagefind;
      });
      pagefindPromise.catch(() => {
        pagefindPromise = undefined;
      });
    }
    return pagefindPromise;
  };

  const updateQueryUrl = (query: string) => {
    const url = new URL(document.defaultView?.location.href ?? document.baseURI);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    document.defaultView?.history.replaceState(null, "", url.href);
  };

  const more = document.createElement("button");
  more.type = "button";
  more.className = "md-button plw-search-more";
  more.textContent = "加载更多";
  more.hidden = true;
  resultList.after(more);
  let matches: PagefindResult[] = [];
  let displayed = 0;
  let currentQuery = "";
  let retry: (() => Promise<void>) | undefined;

  const isCurrent = (sequence: number) => !signal.aborted && sequence === searchSequence;
  const invalidate = () => {
    ++searchSequence;
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    searchTimer = undefined;
    more.disabled = false;
  };
  const appendBatch = async (sequence: number) => {
    more.disabled = true;
    try {
      const batch = await Promise.all(matches.slice(displayed, displayed + 10).map(result => result.data()));
      if (!isCurrent(sequence)) return;
      const fragment = document.createDocumentFragment();
      for (const data of batch) {
        const item = createResultItem(document, data, siteRoot);
        if (item) fragment.append(item);
      }
      resultList.append(fragment);
      displayed += batch.length;
      resultMeta.textContent = matches.length ? `已显示 ${displayed} 条，共 ${matches.length} 条` : "没有找到结果";
      more.hidden = displayed >= matches.length;
      more.disabled = false;
      more.textContent = "加载更多";
      retry = undefined;
    } catch (error) {
      if (!isCurrent(sequence)) return;
      resultMeta.textContent = `加载失败，已显示 ${displayed} 条，请重试`;
      more.hidden = false;
      more.disabled = false;
      more.textContent = "重试";
      retry = () => appendBatch(sequence);
      console.error("PLW Pagefind result loading failed", error);
    }
  };
  const runSearch = async (query: string) => {
    invalidate();
    const sequence = searchSequence;
    currentQuery = query.trim();
    matches = [];
    displayed = 0;
    retry = undefined;
    resultList.replaceChildren();
    more.hidden = true;
    updateQueryUrl(currentQuery);
    if (!currentQuery) {
      resultMeta.textContent = "输入关键词开始搜索";
      return;
    }
    resultMeta.textContent = "正在搜索…";
    try {
      const pagefind = await getPagefind();
      if (!isCurrent(sequence)) return;
      const search = await pagefind.search(currentQuery);
      if (!isCurrent(sequence)) return;
      matches = search.results;
      await appendBatch(sequence);
    } catch (error) {
      if (!isCurrent(sequence)) return;
      resultMeta.textContent = "搜索索引暂时不可用，请重试";
      more.hidden = false;
      more.disabled = false;
      more.textContent = "重试";
      retry = () => runSearch(input.value);
      console.error("PLW Pagefind search failed", error);
    }
  };
  more.addEventListener("click", () => void (retry ? retry() : appendBatch(searchSequence)), { signal });

  const focusInput = (select = false) => {
    input.focus();
    if (select) input.select();
  };

  const setOpen = (open: boolean, select = false) => {
    if (toggle.checked !== open) {
      toggle.checked = open;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (open) {
      focusInput(select);
    }
  };

  const handleToggle = () => {
    if (toggle.checked) focusInput();
    else {
      invalidate();
      input.blur();
    }
  };

  const handleInput = () => {
    invalidate();
    more.hidden = true;
    searchTimer = window.setTimeout(() => void runSearch(input.value), 120);
  };

  const handleFocus = () => {
    setOpen(true);
    void getPagefind().catch(() => undefined);
    if (input.value.trim() && !matches.length) void runSearch(input.value);
  };

  const handleReset = () => {
    window.setTimeout(() => void runSearch(""), 0);
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    void runSearch(input.value);
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (toggle.checked && event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (!toggle.checked && shouldOpenSearchShortcut(event)) {
      event.preventDefault();
      setOpen(true, true);
      return;
    }

    if (!toggle.checked || !["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
    const links = [...resultList.querySelectorAll<HTMLAnchorElement>(".md-search-result__link[href]")].filter(
      link => !link.closest("details") || link.closest("details")!.open
    );
    if (event.key === "Enter" && document.activeElement === input && links[0]) {
      event.preventDefault();
      links[0].click();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const currentIndex = links.indexOf(document.activeElement as HTMLAnchorElement);
    const nextIndex =
      event.key === "ArrowDown"
        ? currentIndex < 0
          ? 0
          : Math.min(currentIndex + 1, links.length - 1)
        : currentIndex <= 0
        ? -1
        : currentIndex - 1;
    if (nextIndex === -1) focusInput();
    else if (links[nextIndex]) links[nextIndex].focus();
    event.preventDefault();
  };

  toggle.addEventListener("change", handleToggle, { signal });
  input.addEventListener("focus", handleFocus, { signal });
  input.addEventListener("input", handleInput, { signal });
  form.addEventListener("reset", handleReset, { signal });
  form.addEventListener("submit", handleSubmit, { signal });
  document.addEventListener("keydown", handleKeydown, { signal });
  document.addEventListener(
    "click",
    event => {
      if ((event.target as Element | null)?.closest("[data-plw-open-search]")) setOpen(true);
    },
    { signal }
  );
  resultList.addEventListener(
    "click",
    event => {
      if ((event.target as Element | null)?.closest("a[href]")) setOpen(false);
    },
    { signal }
  );

  document.addEventListener(
    "plw:page-change",
    () => {
      invalidate();
      matches = [];
      displayed = 0;
      resultList.replaceChildren();
      more.hidden = true;
      setOpen(false);
    },
    { signal }
  );

  const isQuizSurfaceWithQuery = Boolean(document.querySelector("#plw-quiz-questions-root, #plw-quiz-library-root"));
  const initialQuery = isQuizSurfaceWithQuery
    ? null
    : new URL(document.defaultView?.location.href ?? document.baseURI).searchParams.get("q");
  if (initialQuery) {
    input.value = initialQuery;
    setOpen(true);
    void runSearch(initialQuery);
  }

  return () => {
    invalidate();
    controller.abort();
    more.remove();
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
  };
}
