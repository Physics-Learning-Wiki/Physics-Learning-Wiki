import type { Attempt, QuizSource, QuizStorageData, Session } from "./types.js";

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

export class QuizStore {
  private memory = emptyData();
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

  read(): QuizStorageData {
    if (!this.persistent || !this.storage) return this.memory;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw) as QuizStorageData;
      return parsed.schemaVersion === 2 ? parsed : emptyData();
    } catch {
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
