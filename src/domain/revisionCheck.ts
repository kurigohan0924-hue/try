import { PLAYABLE_FORMATS, type Format, type Question, type Standard, type Status } from './types';

/** 基本問題に対する端末側の上書き（アプリ上で「検証済み」にした等） */
export interface QuestionOverride {
  questionId: string;
  status?: Status;
  basedOn?: Record<string, string>;
  updatedAt: string;
}

export interface EvaluateOptions {
  override?: QuestionOverride;
  /** 設定で「出題しない」にした基準 ID */
  disabledStandards?: ReadonlySet<string>;
  /** 出題 UI がある形式（フェーズごとに増える） */
  playableFormats?: readonly Format[];
}

export type NotPlayableReason =
  | 'excluded'
  | 'needs_review'
  | 'out_of_scope'
  | 'disabled_standard'
  | 'unknown_standard'
  | 'format_not_supported';

export interface Evaluation {
  /** 画面に出す実効ステータス */
  status: Status;
  playable: boolean;
  reasons: NotPlayableReason[];
  /** 問題作成後に改正された基準 */
  revisedStandards: string[];
  /** 関連基準が空で、改正チェックの対象外 */
  unlinked: boolean;
}

/**
 * 問題の実効ステータスと出題可否を判定する純粋関数。
 * 保存値は書き換えず、standards.json の version と問題の basedOn を毎回比べる。
 */
export function evaluateQuestion(
  q: Question,
  standards: ReadonlyMap<string, Standard>,
  opts: EvaluateOptions = {},
): Evaluation {
  const { override, disabledStandards = new Set<string>(), playableFormats = PLAYABLE_FORMATS } = opts;
  const storedStatus: Status = override?.status ?? q.status;
  const basedOn = { ...q.basedOn, ...override?.basedOn };
  const reasons: NotPlayableReason[] = [];
  const revisedStandards: string[] = [];

  for (const id of q.standardIds) {
    const std = standards.get(id);
    if (!std) {
      reasons.push('unknown_standard');
      continue;
    }
    const v = basedOn[id];
    // 版の記録がない＝いつの基準で作ったか不明なので、安全側で要見直しにする
    if (!v || v < std.version) revisedStandards.push(id);
    if (std.examScope === 'out') reasons.push('out_of_scope');
    if (disabledStandards.has(id)) reasons.push('disabled_standard');
  }

  let status = storedStatus;
  if (storedStatus === 'excluded') {
    reasons.unshift('excluded');
  } else if (revisedStandards.length > 0 || storedStatus === 'needs_review') {
    status = 'needs_review';
    reasons.unshift('needs_review');
  }
  if (!playableFormats.includes(q.format)) reasons.push('format_not_supported');

  return {
    status,
    playable: reasons.length === 0,
    reasons: [...new Set(reasons)],
    revisedStandards,
    unlinked: q.standardIds.length === 0,
  };
}

/** 現行版の basedOn を作る（クイック登録時・見直し完了時） */
export function currentVersions(
  standardIds: readonly string[],
  standards: ReadonlyMap<string, Standard>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of standardIds) {
    const std = standards.get(id);
    if (std) out[id] = std.version;
  }
  return out;
}

/** 「見直し完了」：basedOn を現行版にそろえ、ステータスを選び直した上書きを返す */
export function markReviewed(
  q: Question,
  standards: ReadonlyMap<string, Standard>,
  newStatus: Exclude<Status, 'needs_review'>,
  now: string,
): QuestionOverride {
  return {
    questionId: q.id,
    status: newStatus,
    basedOn: currentVersions(q.standardIds, standards),
    updatedAt: now,
  };
}

export const REASON_LABEL: Record<NotPlayableReason, string> = {
  excluded: '除外',
  needs_review: '改正により要見直し',
  out_of_scope: '出題範囲外の基準',
  disabled_standard: '設定で出題しない基準',
  unknown_standard: '基準マスタにない基準 ID',
  format_not_supported: 'この形式はまだ出題できません',
};
