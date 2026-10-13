import { useMemo, useState } from 'react';
import { topicLabel, type Subject, type Topic } from '../../domain/types';

export interface NewTopicDraft {
  major: string;
  middle: string;
  minor: string;
}

/**
 * 論点の選択。最近使った論点を先頭に出し、入力で絞り込む（表記ゆれ防止）。
 * 候補にないときだけ新しい論点（大・中必須、小任意）を追加できる。
 */
export function TopicPicker({
  topics,
  subject,
  recentIds,
  value,
  onChange,
  draft,
  onDraftChange,
}: {
  topics: Topic[];
  subject: Subject;
  recentIds: string[];
  value: string | null;
  onChange: (id: string | null) => void;
  draft: NewTopicDraft | null;
  onDraftChange: (d: NewTopicDraft | null) => void;
}) {
  const [query, setQuery] = useState('');
  const forSubject = useMemo(() => topics.filter((t) => !t.subjects || t.subjects.includes(subject)), [topics, subject]);
  const selected = topics.find((t) => t.id === value);

  const candidates = useMemo(() => {
    const q = query.trim();
    const words = q.split(/\s+/).filter(Boolean);
    const hit = (t: Topic) => words.every((w) => topicLabel(t).includes(w));
    const recent = recentIds.map((id) => forSubject.find((t) => t.id === id)).filter((t): t is Topic => !!t);
    const ordered = [...recent, ...forSubject.filter((t) => !recentIds.includes(t.id))];
    return (q ? ordered.filter(hit) : ordered).slice(0, q ? 12 : 6);
  }, [query, forSubject, recentIds]);

  const majors = useMemo(() => [...new Set(topics.map((t) => t.major))], [topics]);
  const draftMajor = draft?.major ?? '';
  const middles = useMemo(
    () => [...new Set(topics.filter((t) => !draftMajor || t.major === draftMajor).map((t) => t.middle))],
    [topics, draftMajor],
  );

  if (selected && !draft) {
    return (
      <div className="picked">
        <span>{topicLabel(selected)}</span>
        <button type="button" className="link-btn" onClick={() => onChange(null)}>
          変更
        </button>
      </div>
    );
  }

  if (draft) {
    return (
      <div className="new-topic">
        <datalist id="majors">{majors.map((m) => <option key={m} value={m} />)}</datalist>
        <datalist id="middles">{middles.map((m) => <option key={m} value={m} />)}</datalist>
        <input className="input" list="majors" placeholder="大（例：資産会計）" value={draft.major} onChange={(e) => onDraftChange({ ...draft, major: e.target.value })} />
        <input className="input" list="middles" placeholder="中（例：固定資産の減損）" value={draft.middle} onChange={(e) => onDraftChange({ ...draft, middle: e.target.value })} />
        <input className="input" placeholder="小（任意）" value={draft.minor} onChange={(e) => onDraftChange({ ...draft, minor: e.target.value })} />
        <button type="button" className="link-btn" onClick={() => onDraftChange(null)}>
          既存の論点から選ぶ
        </button>
      </div>
    );
  }

  return (
    <div>
      <input className="input" type="search" placeholder="論点を検索（例：減損）" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="chips">
        {candidates.map((t) => (
          <button
            type="button"
            key={t.id}
            className="chip"
            onClick={() => {
              onChange(t.id);
              setQuery('');
            }}
          >
            {t.minor ? `${t.middle}›${t.minor}` : t.middle}
          </button>
        ))}
        <button type="button" className="chip chip-add" onClick={() => onDraftChange({ major: '', middle: query.trim(), minor: '' })}>
          ＋新しい論点
        </button>
      </div>
    </div>
  );
}
