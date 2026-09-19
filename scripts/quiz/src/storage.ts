import type { Attempt, QuestionResult, QuizSource, QuizStorageData, Session } from "./types.js";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY_PROD = "plw.quiz.v2";
export const STORAGE_KEY_PREVIEW = "plw.quiz.preview.v2";

export function sourceKey(source: QuizSource): string {
  if (source.type === "set") {
    return `set:${source.id}`;
  }
  return `adhoc:${[...source.questionIds].sort().join(",")}`;
}

export function emptyData(): QuizStorageData {
  return {
    schemaVersion: 2,
    activeSessions: {},
    attempts: [],
    wrongQuestions: {},
    preferences: { restoreSession: true }
  };
}

export type StorageResetReason = "corrupt_data" | "version_mismatch" | null;

function isQuizSource(v: unknown): v is QuizSource {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const s = v as any;
  if (s.type === "set") return typeof s.id === "string" && s.id.length > 0;
  if (s.type === "adhoc") {
    return Array.isArray(s.questionIds) && s.questionIds.every((id: any) => typeof id === "string");
  }
  return false;
}

function isSession(v: unknown): v is Session {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const s = v as any;
  return (
    typeof s.sessionId === "string" &&
    s.sessionId.length > 0 &&
    typeof s.preview === "boolean" &&
    ["active", "completed", "discarded"].includes(s.state) &&
    isQuizSource(s.source) &&
    typeof s.seed === "string" &&
    typeof s.bankFingerprint === "string" &&
    typeof s.selectionAlgorithmVersion === "number" &&
    Number.isInteger(s.currentIndex) &&
    s.currentIndex >= 0 &&
    Array.isArray(s.questionRefs) &&
    s.questionRefs.every(
      (r: any) =>
        r &&
        typeof r.id === "string" &&
        r.id.length > 0 &&
        typeof r.version === "number" &&
        Number.isInteger(r.version) &&
        r.version >= 1
    ) &&
    s.answers !== null &&
    typeof s.answers === "object" &&
    !Array.isArray(s.answers) &&
    s.uncertain !== null &&
    typeof s.uncertain === "object" &&
    !Array.isArray(s.uncertain) &&
    Object.values(s.uncertain).every(val => typeof val === "boolean") &&
    s.locked !== null &&
    typeof s.locked === "object" &&
    !Array.isArray(s.locked) &&
    Object.values(s.locked).every(val => typeof val === "boolean") &&
    typeof s.startedAt === "string" &&
    typeof s.updatedAt === "string"
  );
}

function isQuestionResult(v: unknown): v is QuestionResult {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as any;
  return (
    typeof r.questionId === "string" &&
    r.questionId.length > 0 &&
    typeof r.version === "number" &&
    Number.isInteger(r.version) &&
    r.version >= 1 &&
    Array.isArray(r.topicIds) &&
    r.topicIds.every((id: any) => typeof id === "string") &&
    Array.isArray(r.conceptIds) &&
    r.conceptIds.every((id: any) => typeof id === "string") &&
    Array.isArray(r.objectiveIds) &&
    r.objectiveIds.every((id: any) => typeof id === "string") &&
    typeof r.correct === "boolean" &&
    typeof r.unanswered === "boolean" &&
    typeof r.uncertain === "boolean"
  );
}

function isAttempt(v: unknown): v is Attempt {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const a = v as any;
  return (
    typeof a.sessionId === "string" &&
    a.sessionId.length > 0 &&
    isQuizSource(a.source) &&
    typeof a.seed === "string" &&
    typeof a.bankFingerprint === "string" &&
    typeof a.score === "number" &&
    typeof a.total === "number" &&
    typeof a.completedAt === "string" &&
    Array.isArray(a.questionResults) &&
    a.questionResults.every(isQuestionResult)
  );
}

function isWrongQuestions(v: unknown): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof k !== "string" || typeof val !== "string") return false;
  }
  return true;
}

export class QuizStore {
  private memory = emptyData();
  private lastResetReason: StorageResetReason = null;
  readonly persistent: boolean;
  private readonly storageKey: string;

  constructor(private readonly storage?: StorageLike, readonly preview = false) {
    this.storageKey = preview ? STORAGE_KEY_PREVIEW : STORAGE_KEY_PROD;
    let persistent = Boolean(storage);
    if (storage) {
      try {
        const probe = `${this.storageKey}.probe`;
        storage.setItem(probe, "1");
      } catch {
        persistent = false;
      }
    }
    this.persistent = persistent;
    this.memory = this.read();
  }

  getResetReason(): StorageResetReason {
    return this.lastResetReason;
  }

  consumeResetReason(): StorageResetReason {
    const reason = this.lastResetReason;
    this.lastResetReason = null;
    return reason;
  }

  read(): QuizStorageData {
    if (!this.persistent || !this.storage) return this.memory;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) {
        this.lastResetReason = null;
        return emptyData();
      }
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        this.lastResetReason = "corrupt_data";
        const empty = emptyData();
        this.write(empty);
        return empty;
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        this.lastResetReason = "corrupt_data";
        const empty = emptyData();
        this.write(empty);
        return empty;
      }

      if (parsed.schemaVersion === 2) {
        // matches current storage schema version
      } else {
        this.lastResetReason = "version_mismatch";
        const empty = emptyData();
        this.write(empty);
        return empty;
      }

      if (
        typeof parsed.activeSessions !== "object" ||
        parsed.activeSessions === null ||
        Array.isArray(parsed.activeSessions) ||
        !Array.isArray(parsed.attempts) ||
        !isWrongQuestions(parsed.wrongQuestions) ||
        !parsed.preferences ||
        typeof parsed.preferences !== "object" ||
        Array.isArray(parsed.preferences) ||
        typeof parsed.preferences.restoreSession !== "boolean"
      ) {
        this.lastResetReason = "corrupt_data";
        const empty = emptyData();
        this.write(empty);
        return empty;
      }

      for (const [srcKey, list] of Object.entries(parsed.activeSessions)) {
        if (!Array.isArray(list) || !list.every(isSession)) {
          this.lastResetReason = "corrupt_data";
          const empty = emptyData();
          this.write(empty);
          return empty;
        }
      }

      if (!parsed.attempts.every(isAttempt)) {
        this.lastResetReason = "corrupt_data";
        const empty = emptyData();
        this.write(empty);
        return empty;
      }

      this.lastResetReason = null;
      return parsed as QuizStorageData;
    } catch {
      this.lastResetReason = "corrupt_data";
      return emptyData();
    }
  }

  write(data: QuizStorageData): void {
    this.memory = data;
    if (!this.persistent || !this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Degrade gracefully to in-memory when storage is full or blocked
    }
  }

  saveSession(session: Session): void {
    const data = this.read();
    const key = sourceKey(session.source);
    const sessions = data.activeSessions[key] ?? [];
    const filtered = sessions.filter(
      item => item.sessionId !== session.sessionId && item.seed !== session.seed
    );
    data.activeSessions[key] = [session, ...filtered].slice(0, 5);
    this.write(data);
  }

  discardSession(source: QuizSource, seed: string): void {
    const data = this.read();
    const key = sourceKey(source);
    const sessions = data.activeSessions[key] ?? [];
    data.activeSessions[key] = sessions.filter(item => item.seed !== seed);
    this.write(data);
  }

  saveAttempt(attempt: Attempt): void {
    const data = this.read();
    const key = sourceKey(attempt.source);

    // Idempotency: avoid recording duplicate attempts or accumulating wrong questions twice
    const alreadySaved = data.attempts.some(item => item.sessionId === attempt.sessionId);
    if (!alreadySaved) {
      data.attempts = [attempt, ...data.attempts].slice(0, 50);
      for (const result of attempt.questionResults) {
        if (!result.correct) {
          data.wrongQuestions[result.questionId] = attempt.completedAt;
        }
      }
      const wrong = Object.entries(data.wrongQuestions)
        .sort((a, b) => b[1].localeCompare(a[1]))
        .slice(0, 300);
      data.wrongQuestions = Object.fromEntries(wrong);
    }

    // Always clean up the corresponding active session
    const sessions = data.activeSessions[key] ?? [];
    data.activeSessions[key] = sessions.filter(
      item => item.sessionId !== attempt.sessionId && item.seed !== attempt.seed
    );

    this.write(data);
  }

  getActiveSessions(source: QuizSource): Session[] {
    const data = this.read();
    return data.activeSessions[sourceKey(source)] ?? [];
  }

  getAllActiveSessions(): Record<string, Session[]> {
    const data = this.read();
    return data.activeSessions;
  }

  getAttempts(source?: QuizSource): Attempt[] {
    const data = this.read();
    if (!source) return data.attempts;
    const targetKey = sourceKey(source);
    return data.attempts.filter(a => sourceKey(a.source) === targetKey);
  }

  getWrongQuestionIds(): string[] {
    const data = this.read();
    return Object.keys(data.wrongQuestions);
  }
}
