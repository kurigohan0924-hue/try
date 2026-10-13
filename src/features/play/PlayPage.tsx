import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { usePool, useTopics, type PoolItem } from '../../app/usePool';
import { db, newId } from '../../db/db';
import { grade, type GradeResult, type Response } from '../../domain/grading';
import { sample } from '../../domain/session';
import type { Subject } from '../../domain/types';
import { Page } from '../../ui/Page';
import { QuestionBadges } from '../../ui/QuestionMeta';
import { AnswerArea, Feedback } from './QuestionView';

interface Answered {
  item: PoolItem;
  result: GradeResult;
  response: Response;
}

/** 出題対象を決める（フェーズ1：出題可能な問題から無作為。フェーズ2で間隔反復に置き換える） */
function pickSession(items: PoolItem[], mode: string, subject: Subject | null, n: number): PoolItem[] {
  let cands = items.filter((i) => i.ev.playable);
  if (subject) cands = cands.filter((i) => i.q.subject === subject);
  if (mode === 'toren') cands = cands.filter((i) => i.q.source.type === 'toren');
  return sample(cands, n);
}

export function PlayPage() {
  const [params] = useSearchParams();
  const pool = usePool();
  const [round, setRound] = useState(0);
  if (!pool) return <Page title="読み込み中">…</Page>;
  const mode = params.get('mode') ?? 'today';
  const subject = (params.get('subject') as Subject | null) ?? null;
  const n = Number(params.get('n') ?? pool.settings.sessionSize);
  return (
    <Session
      key={`${round}-${params.toString()}`}
      items={pool.items}
      mode={mode}
      subject={subject}
      n={n}
      onRestart={() => setRound((r) => r + 1)}
    />
  );
}

function Session({
  items,
  mode,
  subject,
  n,
  onRestart,
}: {
  items: PoolItem[];
  mode: string;
  subject: Subject | null;
  n: number;
  onRestart: () => void;
}) {
  const nav = useNavigate();
  const topics = useTopics();
  // セッション開始時に一度だけ問題を決める（解答中にプールが更新されても入れ替えない）
  const [queue] = useState(() => pickSession(items, mode, subject, n));
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<Answered[]>([]);
  const [current, setCurrent] = useState<Answered | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  if (queue.length === 0) {
    return (
      <Page title="出題できる問題がありません">
        <p>条件に合う出題可能な問題がありません。問題一覧でステータスや設定（出題する基準）を確認してください。</p>
        <Link to="/questions" className="btn btn-secondary">
          問題一覧へ
        </Link>
      </Page>
    );
  }

  if (index >= queue.length) {
    const correct = answered.filter((a) => a.result.correct).length;
    return (
      <Page
        title="結果"
        back={null}
        bottom={
          <>
            <button className="btn btn-primary btn-xl" onClick={onRestart}>
              もう{queue.length}問
            </button>
            <button className="btn btn-secondary" onClick={() => nav('/')}>
              ホームへ
            </button>
          </>
        }
      >
        <div className="result-score">
          {correct} <span className="muted">/ {answered.length}</span>
        </div>
        <ul className="result-list">
          {answered.map((a) => (
            <li key={a.item.q.id} className={a.result.correct ? 'ok' : 'ng'}>
              <span className="mark">{a.result.correct ? (a.result.rating === 'hard' ? '△' : '○') : '×'}</span>
              <span className="clamp2">{a.item.q.prompt}</span>
            </li>
          ))}
        </ul>
      </Page>
    );
  }

  const item = queue[index]!;

  const onAnswer = async (response: Response) => {
    const result = grade(item.q, response);
    setCurrent({ item, result, response });
    await db.reviewLogs.add({
      id: newId('r'),
      questionId: item.q.id,
      at: new Date().toISOString(),
      correct: result.correct,
      rating: result.rating,
      durationMs: Date.now() - startedAt.current,
      mode,
    });
  };

  const next = () => {
    if (current) setAnswered((a) => [...a, current]);
    setCurrent(null);
    setIndex((i) => i + 1);
  };

  // 最新の評価（ステータス変更の反映）を表示するため、プールから引き直す
  const live = items.find((i) => i.q.id === item.q.id) ?? item;

  return (
    <Page
      title={`${index + 1} / ${queue.length}`}
      back="/"
      bottom={
        current ? (
          <button className="btn btn-primary btn-xl" onClick={next} autoFocus>
            {index + 1 < queue.length ? '次へ' : '結果を見る'}
          </button>
        ) : (
          <AnswerArea key={index} q={item.q} onAnswer={(r) => void onAnswer(r)} />
        )
      }
    >
      <div className="progress thin" aria-hidden>
        <div style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>
      <QuestionBadges item={live} topics={topics} />
      <p className="prompt">{item.q.prompt}</p>
      {current && <Feedback item={live} result={current.result} response={current.response} />}
    </Page>
  );
}
