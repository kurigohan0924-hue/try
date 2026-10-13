import { describe, expect, it } from 'vitest';
import { currentVersions, evaluateQuestion, markReviewed } from './revisionCheck';
import { std, tfq } from './testFixtures';
import type { Question, Standard } from './types';

const map = (...s: Standard[]) => new Map(s.map((x) => [x.id, x]));
const current = map(std('impairment', '2024-09-13'), std('lease-2024', '2024-09-13'));

describe('evaluateQuestion', () => {
  it('基準が改正されていなければ保存値のまま出題できる', () => {
    const e = evaluateQuestion(tfq(), current);
    expect(e).toMatchObject({ status: 'unverified', playable: true, reasons: [], revisedStandards: [] });
  });

  it('standards.json の version を上げるだけで「改正により要見直し」になり出題から外れる', () => {
    const revised = map(std('impairment', '2027-01-15'));
    const e = evaluateQuestion(tfq(), revised);
    expect(e.status).toBe('needs_review');
    expect(e.playable).toBe(false);
    expect(e.revisedStandards).toEqual(['impairment']);
  });

  it('検証済みの問題も改正されれば要見直しになる', () => {
    const e = evaluateQuestion(tfq({ status: 'verified' }), map(std('impairment', '2027-01-15')));
    expect(e.status).toBe('needs_review');
  });

  it('クイック登録（自作）の問題も基準 ID が紐づいていれば対象になる', () => {
    const q = tfq({ id: 'u-1', status: 'self', source: { type: 'toren', detail: '第3回 問2' } });
    expect(evaluateQuestion(q, map(std('impairment', '2027-01-15'))).status).toBe('needs_review');
  });

  it('複数基準のうち1つでも改正されれば要見直し', () => {
    const q = tfq({ standardIds: ['impairment', 'lease-2024'], basedOn: { impairment: '2024-09-13', 'lease-2024': '2024-09-13' } });
    const e = evaluateQuestion(q, map(std('impairment', '2024-09-13'), std('lease-2024', '2026-01-01')));
    expect(e.revisedStandards).toEqual(['lease-2024']);
    expect(e.playable).toBe(false);
  });

  it('basedOn に版の記録がない基準は安全側で要見直し', () => {
    const e = evaluateQuestion(tfq({ basedOn: {} }), current);
    expect(e.status).toBe('needs_review');
  });

  it('関連基準が空なら自動判定の対象外（unlinked）で、出題はできる', () => {
    const e = evaluateQuestion(tfq({ standardIds: [], basedOn: {}, basis: [] }), current);
    expect(e).toMatchObject({ playable: true, unlinked: true, status: 'unverified' });
  });

  it('除外は出題しない（改正より優先して「除外」と表示）', () => {
    const e = evaluateQuestion(tfq({ status: 'excluded' }), map(std('impairment', '2027-01-15')));
    expect(e.status).toBe('excluded');
    expect(e.playable).toBe(false);
  });

  it('保存値が needs_review なら改正がなくても出題しない', () => {
    expect(evaluateQuestion(tfq({ status: 'needs_review' }), current).playable).toBe(false);
  });

  it('出題範囲外（examScope=out）の基準は出題しないが、ステータスは変えない', () => {
    const e = evaluateQuestion(tfq(), map(std('impairment', '2024-09-13', { examScope: 'out' })));
    expect(e).toMatchObject({ status: 'unverified', playable: false, reasons: ['out_of_scope'] });
  });

  it('設定で出題オフにした基準（例：旧リース）は出題しない', () => {
    const q = tfq({ standardIds: ['lease-2024'], basedOn: { 'lease-2024': '2024-09-13' } });
    const e = evaluateQuestion(q, current, { disabledStandards: new Set(['lease-2024']) });
    expect(e.reasons).toEqual(['disabled_standard']);
  });

  it('基準マスタにない ID は出題しない', () => {
    const q = tfq({ standardIds: ['nope'], basedOn: { nope: '2020-01-01' } });
    expect(evaluateQuestion(q, current).reasons).toContain('unknown_standard');
  });

  it('上書き（アプリで検証済みにした等）が保存値より優先される', () => {
    const e = evaluateQuestion(tfq(), current, {
      override: { questionId: 'q1', status: 'verified', updatedAt: '2026-10-14' },
    });
    expect(e.status).toBe('verified');
  });

  it('見直し完了（markReviewed）後は改正後の版でも出題に戻る', () => {
    const revised = map(std('impairment', '2027-01-15'));
    const q = tfq();
    const ov = markReviewed(q, revised, 'unverified', '2027-02-01T00:00:00Z');
    expect(ov.basedOn).toEqual({ impairment: '2027-01-15' });
    const e = evaluateQuestion(q, revised, { override: ov });
    expect(e).toMatchObject({ status: 'unverified', playable: true });
  });

  it('出題 UI がまだない形式は出題しない', () => {
    const q = { ...tfq(), format: 'order', items: ['a', 'b'] } as Question;
    expect(evaluateQuestion(q, current).reasons).toEqual(['format_not_supported']);
    expect(evaluateQuestion(q, current, { playableFormats: ['order'] }).playable).toBe(true);
  });
});

describe('currentVersions', () => {
  it('紐づけた基準の現行版を返す（未知の ID は無視）', () => {
    expect(currentVersions(['impairment', 'x'], current)).toEqual({ impairment: '2024-09-13' });
  });
});
