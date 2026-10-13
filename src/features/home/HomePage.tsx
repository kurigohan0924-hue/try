import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { usePool } from '../../app/usePool';
import { db } from '../../db/db';
import { daysUntil, localDateKey } from '../../domain/session';
import { Page } from '../../ui/Page';

export function HomePage() {
  const nav = useNavigate();
  const pool = usePool();
  const todayKey = localDateKey(new Date());
  const todayCount = useLiveQuery(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return db.reviewLogs.where('at').aboveOrEqual(start.toISOString()).count();
  }, [todayKey]);

  const s = pool?.settings;
  const playable = pool?.items.filter((i) => i.ev.playable).length ?? 0;
  const needsReview = pool?.items.filter((i) => i.ev.status === 'needs_review').length ?? 0;
  const toren = pool?.items.filter((i) => i.q.source.type === 'toren').length ?? 0;
  const days = s ? daysUntil(s.examDate, new Date()) : undefined;
  const goal = s?.dailyGoal ?? 20;
  const done = todayCount ?? 0;

  return (
    <Page
      back={null}
      title="簿財 前提知識"
      right={
        <Link to="/settings" className="header-btn" aria-label="設定">
          ⚙
        </Link>
      }
      bottom={
        <>
          <button className="btn btn-primary btn-xl" disabled={playable === 0} onClick={() => nav(`/play?mode=today`)}>
            今日の{s?.sessionSize ?? 5}問
          </button>
          <div className="row2">
            <Link to="/quick" className="btn btn-secondary">
              ＋ クイック登録
            </Link>
            <Link to="/play?mode=random&n=10" className="btn btn-secondary">
              ランダム10問
            </Link>
          </div>
        </>
      }
    >
      <section className="stat-grid">
        <div className="stat">
          <div className="stat-label">本試験まで{s && !s.examDateConfirmed ? '（仮）' : ''}</div>
          <div className="stat-value">{days === undefined ? '—' : days >= 0 ? `${days}日` : '終了'}</div>
          <div className="stat-sub">{s?.examDate}</div>
        </div>
        <div className="stat">
          <div className="stat-label">今日の解答</div>
          <div className="stat-value">
            {done}
            <span className="stat-unit"> / {goal}問</span>
          </div>
          <div className="progress" aria-hidden>
            <div style={{ width: `${Math.min(100, (done / goal) * 100)}%` }} />
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">科目別</h2>
        <div className="row2">
          <Link to="/play?mode=random&subject=zaihyo" className="btn btn-ghost">
            財表
          </Link>
          <Link to="/play?mode=random&subject=boki" className="btn btn-ghost">
            簿記論
          </Link>
        </div>
      </section>

      <section className="card">
        <Link to="/questions" className="list-link">
          <span>問題一覧</span>
          <span className="muted small">
            出題可能 {playable}問{toren > 0 && ` ／ 答練 ${toren}問`}
          </span>
        </Link>
        {needsReview > 0 && (
          <Link to="/questions?status=needs_review" className="list-link">
            <span className="text-danger">改正により要見直し</span>
            <span className="badge badge-danger">{needsReview}問</span>
          </Link>
        )}
      </section>
      <p className="muted small center">間隔反復・連続学習日数はフェーズ2で追加します</p>
    </Page>
  );
}
