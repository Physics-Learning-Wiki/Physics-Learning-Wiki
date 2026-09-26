import type { Question, QuestionResult, SelfAssessedAnswer, UserAnswer } from "./types.js";

const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

export function parseNumeric(value: string): number | null {
  const normalized = value.trim();
  if (!NUMBER_PATTERN.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isAnswerComplete(question: Question, answer: UserAnswer): boolean {
  if (answer === null) return false;
  if (question.type === "free_response") {
    if (!isSelfAssessedAnswer(answer)) return false;
    const text = answer.text.trim();
    if (question.response.required && text.length === 0) return false;
    if (question.response.minChars !== undefined && text.length < question.response.minChars) return false;
    if (question.response.maxChars !== undefined && text.length > question.response.maxChars) return false;
    return Boolean(answer.levelId && question.grading.rubric.some(level => level.id === answer.levelId));
  }
  if (question.type === "single_choice") return typeof answer === "string" && answer.length > 0;
  if (question.type === "multiple_choice") return Array.isArray(answer) && answer.length > 0;
  if (question.type === "true_false") return typeof answer === "boolean";
  if (!isNumericAnswer(answer) || parseNumeric(answer.value) === null) return false;
  return !question.answer.unit.required || Boolean(answer.unit && question.answer.unit.accepted.includes(answer.unit));
}

export function gradeQuestion(question: Question, answer: UserAnswer): boolean {
  if (answer === null) return false;
  if (question.type === "free_response") {
    if (!isSelfAssessedAnswer(answer) || !answer.levelId) return false;
    const level = question.grading.rubric.find(item => item.id === answer.levelId);
    const maxScore = Math.max(...question.grading.rubric.map(item => item.points), 0);
    return Boolean(level && level.points >= maxScore);
  }
  if (question.type === "single_choice") return typeof answer === "string" && answer === question.answer.choice;
  if (question.type === "multiple_choice") {
    if (!Array.isArray(answer) || !("choices" in question.answer)) return false;
    return [...answer].sort().join("\0") === [...question.answer.choices].sort().join("\0");
  }
  if (question.type === "true_false") return typeof answer === "boolean" && answer === question.answer.value;
  if (!isNumericAnswer(answer)) return false;
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
  const complete = isAnswerComplete(question, answer);
  if (question.type === "free_response") {
    const selfAnswer = isSelfAssessedAnswer(answer) ? answer : null;
    const level = selfAnswer?.levelId
      ? question.grading.rubric.find(item => item.id === selfAnswer.levelId)
      : undefined;
    const maxScore = Math.max(...question.grading.rubric.map(item => item.points), 0);
    return {
      questionId: question.id,
      version: question.version,
      topicIds: question.topicIds ?? [],
      conceptIds: question.conceptIds ?? [],
      objectiveIds: question.objectiveIds ?? [],
      answer,
      correct: Boolean(level && level.points >= maxScore),
      unanswered: !complete,
      uncertain,
      evaluation: {
        mode: "self_assessed",
        status: complete ? "assessed" : "unanswered",
        score: level?.points ?? 0,
        maxScore,
        ...(level ? { levelId: level.id } : {})
      }
    };
  }
  const correct = gradeQuestion(question, answer);
  return {
    questionId: question.id,
    version: question.version,
    topicIds: question.topicIds ?? [],
    conceptIds: question.conceptIds ?? [],
    objectiveIds: question.objectiveIds ?? [],
    answer,
    correct,
    unanswered: !complete,
    uncertain,
    evaluation: {
      mode: "automatic",
      status: complete ? (correct ? "correct" : "incorrect") : "unanswered",
      score: correct ? 1 : 0,
      maxScore: 1
    }
  };
}

function isSelfAssessedAnswer(answer: UserAnswer): answer is SelfAssessedAnswer {
  return Boolean(
    answer &&
      typeof answer === "object" &&
      !Array.isArray(answer) &&
      "text" in answer &&
      typeof answer.text === "string" &&
      "levelId" in answer &&
      (answer.levelId === null || typeof answer.levelId === "string")
  );
}

function isNumericAnswer(answer: UserAnswer): answer is { value: string; unit?: string } {
  return Boolean(
    answer &&
      typeof answer === "object" &&
      !Array.isArray(answer) &&
      "value" in answer &&
      typeof answer.value === "string"
  );
}

export function countProgress(
  questions: readonly Question[],
  answers: Readonly<Record<string, UserAnswer>>,
  uncertain: Readonly<Record<string, boolean>>
): { answered: number; unanswered: number; uncertain: number } {
  const answered = questions.filter(question => isAnswerComplete(question, answers[question.id] ?? null)).length;
  return {
    answered,
    unanswered: questions.length - answered,
    uncertain: questions.filter(question => Boolean(uncertain[question.id])).length
  };
}

export function summarizeConcepts(
  results: readonly QuestionResult[]
): Record<string, { correct: number; total: number; uncertain: number; selfAssessed: number }> {
  const summary: Record<string, { correct: number; total: number; uncertain: number; selfAssessed: number }> = {};
  for (const result of results) {
    const concepts = result.conceptIds && result.conceptIds.length > 0 ? result.conceptIds : ["other"];
    for (const cid of concepts) {
      const item = (summary[cid] ??= { correct: 0, total: 0, uncertain: 0, selfAssessed: 0 });
      item.total += 1;
      if (result.evaluation?.mode === "self_assessed") item.selfAssessed += 1;
      else if (result.correct) item.correct += 1;
      if (result.uncertain) item.uncertain += 1;
    }
  }
  return summary;
}

export function summarizeObjectives(
  results: readonly QuestionResult[]
): Record<string, { correct: number; total: number; uncertain: number; selfAssessed: number }> {
  const summary: Record<string, { correct: number; total: number; uncertain: number; selfAssessed: number }> = {};
  for (const result of results) {
    const objectives = result.objectiveIds && result.objectiveIds.length > 0 ? result.objectiveIds : ["general"];
    for (const oid of objectives) {
      const item = (summary[oid] ??= { correct: 0, total: 0, uncertain: 0, selfAssessed: 0 });
      item.total += 1;
      if (result.evaluation?.mode === "self_assessed") item.selfAssessed += 1;
      else if (result.correct) item.correct += 1;
      if (result.uncertain) item.uncertain += 1;
    }
  }
  return summary;
}
