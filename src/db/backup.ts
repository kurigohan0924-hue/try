import type { QuestionOverride } from '../domain/revisionCheck';
import type { Question } from '../domain/types';
import { type AppDB, type CustomTopic, type ReviewLog, type Settings } from './db';

export const BACKUP_APP = 'zeirishi-zenteichishiki';
export const BACKUP_SCHEMA_VERSION = 1;

/** エクスポート JSON。userQuestions は問題 YAML と同じスキーマ */
export interface BackupFile {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  userQuestions: Question[];
  overrides: QuestionOverride[];
  customTopics: CustomTopic[];
  reviewLogs: ReviewLog[];
  settings: Settings | null;
}

export async function exportBackup(d: AppDB, now = new Date()): Promise<BackupFile> {
  const [userQuestions, overrides, customTopics, reviewLogs, settings] = await Promise.all([
    d.userQuestions.toArray(),
    d.overrides.toArray(),
    d.customTopics.toArray(),
    d.reviewLogs.toArray(),
    d.settings.get('app'),
  ]);
  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    userQuestions,
    overrides,
    customTopics,
    reviewLogs,
    settings: settings ?? null,
  };
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `zeirishi-backup-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.json`;
}
