# 家計簿アプリ 実装計画

## 1. 目的

月次で収支を確認しながら、日々の家計簿をクイックに登録できるアプリを作る。
`../ui-z-cloud/src/features/payments`（このリポジトリからの相対パス。資産ダッシュボード）の
見た目・情報設計を一部参考にする。
一方でデータの持ち方は異なる: 手入力を主としつつ、既存カードの CSV・PDF もインポートでき、
重複を防ぎながら同じデータベースに取り込む。すべてのデータ（取引・ジャンル・ユーザー）は
DB で一元管理し、ファイル（JSON/CSV）を正データとしては持たない。ユーザーごとにサインアップし、
自分のデータのみを見られるマルチユーザー対応にする。

以下は本計画のスコープには含めず、将来の拡張として `docs/todo.md` に別途記載する:

- 資産（残高・純資産推移）の管理機能。
- 銀行口座（netbk・sbi・smtb 等）の CSV/PDF インポート。初期スコープはカード明細のインポートのみ。

## 2. 機能要件

- **月毎の収支の確認**
  - 月セレクターで対象月を切り替える。
  - 当月の収入・支出・差額のサマリー、ジャンル別支出の内訳、取引一覧（タイムライン）を表示する。
- **家計簿をクイックに登録**
  - 日付・金額・種別（収入/支出）・ジャンル・メモを最小の手数で入力できるフォームを用意する。
  - ジャンルはユーザーが追加・編集・削除・並び替えできる。ユーザー作成時（初回サインアップ時）に、
    そのユーザー用の基本的なジャンル（食費・日用品・交通費・住居費・通信費・娯楽・医療・給与・
    その他 等）を作成する。
- **家計簿を確認**
  - 登録済み取引を月単位で一覧表示し、ジャンル/種別で絞り込める。
- **CSV/PDF インポート（カードのみ）**
  - カード明細（CSV/PDF）をアップロードし、取引として取り込む。
  - 取り込んだ取引はジャンル辞書（キーワード部分一致）で自動的にジャンルを推定し、一致しない
    ものは未分類として登録する（後で手動でジャンルを割り当てられる）。
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

- `data-source.json` の `converter` ごとのパース方針。初期スコープはカード/デビット明細のみのため
  `jcb`・`debit`・`rakuten`・`vpass` の CSV/PDF フォーマット差異への対応を対象とする
  （`netbk`・`sbi`・`smtb_main` 等の銀行口座 CSV/PDF は `docs/todo.md` に回す）。
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
  具体的な方式とメール確認の要否は、フェーズ2（認証）着手前に決定する。
- 全テーブルに `user_id uuid references auth.users(id)` を持たせ、**Row Level Security (RLS)** で
  `auth.uid() = user_id` を強制する。アプリ側のクエリ漏れがあってもユーザー間のデータ漏洩が起きない
  ようにする。
- クライアント/サーバーそれぞれで `@supabase/ssr` を使い、Cookie ベースのセッションを扱う。

### 4.3 テーブル設計

- `categories`: `id`, `user_id`, `name`, `type`(income/expense), `color`, `sort_order`,
  `is_default`, `import_keywords`(text[], nullable。自動ジャンル判定用のキーワード。
  `sort_order` の昇順で先勝ち評価する), `created_at`
- `import_sources`: `id`, `user_id`, `name`(表示名。ユーザーが変更できる。例: 「楽天カード」),
  `format_key`(パーサー選択用の固定キー: `jcb` / `debit` / `rakuten` / `vpass`), `created_at`
  — インポート対象は初期スコープではカードのみ。銀行口座インポートは `docs/todo.md` を参照。
- `transactions`: `id`, `user_id`, `date`, `amount`(常に正数), `type`(income/expense),
  `category_id`(nullable), `description`(nullable。インポート時の明細名。一覧表示・自動ジャンル
  判定・重複判定に使う。手入力時は未設定でよい), `memo`(nullable。ユーザーが自由に追記するメモで
  `description` とは独立), `source`(manual/import), `import_source_id`(nullable。
  `import_sources.id` を参照), `import_hash`(nullable), `created_at`
- `import_batches`: `id`, `user_id`, `import_source_id`, `file_name`, `source_type`(csv/pdf),
  `imported_at`, `inserted_count`, `skipped_count`
  — インポート実行ごとの履歴（結果表示・やり直し判断のため）。

### 4.4 データの不変条件

- **金額の符号**: `amount` は常に正数。収支の方向は `type`(income/expense) だけで表す。
  CSV/PDF 変換時は元データの符号（入金+/出金− 等）を読んで `type` を決定したうえで、
  `amount` には絶対値を格納する。月次集計は `type` ごとに `amount` を合計するだけで求まる。
- **`description` と `memo` の分離**: `description` はインポート元の明細名（または手入力時に
  ユーザーが入力した取引内容）を表し、一覧表示・自動ジャンル判定・重複判定に使う。`memo` は
  ユーザーが後から追記する自由入力のメモで、`description` を上書きしない。

### 4.5 重複防止（インポート）

- 取り込み時に `import_source_id`（表示名ではなく不変の内部 ID）+ `date` + `amount` +
  正規化した `description` から決定的なハッシュを算出し `transactions.import_hash` に格納する。
  `import_source_id` を使うことで、カードの表示名を変更しても同じ取込元として扱われ、
  重複が再登録されない。
- `(user_id, import_hash)` に一意制約を張り、同じ取引が複数回インポートされても2回目以降は
  `ON CONFLICT DO NOTHING` でスキップする。
- 制約は `source = 'import'` の行にのみ適用し（部分一意インデックス）、手入力（`source = 'manual'`）
  の取引は同一内容の重複登録を許可する（同じ金額のコーヒーを2回買った、等は正当なデータのため）。
- **既知の制約**: 同日・同じ明細名・同額の取引が複数回発生した場合、同一取引として1件に統合
  される（多くの明細フォーマットに連番や時刻等の一意キーが無いため）。初期版ではこの制約を
  受け入れ、厳密な区別は将来課題として `docs/todo.md` に回す。

## 5. アーキテクチャ

- Next.js App Router（既存の `next@16` / `react@19` 構成をそのまま利用）。
- `src/features/kakei/` 配下に機能を集約（`../ui-z-cloud/src/features/payments` の構成に倣う）:
  - `components/` … 画面パーツ（Dashboard, PeriodSelector, CategoryBreakdown,
    TransactionForm, TransactionList, CategoryManager, ImportUploader 等）
  - `lib/` … 集計ロジック（月次サマリー・カテゴリ別内訳の view-model 算出）
  - `import/` … カード種別ごとの CSV/PDF パーサー（`jcb` / `debit` / `rakuten` / `vpass`）と
    ハッシュ生成
  - `db/` … Supabase クライアント初期化（サーバー用・クライアント用）、型定義
  - `actions/` … Server Actions（取引・ジャンル・インポートの CRUD）
- データ取得はサーバーコンポーネントで行い、更新は Server Actions + `revalidatePath` で反映する。
- 認証が必要な画面は `proxy.ts`（Next.js 16 の Middleware 規約。旧 `middleware.ts`）でセッションを
  検査し、未ログインはサインインへリダイレクトする。

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
4. **インポート**: 取込元（カード）選択 → CSV/PDF アップロード → 取り込みプレビュー
   （新規/重複の件数、推定ジャンル）→ 確定。
5. **ジャンル管理**: ジャンルの追加・編集・削除・並び替え。

## 8. 実装フェーズ

1. **セットアップ**: shadcn/ui 導入、デザイントークン移植、Supabase を Marketplace から
   プロビジョニング、`@supabase/ssr` 導入、テーブル作成（RLS 込み）・マイグレーション。
2. **認証**: サインイン/サインアップ画面、`proxy.ts` によるルート保護、ユーザー作成時に
   そのユーザー用デフォルトジャンルを作成する処理。
3. **データ基盤**: Server Actions（取引・ジャンルの CRUD）と月次集計ロジック（`lib/`）。
4. **月次収支の確認**: 月セレクター・収支サマリー・ジャンル別内訳・取引一覧。
5. **クイック登録・ジャンル管理**: 入力フォームとジャンル管理 UI。
6. **CSV/PDF インポート（カード）**: `jcb` / `debit` / `rakuten` / `vpass` パーサー実装、
   ジャンル辞書によるキーワード自動判定、ハッシュによる重複防止、プレビュー→確定 UI。
7. **仕上げ**: 空状態・入力バリデーション・レスポンシブ対応・軽量なテスト。
