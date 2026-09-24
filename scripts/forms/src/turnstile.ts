import { abortable } from "./abort.js";
import type { MountedTurnstile, TurnstileApi } from "./types.js";

const TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SITE_KEY = "0x4AAAAAADWCCejih_jntWim";
let turnstilePromise: Promise<TurnstileApi> | undefined;

function getTurnstileWindow(): Window & { turnstile?: TurnstileApi } {
  return window as Window & { turnstile?: TurnstileApi };
}

function createTurnstilePromise(): Promise<TurnstileApi> {
  const existing = getTurnstileWindow().turnstile;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const script =
      document.querySelector<HTMLScriptElement>('script[data-plw-turnstile="true"]') ??
      document.createElement("script");
    script.src = TURNSTILE_URL;
    script.async = true;
    script.dataset.plwTurnstile = "true";

    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      const api = getTurnstileWindow().turnstile;
      if (!api) {
        turnstilePromise = undefined;
        reject(new Error("Cloudflare Turnstile loaded without an API"));
        return;
      }
      resolve(api);
    };
    const onError = () => {
      cleanup();
      script.remove();
      turnstilePromise = undefined;
      reject(new Error("Cloudflare Turnstile could not be loaded"));
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!script.isConnected) document.head.append(script);
  });
}

export function loadTurnstile(signal?: AbortSignal): Promise<TurnstileApi> {
  if (!turnstilePromise) {
    turnstilePromise = createTurnstilePromise().catch(error => {
      turnstilePromise = undefined;
      throw error;
    });
  }
  return abortable(turnstilePromise, signal);
}

export async function mountTurnstile(
  container: HTMLElement,
  signal: AbortSignal,
  onError: (message: string) => void
): Promise<MountedTurnstile | undefined> {
  const api = await loadTurnstile(signal);
  if (signal.aborted || !container.isConnected) return undefined;

  let token: string | null = null;
  let disposed = false;
  let widgetId: string;
  try {
    widgetId = api.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: value => {
        if (!disposed && !signal.aborted) token = value;
      },
      "expired-callback": () => {
        token = null;
      },
      "error-callback": () => {
        token = null;
        if (!disposed && !signal.aborted) onError("人机验证加载失败，请稍后重试");
      }
    });
  } catch (error) {
    onError(error instanceof Error ? error.message : "人机验证初始化失败");
    return undefined;
  }

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", dispose);
    token = null;
    try {
      api.remove(widgetId);
    } catch {
      // A widget may already have been removed by the provider.
    }
    container.replaceChildren();
  };
  signal.addEventListener("abort", dispose, { once: true });

  return {
    get token() {
      return token;
    },
    reset() {
      token = null;
      try {
        api.reset(widgetId);
      } catch {
        api.reset();
      }
    },
    dispose
  };
}

export function resetTurnstileForTests(): void {
  turnstilePromise = undefined;
}
