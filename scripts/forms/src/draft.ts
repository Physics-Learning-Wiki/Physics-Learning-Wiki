export interface SubmissionDraft {
  schemaVersion: 1;
  type: string;
  title: string;
  content: string;
  majorChapter: string;
  minorChapter: string;
  updatedAt: number;
}

export function parseDraft(raw: string): SubmissionDraft | undefined {
  try {
    const value = JSON.parse(raw);
    const keys = ["type", "title", "content", "majorChapter", "minorChapter"] as const;
    if (
      !value ||
      value.schemaVersion !== 1 ||
      !keys.every(key => typeof value[key] === "string") ||
      !Number.isFinite(value.updatedAt) ||
      value.updatedAt < 0
    )
      return undefined;
    if (!["", "full-page", "notes", "errata", "suggestion"].includes(value.type)) return undefined;
    return {
      schemaVersion: 1,
      type: value.type,
      title: value.title,
      content: value.content,
      majorChapter: value.majorChapter,
      minorChapter: value.minorChapter,
      updatedAt: value.updatedAt
    };
  } catch {
    return undefined;
  }
}

export function sameDraft(left: SubmissionDraft, right: SubmissionDraft): boolean {
  return (
    left.type === right.type &&
    left.title === right.title &&
    left.content === right.content &&
    left.majorChapter === right.majorChapter &&
    left.minorChapter === right.minorChapter
  );
}
