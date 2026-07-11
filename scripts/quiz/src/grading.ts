import type { Question, QuestionResult, UserAnswer } from "./types.js";

const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

export function parseNumeric(value: string): number | null {
  const normalized = value.trim();
  if (!NUMBER_PATTERN.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function gradeQuestion(question: Question, answer: UserAnswer): boolean {
  if (answer === null) return false;
  if (question.type === "single_choice") return typeof answer === "string" && answer === question.answer.choice;
  if (question.type === "multiple_choice") {
    if (!Array.isArray(answer) || !("choices" in question.answer)) return false;
    return [...answer].sort().join("\0") === [...question.answer.choices].sort().join("\0");
  }
  if (question.type === "true_false") return typeof answer === "boolean" && answer === question.answer.value;
  if (typeof answer !== "object" || Array.isArray(answer)) return false;
  const value = parseNumeric(answer.value);
  if (value === null) return false;
  const expected = question.answer.value;
  const tolerance = question.answer.tolerance;
  const allowed =
    tolerance.type === "absolute" ? tolerance.value : tolerance.value * Math.max(Math.abs(expected), Number.EPSILON);
  if (Math.abs(value - expected) > allowed) return false;
  return !question.answer.unit.required || Boolean(answer.unit && question.answer.unit.accepted.includes(answer.unit));
}

export function makeResult(question: Question, answer: UserAnswer, uncertain: boolean): QuestionResult {
  return {
    questionId: question.id,
    version: question.version,
    primaryObjective: question.primaryObjective,
    answer,
    correct: gradeQuestion(question, answer),
    unanswered: answer === null,
    uncertain
  };
}

export function summarizeObjectives(
  results: readonly QuestionResult[]
): Record<string, { correct: number; total: number; uncertain: number }> {
  const summary: Record<string, { correct: number; total: number; uncertain: number }> = {};
  for (const result of results) {
    const item = (summary[result.primaryObjective] ??= { correct: 0, total: 0, uncertain: 0 });
    item.total += 1;
    if (result.correct) item.correct += 1;
    if (result.uncertain) item.uncertain += 1;
  }
  return summary;
}
