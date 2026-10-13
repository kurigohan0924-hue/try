import { useState } from 'react';
import { useSettings } from '../../app/usePool';
import { standards } from '../../data/bank';
import { backupFileName, exportBackup } from '../../db/backup';
import { db, updateSettings, type Theme } from '../../db/db';
import { Page } from '../../ui/Page';

const SCOPE_LABEL = { in: '出題範囲', out: '範囲外', unconfirmed: '範囲要確認' } as const;

export function SettingsPage() {
  const s = useSettings();
  const [msg, setMsg] = useState('');
  if (!s) return <Page title="設定">…</Page>;

  const doExport = async () => {
    const data = await exportBackup(db);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    await updateSettings({ lastExportAt: new Date().toISOString() });
    setMsg(`書き出しました（登録問題 ${data.userQuestions.length}問・履歴 ${data.reviewLogs.length}件）`);
  };

  const toggleStd = (id: string) => {
    const set = new Set(s.disabledStandards);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    void updateSettings({ disabledStandards: [...set] });
  };

  return (
    <Page title="設定">
      <section className="card form">
        <h2 className="card-title">学習</h2>
        <label className="label" htmlFor="exam">
          本試験日
        </label>
        <input
          id="exam"
          className="input"
          type="date"
          value={s.examDate}
          onChange={(e) => e.target.value && void updateSettings({ examDate: e.target.value, examDateConfirmed: true })}
        />
        {!s.examDateConfirmed && <p className="small muted">初期値は仮（2027年8月上旬）。日程が発表されたら変更してください。</p>}
        <div className="row2">
          <div>
            <label className="label" htmlFor="goal">
              1日の目標問題数
            </label>
            <input id="goal" className="input" type="number" min={1} max={500} value={s.dailyGoal} onChange={(e) => void updateSettings({ dailyGoal: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
          <div>
            <label className="label" htmlFor="size">
              「今日の◯問」の問題数
            </label>
            <input id="size" className="input" type="number" min={1} max={50} value={s.sessionSize} onChange={(e) => void updateSettings({ sessionSize: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
        </div>
        <label className="label">表示</label>
        <div className="seg">
          {(
            [
              ['system', '端末に合わせる'],
              ['light', 'ライト'],
              ['dark', 'ダーク'],
            ] as [Theme, string][]
          ).map(([t, l]) => (
            <button type="button" key={t} className={`seg-btn ${s.theme === t ? 'active' : ''}`} onClick={() => void updateSettings({ theme: t })}>
              {l}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">出題する基準</h2>
        <p className="small muted">オフにした基準に紐づく問題は出題しません（例：旧リース基準を外す）。版は standards.json の現行版です。</p>
        <ul className="std-list">
          {standards.map((st) => (
            <li key={st.id}>
              <label className="check">
                <input type="checkbox" checked={!s.disabledStandards.includes(st.id)} onChange={() => toggleStd(st.id)} />
                <span>
                  {st.label && <span className="badge badge-accent small">{st.label}</span>} {st.name}
                  <span className="small muted">
                    {' '}
                    {st.number ? `${st.number}・` : ''}版 {st.version}・{SCOPE_LABEL[st.examScope]}
                    {st.unconfirmed.length > 0 && '・要確認あり'}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="card-title">バックアップ</h2>
        <p className="small muted">
          クイック登録した問題・解答履歴・設定を JSON で書き出します。iPhone の Safari では端末データが消えることがあるので、ホーム画面に追加して使い、定期的に書き出してください。
          {s.lastExportAt && ` 前回：${new Date(s.lastExportAt).toLocaleString('ja-JP')}`}
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => void doExport()}>
          JSON を書き出す
        </button>
        <p className="small muted">読み込み（インポート）はフェーズ2で追加します。</p>
        {msg && <p className="small">{msg}</p>}
      </section>
    </Page>
  );
}
