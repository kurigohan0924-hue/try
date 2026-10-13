import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { tfq } from '../domain/testFixtures';
import { BACKUP_APP, backupFileName, exportBackup } from './backup';
import { AppDB, DEFAULT_SETTINGS, getSettings, updateSettings } from './db';

let d: AppDB;
afterEach(async () => {
  await d?.delete();
});

describe('backup', () => {
  it('クイック登録の問題・上書き・履歴・設定をすべて書き出す', async () => {
    d = new AppDB('test-backup');
    await d.userQuestions.add(tfq({ id: 'u-1', status: 'self', source: { type: 'toren', detail: '第1回 問1' } }));
    await d.overrides.put({ questionId: 'z-cf-001', status: 'verified', updatedAt: '2026-10-14' });
    await d.reviewLogs.add({ id: 'r1', questionId: 'u-1', at: '2026-10-14T00:00:00Z', correct: true, rating: 'good', durationMs: 1000, mode: 'today' });
    await updateSettings({ lastTorenName: 'TAC 第3回応用答練' }, d);

    const b = await exportBackup(d, new Date('2026-10-14T09:00:00Z'));
    expect(b.app).toBe(BACKUP_APP);
    expect(b.userQuestions.map((q) => q.id)).toEqual(['u-1']);
    expect(b.overrides).toHaveLength(1);
    expect(b.reviewLogs).toHaveLength(1);
    expect(b.settings?.lastTorenName).toBe('TAC 第3回応用答練');
    expect(JSON.parse(JSON.stringify(b))).toEqual(b);
  });

  it('設定が未保存なら既定値を返す', async () => {
    d = new AppDB('test-settings');
    expect(await getSettings(d)).toEqual(DEFAULT_SETTINGS);
  });

  it('ファイル名に日時を含む', () => {
    expect(backupFileName(new Date(2026, 9, 14, 8, 5))).toBe('zeirishi-backup-20261014-0805.json');
  });
});
