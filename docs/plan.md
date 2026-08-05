# 家計簿アプリ 実装計画

## 1. 目的

月次で収支を確認しながら、日々の家計簿をクイックに登録できるアプリを作る。
`../ui-z-cloud/src/features/payments`（このリポジトリからの相対パス。資産ダッシュボード）の
見た目・情報設計を一部参考にする。
一方でデータの持ち方は異なる: 手入力を主としつつ、既存銀行/カードの CSV・PDF もインポートでき、
重複を防ぎながら同じデータベースに取り込む。すべてのデータ（取引・ジャンル・ユーザー）は
DB で一元管理し、ファイル（JSON/CSV）を正データとしては持たない。ユーザーごとにサインアップし、
自分のデータのみを見られるマルチユーザー対応にする。

資産（残高・純資産推移）の管理機能は本計画のスコープには含めず、将来の拡張として
`docs/todo.md` に別途記載する。

## 2. 機能要件

- **月毎の収支の確認**
  - 月セレクターで対象月を切り替える。
  - 当月の収入・支出・差額のサマリー、ジャンル別支出の内訳、取引一覧（タイムライン）を表示する。
- **家計簿をクイックに登録**
  - 日付・金額・種別（収入/支出）・ジャンル・メモを最小の手数で入力できるフォームを用意する。
  - ジャンルはユーザーが追加・編集・削除・並び替えできる。初回セットアップ時に基本的なジャンル
    （食費・日用品・交通費・住居費・通信費・娯楽・医療・給与・その他 等）をデフォルトで投入する。
- **家計簿を確認**
  - 登録済み取引を月単位で一覧表示し、ジャンル/種別で絞り込める。
- **CSV/PDF インポート**
  - 銀行明細（CSV）・カード明細（CSV/PDF）をアップロードし、取引として取り込む。
  - 同じ取引を複数回インポートしても重複登録されないようにする。
  - インポート結果（新規取り込み件数・重複スキップ件数）を確認できる。
- **マルチユーザー**
  - サインアップ/ログインし、各ユーザーは自分が登録・インポートしたデータのみ閲覧・編集できる。

## 3. 参考にする既存実装（`../ui-z-cloud/src/features/payments`）

流用する情報設計・視覚言語:

- `PeriodSelectorB` … 年タブ + 月タブ + 選択中期間ラベルの月セレクター。
- `CategoriesCard` … カテゴリ別ドット・金額・構成比%・比率バーの一覧。
- `Timeline` … 日付降順の取引一覧、種別/ジャンルでのフィルタ。
- `Card` (shadcn/ui) をベースにした `size="sm"` の小さめカード、`Dot` などの装飾コンポーネント。
- Tailwind v4 の CSS変数トークン（`--bank`, `--success`, `--destructive` 等の oklch カラー）、
  `mf-num` / `tnum`（数値の等幅表示）ユーティリティ。

流用する変換ロジック（考え方のみ。実装は作り直す）:

- `data-source.json` の `sourceType`（`monthly-csv` / `monthly-pdf` 等）や `converter` ごとの
  パース方針（netbk・sbi・smtb・jcb・rakuten・vpass 等の CSV/PDF フォーマット差異への対応）。
- `card-dictionary.json` によるジャンル自動判定（キーワード部分一致・先勝ち・表記正規化）。

流用しないもの:

- ファイル（`raw/` + `manual.json` + `data.json`）を正データとする構成。本アプリは DB が正データ。
- `pdftotext`（poppler）への外部コマンド依存。Vercel Functions 上で確実に動かすため、PDF テキスト
  抽出は Node 単体で動く JS ライブラリ（`unpdf` 等）を使う。
- 銀行 ledger の自動振替判定・異常検知（`rules.json` 相当のロジック）は初期スコープに含めない
  （将来の拡張候補）。

## 4. マルチユーザー・データベース

### 4.1 プロバイダー

**Supabase（マネージド、Vercel Marketplace 経由でプロビジョニング）** を採用する。

検討した選択肢と採用理由:

| 選択肢 | 評価 |
| --- | --- |
| **Supabase（マネージド）** | Postgres + Auth + Storage が1統合で完結。自前でサーバーを持たずに済み、個人〜小規模の家計簿アプリに運用負荷が最小。**採用** |
| Supabase（self-hosted） | 機能は同じだが、Postgres・GoTrue（認証サーバー）等のインフラ運用・バックアップ・セキュリティパッチ適用を自分で担う必要があり、本アプリの規模に対して過剰。 |
| Neon Postgres + Clerk | DB と Auth を分離する構成。両方 Vercel Marketplace ネイティブだが、2プロバイダーの連携（Clerk の `userId` を Neon 側で外部キーとして扱う等）を自分で組む必要がある。 |
| Firebase（Firestore + Auth） | NoSQL のため月次集計・ジャンル別集計・インポート重複排除のロジックをアプリ側で厚く書く必要があり、リレーショナルな家計簿データには不向き。Vercel Marketplace のネイティブ統合もない。 |
| Turso（libSQL） | SQLite 系で高速だが Auth を持たず、結局別の Auth プロバイダーとの2本構成になる。 |

### 4.2 認証・データ分離

- Supabase Auth でメール/パスワード（または Magic Link）によるサインアップ・ログインを提供する。
- 全テーブルに `user_id uuid references auth.users(id)` を持たせ、**Row Level Security (RLS)** で
  `auth.uid() = user_id` を強制する。アプリ側のクエリ漏れがあってもユーザー間のデータ漏洩が起きない
  ようにする。
- クライアント/サーバーそれぞれで `@supabase/ssr` を使い、Cookie ベースのセッションを扱う。

### 4.3 テーブル設計

- `categories`: `id`, `user_id`, `name`, `type`(income/expense), `color`, `sort_order`,
  `is_default`, `created_at`
- `transactions`: `id`, `user_id`, `date`, `amount`, `type`(income/expense),
  `category_id`(nullable), `memo`, `source`(manual/import), `source_name`(nullable。
  インポート元の銀行/カード名。例: `netbk-main`, `楽天カード`), `import_hash`(nullable), `created_at`
- `import_batches`: `id`, `user_id`, `source_name`, `file_name`, `source_type`(csv/pdf), `imported_at`,
  `inserted_count`, `skipped_count`
  — インポート実行ごとの履歴（結果表示・やり直し判断のため）。

### 4.4 重複防止（インポート）

- 取り込み時に `source_name` + `date` + `amount` + 正規化した `description` から決定的なハッシュを
  算出し `transactions.import_hash` に格納する。
- `(user_id, import_hash)` に一意制約を張り、同じ取引が複数回インポートされても2回目以降は
  `ON CONFLICT DO NOTHING` でスキップする。
- 制約は `source = 'import'` の行にのみ適用し（部分一意インデックス）、手入力（`source = 'manual'`）
  の取引は同一内容の重複登録を許可する（同じ金額のコーヒーを2回買った、等は正当なデータのため）。

## 5. アーキテクチャ

- Next.js App Router（既存の `next@16` / `react@19` 構成をそのまま利用）。
- `src/features/kakei/` 配下に機能を集約（`../ui-z-cloud/src/features/payments` の構成に倣う）:
  - `components/` … 画面パーツ（Dashboard, PeriodSelector, CategoryBreakdown,
    TransactionForm, TransactionList, CategoryManager, ImportUploader 等）
  - `lib/` … 集計ロジック（月次サマリー・カテゴリ別内訳の view-model 算出）
  - `import/` … ソース別パーサー（銀行/カードごとの CSV/PDF → 正規化取引への変換）とハッシュ生成
  - `db/` … Supabase クライアント初期化（サーバー用・クライアント用）、型定義
  - `actions/` … Server Actions（取引・ジャンル・インポートの CRUD）
- データ取得はサーバーコンポーネントで行い、更新は Server Actions + `revalidatePath` で反映する。
- 認証が必要な画面は `middleware.ts` でセッションを検査し、未ログインはサインインへリダイレクトする。

## 6. UI 設計方針

- shadcn/ui を導入し、`Card` / `Button` / `Input` / `Select` / `Dialog` / `Tabs` 等を利用する。
- `../ui-z-cloud/src/features/payments` から Tailwind の CSS変数トークン（色・数値表示ユーティリティ）を移植し、視覚的な
  一貫性を持たせる（配色は収入=緑系、支出=赤系などカテゴリの意味に応じて割り当て）。
- レイアウトはカードベースのダッシュボード構成（月セレクター → サマリーカード群 → 一覧）。

## 7. 画面構成

1. **サインイン/サインアップ**: Supabase Auth によるメール認証フォーム。
2. **ダッシュボード（トップ）**: 月セレクター、収支サマリーカード、ジャンル別支出カード、
   取引一覧（タイムライン）。
3. **クイック登録**: ダッシュボードから開くダイアログ or 専用セクション。日付・金額・種別・
   ジャンル・メモを入力し即登録。
4. **インポート**: 取込元（銀行/カード）選択 → CSV/PDF アップロード → 取り込みプレビュー
   （新規/重複の件数）→ 確定。
5. **ジャンル管理**: ジャンルの追加・編集・削除・並び替え。

## 8. 実装フェーズ

1. **セットアップ**: shadcn/ui 導入、デザイントークン移植、Supabase を Marketplace から
   プロビジョニング、`@supabase/ssr` 導入、テーブル作成（RLS 込み）・マイグレーション、
   デフォルトジャンルの seed。
2. **認証**: サインイン/サインアップ画面、`middleware.ts` によるルート保護、ユーザーごとの
   セッション取得。
3. **データ基盤**: Server Actions（取引・ジャンルの CRUD）と月次集計ロジック（`lib/`）。
4. **月次収支の確認**: 月セレクター・収支サマリー・ジャンル別内訳・取引一覧。
5. **クイック登録・ジャンル管理**: 入力フォームとジャンル管理 UI。
6. **CSV/PDF インポート**: ソース別パーサー実装、ハッシュによる重複防止、プレビュー→確定 UI。
7. **仕上げ**: 空状態・入力バリデーション・レスポンシブ対応・軽量なテスト。
