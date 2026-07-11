import type { Attempt, QuizStorageData, Session } from "./types.js";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = "plw.quiz.v1";

function emptyData(): QuizStorageData {
  return {
    schemaVersion: 1,
    activeSessions: {},
    attempts: [],
    wrongQuestions: {},
    preferences: { restoreSession: true }
  };
}

export class QuizStore {
  private memory = emptyData();
  readonly persistent: boolean;

  constructor(private readonly storage?: StorageLike) {
    let persistent = Boolean(storage);
    if (storage) {
      try {
        const probe = `${KEY}.probe`;
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
      const raw = this.storage.getItem(KEY);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw) as QuizStorageData;
      return parsed.schemaVersion === 1 ? parsed : emptyData();
    } catch {
      return emptyData();
    }
  }

  write(data: QuizStorageData): void {
    this.memory = data;
    if (!this.persistent || !this.storage) return;
    try {
      this.storage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Continue in memory when storage is full or blocked.
    }
  }

  saveSession(session: Session): void {
    const data = this.read();
    const sessions = data.activeSessions[session.pageId] ?? [];
    const withoutSame = sessions.filter(item => !(item.mode === session.mode && item.seed === session.seed));
    data.activeSessions[session.pageId] = [session, ...withoutSame].slice(0, 3);
    this.write(data);
  }

  saveAttempt(attempt: Attempt): void {
    const data = this.read();
    data.attempts = [attempt, ...data.attempts].slice(0, 50);
    const sessions = data.activeSessions[attempt.pageId] ?? [];
    data.activeSessions[attempt.pageId] = sessions.filter(
      item => !(item.mode === attempt.mode && item.seed === attempt.seed)
    );
    for (const result of attempt.questionResults) {
      if (!result.correct) data.wrongQuestions[result.questionId] = attempt.completedAt;
    }
    const wrong = Object.entries(data.wrongQuestions)
      .sort((a, b) => b[1].localeCompare(a[1]))
      .slice(0, 300);
    data.wrongQuestions = Object.fromEntries(wrong);
    this.write(data);
  }
}
