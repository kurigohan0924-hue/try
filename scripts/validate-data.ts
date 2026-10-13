/**
 * 問題データの検証: npm run validate
 * data/standards.json・data/topics.yaml・data/questions/**\/*.yaml をスキーマと参照整合でチェックする。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { normalizeQuestionFile, type QuestionFile } from '../src/domain/questionFile';
import type { Question, Standard, Topic } from '../src/domain/types';
import { validateData } from '../src/domain/validate';

const root = join(import.meta.dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.ya?ml$/.test(name) ? [p] : [];
  });
}

const standards = JSON.parse(readFileSync(join(root, 'data/standards.json'), 'utf8')) as Standard[];
const topics = parse(readFileSync(join(root, 'data/topics.yaml'), 'utf8')) as Topic[];
const questionsByFile: Record<string, Question[]> = {};
for (const file of walk(join(root, 'data/questions'))) {
  const rel = relative(root, file);
  questionsByFile[rel] = normalizeQuestionFile(parse(readFileSync(file, 'utf8')) as QuestionFile);
}

const issues = validateData({ standards, topics, questionsByFile });
const errors = issues.filter((i) => i.level === 'error');
for (const i of issues) console.log(`${i.level === 'error' ? '✖' : '⚠'} ${i.where}: ${i.message}`);

const total = Object.values(questionsByFile).reduce((n, qs) => n + qs.length, 0);
const bySubject = Object.values(questionsByFile)
  .flat()
  .reduce<Record<string, number>>((acc, q) => ((acc[q.subject] = (acc[q.subject] ?? 0) + 1), acc), {});
console.log(
  `\n基準 ${standards.length} 件 / 論点 ${topics.length} 件 / 問題 ${total} 問 ${JSON.stringify(bySubject)}` +
    ` / エラー ${errors.length} 件・警告 ${issues.length - errors.length} 件`,
);
process.exit(errors.length > 0 ? 1 : 0);
