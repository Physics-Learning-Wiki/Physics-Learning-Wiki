export interface SubmissionEnvelope {
  schemaVersion: 1;
  submissionId: string;
  type: string;
  payload: { title: string; content: string; chapter?: string; attribution?: string; question?: Record<string, unknown> };
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
export function machineBlock(kind: string, record: unknown): string;
export function readBlocks(body: string, kind: string): Record<string, unknown>[];
