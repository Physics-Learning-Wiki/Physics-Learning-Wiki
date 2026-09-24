export interface FeatureMountContext {
  signal: AbortSignal;
}

export type FeatureDisposer = () => void | Promise<void>;

export interface PreviewMathJax {
  tex?: unknown;
  startup?: { promise?: Promise<unknown>; typeset?: boolean };
  typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
  typesetClear?: (elements?: HTMLElement[]) => void;
}

export interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
}

export interface TurnstileApi {
  render(container: string | HTMLElement, options: TurnstileRenderOptions): string;
  remove(widgetId: string): void;
  reset(widgetId?: string): void;
}

export interface MountedTurnstile {
  readonly token: string | null;
  reset(): void;
  dispose(): void;
}
