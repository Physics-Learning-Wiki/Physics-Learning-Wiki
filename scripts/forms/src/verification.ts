import { mountTurnstile } from "./turnstile.js";
import type { MountedTurnstile } from "./types.js";

export interface VerificationHandle extends MountedTurnstile {
  ready: Promise<void>;
}

export function createVerification(
  container: HTMLElement,
  signal: AbortSignal,
  onError: (message: string) => void,
  onReady?: () => void
): VerificationHandle {
  const document = container.ownerDocument;
  const controls = document.createElement("div");
  controls.className = "submit-verification-actions";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "重新验证";
  retry.hidden = true;
  const fallback = document.createElement("a");
  fallback.href = "mailto:submit@folderrewind.top";
  fallback.textContent = "也可通过邮件投稿";
  const notice = document.createElement("span");
  notice.setAttribute("role", "status");
  controls.append(retry, fallback, notice);
  container.after(controls);
  let widget: MountedTurnstile | undefined;
  let pending: Promise<void> | undefined;
  let disposed = false;
  let generation = 0;
  const attempt = (): Promise<void> => {
    if (pending) return pending;
    if (disposed || signal.aborted) return Promise.resolve();
    const current = ++generation;
    widget?.dispose();
    widget = undefined;
    retry.disabled = true;
    notice.textContent = "正在加载人机验证…";
    const failed = (message: string) => {
      if (disposed || signal.aborted || current !== generation) return;
      retry.hidden = false;
      notice.textContent = message;
      onError(message);
    };
    pending = mountTurnstile(container, signal, failed)
      .then(mounted => {
        if (disposed || signal.aborted || current !== generation) {
          mounted?.dispose();
          return;
        }
        widget = mounted;
        if (mounted && retry.hidden) {
          notice.textContent = "";
          onReady?.();
        }
      })
      .catch(() => failed("人机验证加载失败，请重新验证或通过邮件投稿．"))
      .finally(() => {
        if (current === generation) {
          retry.disabled = false;
          pending = undefined;
        }
      });
    return pending;
  };
  retry.addEventListener(
    "click",
    () => {
      retry.hidden = true;
      void attempt();
    },
    { signal }
  );
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    ++generation;
    widget?.dispose();
    signal.removeEventListener("abort", dispose);
  };
  signal.addEventListener("abort", dispose, { once: true });
  return {
    ready: attempt(),
    get token() {
      return widget?.token ?? null;
    },
    reset() {
      widget?.reset();
    },
    dispose
  };
}
