declare global {
  interface Window {
    MathJax?: { typesetPromise?: (elements?: HTMLElement[]) => Promise<void> };
  }
}

let queue = Promise.resolve();

export function typeset(root: HTMLElement): Promise<void> {
  queue = queue.then(async () => {
    if (window.MathJax?.typesetPromise) await window.MathJax.typesetPromise([root]);
  });
  return queue.catch(() => undefined);
}
