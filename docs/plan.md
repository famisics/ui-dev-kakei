# 家計簿アプリ 実装計画

## 1. 目的

月次で収支を確認しながら、日々の家計簿をクイックに登録できるアプリを作る。
`../ui-z-cloud/src/features/payments`（このリポジトリからの相対パス。資産ダッシュボード）の
見た目・情報設計を一部参考にする。
一方でデータの持ち方は異なる: 手入力を主としつつ、既存カードの CSV・PDF もインポートでき、
重複を防ぎながら同じデータベースに取り込む。すべてのデータ（取引・カテゴリ・ユーザー）は
DB で一元管理し、ファイル（JSON/CSV）を正データとしては持たない。ユーザーごとにサインアップし、
自分のデータのみを見られるマルチユーザー対応にする。

以下は本計画のスコープには含めず、将来の拡張として `docs/todo.md` に別途記載する:

- 資産（残高・純資産推移）の管理機能。

## 2. 機能要件

- **月毎の収支の確認**
  - 月セレクターで対象月を切り替える。
  - 当月の収入・支出・差額のサマリー、カテゴリ別支出の内訳、取引一覧（タイムライン）を表示する。
- **家計簿をクイックに登録**
  - 日付・金額・種別（収入/支出）・カテゴリ・支払元（カード/現金）・メモを最小の手数で入力できるフォームを用意する。
  - カテゴリは親カテゴリと小カテゴリに分け、ユーザーが追加・編集・削除・並び替えできる。ユーザー作成時（初回サインアップ時）に、
    そのユーザー用の基本的な親カテゴリ（生活費・娯楽・その他・給与・仕送り・臨時収入）と、
    生活費の小カテゴリ（外食費・日用品・交通費・温泉・光熱費・通信費・医療）、娯楽の小カテゴリ（サブスク・旅行）を作成する。デフォルトカテゴリは削除できない。
- **家計簿を確認**
  - 登録済み取引を月単位で一覧表示し、カテゴリ/種別で絞り込める。
- **CSV/PDF インポート（カードのみ）**
  - 累積型のカード明細（CSV/PDF）をアップロードし、手入力取引と照合して取り込む。
  - 同じカード・日付・金額・種別に対応する手入力取引が1件あれば、その取引へカード明細を
    紐付ける。対応する取引がなければ新しい取引を作成し、候補が複数あればユーザーが選択する。
  - 新規作成する取引はカテゴリ辞書（キーワード部分一致）で自動的にカテゴリを推定し、一致しない
    ものは未分類として登録する。手入力取引に紐付ける場合は、その取引のカテゴリを維持する。
  - 月途中と月末に同じ月の累積明細を取り込んでも、増えた明細だけを追加する。
  - インポート結果（既存取引への紐付け件数・新規作成件数・登録済み件数）を確認できる。
  - 明細の同一性、累積差分、照合ルールの詳細は `docs/import-spec.md` に従う。
- **マルチユーザー**
  - サインアップ/ログインし、各ユーザーは自分が登録・インポートしたデータのみ閲覧・編集できる。

## 3. 参考にする既存実装（`../ui-z-cloud/src/features/payments`）

流用する情報設計・視覚言語:

- `PeriodSelectorB` … 年タブ + 月タブ + 選択中期間ラベルの月セレクター。
- `CategoriesCard` … カテゴリ別ドット・金額・構成比%・比率バーの一覧。
- `Timeline` … 日付降順の取引一覧、種別/カテゴリでのフィルタ。
- `Card` (shadcn/ui) をベースにした `size="sm"` の小さめカード、`Dot` などの装飾コンポーネント。
- Tailwind v4 の CSS変数トークン（`--success`, `--destructive` 等の oklch カラー）、
  `mf-num` / `tnum`（数値の等幅表示）ユーティリティ。

流用する変換ロジック（考え方のみ。実装は作り直す）:

- `data-source.json` の `converter` ごとのパース方針。初期スコープはカード/デビット明細のみのため
  `jcb`・`debit`・`rakuten`・`vpass` の CSV/PDF フォーマット差異への対応を対象とする。
- `card-dictionary.json` によるカテゴリ自動判定（キーワード部分一致・先勝ち・表記正規化）。

流用しないもの:

- ファイル（`raw/` + `manual.json` + `data.json`）を正データとする構成。本アプリは DB が正データ。
- `pdftotext`（poppler）への外部コマンド依存。Vercel Functions 上で確実に動かすため、PDF テキスト
  抽出は Node 単体で動く JS ライブラリ（`unpdf` 等）を使う。

## 4. マルチユーザー・データベース

### 4.1 プロバイダー

**Supabase（マネージド、Vercel Marketplace 経由でプロビジョニング）** を採用する。

検討した選択肢と採用理由:

| 選択肢 | 評価 |
| --- | --- |
| **Supabase（マネージド）** | Postgres + Auth + Storage が1統合で完結。自前でサーバーを持たずに済み、個人〜小規模の家計簿アプリに運用負荷が最小。**採用** |
| Supabase（self-hosted） | 機能は同じだが、Postgres・GoTrue（認証サーバー）等のインフラ運用・バックアップ・セキュリティパッチ適用を自分で担う必要があり、本アプリの規模に対して過剰。 |
| Neon Postgres + Clerk | DB と Auth を分離する構成。両方 Vercel Marketplace ネイティブだが、2プロバイダーの連携（Clerk の `userId` を Neon 側で外部キーとして扱う等）を自分で組む必要がある。 |
| Firebase（Firestore + Auth） | NoSQL のため月次集計・カテゴリ別集計・インポート重複排除のロジックをアプリ側で厚く書く必要があり、リレーショナルな家計簿データには不向き。Vercel Marketplace のネイティブ統合もない。 |
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
  `is_default`, `parent_id`(nullable。親カテゴリの `categories.id`),
  `import_keywords`(text[], nullable。自動カテゴリ判定用のキーワード。
  `sort_order` の昇順で先勝ち評価する), `created_at`
- `import_sources`: `id`, `user_id`, `name`(表示名。ユーザーが変更できる。例: 「楽天カード」),
  `format_key`(パーサー選択用の固定キー: `jcb` / `debit` / `rakuten` / `vpass`), `created_at`
  — インポート対象はカード明細のみ。
- `transactions`: `id`, `user_id`, `date`, `amount`(常に正数), `type`(income/expense),
  `category_id`(nullable), `description`(nullable。インポート時の
  明細名または手入力した取引内容), `memo`(nullable。ユーザーが自由に追記するメモで
  `description` とは独立), `source`(manual/import), `created_at`
- `statement_entries`: `id`, `user_id`, `import_source_id`, `transaction_id`, `entry_key`,
  `fingerprint`, `occurrence`, `external_id`(nullable), `date`, `amount`, `type`, `description`, `created_at`
  — インポート明細の同一性と取引への1対1の紐付けを管理する。
- `import_batches`: `id`, `user_id`, `import_source_id`, `file_name`, `source_type`(csv/pdf),
  `imported_at`, `matched_count`, `created_count`, `duplicate_count`
  — インポート実行ごとの履歴（結果表示・やり直し判断のため）。

### 4.4 データの不変条件

- **金額の符号**: `amount` は常に正数。収支の方向は `type`(income/expense) だけで表す。
  CSV/PDF 変換時は元データの符号（入金+/出金− 等）を読んで `type` を決定したうえで、
  `amount` には絶対値を格納する。月次集計は `type` ごとに `amount` を合計するだけで求まる。
- **`description` と `memo` の分離**: `description` はインポート元の明細名（または手入力時に
  ユーザーが入力した取引内容）を表し、一覧表示・自動カテゴリ判定・重複判定に使う。`memo` は
  ユーザーが後から追記する自由入力のメモで、`description` を上書きしない。

### 4.5 重複防止（インポート）

- カード会社のファイルを、対象時点までの明細を含む累積スナップショットとして扱う。
- 同じ日付・金額・種別・正規化した明細名を持つ明細は、累積スナップショット内の件数を
  `occurrence` で表し、正当な複数取引を保持する。
- `statement_entries` の `(user_id, import_source_id, entry_key)` に一意制約を設ける。
- 既存の手入力取引への紐付けと、対応する取引がない場合の新規作成を同一トランザクションで行う。
- 詳細は `docs/import-spec.md` を参照する。

## 5. アーキテクチャ

- Next.js App Router（既存の `next@16` / `react@19` 構成をそのまま利用）。
- `src/features/kakei/` 配下に機能を集約（`../ui-z-cloud/src/features/payments` の構成に倣う）:
  - `components/` … 画面パーツ（Dashboard, PeriodSelector, CategoryBreakdown,
    TransactionForm, TransactionList, CategoryManager, ImportUploader 等）
  - `lib/` … 集計ロジック（月次サマリー・カテゴリ別内訳の view-model 算出）
  - `import/` … カード種別ごとの CSV/PDF パーサー（`jcb` / `debit` / `rakuten` / `vpass`）と
    明細のフィンガープリント・`entry_key` 生成
  - `db/` … Supabase クライアント初期化（サーバー用・クライアント用）、型定義
  - `actions/` … Server Actions（取引・カテゴリ・インポートの CRUD）
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
2. **ダッシュボード（トップ）**: 月セレクター、収支サマリーカード、カテゴリ別支出カード、
   取引一覧（タイムライン）。
3. **クイック登録**: ダッシュボードから開くダイアログ or 専用セクション。日付・金額・種別・
   カテゴリ・支払元・メモを入力し即登録。
4. **インポート**: 取込元（カード）選択 → CSV/PDF アップロード → 取り込みプレビュー
   （既存取引への紐付け/新規/登録済み/要確認の件数、推定カテゴリ）→ 確定。
5. **カテゴリ管理**: 親カテゴリ・小カテゴリの追加・編集・削除・並び替え。デフォルトカテゴリは削除不可。

## 8. 実装フェーズ

1. **セットアップ**: shadcn/ui 導入、デザイントークン移植、Supabase を Marketplace から
   プロビジョニング、`@supabase/ssr` 導入、テーブル作成（RLS 込み）・マイグレーション。
2. **認証**: サインイン/サインアップ画面、`proxy.ts` によるルート保護、ユーザー作成時に
   そのユーザー用デフォルトカテゴリを作成する処理。
3. **データ基盤**: Server Actions（取引・カテゴリの CRUD）と月次集計ロジック（`lib/`）。
4. **月次収支の確認**: 月セレクター・収支サマリー・カテゴリ別内訳・取引一覧。
5. **クイック登録・カテゴリ管理**: 入力フォームとカテゴリ管理 UI。
6. **CSV/PDF インポート（カード）**: `jcb` / `debit` / `rakuten` / `vpass` パーサー実装、
   カテゴリ辞書によるキーワード自動判定、累積明細の差分判定、手入力取引との照合、
   プレビュー→確定 UI。
7. **仕上げ**: 空状態・入力バリデーション・レスポンシブ対応・軽量なテスト。
