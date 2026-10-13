import { useEffect, useState } from 'react';
import { useSettings, useTopics } from '../../app/usePool';
import { standardMap, standards } from '../../data/bank';
import { db, newId, updateSettings } from '../../db/db';
import { currentVersions } from '../../domain/revisionCheck';
import { SUBJECT_LABEL, type Basis, type Question, type Subject } from '../../domain/types';
import { Page } from '../../ui/Page';
import { TopicPicker, type NewTopicDraft } from './TopicPicker';

type QFormat = 'flashcard' | 'tf' | 'choice';

const EMPTY_CHOICES = ['', '', '', ''];

export function QuickAddPage() {
  const settings = useSettings();
  const topics = useTopics();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewTopicDraft | null>(null);
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState<QFormat>('flashcard');
  const [answerTextValue, setAnswerText] = useState('');
  const [tfAnswer, setTfAnswer] = useState<boolean | null>(null);
  const [choices, setChoices] = useState<string[]>(EMPTY_CHOICES);
  const [choiceAnswer, setChoiceAnswer] = useState<number | null>(null);
  const [torenName, setTorenName] = useState<string | null>(null);
  const [problemNo, setProblemNo] = useState('');
  const [explanation, setExplanation] = useState('');
  const [basisStd, setBasisStd] = useState('');
  const [basisRef, setBasisRef] = useState('');
  const [relatedStds, setRelatedStds] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // 前回の科目・答練名を初期値に（連続登録を速くする）
  const effSubject = subject ?? settings?.lastSubject ?? 'zaihyo';
  const effToren = torenName ?? settings?.lastTorenName ?? '';

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const answerFilled =
    format === 'flashcard'
      ? answerTextValue.trim() !== ''
      : format === 'tf'
        ? tfAnswer !== null
        : choiceAnswer !== null && choices.every((c) => c.trim() !== '');
  const topicFilled = draft ? draft.major.trim() !== '' && draft.middle.trim() !== '' : topicId !== null;
  const canSave = topicFilled && prompt.trim() !== '' && answerFilled && effToren.trim() !== '' && problemNo.trim() !== '';

  const save = async () => {
    setError('');
    if (!canSave) {
      setError('必須項目（論点・問題文・答え・答練名・問題番号）を入力してください');
      return;
    }
    const now = new Date().toISOString();
    let tid = topicId!;
    if (draft) {
      tid = newId('c');
      await db.customTopics.add({
        id: tid,
        major: draft.major.trim(),
        middle: draft.middle.trim(),
        ...(draft.minor.trim() ? { minor: draft.minor.trim() } : {}),
        subjects: [effSubject],
        createdAt: now,
      });
    }
    const basis: Basis[] = basisStd && basisRef.trim() ? [{ standardId: basisStd, ref: basisRef.trim() }] : [];
    const standardIds = [...new Set([...(basisStd ? [basisStd] : []), ...relatedStds])];
    const common = {
      id: newId('u'),
      subject: effSubject,
      topicId: tid,
      prompt: prompt.trim(),
      ...(explanation.trim() ? { explanation: explanation.trim() } : {}),
      basis,
      standardIds,
      basedOn: currentVersions(standardIds, standardMap),
      source: { type: 'toren' as const, detail: `${effToren.trim()} ${problemNo.trim()}` },
      difficulty: 2 as const,
      tags: [],
      status: 'self' as const,
      updatedAt: now,
    };
    const q: Question =
      format === 'flashcard'
        ? { ...common, format, answerText: answerTextValue.trim() }
        : format === 'tf'
          ? { ...common, format, answer: tfAnswer! }
          : { ...common, format, choices: choices.map((c) => c.trim()), answer: choiceAnswer! };
    await db.userQuestions.add(q);
    await updateSettings({
      lastSubject: effSubject,
      lastTorenName: effToren.trim(),
      recentTopicIds: [tid, ...(settings?.recentTopicIds ?? []).filter((x) => x !== tid)].slice(0, 8),
    });
    // 科目・論点・答練名は残し、問題ごとの入力だけ消す
    setTopicId(tid);
    setDraft(null);
    setPrompt('');
    setAnswerText('');
    setTfAnswer(null);
    setChoices(EMPTY_CHOICES);
    setChoiceAnswer(null);
    setProblemNo('');
    setExplanation('');
    setBasisRef('');
    setToast('登録しました');
  };

  return (
    <Page
      title="クイック登録"
      bottom={
        <>
          {error && <p className="text-danger small">{error}</p>}
          <button className="btn btn-primary btn-xl" disabled={!canSave} onClick={() => void save()}>
            登録する
          </button>
        </>
      }
    >
      {toast && <div className="toast">{toast}</div>}
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <div className="seg">
          {(['zaihyo', 'boki'] as Subject[]).map((s) => (
            <button type="button" key={s} className={`seg-btn ${effSubject === s ? 'active' : ''}`} onClick={() => setSubject(s)}>
              {SUBJECT_LABEL[s]}
            </button>
          ))}
        </div>

        <label className="label">論点 *</label>
        <TopicPicker
          topics={topics}
          subject={effSubject}
          recentIds={settings?.recentTopicIds ?? []}
          value={topicId}
          onChange={setTopicId}
          draft={draft}
          onDraftChange={setDraft}
        />

        <label className="label" htmlFor="q-prompt">
          問題文 *
        </label>
        <textarea id="q-prompt" className="input" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例：減損損失の認識の判定に使う金額は？" />

        <div className="seg">
          {(
            [
              ['flashcard', '一問一答'],
              ['tf', '○×'],
              ['choice', '4択'],
            ] as [QFormat, string][]
          ).map(([f, l]) => (
            <button type="button" key={f} className={`seg-btn ${format === f ? 'active' : ''}`} onClick={() => setFormat(f)}>
              {l}
            </button>
          ))}
        </div>

        <label className="label">答え *</label>
        {format === 'flashcard' && (
          <textarea className="input" rows={2} value={answerTextValue} onChange={(e) => setAnswerText(e.target.value)} placeholder="例：割引前将来キャッシュ・フローの総額" />
        )}
        {format === 'tf' && (
          <div className="seg">
            <button type="button" className={`seg-btn big ${tfAnswer === true ? 'active' : ''}`} onClick={() => setTfAnswer(true)}>
              ○ 正しい
            </button>
            <button type="button" className={`seg-btn big ${tfAnswer === false ? 'active' : ''}`} onClick={() => setTfAnswer(false)}>
              × 誤り
            </button>
          </div>
        )}
        {format === 'choice' && (
          <div className="choice-inputs">
            {choices.map((c, i) => (
              <div key={i} className="choice-input">
                <button type="button" className={`radio ${choiceAnswer === i ? 'on' : ''}`} onClick={() => setChoiceAnswer(i)} aria-label={`${i + 1}を正解にする`}>
                  {choiceAnswer === i ? '正' : i + 1}
                </button>
                <input className="input" value={c} onChange={(e) => setChoices(choices.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`選択肢${i + 1}`} />
              </div>
            ))}
            <p className="small muted">左の番号をタップして正解を選ぶ</p>
          </div>
        )}

        <div className="row2">
          <div>
            <label className="label" htmlFor="q-toren">
              答練名 *
            </label>
            <input id="q-toren" className="input" value={effToren} onChange={(e) => setTorenName(e.target.value)} placeholder="TAC 第3回応用答練" />
          </div>
          <div>
            <label className="label" htmlFor="q-no">
              問題番号 *
            </label>
            <input id="q-no" className="input" value={problemNo} onChange={(e) => setProblemNo(e.target.value)} placeholder="第1問 問2" />
          </div>
        </div>

        <details className="details">
          <summary>解説・根拠（任意・あとで追記可）</summary>
          <label className="label" htmlFor="q-exp">
            解説
          </label>
          <textarea id="q-exp" className="input" rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          <label className="label">根拠</label>
          <select className="input" value={basisStd} onChange={(e) => setBasisStd(e.target.value)}>
            <option value="">基準を選ぶ</option>
            {standards.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label ? `【${s.label}】` : ''}
                {s.name}
              </option>
            ))}
          </select>
          <input className="input" value={basisRef} onChange={(e) => setBasisRef(e.target.value)} placeholder="項番号（例：第20項）" />
          <label className="label">関連する基準（改正チェックに使う）</label>
          <div className="chips">
            {standards.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`chip ${relatedStds.includes(s.id) || basisStd === s.id ? 'chip-on' : ''}`}
                onClick={() => setRelatedStds((r) => (r.includes(s.id) ? r.filter((x) => x !== s.id) : [...r, s.id]))}
              >
                {s.label ?? s.name.replace(/に関する会計基準|に係る会計基準/, '')}
              </button>
            ))}
          </div>
        </details>
      </form>
    </Page>
  );
}
