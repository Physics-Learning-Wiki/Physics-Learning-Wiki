export interface SubmissionEnvelope {
  schemaVersion: 1;
  submissionId: string;
  type: string;
  payload: { title: string; content: string; chapter?: string; attribution?: string; question?: Record<string, unknown>; quizSet?: QuizSetSource };
  licenseConsent: boolean;
  licenseVersion: string;
  sourceDeclaration: { kind: string; note: string; source?: string; permission?: string };
  turnstileToken: string;
  baseRevision?: number;
}
export const LICENSE_VERSION: string;
export const TYPE_LABELS: Record<string, string>;
export function fieldErrors(value: unknown, withdrawal?: boolean): Record<string, string>;
export function publicRecord(value: SubmissionEnvelope, revision: number, confirmedAt: string): Record<string, unknown>;
export function publicBody(record: Record<string, unknown>): string;
export function machineBlock(kind: string, record: unknown): string;
export function readBlocks(body: string, kind: string): Record<string, unknown>[];

export interface SourceDeclaration { kind: string; note: string; source?: string; permission?: string }
export type SetItem = { kind: "existing"; questionId: string } | { kind: "new"; clientId: string };
export interface NewSetQuestion { clientId: string; question: Record<string, unknown>; sourceDeclaration: SourceDeclaration }
export interface QuizSetSource { tags: string[]; feedbackMode: "immediate" | "deferred"; selection: { type: "fixed"; order: "fixed" | "shuffle"; items: SetItem[] }; newQuestions: NewSetQuestion[] }
