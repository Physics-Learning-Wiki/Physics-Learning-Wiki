import type { Question, QuizSource, Session } from "./types.js";

export function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createSession(
  source: QuizSource,
  seed: string,
  bankFingerprint: string,
  selectionAlgorithmVersion: number,
  preview: boolean,
  questions: readonly Question[],
  context?: Session["context"]
): Session {
  const now = new Date().toISOString();
  return {
    sessionId: generateSessionId(),
    preview,
    selectionAlgorithmVersion,
    state: "active",
    source,
    seed,
    bankFingerprint,
    questionRefs: questions.map(({ id, version }) => ({ id, version })),
    answers: {},
    uncertain: {},
    locked: {},
    currentIndex: 0,
    startedAt: now,
    updatedAt: now,
    context
  };
}

export function isSessionRestorable(
  session: Session,
  source: QuizSource,
  seed: string,
  bankFingerprint: string,
  selectionAlgorithmVersion: number,
  questions: readonly Question[]
): boolean {
  if (session.state !== "active") return false;
  if (session.source.type !== source.type) return false;
  if (session.source.type === "set" && source.type === "set" && session.source.id !== source.id) return false;
  if (session.source.type === "adhoc" && source.type === "adhoc") {
    const sIds = [...session.source.questionIds].sort().join(",");
    const tIds = [...source.questionIds].sort().join(",");
    if (sIds !== tIds) return false;
  }
  if (session.seed !== seed) return false;
  if (session.bankFingerprint !== bankFingerprint) return false;
  if (session.selectionAlgorithmVersion !== selectionAlgorithmVersion) return false;

  if (session.questionRefs.length !== questions.length) return false;
  for (let i = 0; i < questions.length; i += 1) {
    if (session.questionRefs[i].id !== questions[i].id || session.questionRefs[i].version !== questions[i].version) {
      return false;
    }
  }

  return true;
}

export function findRestorableSession(
  candidates: readonly Session[],
  source: QuizSource,
  seed: string,
  bankFingerprint: string,
  selectionAlgorithmVersion: number,
  questions: readonly Question[]
): Session | undefined {
  return candidates.find(item =>
    isSessionRestorable(item, source, seed, bankFingerprint, selectionAlgorithmVersion, questions)
  );
}

export type SessionRestoreStatus =
  | { status: "restorable"; session: Session }
  | { status: "stale"; session: Session; reason: string }
  | { status: "none" };

export function inspectSessionStatus(
  candidates: readonly Session[],
  source: QuizSource,
  seed: string,
  bankFingerprint: string,
  selectionAlgorithmVersion: number,
  questions: readonly Question[]
): SessionRestoreStatus {
  const matching = candidates.find(session => {
    if (session.source.type !== source.type) return false;
    if (session.source.type === "set" && source.type === "set" && session.source.id !== source.id) return false;
    if (session.source.type === "adhoc" && source.type === "adhoc") {
      const sIds = [...session.source.questionIds].sort().join(",");
      const tIds = [...source.questionIds].sort().join(",");
      if (sIds !== tIds) return false;
    }
    return session.seed === seed;
  });

  if (!matching || matching.state !== "active") {
    return { status: "none" };
  }

  if (matching.bankFingerprint !== bankFingerprint) {
    return {
      status: "stale",
      session: matching,
      reason: "题库指纹已变更（题目内容或元数据有更新）"
    };
  }

  if (matching.selectionAlgorithmVersion !== selectionAlgorithmVersion) {
    return {
      status: "stale",
      session: matching,
      reason: "题库组卷算法版本已升级"
    };
  }

  if (matching.questionRefs.length !== questions.length) {
    return {
      status: "stale",
      session: matching,
      reason: "小测题目数量与当前题库不一致"
    };
  }

  for (let i = 0; i < questions.length; i += 1) {
    if (matching.questionRefs[i].id !== questions[i].id) {
      return {
        status: "stale",
        session: matching,
        reason: `题目结构发生变化（第 ${i + 1} 题不匹配）`
      };
    }
    if (matching.questionRefs[i].version !== questions[i].version) {
      return {
        status: "stale",
        session: matching,
        reason: `题目版本已更新（第 ${i + 1} 题已发布新版本）`
      };
    }
  }

  return { status: "restorable", session: matching };
}
