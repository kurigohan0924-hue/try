import standardsJson from '../../data/standards.json';
import topicsYaml from '../../data/topics.yaml';
import { normalizeQuestionFile, type QuestionFile } from '../domain/questionFile';
import type { Question, Standard, Topic } from '../domain/types';

/** data/questions 配下の YAML はビルド時に JSON 化して取り込む。ファイルを足すだけで出題に反映される */
const files = import.meta.glob<QuestionFile>('../../data/questions/**/*.{yaml,yml}', {
  eager: true,
  import: 'default',
});

export const bundledQuestions: Question[] = Object.keys(files)
  .sort()
  .flatMap((k) => normalizeQuestionFile(files[k]!));

export const standards: Standard[] = standardsJson as Standard[];
export const standardMap: ReadonlyMap<string, Standard> = new Map(standards.map((s) => [s.id, s]));
export const bundledTopics: Topic[] = topicsYaml as Topic[];
