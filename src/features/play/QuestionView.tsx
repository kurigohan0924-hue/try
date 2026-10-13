import { useState } from 'react';
import type { PoolItem } from '../../app/usePool';
import { answerText, SELF_ASSESSMENT_LABEL, type GradeResult, type Response, type SelfAssessment } from '../../domain/grading';
import type { Question } from '../../domain/types';
import { BasisList, EvaluationNotes } from '../../ui/QuestionMeta';
import { StatusEditor } from '../../ui/StatusEditor';

/** 画面下部の解答ボタン（形式ごと） */
export function AnswerArea({ q, onAnswer }: { q: Question; onAnswer: (r: Response) => void }) {
  const [revealed, setRevealed] = useState(false);
  switch (q.format) {
    case 'tf':
      return (
        <div className="row2">
          <button className="btn btn-tf btn-xl" onClick={() => onAnswer({ format: 'tf', value: true })} aria-label="正しい">
            ○
          </button>
          <button className="btn btn-tf btn-xl" onClick={() => onAnswer({ format: 'tf', value: false })} aria-label="誤り">
            ×
          </button>
        </div>
      );
    case 'choice':
      return (
        <div className="choices">
          {q.choices.map((c, i) => (
            <button key={i} className="btn btn-choice" onClick={() => onAnswer({ format: 'choice', value: i })}>
              <span className="choice-no">{i + 1}</span>
              <span>{c}</span>
            </button>
          ))}
        </div>
      );
    case 'flashcard':
      if (!revealed)
        return (
          <button className="btn btn-primary btn-xl" onClick={() => setRevealed(true)}>
            答えを見る
          </button>
        );
      return (
        <div className="flash-reveal">
          <div className="flash-answer">{q.answerText}</div>
          <div className="row3">
            {(['forgot', 'vague', 'remembered'] as SelfAssessment[]).map((v) => (
              <button key={v} className={`btn btn-self btn-self-${v}`} onClick={() => onAnswer({ format: 'flashcard', value: v })}>
                {SELF_ASSESSMENT_LABEL[v]}
              </button>
            ))}
          </div>
        </div>
      );
    default:
      return <p className="muted">この形式はフェーズ4で対応します。</p>;
  }
}

/** 解答後の正誤・解説・根拠 */
export function Feedback({ item, result, response }: { item: PoolItem; result: GradeResult; response: Response }) {
  const { q } = item;
  const isFlash = q.format === 'flashcard';
  return (
    <section className="feedback">
      {isFlash ? (
        <div className={`verdict ${result.correct ? 'ok' : 'ng'}`}>
          {response.format === 'flashcard' ? SELF_ASSESSMENT_LABEL[response.value] : ''}
        </div>
      ) : (
        <div className={`verdict ${result.correct ? 'ok' : 'ng'}`}>{result.correct ? '正解' : '不正解'}</div>
      )}
      {(isFlash || !result.correct || q.format === 'choice') && (
        <div className="answer-box">
          <div className="small muted">正解</div>
          <div className="pre">{answerText(q)}</div>
        </div>
      )}
      {response.format === 'choice' && !result.correct && q.format === 'choice' && (
        <p className="small muted">あなたの解答：{q.choices[response.value]}</p>
      )}
      {q.explanation ? <p className="explanation pre">{q.explanation}</p> : <p className="muted">解説：未記入</p>}
      <h3 className="h3">根拠</h3>
      <BasisList basis={q.basis} />
      <details className="details">
        <summary>この問題の情報・ステータス</summary>
        <EvaluationNotes item={item} />
        <StatusEditor item={item} />
      </details>
    </section>
  );
}
