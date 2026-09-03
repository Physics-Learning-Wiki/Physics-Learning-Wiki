declare global {
  interface Window {
    MathJax?: { typesetPromise?: (elements?: HTMLElement[]) => Promise<void> };
  }
}

let queue = Promise.resolve();

/**
 * Typesets any pending math formulas inside the given root element.
 *
 * In production builds, question bank bundles are pre-rendered into MathJax CHTML
 * via post-build SSR, and client-side MathJax runtime is removed for performance.
 * In local development mode (`mkdocs serve`), MathJax runtime is retained and this
 * function serves as a CSR fallback.
 */
export function typeset(root: HTMLElement): Promise<void> {
  queue = queue.then(async () => {
    if (window.MathJax?.typesetPromise) await window.MathJax.typesetPromise([root]);
  });
  return queue.catch(() => undefined);
}
