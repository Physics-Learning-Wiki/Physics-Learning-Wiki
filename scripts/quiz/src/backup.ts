import { isProfile } from "./storage.js";
import type { QuizStorageData } from "./types.js";

export const MAX_BACKUP_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PROFILE_BYTES = 4 * 1024 * 1024;

export interface QuizBackupV1 {
  format: "physics-learning-wiki.quiz-backup";
  formatVersion: 1;
  exportedAt: string;
  source: { app: "Physics Learning Wiki"; preview: boolean };
  storageSchemaVersion: 3;
  data: QuizStorageData;
}

export type BackupParseResult = { ok: true; backup: QuizBackupV1 } | { ok: false; error: string };

export function createBackup(data: QuizStorageData, preview: boolean): QuizBackupV1 {
  if (!isProfile(data, preview)) throw new Error("当前学习档案未通过校验，无法生成正常备份");
  return {
    format: "physics-learning-wiki.quiz-backup",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    source: { app: "Physics Learning Wiki", preview },
    storageSchemaVersion: 3,
    data: structuredClone(data)
  };
}

export function serializeBackup(backup: QuizBackupV1): string {
  const raw = JSON.stringify(backup, null, 2);
  if (new TextEncoder().encode(raw).length > MAX_BACKUP_FILE_BYTES) throw new Error("备份文件超过 5 MiB 上限");
  return raw;
}

function containsDangerousKeys(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsDangerousKeys);
  return Object.entries(value).some(
    ([key, child]) => ["__proto__", "prototype", "constructor"].includes(key) || containsDangerousKeys(child)
  );
}

export function parseBackup(raw: string, preview: boolean): BackupParseResult {
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > MAX_BACKUP_FILE_BYTES) return { ok: false, error: "文件超过 5 MiB 上限" };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, error: "JSON 格式错误" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || containsDangerousKeys(value))
    return { ok: false, error: "备份包含无效对象或危险字段" };
  const backup = value as Record<string, unknown>;
  if (backup.format !== "physics-learning-wiki.quiz-backup" || backup.formatVersion !== 1)
    return { ok: false, error: "format / formatVersion 不受支持" };
  const source = backup.source;
  if (
    !source ||
    typeof source !== "object" ||
    Array.isArray(source) ||
    (source as Record<string, unknown>).app !== "Physics Learning Wiki" ||
    (source as Record<string, unknown>).preview !== preview
  )
    return { ok: false, error: "source.preview 与当前环境不匹配" };
  if (backup.storageSchemaVersion !== 3) return { ok: false, error: "storageSchemaVersion 不受支持" };
  if (typeof backup.exportedAt !== "string" || Number.isNaN(Date.parse(backup.exportedAt)))
    return { ok: false, error: "exportedAt 无效" };
  if (new TextEncoder().encode(JSON.stringify(backup.data)).length > MAX_PROFILE_BYTES)
    return { ok: false, error: "data 超过 4 MiB 档案上限" };
  if (!isProfile(backup.data, preview)) return { ok: false, error: "data 档案结构无效" };
  return { ok: true, backup: backup as unknown as QuizBackupV1 };
}
