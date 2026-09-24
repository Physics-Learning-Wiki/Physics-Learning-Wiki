import { abortable } from "./abort.js";
import type { PreviewMathJax } from "./types.js";

const MATHJAX_URL = "https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-mml-chtml.js";
let previewMathJaxPromise: Promise<PreviewMathJax> | undefined;

function getPreviewMathJaxWindow(): Window & { MathJax?: PreviewMathJax } {
  return window as Window & { MathJax?: PreviewMathJax };
}

function createPreviewMathJax(): Promise<PreviewMathJax> {
  const target = getPreviewMathJaxWindow();
  if (target.MathJax?.typesetPromise) return Promise.resolve(target.MathJax);

  return new Promise((resolve, reject) => {
    target.MathJax = {
      tex: {
        inlineMath: [
          ["$", "$"],
          ["\\(", "\\)"]
        ],
        displayMath: [
          ["$$", "$$"],
          ["\\[", "\\]"]
        ],
        processEscapes: true
      },
      startup: { typeset: false }
    } as PreviewMathJax;

    const script = document.createElement("script");
    script.src = MATHJAX_URL;
    script.async = true;
    script.dataset.plwPreviewMathjax = "true";

    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      const api = getPreviewMathJaxWindow().MathJax;
      if (!api) {
        reject(new Error("MathJax loaded without an API"));
        return;
      }
      Promise.resolve(api.startup?.promise)
        .then(() => {
          const readyApi = getPreviewMathJaxWindow().MathJax;
          if (!readyApi?.typesetPromise) throw new Error("MathJax preview is not ready");
          resolve(readyApi);
        })
        .catch(reject);
    };
    const onError = () => {
      cleanup();
      script.remove();
      previewMathJaxPromise = undefined;
      reject(new Error("MathJax preview could not be loaded"));
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.append(script);
  });
}

export function loadPreviewMathJax(signal?: AbortSignal): Promise<PreviewMathJax> {
  if (!previewMathJaxPromise) {
    previewMathJaxPromise = createPreviewMathJax().catch(error => {
      previewMathJaxPromise = undefined;
      throw error;
    });
  }
  return abortable(previewMathJaxPromise, signal);
}

export function resetPreviewMathJaxForTests(): void {
  previewMathJaxPromise = undefined;
}
