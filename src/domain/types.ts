/** 問題・基準・論点のデータ型。data/schema/*.schema.json と一致させること。 */

export type Subject = 'boki' | 'zaihyo';
export type Format = 'tf' | 'choice' | 'flashcard' | 'cloze' | 'multi' | 'order';
export type Status = 'unverified' | 'verified' | 'self' | 'needs_review' | 'excluded';
export type SourceType = 'past_exam' | 'tac' | 'toren' | 'original';
export type Difficulty = 1 | 2 | 3;

export const SUBJECT_LABEL: Record<Subject, string> = { boki: '簿記論', zaihyo: '財表' };
export const STATUS_LABEL: Record<Status, string> = {
  unverified: '未検証',
  verified: '検証済み',
  self: '自作',
  needs_review: '改正により要見直し',
  excluded: '除外',
};
export const SOURCE_LABEL: Record<SourceType, string> = {
  past_exam: '過去問ベース',
  tac: 'TAC教材ベース',
  toren: '答練の間違い',
  original: 'オリジナル',
};
export const FORMAT_LABEL: Record<Format, string> = {
  tf: '○×',
  choice: '4択',
  flashcard: '一問一答',
  cloze: '穴埋め',
  multi: '複数選択',
  order: '並べ替え',
};

/** 根拠。ref は「第20項」「二 3.」「注解 注4」など。unconfirmed=true は原文と未照合 */
export interface Basis {
  standardId: string;
  ref: string;
  unconfirmed?: boolean;
}

interface QuestionBase {
  id: string;
  subject: Subject;
  topicId: string;
  prompt: string;
  explanation?: string;
  basis: Basis[];
  /** 関連する基準 ID（改正チェックの対象） */
  standardIds: string[];
  /** 作成・確認したときの各基準の版（standards.json の version） */
  basedOn: Record<string, string>;
  source: { type: SourceType; detail?: string };
  difficulty: Difficulty;
  tags: string[];
  status: Status;
  updatedAt: string;
}

export interface TfQuestion extends QuestionBase {
  format: 'tf';
  answer: boolean;
}
export interface ChoiceQuestion extends QuestionBase {
  format: 'choice';
  choices: string[];
  answer: number;
}
export interface FlashcardQuestion extends QuestionBase {
  format: 'flashcard';
  answerText: string;
}
/** フェーズ4で UI を実装する形式（スキーマだけ先に定義） */
export interface MultiQuestion extends QuestionBase {
  format: 'multi';
  choices: string[];
  answer: number[];
}
export interface OrderQuestion extends QuestionBase {
  format: 'order';
  /** 正しい順に並べた項目 */
  items: string[];
}
export interface ClozeQuestion extends QuestionBase {
  format: 'cloze';
  /** 本文中の {{1}} {{2}} … が blanks[0], blanks[1] … に対応 */
  text: string;
  blanks: { options: string[]; answer: number }[];
}

export type Question =
  | TfQuestion
  | ChoiceQuestion
  | FlashcardQuestion
  | MultiQuestion
  | OrderQuestion
  | ClozeQuestion;

/** フェーズ1で出題 UI がある形式 */
export const PLAYABLE_FORMATS: readonly Format[] = ['tf', 'choice', 'flashcard'];

export interface Standard {
  id: string;
  name: string;
  number?: string;
  issuer: 'ASBJ' | '企業会計審議会' | 'ASBJ（討議資料）';
  /** 現行版の公表・最終改正日（YYYY-MM-DD）。改正したらここを更新する */
  version: string;
  firstIssued?: string;
  effectiveFrom?: string;
  earlyAdoption?: string;
  majorChanges: string[];
  examScope: 'in' | 'out' | 'unconfirmed';
  supersedes?: string;
  supersededBy?: string;
  /** 出題画面のバッジ（例：新リース基準） */
  label?: string;
  /** 「要確認」の項目と理由 */
  unconfirmed: string[];
  sourceUrl?: string;
  note?: string;
}

export interface Topic {
  id: string;
  major: string;
  middle: string;
  minor?: string;
  /** 省略時は両科目 */
  subjects?: Subject[];
}

export function topicLabel(t: Pick<Topic, 'major' | 'middle' | 'minor'>): string {
  return [t.major, t.middle, t.minor].filter(Boolean).join(' › ');
}
