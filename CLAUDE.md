# CLAUDE.md — 税理士試験 簿記論・財表「前提知識」学習 PWA

要件の原典は `docs/requirements.md`。このファイルには「決まった方針・規約」と「現在地」だけを書き、作業のたびに更新する。

## 現在地
- 計画（`docs/plan.md`）承認済み（2026-10-13）。
- **フェーズ1 実装済み・main にマージ・Pages に配信済み（PR #1）。ユーザーの動作確認待ち**。確認が取れるまでフェーズ2に進まない。
- 次：フェーズ2（FSRS・今日の復習・各モード・PWA/オフライン・インポート）。

## コマンド
- `npm run dev` 開発サーバー / `npm run build` 本番ビルド（validate と型チェック込み）
- `npm run check` = validate + typecheck + lint + test（push 前に必ず通す）
- `npm run validate` 問題データの検証（`scripts/validate-data.ts`）

## 構成
- `data/standards.json` 基準マスタ / `data/topics.yaml` 論点マスタ / `data/questions/<科目>/*.yaml` 基本問題 / `data/schema/*.json` JSON Schema
- `src/domain/` React に依存しない純粋関数（grading・revisionCheck・session・validate・questionFile）。ロジックはここに書いてテストする
- `src/db/` Dexie（IndexedDB）とバックアップ / `src/data/bank.ts` YAML・JSON の取り込み（import.meta.glob）
- `src/app/usePool.ts` 基本問題＋端末の問題に上書き・改正チェックを適用した出題プール
- `src/features/<画面>/` 画面 / `src/ui/` 共通部品と CSS（CSS 変数でライト・ダーク）
- ルーティングは HashRouter（GitHub Pages とオフラインで 404 を避ける）。`base` は `GITHUB_PAGES=true` のとき `/try/`
- `.github/workflows/ci.yml`（全ブランチで check+build）、`deploy.yml`（main への push で Pages に配信）
- 配信 URL：https://kurigohan0924-hue.github.io/try/ 。既定ブランチは main。フェーズごとに作業ブランチから main へ PR を出してマージする（github-pages 環境は main からのみ配信可）

## 規約
- 問題の書き方は `docs/writing-guide.md`。基本問題は basis（根拠）・standardIds・basedOn 必須。答練（toren）はリポジトリに入れない
- standards.json の `version` は基準そのものの最終改正日。他基準の公表に伴う修正は majorChanges に記録し、問題に影響するときだけ version を上げる
- 根拠は原文（ASBJ・金融庁サイト）で照合してから書く。照合できない項番号は `unconfirmed: true`（企業会計原則は原文の公的な掲載先が見つからず、現状すべて unconfirmed）
- 基準原文の PDF はリポジトリに置かず、作業時に scratchpad へ取得する（`.gitignore` で `*.pdf`・`reference/` を除外）
- 端末の問題 ID は `u-<uuid>`、追加論点は `c-<uuid>`、履歴は `r-<uuid>`

## 作業ルール（ユーザー指定）
- いきなり実装しない。計画の承認後にフェーズ単位で進め、各フェーズ終了時に動作確認方法を示して止まる。
- 開発ブランチ：`claude/vigilant-hamilton-jbc6ov`。PR はユーザーが求めたときだけ作る。
- 採点・間隔反復・改正チェックのロジックはユニットテスト必須。
- UI 文言は日本語。主要ボタンは画面下半分、大きなタップ領域、ダークモード対応。

## 正確性・著作権（厳守）
- Claude が生成した問題は必ず検証ステータス「未検証」で登録する。「検証済み」にするのはユーザーだけ。
- 根拠（基準名・項番号）を示せない問題は作らない。
- TAC 教材・答練・過去問の文章を長く写さない。論点を抽出して自分の言葉で問題化する（基準・企業会計原則の文言の穴埋めは可）。
- standards.json の内容は下書き扱い。不確かな箇所は「要確認」と明記し、確定はユーザーが行う。
- 過去問の論点は ✅/⚠️/❌ に分類した一覧をユーザーが承認してから問題化する。出題範囲上の扱いは必ずユーザーに確認する。

## 決定事項
- 受験：2027年（令和9年）8月の本試験を想定。試験日の初期値は仮置きで、設定から変更できる。
- リース：新基準（第34号）と旧基準（第13号）の**両方**を学習対象にする。別の基準 ID として登録し、問題ごとに紐づけてバッジで区別する。新旧の比較問題も作る。
- 配信：GitHub Pages（リポジトリは公開、Pages は GitHub Actions 配信。2026-10-13 に設定・初回配信済み）。
- 公開リポジトリなので、ASBJ 原文・過去問 PDF・TAC 教材・エクスポート JSON はコミットしない。
- 端末：iPhone を想定し、ホーム画面への追加を案内し、バックアップを促す。
- PC 編集はエクスポート → PC でインポート・編集 → エクスポート → スマホでインポート（ID と updatedAt で統合、履歴は消さない）。
- 論点マスタは Claude が下書きする（TAC の章立てに寄せる）。クイック登録は大・中が必須、小は任意。新しい論点はその場で追加できる。
- 改正チェック：問題ごとに basedOn（基準 ID → 版）を持たせる。standards.json の version の方が新しければ、検証済みも含めて要見直しにし、出題から外す。保存値は書き換えず、純粋関数で都度判定する。関連基準が空の問題は自動判定の対象外として表示する。
- 間隔反復：ts-fsrs を使う。自動採点は正解=Good、不正解=Again。フラッシュカードは覚えた/あいまい/忘れた = Good/Hard/Again。
- 基準原文と過去問は公式サイトから取得する（ネットワークで許可されるまでは不可。許可前に書いた根拠には「項番号要確認」と記す）。
