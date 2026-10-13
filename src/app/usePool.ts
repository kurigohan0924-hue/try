import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { bundledQuestions, bundledTopics, standardMap } from '../data/bank';
import { db, DEFAULT_SETTINGS, type Settings } from '../db/db';
import { evaluateQuestion, type Evaluation, type QuestionOverride } from '../domain/revisionCheck';
import type { Question, Topic } from '../domain/types';

export interface PoolItem {
  q: Question;
  ev: Evaluation;
  /** リポジトリの基本問題か（false=端末で登録した問題） */
  bundled: boolean;
  override?: QuestionOverride;
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...(await db.settings.get('app')) }), []);
}

export function useTopics(): Topic[] {
  const custom = useLiveQuery(() => db.customTopics.toArray(), []);
  return useMemo(() => [...bundledTopics, ...(custom ?? [])], [custom]);
}

/** 基本問題＋端末の問題に、上書きと改正チェックを適用した出題プール */
export function usePool(): { items: PoolItem[]; settings: Settings } | undefined {
  const data = useLiveQuery(async () => {
    const [userQuestions, overrides, s] = await Promise.all([
      db.userQuestions.toArray(),
      db.overrides.toArray(),
      db.settings.get('app'),
    ]);
    return { userQuestions, overrides, settings: { ...DEFAULT_SETTINGS, ...s } };
  }, []);

  return useMemo(() => {
    if (!data) return undefined;
    const ovMap = new Map(data.overrides.map((o) => [o.questionId, o]));
    const disabled = new Set(data.settings.disabledStandards);
    const make = (q: Question, bundled: boolean): PoolItem => {
      const override = bundled ? ovMap.get(q.id) : undefined;
      return { q, bundled, override, ev: evaluateQuestion(q, standardMap, { override, disabledStandards: disabled }) };
    };
    const items = [
      ...bundledQuestions.map((q) => make(q, true)),
      ...data.userQuestions
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((q) => make(q, false)),
    ];
    return { items, settings: data.settings };
  }, [data]);
}
