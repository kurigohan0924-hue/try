import { standardMap } from '../data/bank';
import type { PoolItem } from '../app/usePool';
import { REASON_LABEL } from '../domain/revisionCheck';
import { FORMAT_LABEL, SOURCE_LABEL, SUBJECT_LABEL, topicLabel, type Basis, type Status, type Topic } from '../domain/types';
import { STATUS_LABEL } from '../domain/types';

const STATUS_CLASS: Record<Status, string> = {
  unverified: 'badge-warn',
  verified: 'badge-ok',
  self: 'badge-info',
  needs_review: 'badge-danger',
  excluded: 'badge-muted',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

/** 科目・形式・ステータス・基準ラベル（新/旧リース等）のバッジ列 */
export function QuestionBadges({ item, topics }: { item: PoolItem; topics?: Topic[] }) {
  const { q, ev } = item;
  const topic = topics?.find((t) => t.id === q.topicId);
  const labels = q.standardIds.map((id) => standardMap.get(id)?.label).filter(Boolean) as string[];
  return (
    <div className="badges">
      <span className="badge">{SUBJECT_LABEL[q.subject]}</span>
      <span className="badge">{FORMAT_LABEL[q.format]}</span>
      <StatusBadge status={ev.status} />
      {labels.map((l) => (
        <span key={l} className="badge badge-accent">
          {l}
        </span>
      ))}
      {q.source.type === 'toren' && <span className="badge badge-info">答練</span>}
      {topic && <span className="badge-text">{topicLabel(topic)}</span>}
    </div>
  );
}

export function BasisList({ basis }: { basis: Basis[] }) {
  if (basis.length === 0) return <p className="muted">根拠：未記入</p>;
  return (
    <ul className="basis-list">
      {basis.map((b, i) => {
        const s = standardMap.get(b.standardId);
        return (
          <li key={i}>
            {s ? `${s.number ? s.number + '「' : '「'}${s.name}」` : b.standardId} {b.ref}
            {b.unconfirmed && <span className="badge badge-warn small">項番号要確認</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** 出題できない理由・改正された基準などの補足 */
export function EvaluationNotes({ item }: { item: PoolItem }) {
  const { ev, q } = item;
  return (
    <>
      {ev.revisedStandards.length > 0 && (
        <p className="note-danger">
          作成後に改正された基準：
          {ev.revisedStandards.map((id) => `${standardMap.get(id)?.name ?? id}（現行 ${standardMap.get(id)?.version}）`).join('、')}
        </p>
      )}
      {ev.unlinked && <p className="muted">関連基準が未設定のため、改正チェックの対象外です。</p>}
      {!ev.playable && ev.reasons.length > 0 && (
        <p className="muted">出題しない理由：{ev.reasons.map((r) => REASON_LABEL[r]).join('、')}</p>
      )}
      <p className="muted small">
        出典：{SOURCE_LABEL[q.source.type]}
        {q.source.detail ? `（${q.source.detail}）` : ''} ／ 更新 {q.updatedAt.slice(0, 10)}
      </p>
    </>
  );
}
