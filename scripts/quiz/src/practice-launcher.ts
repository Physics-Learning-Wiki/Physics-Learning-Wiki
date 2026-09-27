import { resolveSiteUrl } from "./data.js";
import { newSeed, shuffle } from "./random.js";
import type { Manifest, PracticeOrigin, Question } from "./types.js";
import type { QuizStore } from "./storage.js";

export const LOCAL_PRACTICE_MAX_QUESTIONS = 50;
export interface PracticeLaunch {
  version: 1;
  launchId: string;
  sessionId: string;
  preview: boolean;
  profileEpoch: string;
  creationBaseRevision: number;
  createdAt: string;
  seed: string;
  selectionAlgorithmVersion: number;
  bankFingerprint: string;
  questionRefs: Array<{ id: string; version: number }>;
  title: string;
  origin: PracticeOrigin;
}
const key = (preview: boolean, id: string) => `plw.quiz.launch.v1.${preview ? "preview" : "prod"}.${id}`;

export function launchLocalPractice(options: {
  questions: Question[];
  count: number;
  title: string;
  origin: PracticeOrigin;
  manifest: Pick<Manifest, "preview" | "bankFingerprint" | "selectionAlgorithmVersion">;
  store: QuizStore;
}): { ok: true } | { ok: false; reason: string } {
  const { questions, count, title, origin, manifest, store } = options;
  const unique = new Map(questions.filter(q => q.status === "published" || manifest.preview).map(q => [q.id, q]));
  if (!unique.size || count < 1 || count > LOCAL_PRACTICE_MAX_QUESTIONS || title.length > 120)
    return { ok: false, reason: "练习题目或数量无效" };
  const seed = newSeed();
  const selected = shuffle([...unique.values()], seed).slice(0, count);
  const id = crypto.randomUUID();
  const snapshot = store.read();
  const payload: PracticeLaunch = {
    version: 1,
    launchId: id,
    sessionId: id,
    preview: manifest.preview,
    profileEpoch: snapshot.profileEpoch,
    creationBaseRevision: snapshot.revision,
    createdAt: new Date().toISOString(),
    seed,
    selectionAlgorithmVersion: manifest.selectionAlgorithmVersion,
    bankFingerprint: manifest.bankFingerprint,
    questionRefs: selected.map(q => ({ id: q.id, version: q.version })),
    title,
    origin
  };
  try {
    sessionStorage.setItem(key(manifest.preview, id), JSON.stringify(payload));
  } catch {
    return { ok: false, reason: "浏览器无法暂存练习启动信息" };
  }
  window.location.assign(`${resolveSiteUrl("quiz/play/")}?launch=${encodeURIComponent(id)}`);
  return { ok: true };
}

export function readPracticeLaunch(id: string, preview: boolean): PracticeLaunch | null {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(key(preview, id));
  } catch {
    return null;
  }
  if (!raw) return null;
  let value: any;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !value ||
    value.version !== 1 ||
    value.launchId !== id ||
    value.sessionId !== id ||
    value.preview !== preview ||
    typeof value.profileEpoch !== "string" ||
    !Number.isSafeInteger(value.creationBaseRevision) ||
    value.creationBaseRevision < 0 ||
    typeof value.seed !== "string" ||
    typeof value.title !== "string" ||
    value.title.length > 120 ||
    typeof value.bankFingerprint !== "string" ||
    !Number.isSafeInteger(value.selectionAlgorithmVersion) ||
    !Array.isArray(value.questionRefs) ||
    value.questionRefs.length < 1 ||
    value.questionRefs.length > LOCAL_PRACTICE_MAX_QUESTIONS ||
    value.questionRefs.some(
      (r: any) => !r || typeof r.id !== "string" || !Number.isSafeInteger(r.version) || r.version < 1
    ) ||
    new Set(value.questionRefs.map((r: any) => r.id)).size !== value.questionRefs.length ||
    !value.origin ||
    !["mistakes", "saved", "collection", "retry"].includes(value.origin.type) ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    Date.now() - Date.parse(value.createdAt) > 24 * 60 * 60 * 1000 ||
    Date.parse(value.createdAt) - Date.now() > 5 * 60 * 1000
  )
    return null;
  return value as PracticeLaunch;
}

export function clearPracticeLaunch(id: string, preview: boolean): boolean {
  try {
    sessionStorage.removeItem(key(preview, id));
    return sessionStorage.getItem(key(preview, id)) === null;
  } catch {
    return false;
  }
}
