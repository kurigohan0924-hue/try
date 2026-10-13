import { describe, expect, it } from 'vitest';
import { daysUntil, localDateKey, sample } from './session';

describe('sample', () => {
  it('重複なしで n 件を返す', () => {
    const r = sample([1, 2, 3, 4, 5, 6], 5, () => 0.5);
    expect(r).toHaveLength(5);
    expect(new Set(r).size).toBe(5);
  });
  it('件数が足りなければ全件', () => {
    expect(sample([1, 2], 5)).toHaveLength(2);
  });
  it('元の配列を変更しない', () => {
    const a = [1, 2, 3];
    sample(a, 2, () => 0.99);
    expect(a).toEqual([1, 2, 3]);
  });
});

describe('daysUntil', () => {
  it('当日は 0、前日は 1、過ぎたら負', () => {
    expect(daysUntil('2027-08-03', new Date(2027, 7, 3, 23, 0))).toBe(0);
    expect(daysUntil('2027-08-03', new Date(2027, 7, 2, 0, 1))).toBe(1);
    expect(daysUntil('2027-08-03', new Date(2027, 7, 4))).toBe(-1);
    expect(daysUntil('2027-08-03', new Date(2026, 9, 13))).toBe(294);
  });
});

describe('localDateKey', () => {
  it('ローカル日付の YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
