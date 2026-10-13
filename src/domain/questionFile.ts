import type { Question } from './types';

/**
 * 問題 YAML 1ファイルの形。defaults の値を各問題に補う（問題側の指定が優先）。
 * 書き方は docs/writing-guide.md を参照。
 */
export interface QuestionFile {
  defaults?: Partial<Question>;
  questions: Partial<Question>[];
}

export function normalizeQuestionFile(file: QuestionFile): Question[] {
  const d = file.defaults ?? {};
  return (file.questions ?? []).map(
    (q) =>
      ({
        tags: [],
        basis: [],
        standardIds: [],
        basedOn: {},
        difficulty: 2,
        ...d,
        ...q,
      }) as Question,
  );
}
