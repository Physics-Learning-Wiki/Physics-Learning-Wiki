import type { Manifest, PageBundle, QuizMode } from "./types.js";

export interface QuizParameters {
  pageId: string | null;
  mode: QuizMode | null;
  seed: string | null;
}

export function readParameters(url = new URL(window.location.href)): QuizParameters {
  const pageId = url.searchParams.get("page_id");
  const modeValue = url.searchParams.get("mode");
  const mode = modeValue === "quick" || modeValue === "full" || modeValue === "retry" ? modeValue : null;
  return { pageId, mode, seed: url.searchParams.get("seed") };
}

async function fetchJson<T>(url: URL, signal: AbortSignal, noCache = false): Promise<T> {
  const response = await fetch(url, { signal, cache: noCache ? "no-cache" : "default" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

export async function loadManifest(url: URL, signal: AbortSignal): Promise<Manifest> {
  const manifest = await fetchJson<Manifest>(url, signal, true);
  if (manifest.schemaVersion !== 2) throw new Error("Unsupported manifest version");
  return manifest;
}

export async function loadBundle(manifestUrl: URL, relative: string, signal: AbortSignal): Promise<PageBundle> {
  const bundle = await fetchJson<PageBundle>(new URL(relative, manifestUrl), signal);
  if (bundle.schemaVersion !== 2) throw new Error("Unsupported question bundle version");
  return bundle;
}
