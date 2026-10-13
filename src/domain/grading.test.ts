import { describe, expect, it } from 'vitest';
import { answerText, grade } from './grading';
import { tfq } from './testFixtures';
import type { Question } from './types';

const base = tfq();

describe('grade', () => {
  it('○×：正解は good、不正解は again', () => {
    expect(grade(base, { format: 'tf', value: true })).toEqual({ correct: true, rating: 'good' });
    expect(grade(base, { format: 'tf', value: false })).toEqual({ correct: false, rating: 'again' });
  });

  it('4択：選んだ番号で判定', () => {
    const q = { ...base, format: 'choice', choices: ['a', 'b', 'c', 'd'], answer: 2 } as Question;
    expect(grade(q, { format: 'choice', value: 2 }).correct).toBe(true);
    expect(grade(q, { format: 'choice', value: 0 })).toEqual({ correct: false, rating: 'again' });
  });

  it('フラッシュカード：覚えた/あいまい/忘れた = good/hard/again', () => {
    const q = { ...base, format: 'flashcard', answerText: 'x' } as Question;
    expect(grade(q, { format: 'flashcard', value: 'remembered' })).toEqual({ correct: true, rating: 'good' });
    expect(grade(q, { format: 'flashcard', value: 'vague' })).toEqual({ correct: true, rating: 'hard' });
    expect(grade(q, { format: 'flashcard', value: 'forgot' })).toEqual({ correct: false, rating: 'again' });
  });

  it('複数選択：順序や重複に関係なく集合が一致すれば正解', () => {
    const q = { ...base, format: 'multi', choices: ['a', 'b', 'c', 'd'], answer: [0, 2] } as Question;
    expect(grade(q, { format: 'multi', value: [2, 0] }).correct).toBe(true);
    expect(grade(q, { format: 'multi', value: [2, 0, 0] }).correct).toBe(true);
    expect(grade(q, { format: 'multi', value: [0] }).correct).toBe(false);
    expect(grade(q, { format: 'multi', value: [0, 1, 2] }).correct).toBe(false);
  });

  it('並べ替え：items の元の順と一致すれば正解', () => {
    const q = { ...base, format: 'order', items: ['兆候', '認識', '測定'] } as Question;
    expect(grade(q, { format: 'order', value: [0, 1, 2] }).correct).toBe(true);
    expect(grade(q, { format: 'order', value: [1, 0, 2] }).correct).toBe(false);
    expect(grade(q, { format: 'order', value: [0, 1] }).correct).toBe(false);
  });

  it('穴埋め：すべての穴が正しいときだけ正解', () => {
    const q = {
      ...base,
      format: 'cloze',
      text: '{{1}} と {{2}}',
      blanks: [
        { options: ['a', 'b'], answer: 1 },
        { options: ['c', 'd'], answer: 0 },
      ],
    } as Question;
    expect(grade(q, { format: 'cloze', value: [1, 0] }).correct).toBe(true);
    expect(grade(q, { format: 'cloze', value: [1, 1] }).correct).toBe(false);
  });

  it('形式が違う解答はエラー', () => {
    expect(() => grade(base, { format: 'choice', value: 0 })).toThrow();
  });
});

describe('answerText', () => {
  it('○× と 4択の正解表示', () => {
    expect(answerText(base)).toContain('○');
    expect(answerText({ ...base, answer: false } as Question)).toContain('×');
    const q = { ...base, format: 'choice', choices: ['a', 'b'], answer: 1 } as Question;
    expect(answerText(q)).toBe('b');
  });
});
