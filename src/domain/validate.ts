import Ajv, { type ValidateFunction } from 'ajv';
import questionSchema from '../../data/schema/question.schema.json';
import standardSchema from '../../data/schema/standard.schema.json';
import topicSchema from '../../data/schema/topic.schema.json';
import type { Question, Standard, Topic } from './types';

export interface DataIssue {
  level: 'error' | 'warning';
  where: string;
  message: string;
}

const ajv = new Ajv({ allErrors: true });
const vQuestion = ajv.compile(questionSchema);
const vStandard = ajv.compile(standardSchema);
const vTopic = ajv.compile(topicSchema);

function schemaIssues(v: ValidateFunction, data: unknown, where: string): DataIssue[] {
  if (v(data)) return [];
  return (v.errors ?? []).map((e) => ({
    level: 'error' as const,
    where,
    message: `${e.instancePath || '(root)'} ${e.message ?? ''}`.trim(),
  }));
}

export interface ValidateInput {
  standards: Standard[];
  topics: Topic[];
  /** ファイル名ごとの問題（defaults 適用済み） */
  questionsByFile: Record<string, Question[]>;
  /** true なら基本問題向けの厳しいチェック（根拠必須など）を行う */
  bundled?: boolean;
}

/** スキーマ検証と参照整合チェック。scripts/validate-data.ts とテストから使う */
export function validateData(input: ValidateInput): DataIssue[] {
  const { standards, topics, questionsByFile, bundled = true } = input;
  const issues: DataIssue[] = [];
  const stdMap = new Map<string, Standard>();
  for (const s of standards) {
    issues.push(...schemaIssues(vStandard, s, `standards.json:${s.id}`));
    if (stdMap.has(s.id)) issues.push({ level: 'error', where: `standards.json:${s.id}`, message: 'id が重複' });
    stdMap.set(s.id, s);
  }
  for (const s of standards) {
    for (const ref of [s.supersedes, s.supersededBy]) {
      if (ref && !stdMap.has(ref))
        issues.push({ level: 'error', where: `standards.json:${s.id}`, message: `参照先の基準がない: ${ref}` });
    }
  }
  const topicIds = new Set<string>();
  for (const t of topics) {
    issues.push(...schemaIssues(vTopic, t, `topics.yaml:${t.id}`));
    if (topicIds.has(t.id)) issues.push({ level: 'error', where: `topics.yaml:${t.id}`, message: 'id が重複' });
    topicIds.add(t.id);
  }

  const seen = new Map<string, string>();
  for (const [file, qs] of Object.entries(questionsByFile)) {
    for (const q of qs) {
      const where = `${file}:${q.id ?? '(id なし)'}`;
      const err = (message: string) => issues.push({ level: 'error', where, message });
      const warn = (message: string) => issues.push({ level: 'warning', where, message });
      issues.push(...schemaIssues(vQuestion, q, where));
      if (!q.id) continue;
      if (seen.has(q.id)) err(`id が重複（${seen.get(q.id)}）`);
      seen.set(q.id, file);
      if (!topicIds.has(q.topicId)) err(`論点マスタにない topicId: ${q.topicId}`);
      for (const id of q.standardIds ?? []) {
        const std = stdMap.get(id);
        if (!std) {
          err(`基準マスタにない standardId: ${id}`);
          continue;
        }
        const v = q.basedOn?.[id];
        if (!v) err(`basedOn に ${id} の版がない`);
        else if (v > std.version) err(`basedOn.${id}=${v} が基準の版 ${std.version} より新しい`);
      }
      for (const b of q.basis ?? []) {
        if (!q.standardIds?.includes(b.standardId)) err(`根拠の基準 ${b.standardId} が standardIds にない`);
      }
      if (q.format === 'choice') {
        if (q.answer >= q.choices.length) err('answer が choices の範囲外');
        if (q.choices.length !== 4) warn(`4択だが選択肢が ${q.choices.length} 個`);
        if (new Set(q.choices).size !== q.choices.length) err('選択肢が重複');
      }
      if (q.format === 'multi' && q.answer.some((i) => i >= q.choices.length)) err('answer が choices の範囲外');
      if (q.format === 'cloze') {
        const n = (q.text.match(/\{\{\d+\}\}/g) ?? []).length;
        if (n !== q.blanks.length) err(`穴の数（${n}）と blanks の数（${q.blanks.length}）が一致しない`);
        q.blanks.forEach((b, i) => b.answer >= b.options.length && err(`blanks[${i}].answer が範囲外`));
      }
      if (bundled) {
        if ((q.basis ?? []).length === 0) err('根拠（basis）がない問題は登録しない');
        if ((q.standardIds ?? []).length === 0) err('standardIds が空（改正チェックができない）');
        if (q.source?.type === 'toren') err('答練の問題はリポジトリに入れない（端末のクイック登録のみ）');
        if (!q.explanation) warn('解説がない');
      }
    }
  }
  return issues;
}
