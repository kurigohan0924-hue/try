import type { Question } from './types';

/** FSRS の評価（ts-fsrs の Rating に対応させる） */
export type Rating = 'again' | 'hard' | 'good' | 'easy';
/** フラッシュカードの自己評価 */
export type SelfAssessment = 'forgot' | 'vague' | 'remembered';

export const SELF_ASSESSMENT_LABEL: Record<SelfAssessment, string> = {
  forgot: '忘れた',
  vague: 'あいまい',
  remembered: '覚えた',
};

export type Response =
  | { format: 'tf'; value: boolean }
  | { format: 'choice'; value: number }
  | { format: 'flashcard'; value: SelfAssessment }
  | { format: 'multi'; value: number[] }
  /** 利用者が並べた順の、items のインデックス列 */
  | { format: 'order'; value: number[] }
  | { format: 'cloze'; value: number[] };

export interface GradeResult {
  correct: boolean;
  rating: Rating;
}

const SELF_TO_RATING: Record<SelfAssessment, Rating> = {
  forgot: 'again',
  vague: 'hard',
  remembered: 'good',
};

/** 採点。自動採点の形式は 正解=good / 不正解=again */
export function grade(q: Question, r: Response): GradeResult {
  if (q.format !== r.format) throw new Error(`形式が一致しません: ${q.format} / ${r.format}`);
  if (r.format === 'flashcard') {
    return { correct: r.value !== 'forgot', rating: SELF_TO_RATING[r.value] };
  }
  const correct = isCorrect(q, r);
  return { correct, rating: correct ? 'good' : 'again' };
}

function isCorrect(q: Question, r: Exclude<Response, { format: 'flashcard' }>): boolean {
  switch (q.format) {
    case 'tf':
      return r.value === q.answer;
    case 'choice':
      return r.value === q.answer;
    case 'multi': {
      const a = [...new Set(r.value as number[])].sort((x, y) => x - y);
      const b = [...new Set(q.answer)].sort((x, y) => x - y);
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    case 'order': {
      const v = r.value as number[];
      return v.length === q.items.length && v.every((idx, pos) => idx === pos);
    }
    case 'cloze': {
      const v = r.value as number[];
      return v.length === q.blanks.length && q.blanks.every((b, i) => v[i] === b.answer);
    }
    default:
      return false;
  }
}

/** 正解の表示用テキスト */
export function answerText(q: Question): string {
  switch (q.format) {
    case 'tf':
      return q.answer ? '○（正しい）' : '×（誤り）';
    case 'choice':
      return q.choices[q.answer] ?? '';
    case 'flashcard':
      return q.answerText;
    case 'multi':
      return q.answer.map((i) => q.choices[i]).join(' / ');
    case 'order':
      return q.items.map((s, i) => `${i + 1}. ${s}`).join('\n');
    case 'cloze':
      return q.blanks.map((b, i) => `(${i + 1}) ${b.options[b.answer]}`).join(' ');
  }
}
