import Dexie, { type EntityTable } from 'dexie';
import type { Rating } from '../domain/grading';
import type { QuestionOverride } from '../domain/revisionCheck';
import type { Question, Topic } from '../domain/types';

/** 解答 1 回分の履歴 */
export interface ReviewLog {
  id: string;
  questionId: string;
  /** ISO 日時 */
  at: string;
  correct: boolean;
  rating: Rating;
  durationMs: number;
  mode: string;
}

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  key: 'app';
  examDate: string;
  /** false の間は「（仮）」と表示 */
  examDateConfirmed: boolean;
  dailyGoal: number;
  sessionSize: number;
  theme: Theme;
  /** 出題しない基準 ID */
  disabledStandards: string[];
  /** クイック登録の入力補助 */
  lastTorenName: string;
  recentTopicIds: string[];
  lastSubject: 'boki' | 'zaihyo';
  lastExportAt?: string;
}

export interface CustomTopic extends Topic {
  createdAt: string;
}

export const DEFAULT_SETTINGS: Settings = {
  key: 'app',
  examDate: '2027-08-03',
  examDateConfirmed: false,
  dailyGoal: 20,
  sessionSize: 5,
  theme: 'system',
  disabledStandards: [],
  lastTorenName: '',
  recentTopicIds: [],
  lastSubject: 'zaihyo',
};

export class AppDB extends Dexie {
  userQuestions!: EntityTable<Question, 'id'>;
  overrides!: EntityTable<QuestionOverride, 'questionId'>;
  customTopics!: EntityTable<CustomTopic, 'id'>;
  reviewLogs!: EntityTable<ReviewLog, 'id'>;
  settings!: EntityTable<Settings, 'key'>;

  constructor(name = 'zeirishi-zenteichishiki') {
    super(name);
    this.version(1).stores({
      userQuestions: 'id, subject, topicId, updatedAt',
      overrides: 'questionId',
      customTopics: 'id',
      reviewLogs: 'id, questionId, at',
      settings: 'key',
    });
  }
}

export const db = new AppDB();

export async function getSettings(d: AppDB = db): Promise<Settings> {
  const s = await d.settings.get('app');
  return { ...DEFAULT_SETTINGS, ...s };
}

export async function updateSettings(patch: Partial<Omit<Settings, 'key'>>, d: AppDB = db): Promise<void> {
  const cur = await getSettings(d);
  await d.settings.put({ ...cur, ...patch, key: 'app' });
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
