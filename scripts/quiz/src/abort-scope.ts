export interface AbortScope {
  controller: AbortController;
  release(): void;
}

export function createAbortScope(parentSignal?: AbortSignal): AbortScope {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal?.reason);

  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  }

  return {
    controller,
    release() {
      parentSignal?.removeEventListener("abort", abortFromParent);
    }
  };
}
