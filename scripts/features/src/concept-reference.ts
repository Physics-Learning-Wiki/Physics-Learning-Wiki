import type { FeatureMountContext } from "../../runtime/src/loader.js";

interface Concept {
  name: string;
  english: string;
  summary: string;
  href: string;
}

let nextId = 0;

export function mount(root: ParentNode, { signal }: FeatureMountContext): void | (() => void) {
  const document = root.ownerDocument;
  const window = document?.defaultView;
  if (!document || !window || signal.aborted || typeof HTMLElement.prototype.showPopover !== "function") return;
  const source = root.querySelector<HTMLTemplateElement>("template[data-plw-concepts]");
  const json = source?.content.textContent;
  if (!json) return;

  let concepts: Record<string, Concept>;
  try {
    concepts = JSON.parse(json);
    if (!concepts || typeof concepts !== "object" || Array.isArray(concepts)) return;
    for (const value of Object.values(concepts)) {
      if (!value || [value.name, value.english, value.summary, value.href].some(item => typeof item !== "string"))
        return;
      const target = new URL(value.href, document.baseURI);
      if (!value.name.trim() || !value.summary.trim() || target.origin !== window.location.origin) return;
      if (!/^https?:$/.test(target.protocol)) return;
    }
  } catch {
    return;
  }

  const links = [...root.querySelectorAll<HTMLAnchorElement>("a[data-plw-concept]")].filter(link => {
    const key = link.dataset.plwConcept ?? "";
    return (
      Object.prototype.hasOwnProperty.call(concepts, key) &&
      new URL(concepts[key].href, document.baseURI).href === link.href
    );
  });
  if (!links.length) return;

  const controller = new AbortController();
  const options = { signal: controller.signal };
  const panel = document.createElement("div");
  panel.id = `plw-concept-popover-${++nextId}`;
  panel.className = "plw-concept-popover";
  // Manage dismissal explicitly: a normal anchor is not a native popover
  // invoker, so auto light-dismiss would hide it before its toggle click.
  panel.popover = "manual";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("data-pagefind-ignore", "all");

  const title = document.createElement("h2");
  title.id = `${panel.id}-title`;
  title.tabIndex = -1;
  panel.setAttribute("aria-labelledby", title.id);
  const english = document.createElement("p");
  english.className = "plw-concept-english";
  english.lang = "en";
  const summary = document.createElement("p");
  const fullPage = document.createElement("a");
  fullPage.textContent = "阅读完整内容 →";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "关闭";
  closeButton.className = "plw-concept-close";
  closeButton.setAttribute("aria-label", "关闭概念解释");
  panel.append(title, english, summary, fullPage, closeButton);
  document.body.append(panel);

  let active: HTMLAnchorElement | undefined;
  let frame = 0;
  let disposed = false;
  const originalAttributes = new Map<HTMLAnchorElement, Map<string, string | null>>();
  const attributes = ["aria-haspopup", "aria-controls", "aria-expanded", "aria-label", "data-plw-concept-ready"];

  const deactivate = () => {
    active?.setAttribute("aria-expanded", "false");
    active = undefined;
  };
  const close = (restoreFocus: boolean) => {
    const trigger = active;
    if (panel.matches(":popover-open")) panel.hidePopover();
    deactivate();
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
  };
  const position = () => {
    frame = 0;
    if (!active || !panel.matches(":popover-open")) return;
    const anchor = active.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    const margin = 16;
    const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - box.width - margin));
    const below = anchor.bottom + 8;
    const above = anchor.top - box.height - 8;
    const top = Math.max(
      margin,
      Math.min(
        below + box.height <= window.innerHeight - margin ? below : above,
        window.innerHeight - box.height - margin
      )
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  };
  const schedulePosition = () => {
    if (active && !frame) frame = window.requestAnimationFrame(position);
  };

  for (const link of links) {
    originalAttributes.set(link, new Map(attributes.map(name => [name, link.getAttribute(name)])));
    link.setAttribute("aria-haspopup", "dialog");
    link.setAttribute("aria-controls", panel.id);
    link.setAttribute("aria-expanded", "false");
    link.setAttribute(
      "aria-label",
      `${link.textContent?.trim() || concepts[link.dataset.plwConcept!].name}，查看概念解释`
    );
    link.setAttribute("data-plw-concept-ready", "");
    link.addEventListener(
      "click",
      event => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        if (link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
        if (disposed || signal.aborted) return;
        if (active === link && panel.matches(":popover-open")) {
          event.preventDefault();
          event.stopPropagation();
          close(true);
          return;
        }
        const concept = concepts[link.dataset.plwConcept!];
        close(false);
        title.textContent = concept.name;
        english.textContent = concept.english;
        english.hidden = !concept.english;
        summary.textContent = concept.summary;
        fullPage.href = link.href;
        active = link;
        try {
          panel.showPopover();
        } catch {
          deactivate();
          return; // Do not cancel the underlying link if enhancement fails.
        }
        event.preventDefault();
        // Material handles internal links on body: prevent instant navigation
        // only for clicks that successfully opened our explanation.
        event.stopPropagation();
        link.setAttribute("aria-expanded", "true");
        position();
        if (event.detail === 0) title.focus({ preventScroll: true });
      },
      options
    );
  }
  closeButton.addEventListener("click", () => close(true), options);
  panel.addEventListener(
    "toggle",
    () => {
      if (!panel.matches(":popover-open")) deactivate();
    },
    options
  );
  document.addEventListener(
    "keydown",
    event => {
      if (event.key !== "Escape" || !active) return;
      event.preventDefault();
      event.stopPropagation();
      close(true);
    },
    { ...options, capture: true }
  );
  document.addEventListener(
    "pointerdown",
    event => {
      if (!active || !(event.target instanceof Node)) return;
      if (panel.contains(event.target) || links.some(link => link.contains(event.target as Node))) return;
      close(false);
    },
    { ...options, capture: true }
  );
  window.addEventListener("resize", schedulePosition, options);
  document.addEventListener("scroll", schedulePosition, { ...options, capture: true, passive: true });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    controller.abort();
    signal.removeEventListener("abort", dispose);
    if (frame) window.cancelAnimationFrame(frame);
    close(false);
    panel.remove();
    for (const [link, saved] of originalAttributes) {
      for (const [name, value] of saved) {
        if (value === null) link.removeAttribute(name);
        else link.setAttribute(name, value);
      }
    }
  };
  signal.addEventListener("abort", dispose, { once: true });
  return dispose;
}
