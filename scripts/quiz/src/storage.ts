import { applyLearningResult, learningOutcome } from "./learning.js";
import type {
  Attempt,
  QuestionCollection,
  QuestionLearningRecord,
  QuestionResult,
  QuizSource,
  QuizStorageData,
  SavedQuestionRecord,
  Session
} from "./types.js";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
export interface LockLike {
  request<T>(name: string, options: { mode: "exclusive" }, callback: () => Promise<T>): Promise<T>;
}
export const STORAGE_KEY_PROD = "plw.quiz.v3";
export const STORAGE_KEY_PREVIEW = "plw.quiz.preview.v3";
export const LEGACY_KEY_PROD = "plw.quiz.v2";
export const LEGACY_KEY_PREVIEW = "plw.quiz.preview.v2";
const MAX_BYTES = 4 * 1024 * 1024;
export type StoreError =
  | "quota_exceeded"
  | "unavailable"
  | "read_only"
  | "conflict"
  | "stale_profile"
  | "invalid_data"
  | "limit_exceeded"
  | "session_missing";
export type StorageWriteResult<T> = { ok: true; value: T; revision: number } | { ok: false; reason: StoreError };
export type StorageStatus = "ready" | "empty" | "corrupt_data" | "version_mismatch" | "unavailable";

const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const num = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const date = (v: unknown): v is string =>
  str(v) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v) && !Number.isNaN(Date.parse(v));
const strs = (v: unknown, max = 500): v is string[] => Array.isArray(v) && v.length <= max && v.every(str);
function hasDangerousKeys(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  if (Array.isArray(v)) return v.some(hasDangerousKeys);
  return Object.entries(v).some(
    ([key, child]) => ["__proto__", "prototype", "constructor"].includes(key) || hasDangerousKeys(child)
  );
}
const textLength = (v: string) => [...v].length;
function isAnswer(v: unknown): boolean {
  if (v === null || typeof v === "boolean") return true;
  if (typeof v === "string") return textLength(v) <= 20000;
  if (Array.isArray(v)) return v.length <= 500 && v.every(x => typeof x === "string" && textLength(x) <= 20000);
  if (!obj(v)) return false;
  if (typeof v.text === "string")
    return textLength(v.text) <= 20000 && (v.levelId === null || typeof v.levelId === "string");
  return (
    typeof v.value === "string" &&
    textLength(v.value) <= 20000 &&
    (v.unit === undefined || (typeof v.unit === "string" && textLength(v.unit) <= 20000))
  );
}
const epochId = () => globalThis.crypto?.randomUUID?.() ?? `epoch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const UNCHANGED = Symbol("unchanged");
type Unchanged<T> = { [UNCHANGED]: T };
const validEpoch = (value: unknown): value is string =>
  str(value) && (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value) || /^epoch-\d+-[a-z0-9]+$/.test(value));
export function sourceKey(source: QuizSource): string {
  return source.type === "set" ? `set:${source.id}` : `adhoc:${[...source.questionIds].sort().join(",")}`;
}
export function emptyData(): QuizStorageData {
  return {
    schemaVersion: 3,
    profileEpoch: "",
    revision: 0,
    activeSessions: {},
    attempts: [],
    learning: { historyCoverage: "since_profile_creation", trackedSince: "", questions: {} },
    library: { savedQuestions: {}, collections: {} },
    preferences: { restoreSession: true }
  };
}
const isSource = (v: unknown): v is QuizSource =>
  obj(v) && (v.type === "set" ? str(v.id) : v.type === "adhoc" && strs(v.questionIds));
function isResult(v: unknown): v is QuestionResult {
  const evaluationOk = (e: unknown): boolean => {
    if (e === undefined) return true;
    if (
      !obj(e) ||
      !["automatic", "self_assessed"].includes(e.mode) ||
      !Number.isFinite(e.score) ||
      !Number.isFinite(e.maxScore) ||
      e.score < 0 ||
      e.maxScore < 0 ||
      e.score > e.maxScore
    )
      return false;
    if (e.mode === "automatic" && !["correct", "incorrect", "unanswered"].includes(e.status)) return false;
    if (e.mode === "self_assessed" && !["assessed", "unanswered"].includes(e.status)) return false;
    return true;
  };
  return (
    obj(v) &&
    str(v.questionId) &&
    num(v.version) &&
    v.version > 0 &&
    strs(v.topicIds) &&
    strs(v.conceptIds) &&
    strs(v.objectiveIds) &&
    typeof v.correct === "boolean" &&
    typeof v.unanswered === "boolean" &&
    typeof v.uncertain === "boolean" &&
    isAnswer(v.answer) &&
    evaluationOk(v.evaluation) &&
    (v.evaluation === undefined ||
      (v.evaluation.status === "unanswered" ? v.unanswered && !v.correct : !v.unanswered)) &&
    (v.evaluation?.status !== "correct" || v.correct) &&
    (v.evaluation?.status !== "incorrect" || !v.correct)
  );
}
function isAttempt(v: unknown): v is Attempt {
  if (
    !obj(v) ||
    !str(v.sessionId) ||
    !isSource(v.source) ||
    !str(v.seed) ||
    !str(v.bankFingerprint) ||
    !date(v.completedAt) ||
    !num(v.score) ||
    !num(v.total) ||
    !Array.isArray(v.questionResults) ||
    v.questionResults.length > 500 ||
    v.total !== v.questionResults.length ||
    !v.questionResults.every(isResult)
  )
    return false;
  const results = v.questionResults as QuestionResult[];
  if (new Set(results.map(result => result.questionId)).size !== results.length) return false;
  if (v.source.type === "adhoc") {
    const ids = v.source.questionIds;
    if (ids.length !== results.length || new Set(ids).size !== ids.length) return false;
    if (ids.some((id: string) => !results.some(result => result.questionId === id))) return false;
  }
  const score = results.filter(result => result.correct).length;
  const pointsEarned = results.reduce((sum, result) => sum + (result.evaluation?.score ?? (result.correct ? 1 : 0)), 0);
  const pointsAvailable = results.reduce((sum, result) => sum + (result.evaluation?.maxScore ?? 1), 0);
  const selfAssessedCount = results.filter(result => result.evaluation?.mode === "self_assessed").length;
  return (
    v.score === score &&
    (v.pointsEarned === undefined || v.pointsEarned === pointsEarned) &&
    (v.pointsAvailable === undefined || v.pointsAvailable === pointsAvailable) &&
    (v.selfAssessedCount === undefined || v.selfAssessedCount === selfAssessedCount)
  );
}
function isSession(v: unknown, legacy = false): v is Session {
  if (
    !obj(v) ||
    hasDangerousKeys(v) ||
    !str(v.sessionId) ||
    typeof v.preview !== "boolean" ||
    v.state !== "active" ||
    !isSource(v.source) ||
    !str(v.seed) ||
    !str(v.bankFingerprint) ||
    !num(v.selectionAlgorithmVersion) ||
    !num(v.currentIndex) ||
    !Array.isArray(v.questionRefs) ||
    v.questionRefs.length < 1 ||
    v.questionRefs.length > 500 ||
    !v.questionRefs.every((r: unknown) => obj(r) && str(r.id) && num(r.version) && r.version > 0) ||
    !obj(v.answers) ||
    !Object.values(v.answers).every(isAnswer) ||
    !obj(v.uncertain) ||
    !obj(v.locked) ||
    !Object.values(v.uncertain).every(x => typeof x === "boolean") ||
    !Object.values(v.locked).every(x => typeof x === "boolean") ||
    !date(v.startedAt) ||
    !date(v.updatedAt)
  )
    return false;
  return (
    legacy ||
    (str(v.profileEpoch) &&
      num(v.sessionRevision) &&
      obj(v.committedResults) &&
      Object.entries(v.committedResults).every(
        ([id, entry]) =>
          obj(entry) && date(entry.answeredAt) && isResult(entry.result) && entry.result.questionId === id
      ))
  );
}
function isLearning(v: unknown): v is QuestionLearningRecord {
  if (
    !obj(v) ||
    !num(v.answeredCount) ||
    !num(v.correctCount) ||
    !num(v.incorrectCount) ||
    !num(v.selfAssessedCount) ||
    v.answeredCount !== v.correctCount + v.incorrectCount + v.selfAssessedCount
  )
    return false;
  const w = v.wrongBook;
  return (
    (v.lastQuestionVersion === undefined || (num(v.lastQuestionVersion) && v.lastQuestionVersion > 0)) &&
    (v.firstAnsweredAt === undefined || date(v.firstAnsweredAt)) &&
    (v.lastAnsweredAt === undefined || date(v.lastAnsweredAt)) &&
    (v.firstAnsweredAt === undefined || v.lastAnsweredAt === undefined || v.firstAnsweredAt <= v.lastAnsweredAt) &&
    (v.lastOutcome === undefined || ["correct", "incorrect", "self_assessed"].includes(v.lastOutcome)) &&
    (w === undefined ||
      (obj(w) &&
        ["learning", "mastered"].includes(w.status) &&
        date(w.addedAt) &&
        date(w.updatedAt) &&
        w.addedAt <= w.updatedAt &&
        typeof w.manuallyAdded === "boolean" &&
        num(w.correctAfterLastWrong) &&
        (w.lastWrongAt === undefined || date(w.lastWrongAt)) &&
        (w.masteredAt === undefined || date(w.masteredAt)) &&
        (w.masteredQuestionVersion === undefined ||
          (num(w.masteredQuestionVersion) && w.masteredQuestionVersion > 0)) &&
        (w.status !== "learning" || (w.masteredAt === undefined && w.masteredQuestionVersion === undefined))))
  );
}
export function isProfile(v: unknown, preview = false): v is QuizStorageData {
  if (
    !obj(v) ||
    hasDangerousKeys(v) ||
    v.schemaVersion !== 3 ||
    !validEpoch(v.profileEpoch) ||
    !num(v.revision) ||
    !obj(v.activeSessions) ||
    !Array.isArray(v.attempts) ||
    v.attempts.length > 50 ||
    !v.attempts.every(isAttempt) ||
    !obj(v.learning) ||
    !obj(v.library) ||
    !obj(v.preferences) ||
    typeof v.preferences.restoreSession !== "boolean"
  )
    return false;
  if (
    !["since_profile_creation", "partial_legacy"].includes(v.learning.historyCoverage) ||
    !date(v.learning.trackedSince) ||
    !obj(v.learning.questions) ||
    Object.keys(v.learning.questions).length > 10000 ||
    !Object.values(v.learning.questions).every(isLearning) ||
    !obj(v.library.savedQuestions) ||
    !obj(v.library.collections) ||
    Object.keys(v.library.savedQuestions).length > 10000 ||
    Object.keys(v.library.collections).length > 200
  )
    return false;
  for (const [id, c] of Object.entries(v.library.collections)) {
    if (
      !obj(c) ||
      c.id !== id ||
      id === "all" ||
      id === "unfiled" ||
      !str(c.name) ||
      c.name !== c.name.trim() ||
      [...c.name].length > 40 ||
      !date(c.createdAt) ||
      !date(c.updatedAt) ||
      c.createdAt > c.updatedAt
    )
      return false;
  }
  if (new Set(Object.values(v.library.collections).map(c => c.name)).size !== Object.keys(v.library.collections).length)
    return false;
  for (const s of Object.values(v.library.savedQuestions)) {
    if (
      !obj(s) ||
      !date(s.savedAt) ||
      !date(s.updatedAt) ||
      s.savedAt > s.updatedAt ||
      !num(s.savedQuestionVersion) ||
      s.savedQuestionVersion < 1 ||
      !strs(s.collectionIds, 200) ||
      new Set(s.collectionIds).size !== s.collectionIds.length ||
      s.collectionIds.some((id: string) => !v.library.collections[id])
    )
      return false;
  }
  const lists = Object.values(v.activeSessions);
  if (lists.some(list => !Array.isArray(list) || list.length > 5)) return false;
  const sessions = lists.flat();
  const ids = new Set<string>();
  if (sessions.length > 30) return false;
  for (const [key, list] of Object.entries(v.activeSessions)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") return false;
    for (const s of list) {
      if (
        !isSession(s) ||
        sourceKey(s.source) !== key ||
        s.profileEpoch !== v.profileEpoch ||
        s.preview !== preview ||
        ids.has(s.sessionId) ||
        s.currentIndex >= s.questionRefs.length
      )
        return false;
      ids.add(s.sessionId);
      const refs = new Map(s.questionRefs.map(r => [r.id, r.version]));
      if (refs.size !== s.questionRefs.length) return false;
      if (
        [s.answers, s.uncertain, s.locked, s.committedResults].some(map =>
          Object.keys(map).some(id => !refs.has(id) || id === "__proto__" || id === "constructor" || id === "prototype")
        )
      )
        return false;
      for (const [id, result] of Object.entries(s.committedResults)) {
        if (result.result.version !== refs.get(id) || !s.locked[id]) return false;
      }
    }
  }
  for (const a of v.attempts) {
    if (ids.has(a.sessionId)) return false;
    ids.add(a.sessionId);
    if (new Set(a.questionResults.map(r => r.questionId)).size !== a.questionResults.length) return false;
  }
  return (
    Object.keys(v.learning.questions).every(id => !["__proto__", "constructor", "prototype"].includes(id)) &&
    Object.keys(v.library.savedQuestions).every(id => !["__proto__", "constructor", "prototype"].includes(id))
  );
}
function isLegacy(v: unknown): v is Record<string, any> {
  return (
    obj(v) &&
    !hasDangerousKeys(v) &&
    v.schemaVersion === 2 &&
    obj(v.activeSessions) &&
    Object.values(v.activeSessions).every(list => Array.isArray(list) && list.every(s => isSession(s, true))) &&
    Array.isArray(v.attempts) &&
    v.attempts.every(isAttempt) &&
    obj(v.wrongQuestions) &&
    Object.values(v.wrongQuestions).every(date) &&
    obj(v.preferences) &&
    typeof v.preferences.restoreSession === "boolean"
  );
}
function migrateLegacy(v: Record<string, any>, preview: boolean): QuizStorageData | null {
  if (
    v.attempts.length > 50 ||
    Object.values(v.activeSessions).flat().length > 30 ||
    Object.values(v.activeSessions).some((list: any) => list.length > 5)
  )
    return null;
  const profile = emptyData();
  profile.profileEpoch = epochId();
  profile.revision = 1;
  profile.learning.historyCoverage = "partial_legacy";
  profile.learning.trackedSince = new Date().toISOString();
  profile.preferences = structuredClone(v.preferences);
  const seen = new Map<string, string>();
  for (const attempt of [...(v.attempts as Attempt[])].sort((a, b) => a.completedAt.localeCompare(b.completedAt))) {
    const raw = JSON.stringify(attempt);
    if (seen.has(attempt.sessionId) && seen.get(attempt.sessionId) !== raw) return null;
    if (!seen.has(attempt.sessionId)) {
      seen.set(attempt.sessionId, raw);
      profile.attempts.push(attempt);
      for (const result of attempt.questionResults) {
        const next = applyLearningResult(profile.learning.questions[result.questionId], result, attempt.completedAt);
        if (next) profile.learning.questions[result.questionId] = next;
      }
    }
  }
  profile.attempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  for (const [id, timestamp] of Object.entries(v.wrongQuestions as Record<string, string>)) {
    const record = profile.learning.questions[id] ?? {
      answeredCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      selfAssessedCount: 0
    };
    record.wrongBook ??= {
      status: "learning",
      addedAt: timestamp,
      updatedAt: timestamp,
      manuallyAdded: false,
      legacyImported: true,
      correctAfterLastWrong: 0
    };
    profile.learning.questions[id] = record;
  }
  for (const list of Object.values(v.activeSessions) as Session[][]) {
    for (const old of list) {
      if (seen.has(old.sessionId)) continue;
      const session: Session = {
        ...structuredClone(old),
        profileEpoch: profile.profileEpoch,
        sessionRevision: 0,
        committedResults: {}
      };
      if (session.preview !== preview) return null;
      (profile.activeSessions[sourceKey(session.source)] ??= []).push(session);
    }
  }
  return validateProfile(profile, preview) ? profile : null;
}
function validateProfile(profile: QuizStorageData, preview: boolean): boolean {
  return isProfile(profile, preview);
}

export class QuizStore {
  private memory = emptyData();
  private status: StorageStatus = "empty";
  private initialized = false;
  private readonly key: string;
  private readonly legacyKey: string;
  private readonly lock?: LockLike;
  private readonly subscribers = new Set<() => void>();
  private readonly eventScope = new AbortController();
  constructor(private readonly storage?: StorageLike, readonly preview = false, lock?: LockLike) {
    this.key = preview ? STORAGE_KEY_PREVIEW : STORAGE_KEY_PROD;
    this.legacyKey = preview ? LEGACY_KEY_PREVIEW : LEGACY_KEY_PROD;
    this.lock = lock ?? (typeof navigator !== "undefined" ? navigator.locks : undefined);
    if (typeof window !== "undefined") {
      window.addEventListener(
        "storage",
        event => {
          if (event.key === this.key) this.refresh();
        },
        { signal: this.eventScope.signal }
      );
      window.addEventListener("focus", () => this.refresh(), { signal: this.eventScope.signal });
    }
  }
  destroy(): void {
    this.eventScope.abort();
    this.subscribers.clear();
  }
  get persistent(): boolean {
    return !!this.storage && !!this.lock && this.status !== "unavailable";
  }
  getStatus(): StorageStatus {
    return this.status;
  }
  getResetReason(): StorageStatus | null {
    return this.status === "corrupt_data" || this.status === "version_mismatch" ? this.status : null;
  }
  consumeResetReason(): StorageStatus | null {
    return this.getResetReason();
  }
  read(): QuizStorageData {
    return structuredClone(this.memory);
  }
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  private notify(): void {
    for (const callback of this.subscribers) callback();
  }
  getRawData(): string | null {
    try {
      return this.storage?.getItem(this.key) ?? this.storage?.getItem(this.legacyKey) ?? null;
    } catch {
      return null;
    }
  }
  getRawProfile(): string | null {
    try {
      return this.storage?.getItem(this.key) ?? null;
    } catch {
      return null;
    }
  }
  private refresh(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(this.key);
      if (raw === null) {
        this.status = "empty";
        this.memory = emptyData();
        this.notify();
        return;
      }
      const value: unknown = JSON.parse(raw);
      if (!obj(value) || value.schemaVersion !== 3) this.status = "version_mismatch";
      else if (!validateProfile(value as QuizStorageData, this.preview)) this.status = "corrupt_data";
      else {
        this.memory = value as QuizStorageData;
        this.status = "ready";
      }
      this.notify();
    } catch {
      this.status = "corrupt_data";
      this.notify();
    }
  }
  async ready(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    if (!this.storage) {
      this.status = "unavailable";
      return;
    }
    this.refresh();
    if (this.status !== "empty") return;
    let legacy: string | null;
    try {
      legacy = this.storage.getItem(this.legacyKey);
    } catch {
      this.status = "unavailable";
      return;
    }
    if (!legacy) return;
    if (!this.lock) {
      this.status = "unavailable";
      return;
    }
    await this.lock.request(this.key, { mode: "exclusive" }, async () => {
      if (this.storage?.getItem(this.key) !== null) {
        this.refresh();
        return;
      }
      const raw = this.storage?.getItem(this.legacyKey);
      if (!raw) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        this.status = "corrupt_data";
        return;
      }
      if (!obj(parsed) || parsed.schemaVersion !== 2) {
        this.status = "version_mismatch";
        return;
      }
      if (!isLegacy(parsed)) {
        this.status = "corrupt_data";
        return;
      }
      const migrated = migrateLegacy(parsed, this.preview);
      if (!migrated) {
        this.status = "corrupt_data";
        return;
      }
      try {
        this.storage?.setItem(this.key, JSON.stringify(migrated));
        this.memory = migrated;
        this.status = "ready";
        this.notify();
        try {
          this.storage?.removeItem?.(this.legacyKey);
        } catch {
          /* preserve valid v3 */
        }
      } catch {
        this.status = "unavailable";
      }
    });
  }
  private async transact<T>(
    epoch: string,
    change: (draft: QuizStorageData) => T | StoreError | Unchanged<T>,
    baseRevision?: number
  ): Promise<StorageWriteResult<T>> {
    await this.ready();
    if (this.status === "corrupt_data" || this.status === "version_mismatch") return { ok: false, reason: "read_only" };
    if (!this.storage || !this.lock || this.status === "unavailable") return { ok: false, reason: "unavailable" };
    return this.lock.request(this.key, { mode: "exclusive" }, async () => {
      this.refresh();
      if (this.status === "corrupt_data" || this.status === "version_mismatch")
        return { ok: false, reason: "read_only" };
      const draft = this.read();
      if (draft.profileEpoch && draft.profileEpoch !== epoch) return { ok: false, reason: "stale_profile" };
      if (baseRevision !== undefined && draft.revision !== baseRevision) return { ok: false, reason: "conflict" };
      if (!draft.profileEpoch) {
        draft.profileEpoch = epochId();
        draft.learning.trackedSince = new Date().toISOString();
      }
      const value = change(draft);
      if (
        typeof value === "string" &&
        [
          "quota_exceeded",
          "unavailable",
          "read_only",
          "conflict",
          "stale_profile",
          "invalid_data",
          "limit_exceeded",
          "session_missing"
        ].includes(value)
      )
        return { ok: false, reason: value as StoreError };
      if (typeof value === "object" && value !== null && UNCHANGED in value)
        return { ok: true, value: (value as Unchanged<T>)[UNCHANGED], revision: draft.revision };
      draft.revision++;
      if (!validateProfile(draft, this.preview)) return { ok: false, reason: "invalid_data" };
      const raw = JSON.stringify(draft);
      if (new TextEncoder().encode(raw).length > MAX_BYTES) return { ok: false, reason: "limit_exceeded" };
      try {
        this.storage?.setItem(this.key, raw);
      } catch (error) {
        return {
          ok: false,
          reason:
            error instanceof DOMException && error.name === "QuotaExceededError" ? "quota_exceeded" : "unavailable"
        };
      }
      this.memory = draft;
      this.status = "ready";
      this.notify();
      return { ok: true, value: value as T, revision: draft.revision };
    });
  }
  async createSession(session: Session, creationBaseRevision: number): Promise<StorageWriteResult<Session>> {
    return this.transact(session.profileEpoch, draft => {
      const existing = Object.values(draft.activeSessions)
        .flat()
        .find(s => s.sessionId === session.sessionId);
      if (existing) {
        if (
          existing.profileEpoch !== draft.profileEpoch ||
          existing.profileEpoch !== session.profileEpoch ||
          existing.preview !== session.preview ||
          existing.seed !== session.seed ||
          existing.bankFingerprint !== session.bankFingerprint ||
          existing.selectionAlgorithmVersion !== session.selectionAlgorithmVersion ||
          JSON.stringify(existing.source) !== JSON.stringify(session.source) ||
          JSON.stringify(existing.questionRefs) !== JSON.stringify(session.questionRefs) ||
          JSON.stringify(existing.context) !== JSON.stringify(session.context)
        )
          return "conflict";
        return { [UNCHANGED]: existing };
      }
      if (draft.revision !== creationBaseRevision) return "conflict";
      const key = sourceKey(session.source);
      const list = draft.activeSessions[key] ?? [];
      if (list.length >= 5 || Object.values(draft.activeSessions).flat().length >= 30) return "limit_exceeded";
      const created = {
        ...structuredClone(session),
        profileEpoch: draft.profileEpoch,
        sessionRevision: 0,
        committedResults: {}
      };
      draft.activeSessions[key] = [created, ...list];
      return created;
    });
  }
  async updateSession(session: Session): Promise<StorageWriteResult<Session>> {
    return this.transact(session.profileEpoch, draft => {
      const list = draft.activeSessions[sourceKey(session.source)] ?? [];
      const index = list.findIndex(s => s.sessionId === session.sessionId);
      if (index < 0) return "session_missing";
      if (list[index].sessionRevision !== session.sessionRevision) return "conflict";
      const updated = {
        ...structuredClone(session),
        committedResults: list[index].committedResults,
        sessionRevision: session.sessionRevision + 1,
        updatedAt: new Date().toISOString()
      };
      list[index] = updated;
      return updated;
    });
  }
  async commitQuestion(session: Session, result: QuestionResult): Promise<StorageWriteResult<Session>> {
    return this.transact(session.profileEpoch, draft => {
      const list = draft.activeSessions[sourceKey(session.source)] ?? [];
      const index = list.findIndex(s => s.sessionId === session.sessionId);
      if (index < 0) return "session_missing";
      const current = list[index];
      if (current.sessionRevision !== session.sessionRevision) return "conflict";
      const committed = current.committedResults[result.questionId];
      if (committed) return JSON.stringify(committed.result) === JSON.stringify(result) ? current : "conflict";
      if (!current.questionRefs.some(ref => ref.id === result.questionId && ref.version === result.version))
        return "invalid_data";
      const now = new Date().toISOString();
      const updated = {
        ...structuredClone(session),
        sessionRevision: current.sessionRevision + 1,
        locked: { ...session.locked, [result.questionId]: true },
        committedResults: { ...current.committedResults, [result.questionId]: { answeredAt: now, result } },
        updatedAt: now
      };
      list[index] = updated;
      const learning = applyLearningResult(draft.learning.questions[result.questionId], result, now);
      if (learning) draft.learning.questions[result.questionId] = learning;
      return updated;
    });
  }
  async completeSession(session: Session, attempt: Attempt): Promise<StorageWriteResult<Attempt>> {
    return this.transact(session.profileEpoch, draft => {
      const key = sourceKey(session.source);
      const list = draft.activeSessions[key] ?? [];
      const index = list.findIndex(s => s.sessionId === session.sessionId);
      if (index < 0) return "session_missing";
      const current = list[index];
      if (current.sessionRevision !== session.sessionRevision || attempt.sessionId !== session.sessionId)
        return "conflict";
      if (attempt.questionResults.length !== current.questionRefs.length) return "invalid_data";
      const finalResults = attempt.questionResults.map(result => {
        const committed = current.committedResults[result.questionId];
        if (!committed && learningOutcome(result)) {
          const updated = applyLearningResult(draft.learning.questions[result.questionId], result, attempt.completedAt);
          if (updated) draft.learning.questions[result.questionId] = updated;
        }
        return committed?.result ?? result;
      });
      const completed = { ...attempt, questionResults: finalResults };
      draft.attempts = [completed, ...draft.attempts].slice(0, 50);
      list.splice(index, 1);
      if (!list.length) delete draft.activeSessions[key];
      return completed;
    });
  }
  async discardSession(session: Session): Promise<StorageWriteResult<null>> {
    return this.transact(session.profileEpoch, draft => {
      const key = sourceKey(session.source);
      const list = draft.activeSessions[key] ?? [];
      const index = list.findIndex(s => s.sessionId === session.sessionId);
      if (index < 0) return "session_missing";
      if (list[index].sessionRevision !== session.sessionRevision) return "conflict";
      list.splice(index, 1);
      if (!list.length) delete draft.activeSessions[key];
      return null;
    });
  }
  async setSaved(id: string, version: number, saved: boolean, epoch: string): Promise<StorageWriteResult<boolean>> {
    return this.transact(epoch, draft => {
      if (!str(id) || !num(version) || version < 1) return "invalid_data";
      const records = draft.library.savedQuestions;
      if (saved) {
        if (!records[id] && Object.keys(records).length >= 10000) return "limit_exceeded";
        const now = new Date().toISOString();
        records[id] ??= { savedAt: now, updatedAt: now, savedQuestionVersion: version, collectionIds: [] };
      } else {
        const existing = records[id];
        if (existing) {
          const now = new Date().toISOString();
          for (const cid of existing.collectionIds) draft.library.collections[cid].updatedAt = now;
        }
        delete records[id];
      }
      return saved;
    });
  }
  async createCollection(name: string, epoch: string): Promise<StorageWriteResult<QuestionCollection>> {
    return this.transact(epoch, draft => {
      const trimmed = name.trim();
      if (!trimmed || [...trimmed].length > 40) return "invalid_data";
      if (Object.keys(draft.library.collections).length >= 200) return "limit_exceeded";
      if (Object.values(draft.library.collections).some(c => c.name === trimmed)) return "conflict";
      const now = new Date().toISOString();
      const collection = { id: epochId(), name: trimmed, createdAt: now, updatedAt: now };
      draft.library.collections[collection.id] = collection;
      return collection;
    });
  }
  async renameCollection(id: string, name: string, epoch: string): Promise<StorageWriteResult<QuestionCollection>> {
    return this.transact(epoch, draft => {
      const c = draft.library.collections[id];
      const trimmed = name.trim();
      if (!c || !trimmed || [...trimmed].length > 40) return "invalid_data";
      if (Object.values(draft.library.collections).some(other => other.id !== id && other.name === trimmed))
        return "conflict";
      c.name = trimmed;
      c.updatedAt = new Date().toISOString();
      return c;
    });
  }
  async deleteCollection(id: string, epoch: string): Promise<StorageWriteResult<null>> {
    return this.transact(epoch, draft => {
      if (!draft.library.collections[id]) return "invalid_data";
      delete draft.library.collections[id];
      const now = new Date().toISOString();
      for (const saved of Object.values(draft.library.savedQuestions)) {
        if (saved.collectionIds.includes(id)) {
          saved.collectionIds = saved.collectionIds.filter(item => item !== id);
          saved.updatedAt = now;
        }
      }
      return null;
    });
  }
  async setCollections(
    id: string,
    ids: string[],
    epoch: string,
    baseRevision: number
  ): Promise<StorageWriteResult<SavedQuestionRecord>> {
    return this.transact(
      epoch,
      draft => {
        const saved = draft.library.savedQuestions[id];
        if (!saved || new Set(ids).size !== ids.length || ids.some(cid => !draft.library.collections[cid]))
          return "invalid_data";
        const now = new Date().toISOString();
        const oldIds = new Set(saved.collectionIds);
        saved.collectionIds = [...ids];
        saved.updatedAt = now;
        for (const cid of new Set([...oldIds, ...ids])) {
          if (oldIds.has(cid) !== ids.includes(cid)) draft.library.collections[cid].updatedAt = now;
        }
        return saved;
      },
      baseRevision
    );
  }
  async organizeQuestion(
    id: string,
    version: number,
    ids: string[],
    newName: string,
    epoch: string,
    baselineSaved: SavedQuestionRecord | undefined,
    baselineCollections: Record<string, QuestionCollection>
  ): Promise<StorageWriteResult<SavedQuestionRecord>> {
    return this.transact(epoch, draft => {
      if (JSON.stringify(draft.library.savedQuestions[id]) !== JSON.stringify(baselineSaved)) return "conflict";
      for (const cid of ids) {
        if (JSON.stringify(draft.library.collections[cid]) !== JSON.stringify(baselineCollections[cid]))
          return "conflict";
      }
      if (
        !str(id) ||
        !num(version) ||
        version < 1 ||
        new Set(ids).size !== ids.length ||
        ids.some(cid => !draft.library.collections[cid])
      )
        return "invalid_data";
      const trimmed = newName.trim();
      if (
        trimmed &&
        ([...trimmed].length > 40 || Object.values(draft.library.collections).some(c => c.name === trimmed))
      )
        return "invalid_data";
      if (trimmed && Object.keys(draft.library.collections).length >= 200) return "limit_exceeded";
      const now = new Date().toISOString();
      if (trimmed) {
        const cid = epochId();
        draft.library.collections[cid] = { id: cid, name: trimmed, createdAt: now, updatedAt: now };
        ids = [...ids, cid];
      }
      if (!draft.library.savedQuestions[id] && Object.keys(draft.library.savedQuestions).length >= 10000)
        return "limit_exceeded";
      const saved = draft.library.savedQuestions[id] ?? {
        savedAt: now,
        updatedAt: now,
        savedQuestionVersion: version,
        collectionIds: []
      };
      const oldIds = new Set(saved.collectionIds);
      saved.collectionIds = [...ids];
      saved.updatedAt = now;
      draft.library.savedQuestions[id] = saved;
      for (const cid of new Set([...oldIds, ...ids])) {
        if (oldIds.has(cid) !== ids.includes(cid)) draft.library.collections[cid].updatedAt = now;
      }
      return saved;
    });
  }
  async setWrongStatus(
    id: string,
    status: "learning" | "mastered" | "removed",
    version: number,
    epoch: string
  ): Promise<StorageWriteResult<QuestionLearningRecord>> {
    return this.transact(epoch, draft => {
      const now = new Date().toISOString();
      const record = draft.learning.questions[id] ?? {
        answeredCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        selfAssessedCount: 0
      };
      if (status === "removed") delete record.wrongBook;
      else {
        record.wrongBook ??= {
          status: "learning",
          addedAt: now,
          updatedAt: now,
          manuallyAdded: true,
          correctAfterLastWrong: 0
        };
        record.wrongBook.status = status;
        record.wrongBook.updatedAt = now;
        if (status === "mastered") {
          record.wrongBook.masteredAt = now;
          record.wrongBook.masteredQuestionVersion = version;
        } else {
          delete record.wrongBook.masteredAt;
          delete record.wrongBook.masteredQuestionVersion;
        }
      }
      draft.learning.questions[id] = record;
      return record;
    });
  }
  async restoreProfile(
    profile: QuizStorageData,
    expectedEpoch: string,
    expectedRevision: number
  ): Promise<StorageWriteResult<QuizStorageData>> {
    await this.ready();
    if (this.status === "corrupt_data" || this.status === "version_mismatch") return { ok: false, reason: "read_only" };
    if (!this.storage || !this.lock || this.status === "unavailable") return { ok: false, reason: "unavailable" };
    if (!validateProfile(profile, this.preview)) return { ok: false, reason: "invalid_data" };
    return this.lock.request(this.key, { mode: "exclusive" }, async () => {
      this.refresh();
      if (this.status === "corrupt_data" || this.status === "version_mismatch")
        return { ok: false, reason: "read_only" };
      if (this.memory.profileEpoch !== expectedEpoch || this.memory.revision !== expectedRevision)
        return { ok: false, reason: "conflict" };
      const restored = structuredClone(profile);
      restored.profileEpoch = epochId();
      restored.revision = this.memory.revision + 1;
      for (const session of Object.values(restored.activeSessions).flat()) session.profileEpoch = restored.profileEpoch;
      const raw = JSON.stringify(restored);
      if (new TextEncoder().encode(raw).length > MAX_BYTES) return { ok: false, reason: "limit_exceeded" };
      try {
        this.storage?.setItem(this.key, raw);
      } catch (error) {
        return {
          ok: false,
          reason:
            error instanceof DOMException && error.name === "QuotaExceededError" ? "quota_exceeded" : "unavailable"
        };
      }
      this.memory = restored;
      this.status = "ready";
      this.notify();
      return { ok: true, value: structuredClone(restored), revision: restored.revision };
    });
  }
  async resetProfile(expectedRaw: string | null): Promise<StorageWriteResult<QuizStorageData>> {
    if (!this.storage || !this.lock) return { ok: false, reason: "unavailable" };
    return this.lock.request(this.key, { mode: "exclusive" }, async () => {
      let currentRaw: string | null;
      try {
        currentRaw = this.storage?.getItem(this.key) ?? null;
      } catch {
        return { ok: false, reason: "unavailable" };
      }
      if (currentRaw !== expectedRaw) return { ok: false, reason: "conflict" };
      const next = emptyData();
      next.profileEpoch = epochId();
      next.revision = this.status === "ready" ? this.memory.revision + 1 : 1;
      next.learning.trackedSince = new Date().toISOString();
      try {
        this.storage?.setItem(this.key, JSON.stringify(next));
      } catch {
        return { ok: false, reason: "unavailable" };
      }
      this.memory = next;
      this.status = "ready";
      this.notify();
      return { ok: true, value: structuredClone(next), revision: next.revision };
    });
  }
  getActiveSessions(source: QuizSource): Session[] {
    return this.read().activeSessions[sourceKey(source)] ?? [];
  }
  getAllActiveSessions(): Record<string, Session[]> {
    return this.read().activeSessions;
  }
  getActiveSessionById(id: string): Session | undefined {
    return Object.values(this.memory.activeSessions)
      .flat()
      .find(s => s.sessionId === id);
  }
  getAttempts(source?: QuizSource): Attempt[] {
    const attempts = this.read().attempts;
    return source ? attempts.filter(a => sourceKey(a.source) === sourceKey(source)) : attempts;
  }
  getWrongQuestionIds(): string[] {
    return Object.entries(this.memory.learning.questions)
      .filter(([, r]) => !!r.wrongBook)
      .map(([id]) => id);
  }
}
