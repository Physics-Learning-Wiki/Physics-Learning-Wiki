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

  if (excerpt) {
    const teaser = document.createElement("p");
    teaser.className = "md-search-result__teaser";
    appendSafeExcerpt(document, teaser, excerpt);
    article.append(teaser);
  }

  link.append(article);
  return link;
}

function createResultItem(document: Document, data: PagefindResultData, siteRoot: URL): HTMLLIElement | undefined {
  const title = data.meta?.title ?? "";
  const mainLink = createResultLink(document, data, siteRoot, title, data.excerpt ?? "", "h1");
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
    for (const subResult of subResults.slice(0, 5)) {
      const subLink = createResultLink(
        document,
        { url: subResult.url },
        siteRoot,
        subResult.title ?? title,
        subResult.excerpt ?? "",
        "h2"
      );
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

  const runSearch = async (query: string) => {
    const normalizedQuery = query.trim();
    const sequence = ++searchSequence;
    if (!normalizedQuery) {
      resultList.replaceChildren();
      resultMeta.textContent = "输入关键词开始搜索";
      updateQueryUrl("");
      return;
    }

    updateQueryUrl(normalizedQuery);
    resultMeta.textContent = "正在搜索…";
    try {
      const pagefind = await getPagefind();
      const search = await pagefind.search(normalizedQuery);
      if (sequence !== searchSequence) return;
      const data = await Promise.all(search.results.slice(0, 10).map(result => result.data()));
      if (sequence !== searchSequence) return;

      const fragment = document.createDocumentFragment();
      for (const result of data) {
        const item = createResultItem(document, result, siteRoot);
        if (item) fragment.append(item);
      }
      resultList.replaceChildren(fragment);
      resultMeta.textContent = data.length === 0 ? "没有找到结果" : `找到 ${search.results.length} 条结果`;
    } catch (error) {
      if (sequence !== searchSequence) return;
      resultMeta.textContent = "搜索索引暂时不可用";
      console.error("PLW Pagefind search failed", error);
    }
  };

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
    else input.blur();
  };

  const handleInput = () => {
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => void runSearch(input.value), 120);
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
    const links = [...resultList.querySelectorAll<HTMLAnchorElement>(".md-search-result__link[href]")];
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
  input.addEventListener("focus", () => void getPagefind().catch(() => undefined), { signal });
  input.addEventListener("input", handleInput, { signal });
  form.addEventListener("reset", handleReset, { signal });
  form.addEventListener("submit", handleSubmit, { signal });
  document.addEventListener("keydown", handleKeydown, { signal });
  resultList.addEventListener(
    "click",
    event => {
      if ((event.target as Element | null)?.closest("a[href]")) setOpen(false);
    },
    { signal }
  );

  const initialQuery = new URL(document.defaultView?.location.href ?? document.baseURI).searchParams.get("q");
  if (initialQuery) {
    input.value = initialQuery;
    setOpen(true);
    void runSearch(initialQuery);
  }

  return () => {
    controller.abort();
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
  };
}
