import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { normalizeQuestionFile, type QuestionFile } from './questionFile';
import { std, tfq } from './testFixtures';
import type { Question, Standard, Topic } from './types';
import { validateData } from './validate';

const topics: Topic[] = [{ id: 'impairment', major: '資産会計', middle: '固定資産の減損' }];
const standards: Standard[] = [std('impairment', '2024-09-13')];
const errorsOf = (q: Question, bundled = true) =>
  validateData({ standards, topics, questionsByFile: { 'f.yaml': [q] }, bundled })
    .filter((i) => i.level === 'error')
    .map((i) => i.message);

describe('validateData', () => {
  it('正しい問題はエラーなし', () => {
    expect(errorsOf(tfq({ explanation: 'x' }))).toEqual([]);
  });
  it('根拠のない基本問題はエラー（クイック登録分は可）', () => {
    const q = tfq({ basis: [] });
    expect(errorsOf(q).join()).toContain('根拠');
    expect(errorsOf(q, false)).toEqual([]);
  });
  it('論点マスタ・基準マスタにない ID はエラー', () => {
    expect(errorsOf(tfq({ topicId: 'zzz' })).join()).toContain('topicId');
    expect(errorsOf(tfq({ standardIds: ['zzz'], basis: [], basedOn: {} }), false).join()).toContain('standardId');
  });
  it('basedOn の欠落・未来の版はエラー', () => {
    expect(errorsOf(tfq({ basedOn: {} })).join()).toContain('basedOn');
    expect(errorsOf(tfq({ basedOn: { impairment: '2099-01-01' } })).join()).toContain('新しい');
  });
  it('根拠の基準が standardIds にないとエラー', () => {
    expect(errorsOf(tfq({ basis: [{ standardId: 'other', ref: '1' }] })).join()).toContain('standardIds');
  });
  it('4択の正解番号が範囲外ならエラー', () => {
    const q = { ...tfq(), format: 'choice', choices: ['a', 'b', 'c', 'd'], answer: 4 } as Question;
    expect(errorsOf(q).join()).toContain('範囲外');
  });
  it('スキーマ違反（形式に必要な項目がない）はエラー', () => {
    const q = { ...tfq(), format: 'flashcard' } as Question;
    expect(errorsOf(q).length).toBeGreaterThan(0);
  });
  it('id 重複はエラー', () => {
    const issues = validateData({ standards, topics, questionsByFile: { 'a.yaml': [tfq()], 'b.yaml': [tfq()] } });
    expect(issues.map((i) => i.message).join()).toContain('重複');
  });
  it('答練の問題はリポジトリに入れない', () => {
    expect(errorsOf(tfq({ source: { type: 'toren' } })).join()).toContain('答練');
  });
});

describe('リポジトリのデータ', () => {
  it('data/ 配下の基準・論点・問題がすべて検証を通る', () => {
    const root = join(import.meta.dirname, '../..');
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => {
        const p = join(d, n);
        return statSync(p).isDirectory() ? walk(p) : n.endsWith('.yaml') ? [p] : [];
      });
    const questionsByFile = Object.fromEntries(
      walk(join(root, 'data/questions')).map((f) => [f, normalizeQuestionFile(parse(readFileSync(f, 'utf8')) as QuestionFile)]),
    );
    const issues = validateData({
      standards: JSON.parse(readFileSync(join(root, 'data/standards.json'), 'utf8')),
      topics: parse(readFileSync(join(root, 'data/topics.yaml'), 'utf8')),
      questionsByFile,
    });
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    const all = Object.values(questionsByFile).flat();
    // Claude が生成した問題はすべて未検証で登録する
    expect(all.filter((q) => q.source.type === 'original' && q.status === 'verified')).toEqual([]);
  });
});

describe('normalizeQuestionFile', () => {
  it('defaults を補い、問題側の指定を優先する', () => {
    const f: QuestionFile = { defaults: { subject: 'boki', difficulty: 3 }, questions: [{ id: 'a' }, { id: 'b', difficulty: 1 }] };
    const qs = normalizeQuestionFile(f);
    expect(qs.map((q) => [q.subject, q.difficulty, q.tags])).toEqual([
      ['boki', 3, []],
      ['boki', 1, []],
    ]);
  });
});
