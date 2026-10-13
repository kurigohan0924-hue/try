import type { PoolItem } from '../app/usePool';
import { standardMap } from '../data/bank';
import { db } from '../db/db';
import { markReviewed } from '../domain/revisionCheck';
import { STATUS_LABEL, type Status } from '../domain/types';

type Selectable = Exclude<Status, 'needs_review'>;
const OPTIONS: Selectable[] = ['unverified', 'verified', 'self', 'excluded'];

/**
 * 検証ステータスの変更。基本問題は端末の上書き（overrides）に、端末の問題は本体に保存する。
 * 要見直しの問題は「見直し完了」で basedOn を現行版にそろえる。
 */
export async function setStatus(item: PoolItem, status: Selectable): Promise<void> {
  const now = new Date().toISOString();
  const reviewed = item.ev.status === 'needs_review' ? markReviewed(item.q, standardMap, status, now) : undefined;
  if (item.bundled) {
    await db.overrides.put({
      ...item.override,
      questionId: item.q.id,
      status,
      basedOn: reviewed?.basedOn ?? item.override?.basedOn,
      updatedAt: now,
    });
  } else {
    await db.userQuestions.update(item.q.id, {
      status,
      updatedAt: now,
      ...(reviewed ? { basedOn: reviewed.basedOn } : {}),
    });
  }
}

export function StatusEditor({ item }: { item: PoolItem }) {
  const needsReview = item.ev.status === 'needs_review';
  return (
    <div className="status-editor">
      <span className="small muted">{needsReview ? '見直し完了にして、ステータスを選ぶ：' : '検証ステータスを変更：'}</span>
      <div className="seg">
        {OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`seg-btn ${!needsReview && item.ev.status === s ? 'active' : ''}`}
            onClick={() => void setStatus(item, s)}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
