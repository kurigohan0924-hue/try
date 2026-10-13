import type { Question, Standard } from './types';

export function std(id: string, version: string, extra: Partial<Standard> = {}): Standard {
  return { id, name: id, issuer: 'ASBJ', version, majorChanges: [], examScope: 'unconfirmed', unconfirmed: [], ...extra };
}

export function tfq(extra: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    subject: 'zaihyo',
    topicId: 'impairment',
    format: 'tf',
    prompt: 'p',
    answer: true,
    basis: [{ standardId: 'impairment', ref: '二 3.' }],
    standardIds: ['impairment'],
    basedOn: { impairment: '2024-09-13' },
    source: { type: 'original' },
    difficulty: 2,
    tags: [],
    status: 'unverified',
    updatedAt: '2026-10-13',
    ...extra,
  } as Question;
}
