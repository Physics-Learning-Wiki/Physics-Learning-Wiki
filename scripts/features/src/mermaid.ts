import mermaid from "mermaid";

declare const __PLW_MERMAID_THEME_CSS__: string;

const patchKey = Symbol.for("plw.mermaid.responsive.attach-shadow");
const responsiveObservers = new Set<MutationObserver>();
let initialized = false;

function getNaturalWidth(svg: SVGSVGElement): number {
  const viewBoxWidth = svg.viewBox.baseVal.width;
  if (viewBoxWidth > 0) return viewBoxWidth;
  const maxWidth = Number.parseFloat(svg.style.maxWidth);
  return Number.isFinite(maxWidth) ? maxWidth : 0;
}

function styleHost(host: HTMLElement): void {
  host.style.setProperty("overflow-x", "auto", "important");
  host.style.setProperty("overflow-y", "hidden", "important");
  host.style.setProperty("display", "block", "important");
  host.style.setProperty("max-width", "100%", "important");
  host.style.setProperty("-webkit-overflow-scrolling", "touch");
}

function applyResponsiveStyles(host: HTMLElement, svg: SVGSVGElement): void {
  const naturalWidth = getNaturalWidth(svg);
  const minWidth = naturalWidth > 300 ? Math.round(naturalWidth) : undefined;
  styleHost(host);

  const shadow = svg.getRootNode();
  if (shadow instanceof ShadowRoot) {
    if (shadow.querySelector("style[data-mermaid-responsive]")) return;
    const style = host.ownerDocument.createElement("style");
    style.dataset.mermaidResponsive = "true";
    style.textContent = [
      ":host { display: block !important; overflow-x: auto !important; overflow-y: hidden !important; max-width: 100% !important; -webkit-overflow-scrolling: touch; scrollbar-width: thin; }",
      "svg { display: block !important; margin: 0 auto !important;",
      minWidth ? ` min-width: ${minWidth}px !important; width: ${minWidth}px !important;` : "",
      " max-width: none !important; height: auto !important; }"
    ].join("");
    shadow.append(style);
    return;
  }

  svg.style.setProperty("display", "block", "important");
  svg.style.setProperty("margin", "0 auto", "important");
  if (minWidth) {
    svg.style.setProperty("min-width", `${minWidth}px`, "important");
    svg.style.setProperty("width", `${minWidth}px`, "important");
  }
  svg.style.setProperty("max-width", "none", "important");
  svg.style.setProperty("height", "auto", "important");
}

function observeShadow(host: HTMLElement, shadow: ShadowRoot): void {
  const existingSvg = shadow.querySelector<SVGSVGElement>("svg");
  if (existingSvg) {
    applyResponsiveStyles(host, existingSvg);
    return;
  }

  const observer = new MutationObserver(() => {
    const svg = shadow.querySelector<SVGSVGElement>("svg");
    if (!svg) return;
    observer.disconnect();
    responsiveObservers.delete(observer);
    applyResponsiveStyles(host, svg);
  });
  responsiveObservers.add(observer);
  observer.observe(shadow, { childList: true, subtree: true });
}

function installResponsiveShadowPatch(): void {
  const prototype = Element.prototype as unknown as Record<symbol, unknown>;
  if (prototype[patchKey]) return;

  const attachShadow = Element.prototype.attachShadow;
  Object.defineProperty(prototype, patchKey, { value: true });
  Element.prototype.attachShadow = function (init: ShadowRootInit): ShadowRoot {
    const isMermaidHost = this.classList?.contains("mermaid") ?? false;
    const shadow = attachShadow.call(this, isMermaidHost ? { ...init, mode: "open" } : init);
    if (isMermaidHost) observeShadow(this as HTMLElement, shadow);
    return shadow;
  };
}

function initializeMermaid(): void {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    themeCSS: __PLW_MERMAID_THEME_CSS__,
    sequence: {
      actorFontSize: "16px",
      messageFontSize: "16px",
      noteFontSize: "16px"
    }
  });
  initialized = true;
}

export async function mount(root: ParentNode, context: { signal: AbortSignal }): Promise<() => void> {
  const { signal } = context;
  const sources = [...root.querySelectorAll<HTMLElement>("[data-plw-mermaid-source]")];
  let disposed = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", dispose);
    for (const observer of responsiveObservers) observer.disconnect();
    responsiveObservers.clear();
  };

  if (signal.aborted || sources.length === 0) return dispose;
  signal.addEventListener("abort", dispose, { once: true });

  installResponsiveShadowPatch();
  initializeMermaid();

  for (const source of sources) {
    source.classList.add("mermaid");
    if (source.hasAttribute("data-processed") && !source.querySelector("svg")) {
      source.removeAttribute("data-processed");
    }
  }

  try {
    await mermaid.run({ nodes: sources });
    if (!signal.aborted) {
      for (const source of sources) {
        const svg = source.querySelector<SVGSVGElement>("svg");
        if (svg) applyResponsiveStyles(source, svg);
      }
    }
  } catch (error) {
    dispose();
    throw error;
  }

  if (signal.aborted) dispose();
  return dispose;
}
