import type { LearningOutcome, QuestionLearningRecord, QuestionResult } from "./types.js";

export function learningOutcome(result: QuestionResult): LearningOutcome | null {
  if (result.unanswered || result.evaluation?.status === "unanswered") return null;
  if (result.evaluation?.mode === "self_assessed") {
    return result.evaluation.status === "assessed" ? "self_assessed" : null;
  }
  if (result.evaluation?.mode === "automatic") {
    if (result.evaluation.status === "correct" || result.evaluation.status === "incorrect") {
      return result.evaluation.status;
    }
  }
  return null;
}

export function applyLearningResult(
  previous: QuestionLearningRecord | undefined,
  result: QuestionResult,
  answeredAt: string
): QuestionLearningRecord | undefined {
  const outcome = learningOutcome(result);
  if (!outcome) return previous;
  const next: QuestionLearningRecord = previous
    ? structuredClone(previous)
    : { answeredCount: 0, correctCount: 0, incorrectCount: 0, selfAssessedCount: 0 };
  next.answeredCount += 1;
  next.lastQuestionVersion = result.version;
  next.firstAnsweredAt ??= answeredAt;
  next.lastAnsweredAt = answeredAt;
  next.lastOutcome = outcome;
  if (outcome === "correct") {
    next.correctCount += 1;
    if (next.wrongBook) {
      next.wrongBook.correctAfterLastWrong += 1;
      next.wrongBook.updatedAt = answeredAt;
    }
  } else if (outcome === "incorrect") {
    next.incorrectCount += 1;
    const wrongBook = next.wrongBook ?? {
      status: "learning" as const,
      addedAt: answeredAt,
      updatedAt: answeredAt,
      manuallyAdded: false,
      correctAfterLastWrong: 0
    };
    wrongBook.status = "learning";
    wrongBook.updatedAt = answeredAt;
    wrongBook.lastWrongAt = answeredAt;
    wrongBook.correctAfterLastWrong = 0;
    delete wrongBook.masteredAt;
    delete wrongBook.masteredQuestionVersion;
    next.wrongBook = wrongBook;
  } else {
    next.selfAssessedCount += 1;
  }
  return next;
}
