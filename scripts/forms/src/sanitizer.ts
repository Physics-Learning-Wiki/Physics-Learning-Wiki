import DOMPurify from "dompurify";
import type { Config, DOMPurify as DOMPurifyI } from "dompurify";

export const PREVIEW_PURIFY_CONFIG: Config = {
  ALLOWED_TAGS: [
    "p", "br", "em", "strong", "del", "code", "pre", "blockquote",
    "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
    "h2", "h3", "h4", "h5", "h6", "hr", "span", "div", "a", "img",
    "mjx-container", "mjx-math", "mjx-mrow", "mjx-mi", "mjx-mo", "mjx-mn"
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "class", "aria-label", "aria-hidden",
    "target", "rel", "jax", "display"
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "link", "style"],
  FORBID_ATTR: ["style", "onerror", "onload", "onclick", "onmouseover"]
};

function getPurifier(): { sanitize(html: string, config?: Config): string } {
  if (typeof DOMPurify === "function") {
    if (typeof window !== "undefined") {
      return (DOMPurify as unknown as (w: Window) => DOMPurifyI)(window);
    }
  }
  return DOMPurify as unknown as DOMPurifyI;
}

export function sanitizePreviewHtml(rawHtml: string): string {
  const purifier = getPurifier();
  if (purifier && typeof purifier.sanitize === "function") {
    return String(purifier.sanitize(rawHtml, PREVIEW_PURIFY_CONFIG));
  }
  // Defensive fallback when DOM environment is absent
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "")
    .replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
}
