# 問題データの書き方ガイド

問題は `data/questions/<科目>/<まとまり>.yaml` に書く。ファイルを追加・編集して push するだけで、次の配信から出題に反映される。
書いたら必ず `npm run validate` を実行する（CI でも同じチェックが走る）。

## ファイルの形

```yaml
# ファイル共通の値は defaults に書く（各問題の指定が優先）
defaults:
  subject: zaihyo            # zaihyo（財表）/ boki（簿記論）
  status: unverified         # Claude が作った問題は必ず unverified
  source: { type: original } # past_exam / tac / original（toren はリポジトリに入れない）
  difficulty: 2              # 1〜3
  updatedAt: "2026-10-13"
questions:
  - id: z-imp-002            # 英小文字・数字・ハイフン。一度決めたら変えない（履歴がひも付く）
    topicId: impairment      # data/topics.yaml の id
    format: tf               # tf / choice / flashcard（cloze / multi / order はフェーズ4）
    prompt: 問題文
    answer: false
    explanation: 解説（なぜその処理をするのかまで書く）
    basis:                   # 根拠。必須（示せない問題は作らない）
      - { standardId: impairment, ref: 注解 注1 1. }
    standardIds: [impairment]               # 改正チェックの対象。basis の基準は必ず含める
    basedOn: { impairment: "2024-09-13" }   # 作成時点の standards.json の version
```

### 形式ごとの項目

| format | 必須項目 | 例 |
|---|---|---|
| `tf`（○×） | `answer: true/false` | |
| `choice`（4択） | `choices: [..4つ..]`, `answer: 0始まりの番号` | |
| `flashcard`（一問一答） | `answerText` | 改行は `|-` を使う |
| `multi`（複数選択） | `choices`, `answer: [番号, ...]` | フェーズ4 |
| `order`（並べ替え） | `items: [正しい順]` | フェーズ4 |
| `cloze`（穴埋め） | `text`（`{{1}}` で穴）, `blanks: [{options, answer}]` | フェーズ4 |

## 根拠（basis）のルール

- `ref` は原文の表記どおりに書く：ASBJ 基準は「第20項」「BC39項」、企業会計審議会の基準は「二 3.」「注解 注1 1.」「第二 二 2.」など。
- 原文と照合していない項番号には `unconfirmed: true` を付ける（画面に「項番号要確認」と出る）。
- 解説で理由（結論の背景・意見書）を書くときは、出典が分かるように「（第34項）」「（設定に関する意見書）」と添える。

## 改正チェック（basedOn）

- `basedOn` には、問題を作った（見直した）ときの `standards.json` の `version` を書く。
- 基準が改正されたら `data/standards.json` の `version` を新しい日付にする。それだけで、`basedOn` が古い問題（クイック登録分も含む）は「改正により要見直し」になり出題から外れる。
- 見直した問題は、内容を直したうえで `basedOn` を新しい版に更新する（アプリ上では「見直し完了」ボタン）。
- `version` は基準そのものの「最終改正日」とする。他の基準の公表に伴う軽微な「修正」は `majorChanges` に記録し、問題に影響する場合だけ `version` を上げる。

## 著作権・正確性

- TAC 教材・答練・過去問の文章を長く写さない。論点を抽出して自分の言葉で書く。
- 会計基準・企業会計原則の文言を穴埋めに使うのは可。
- 答練の問題（`source.type: toren`）はリポジトリに入れない。端末のクイック登録だけで管理する。
- `status: verified` にするのは、TAC テキストと照合したユーザーだけ。
