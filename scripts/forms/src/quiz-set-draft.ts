import type { QuizSetSource, SourceDeclaration } from "../../../contracts/envelope.js";
import { validateQuestionSchema } from "../../../contracts/generated.js";

function validDeclaration(value: unknown, partial = false): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const declaration = value as Record<string, unknown>;
  return (
    Object.keys(declaration).every(key => ["kind", "note", "source", "permission"].includes(key)) &&
    Object.values(declaration).every(item => typeof item === "string") &&
    (partial ? ["", "original", "adapted"] : ["original", "adapted"]).includes(String(declaration.kind)) &&
    typeof declaration.note === "string" &&
    (partial || Boolean(declaration.note.trim())) &&
    (partial || declaration.kind !== "adapted" || Boolean(declaration.source && declaration.permission))
  );
}

export interface QuizSetDraft {
  schemaVersion: 1;
  kind: "quiz-set";
  updatedAt: number;
  submissionId?: string;
  baseRevision?: number;
  title: string;
  content: string;
  attribution: string;
  sourceDeclaration: SourceDeclaration;
  quizSet: QuizSetSource;
  editing?: { clientId: string; fields: Record<string, string | boolean> };
}

export function parseQuizSetDraft(raw: string): QuizSetDraft {
  if (new TextEncoder().encode(raw).length > 1024 * 1024) throw new Error("草稿文件超过 1 MiB，请拆分后导入．");
  const d = JSON.parse(raw);
  if (
    d?.schemaVersion !== 1 ||
    d.kind !== "quiz-set" ||
    !Number.isFinite(d.updatedAt) ||
    ![d.title, d.content, d.attribution].every(v => typeof v === "string") ||
    !validDeclaration(d.sourceDeclaration, true) ||
    !Array.isArray(d.quizSet?.newQuestions) ||
    !Array.isArray(d.quizSet?.selection?.items) ||
    !Array.isArray(d.quizSet.tags) ||
    !d.quizSet.tags.every((v: unknown) => typeof v === "string") ||
    d.quizSet.selection.type !== "fixed" ||
    !["fixed", "shuffle"].includes(d.quizSet.selection.order) ||
    !["immediate", "deferred"].includes(d.quizSet.feedbackMode) ||
    (d.submissionId !== undefined && !/^[a-f0-9-]{36}$/.test(d.submissionId)) ||
    (d.baseRevision !== undefined && (!Number.isSafeInteger(d.baseRevision) || d.baseRevision < 1))
  )
    throw new Error("题集草稿格式无效．");
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
  const keys = new Set<string>();
  for (const q of d.quizSet.newQuestions) {
    if (
      !uuid.test(q?.clientId) ||
      keys.has(q.clientId) ||
      !validateQuestionSchema(q.question) ||
      !validDeclaration(q.sourceDeclaration)
    )
      throw new Error("新题草稿格式无效．");
    keys.add(q.clientId);
  }
  for (const item of d.quizSet.selection.items) {
    if (
      !(item?.kind === "existing" && typeof item.questionId === "string") &&
      !(item?.kind === "new" && keys.has(item.clientId))
    )
      throw new Error("草稿存在无效题目引用．");
  }
  if (
    d.editing &&
    (!uuid.test(d.editing.clientId) ||
      !d.editing.fields ||
      !Object.entries(d.editing.fields).every(
        ([key, value]) =>
          /^(q-submit-[a-z-]+|submission-source-(kind|note|url|permission))$/.test(key) &&
          !/license|token/i.test(key) &&
          ["string", "boolean"].includes(typeof value)
      ))
  )
    throw new Error("未保存的新题字段无效．");
  // Reconstruct the envelope to exclude credentials or permission checks from imported JSON.
  return {
    schemaVersion: 1,
    kind: "quiz-set",
    updatedAt: d.updatedAt,
    title: d.title,
    content: d.content,
    attribution: d.attribution,
    sourceDeclaration: d.sourceDeclaration,
    quizSet: {
      tags: d.quizSet.tags,
      feedbackMode: d.quizSet.feedbackMode,
      selection: {
        type: "fixed",
        order: d.quizSet.selection.order,
        items: d.quizSet.selection.items.map((item: any) =>
          item.kind === "existing"
            ? { kind: "existing", questionId: item.questionId }
            : { kind: "new", clientId: item.clientId }
        )
      },
      newQuestions: d.quizSet.newQuestions.map((q: any) => ({
        clientId: q.clientId,
        question: q.question,
        sourceDeclaration: q.sourceDeclaration
      }))
    },
    ...(d.submissionId ? { submissionId: d.submissionId, baseRevision: d.baseRevision } : {}),
    ...(d.editing ? { editing: d.editing } : {})
  };
}
