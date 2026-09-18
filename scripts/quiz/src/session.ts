import type { Question, QuizMode, Session } from "./types.js";

export function createSession(
  pageId: string,
  mode: QuizMode,
  seed: string,
  bankFingerprint: string,
  questions: readonly Question[]
): Session {
  const now = new Date().toISOString();
  return {
    pageId,
    mode,
    seed,
    bankFingerprint,
    questionRefs: questions.map(({ id, version }) => ({ id, version })),
    answers: {},
    uncertain: {},
    locked: {},
    currentIndex: 0,
    startedAt: now,
    updatedAt: now
  };
}

export function isSessionRestorable(
  session: Session,
  mode: QuizMode,
  seed: string,
  bankFingerprint: string,
  questions: readonly Question[]
): boolean {
  return (
    session.mode === mode &&
    session.seed === seed &&
    session.bankFingerprint === bankFingerprint &&
    session.questionRefs.every(reference =>
      questions.some(q => q.id === reference.id && q.version === reference.version)
    )
  );
}

export function findRestorableSession(
  candidates: readonly Session[],
  mode: QuizMode,
  seed: string,
  bankFingerprint: string,
  questions: readonly Question[]
): Session | undefined {
  return candidates.find(item => isSessionRestorable(item, mode, seed, bankFingerprint, questions));
}
