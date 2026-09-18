import type { Manifest, Question, SetBundle, SetCatalogItem, TaxonomyCatalog } from "./types.js";

export interface RunnerParameters {
  setId: string | null;
  seed: string | null;
}

export function getSiteBase(): string {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname;
  if (path.startsWith("/Physics-Learning-Wiki/")) {
    return "/Physics-Learning-Wiki/";
  }
  return "/";
}

export function resolveSiteUrl(path: string): string {
  const base = getSiteBase();
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${cleanPath}`;
}

export function readRunnerParameters(url = new URL(window.location.href)): RunnerParameters {
  const setId = url.searchParams.get("set");
  const seed = url.searchParams.get("seed");
  return { setId, seed };
}

async function fetchJson<T>(url: URL, signal: AbortSignal, noCache = false): Promise<T> {
  const response = await fetch(url, { signal, cache: noCache ? "no-cache" : "default" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

export async function loadManifest(url: URL, signal: AbortSignal): Promise<Manifest> {
  const manifest = await fetchJson<Manifest>(url, signal, true);
  if (manifest.schemaVersion !== 3) throw new Error("Unsupported manifest version");
  return manifest;
}

export async function loadSetBundle(manifestUrl: URL, relative: string, signal: AbortSignal): Promise<SetBundle> {
  const bundle = await fetchJson<SetBundle>(new URL(relative, manifestUrl), signal);
  if (bundle.schemaVersion !== 3) throw new Error("Unsupported question bundle version");
  return bundle;
}

export async function loadSetCatalog(manifestUrl: URL, relative: string, signal: AbortSignal): Promise<SetCatalogItem[]> {
  return await fetchJson<SetCatalogItem[]>(new URL(relative, manifestUrl), signal);
}

export async function loadTaxonomyCatalog(manifestUrl: URL, relative: string, signal: AbortSignal): Promise<TaxonomyCatalog> {
  return await fetchJson<TaxonomyCatalog>(new URL(relative, manifestUrl), signal);
}

export async function loadQuestionCatalog(manifestUrl: URL, relative: string, signal: AbortSignal): Promise<Question[]> {
  return await fetchJson<Question[]>(new URL(relative, manifestUrl), signal);
}
