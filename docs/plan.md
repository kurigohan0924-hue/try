# 実装計画（ステップ2・承認待ち）

## 1. 技術構成

| 用途 | 採用 | 理由 |
|---|---|---|
| UI | React 19 + TypeScript + Vite | 要件どおり |
| 画面遷移 | React Router（HashRouter） | GitHub Pages でもオフラインでも、どの画面を再読み込みしても 404 にならない |
| 端末保存 | Dexie 4（IndexedDB）+ dexie-react-hooks | 要件どおり。保存内容がそのまま画面に反映される |
| 間隔反復 | ts-fsrs（FSRS） | FSRS の実装として定番。自前実装より誤りが少ない |
| PWA | vite-plugin-pwa（Workbox） | 全ファイルを先にキャッシュして機内モードでも動かす。更新時は「新しい版があります」と表示 |
| 問題ファイル | YAML（手書き用）→ ビルド時に JSON へ変換 | 日本語の複数行・コメントが書きやすい。実行時に YAML パーサを読み込まない。エクスポートは同じスキーマの JSON |
| スキーマ検証 | JSON Schema + Ajv | 検証スクリプト・CI・インポート時に同じ定義を使う |
| テスト | Vitest + fake-indexeddb | 採点・FSRS・改正チェック・インポートの統合をユニットテストする |
| CSS | 素の CSS + CSS 変数 | 軽い。`prefers-color-scheme` でダークモード、設定で手動切替も可 |
| 配信 | GitHub Pages（GitHub Actions で自動デプロイ） | リポジトリが公開になったので無料で使える。Cloudflare 案より手順が少ない |

## 2. データ設計

### 2.1 問題（Question）
```ts
type Subject = 'boki' | 'zaihyo';                      // 簿記論 / 財表
type Format  = 'tf' | 'choice' | 'flashcard' | 'cloze' | 'multi' | 'order';
type Status  = 'unverified' | 'verified' | 'self' | 'needs_review' | 'excluded';
type SourceType = 'past_exam' | 'tac' | 'toren' | 'original';

interface Question {
  id: string;                 // 例 "zaihyo-impairment-003"、クイック登録は "u-<ULID>"
  subject: Subject;
  topicId: string;            // 論点マスタ（大・中・小）を参照。表記ゆれ防止
  format: Format;
  prompt: string;
  // 形式ごとの正解（判別共用体）
  //   tf: answer: boolean / choice: choices[] + answer: number
  //   multi: choices[] + answer: number[] / order: items[]（正しい順）
  //   cloze: text 内の {{1}} 等 + blanks[{options[], answer}] / flashcard: answerText
  explanation?: string;
  basis: { standardId: string; ref: string }[];   // ref 例 "第20項"、"一般原則一"
  standardIds: string[];                          // 関連基準（複数可）
  basedOn: Record<string, string>;                // 作成・確認したときの各基準の版（standards.json の version）
  source: { type: SourceType; detail?: string };  // detail 例 "TAC 第3回応用答練 問2"
  difficulty: 1 | 2 | 3;
  tags: string[];
  status: Status;             // 保存されている値
  updatedAt: string;          // ISO 日時
}
```

### 2.2 基準マスタ（`data/standards.json`）
```ts
interface Standard {
  id: string;                 // 例 "lease-2024"（第34号）、"lease-2007"（第13号）
  name: string; number?: string; issuer: 'ASBJ' | '企業会計審議会' | ...;
  version: string;            // 現行版の公表・最終改正日。改正したらここを更新する
  effectiveFrom?: string; earlyAdoption?: string;
  majorChanges: string[];
  examScope: 'in' | 'out' | 'unconfirmed';
  supersedes?: string; supersededBy?: string;
  label?: string;             // 画面のバッジ表示 例 "新リース基準" / "旧リース基準"
  unconfirmed: string[];      // 「要確認」の項目名
}
```
- リースは**新旧両方を別の基準として登録**し、問題ごとにどちらの基準かを紐づける。出題画面には「新リース基準」「旧リース基準」のバッジを出し、新旧の違いを問う比較問題も作る。設定画面で「出題する基準」を個別にオン・オフできる（例：旧リースを外す）。

### 2.3 改正チェック（実際に使う検証ステータスを都度計算する純粋関数・ユニットテスト対象）
1. 除外（excluded）に設定されていれば → 除外
2. 関連基準のどれかで `basedOn[基準ID] < standards[基準ID].version` → **改正により要見直し**（検証済みも含む）
3. 関連基準のどれかが範囲外（examScope=out）、または設定で出題オフ → 出題しない（「範囲外」と表示）
4. それ以外は保存されている値。関連基準が空の問題は「改正チェック対象外」と表示する

保存値を書き換えずに毎回計算するので、**standards.json の version を上げるだけで**、基本問題もクイック登録分もまとめて要見直しになる。「見直し完了」を押すと basedOn を現行版に更新し、ステータスを選び直す。

### 2.4 端末保存（IndexedDB）
| テーブル | 内容 |
|---|---|
| userQuestions | クイック登録・自作の問題（Question と同じ形） |
| overrides | 基本問題への上書き（ステータス、basedOn、メモ）。アプリ上で「検証済み」にした結果など |
| customTopics | クイック登録中に追加した論点 |
| cards | FSRS の状態（問題 ID ごと） |
| reviewLogs | 解答履歴（日時、正誤、評価、所要時間、モード） |
| settings | 試験日、1日の目標、テーマ、1回の問題数、出題する基準 |

エクスポートは上の全テーブルを含む1つの JSON（`schemaVersion` 付き）。インポートは ID ごとに統合し、`updatedAt` が新しい方を採用する。解答履歴は和集合とし、消さない。

### 2.5 リポジトリ構成
```
data/standards.json
data/topics.yaml                 論点マスタ（大・中・小）
data/questions/zaihyo/*.yaml     論点ごとにファイルを分ける
data/questions/boki/*.yaml
docs/requirements.md / plan.md / writing-guide.md（問題の書き方）
scripts/validate-data.ts         スキーマ・参照整合（topicId・基準 ID・根拠の有無）を検証
src/domain/                      grading / fsrs / revisionCheck / importMerge（React に依存しない純粋関数）
src/db/  src/features/<画面>/  src/ui/
```

## 3. 画面一覧
| # | 画面 | 要点 |
|---|---|---|
| 1 | ホーム | 試験までの残り日数・今日の進捗・連続学習日数。画面下半分に大ボタン「今日の5問」（1タップで出題開始）と「＋クイック登録」。その下にモードの一覧 |
| 2 | 出題 | 形式ごとの解答 UI。解答後に正誤・解説・根拠・ステータスと基準のバッジを表示。「次へ」は画面最下部 |
| 3 | セッション結果 | 正答数、間違えた問題、「もう5問」「ホーム」 |
| 4 | モード・論点選択 | 間違えた問題／答練の間違い／科目・論点別／ランダム |
| 5 | クイック登録 | 科目は2択のトグル。論点は最近使ったもの＋インクリメンタル検索（新規追加も可）。問題文・答え・答練名（前回の値を自動入力）・問題番号。形式・解説・根拠・関連基準は「詳細」に折りたたむ。保存後は同じ画面に残り、続けて登録できる |
| 6 | 問題一覧・編集 | PC 向け。絞り込み（出典・ステータス・根拠未記入・要見直し）と一括のステータス変更。解説・根拠の追記 |
| 7 | 成績 | 論点ごとの正答率・最終学習日・問題数 |
| 8 | 基準マスタ・要見直し | 基準ごとの版・出題範囲・「要確認」の項目、影響を受ける問題の一覧 |
| 9 | 設定・バックアップ | 試験日、目標問題数、1回の問題数、テーマ、出題する基準、エクスポート／インポート、iPhone 向けのホーム画面追加の案内 |

## 4. 開発フェーズ（要件からの変更点は ★）
- **フェーズ1**：雛形、CI（型チェック・lint・テスト・データ検証）、問題スキーマ、standards.json の下書き、論点マスタの下書き、○×・4択・フラッシュカード、1セッションの流れ（ランダム5問）、クイック登録、端末保存、改正チェック関数とテスト、初期問題（各科目約20問・すべて未検証）、★簡易 JSON エクスポート（バックアップ用）、★GitHub Pages への自動デプロイ（フェーズ1からスマホで確認できるように）
- **フェーズ2**：FSRS、今日の復習、間違えた問題／答練の間違い／論点別モード、PWA・オフライン化、連続学習日数・目標・残り日数、★インポート（統合あり）
- **フェーズ3**：過去問 PDF → 論点抽出 → 改正チェック → ✅⚠️❌ の分類一覧（`docs/past_exams/*.md`）→ 承認 → 問題生成
- **フェーズ4**：穴埋め・複数選択・並べ替え、成績画面、一括編集画面、基準マスタ画面

★ インポートをフェーズ4から2へ前倒しする理由：iPhone では端末データが消えることがあり、PC で編集した内容をスマホに戻す運用（Q4 の推奨案）にも、インポートが早い段階から必要になるため。

## 5. 著作権と公開リポジトリの扱い
- リポジトリが公開になったので、**ASBJ の基準原文 PDF・過去問 PDF・TAC 教材・エクスポートした JSON はコミットしない**（`.gitignore` で除外）。原文は作業のたびに公式サイトから取得し、セッション内の一時領域だけで読む。
- 問題文は自分の言葉で書く。基準の文言を使うのは穴埋めの短い部分だけ。
- クイック登録した問題（答練の内容）は端末の IndexedDB にだけ保存され、リポジトリにも公開サイトにも載らない。

## 6. 外部アクセス（現在ブロック中）
この実行環境のネットワーク設定で、次のホストが拒否されている。
- `www.asb-j.jp`（ASBJ：基準原文・概念フレームワーク）
- `www.nta.go.jp`（国税庁：過去問・出題範囲）
- 必要に応じて `www.fsa.go.jp`（金融庁：企業会計原則など）

許可されるまでは、項番号を記憶に頼って書くことになる。その場合は根拠に「項番号要確認」の印を付けて登録する。
