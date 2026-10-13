import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePool, useTopics, type PoolItem } from '../../app/usePool';
import { db } from '../../db/db';
import { answerText } from '../../domain/grading';
import { SOURCE_LABEL, STATUS_LABEL, SUBJECT_LABEL, type SourceType, type Status, type Subject } from '../../domain/types';
import { Page } from '../../ui/Page';
import { BasisList, EvaluationNotes, QuestionBadges } from '../../ui/QuestionMeta';
import { StatusEditor } from '../../ui/StatusEditor';

/** 問題一覧（フェーズ1：閲覧・ステータス変更・削除。一括編集はフェーズ4） */
export function QuestionListPage() {
  const pool = usePool();
  const topics = useTopics();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState('');
  const status = (params.get('status') ?? '') as Status | '';
  const source = (params.get('source') ?? '') as SourceType | '';
  const subject = (params.get('subject') ?? '') as Subject | '';
  const noBasis = params.get('noBasis') === '1';

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  const items = useMemo(() => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return (pool?.items ?? []).filter(
      (i) =>
        (!status || i.ev.status === status) &&
        (!source || i.q.source.type === source) &&
        (!subject || i.q.subject === subject) &&
        (!noBasis || i.q.basis.length === 0) &&
        words.every((w) => i.q.prompt.includes(w) || (i.q.explanation ?? '').includes(w)),
    );
  }, [pool, status, source, subject, noBasis, text]);

  return (
    <Page title={`問題一覧（${items.length}）`}>
      <div className="filters">
        <input className="input" type="search" placeholder="問題文・解説を検索" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="filter-row">
          <select className="input" value={subject} onChange={(e) => set('subject', e.target.value)} aria-label="科目">
            <option value="">全科目</option>
            {Object.entries(SUBJECT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select className="input" value={source} onChange={(e) => set('source', e.target.value)} aria-label="出典区分">
            <option value="">全出典</option>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select className="input" value={status} onChange={(e) => set('status', e.target.value)} aria-label="ステータス">
            <option value="">全ステータス</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={noBasis} onChange={(e) => set('noBasis', e.target.checked ? '1' : '')} /> 根拠未記入のみ
        </label>
      </div>
      <ul className="q-list">
        {items.map((item) => (
          <li key={item.q.id} className="q-item">
            <button type="button" className="q-head" onClick={() => setOpen(open === item.q.id ? null : item.q.id)}>
              <QuestionBadges item={item} topics={topics} />
              <span className="clamp2">{item.q.prompt}</span>
            </button>
            {open === item.q.id && <Detail item={item} />}
          </li>
        ))}
      </ul>
    </Page>
  );
}

function Detail({ item }: { item: PoolItem }) {
  const { q } = item;
  return (
    <div className="q-detail">
      {(q.format === 'choice' || q.format === 'multi') && (
        <ol className="small">
          {q.choices.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>
      )}
      <div className="answer-box">
        <div className="small muted">正解</div>
        <div className="pre">{answerText(q)}</div>
      </div>
      {q.explanation ? <p className="pre small">{q.explanation}</p> : <p className="muted small">解説：未記入</p>}
      <BasisList basis={q.basis} />
      <EvaluationNotes item={item} />
      <StatusEditor item={item} />
      <p className="small muted">ID：{q.id}</p>
      {!item.bundled && (
        <button
          type="button"
          className="btn btn-danger-ghost"
          onClick={() => {
            if (confirm('この問題を削除しますか？（解答履歴は残ります）')) void db.userQuestions.delete(q.id);
          }}
        >
          この問題を削除
        </button>
      )}
    </div>
  );
}
