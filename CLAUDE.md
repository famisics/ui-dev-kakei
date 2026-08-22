# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # 開発サーバー (http://localhost:3000)
npm run build
npm run lint      # biome check
npm run format    # biome format --write
npm run test      # vitest run（単体テスト）
npx vitest run <path/to/file.test.ts>   # 単一テストファイルのみ実行
```

型チェックのみ行いたい場合は `tsc --noEmit` を使う。`nr tsc` などで `.js` を生成しないこと。

### DBマイグレーション

```bash
npm run db:migrate            # supabase db push（supabase link 済みが前提）
npm run db:migrate:dry-run    # supabase db push --dry-run
```

マイグレーションSQLは `supabase/migrations/` に追加する。新しいテーブルには RLS
（`to authenticated` + `(select auth.uid()) = user_id`、更新ポリシーは `using` と
`with check` の両方）を必ず設定する。

デフォルトカテゴリ（`categories.is_default`）とその自動振り分けキーワード
（`import_keywords`）は `src/consts/default-categories.ts` が正データで、アプリの
UIからは編集できない（`protect_default_category` トリガーがDB側でも拒否する）。
定義を変更したら以下を実行し、生成されたマイグレーションを `db:migrate` で適用する。

```bash
npm run generate:categories-migration   # src/consts/default-categories.ts から
                                         # supabase/migrations/ にマイグレーションを追記生成
```

## アーキテクチャ

Next.js (App Router) + Supabase（Postgres + Auth、`@supabase/ssr`）の家計簿アプリ。
全データはDBで一元管理し、アップロードしたファイルを正データとしては保持しない。

### 機能の集約先: `src/features/kakei/`

- `components/` — 画面パーツ（`SummaryCards`, `TransactionList`, `QuickAddForm`,
  `CategoryManager`, `ImportUploader` 等）
- `actions/` — Server Actions（`"use server"`）。取引・カテゴリ・インポートのCRUD。
  データ取得もServer Actions/Server Componentから直接呼び出し、更新後は
  `revalidatePath` で反映する。
- `lib/` — 月次サマリーなどの集計ロジック（view-model算出）
- `import/` — カード明細CSV/PDFインポート関連
  - `parsers/` — カード会社ごとのフォーマット（`jcb` / `debit` / `rakuten` / `vpass`）
  - `normalize.ts` — 明細名の正規化
  - `hash.ts` — フィンガープリント・`entry_key`生成
  - `matching.ts` — 手入力取引との照合ロジック
  - `category-dictionary.ts` — キーワードによるカテゴリ自動判定
- `db/types.ts` — 全テーブルの型定義とSupabase `Database` 型（`Row`/`Insert`/`Update`）

### 認証

- `src/proxy.ts`（Next.js 16 のMiddleware規約。旧`middleware.ts`）が全リクエストで
  `src/lib/supabase/middleware.ts` の `updateSession` を呼び、未ログインユーザーを
  `/login` にリダイレクトする（`PUBLIC_PATHS` 以外）。
- `src/lib/supabase/server.ts` — Server Component/Server Action用クライアント
  （cookieベース）。
- `src/lib/supabase/client.ts` — ブラウザ用クライアント。
- `src/lib/supabase/auth.ts` の `getAuthedUserId()` を各Server Actionの先頭で呼び、
  `{ supabase, userId }` を取得する。認証ユーザー以外のデータへは全テーブルのRLSで
  アクセスできない前提（`user_id`によるフィルタはRLSが最終防衛線だが、クエリ側でも
  `eq("user_id", userId)` を明示する）。

### データモデルの不変条件

- `amount` は常に正数。収支の方向は `type`(`income`/`expense`) だけで表す。
- `transactions.source` は `manual`（手入力）/ `import`（インポートで新規作成）。
  インポートで既存の手入力取引に紐付けても `source = 'manual'` を維持する。
- `description`（インポート元の明細名 or 手入力時の取引内容。自動カテゴリ判定・
  重複判定に使う）と `memo`（ユーザーが自由に追記する、`description`とは独立の
  メモ）は分離している。
- `categories` は `parent_id` で親カテゴリ/小カテゴリの階層を持ち、
  `import_keywords`（`sort_order`昇順で先勝ち評価）で自動カテゴリ判定に使う。
  `is_default` のカテゴリは削除できない。

### カード明細インポートの重複防止（詳細は `docs/import-spec.md`）

カード会社のファイルは「対象時点までの明細を全て含む累積スナップショット」として扱う
（増分型は対象外）。同じ月の累積明細を繰り返しインポートしても、取引・明細エントリーは
増えない。

- `statement_entries` が明細の同一性と取引への1対1紐付けを管理する
  （`transaction_id` に一意制約、`(user_id, import_source_id, entry_key)` に一意制約）。
- `fingerprint = SHA-256(date | amount | type | normalize(description))`。
  カード会社固有の取引IDがない明細の同一性判定に使う。
- 同じ`fingerprint`が複数件ある場合、ファイル内の出現順に `occurrence`（1始まり）を
  振り、累積差分（今回件数 `n` と登録済み件数 `m` の比較）で新規分だけを処理する。
  `n < m` の場合は既存データを削除せず、プレビューで警告するのみ。
- `entry_key` は固有IDがあれば `SHA-256(import_source_id | external_id)`、
  なければ `SHA-256(import_source_id | fingerprint | occurrence)`。
- 手入力取引との照合は `matching.ts` に従い、日付・金額・種別が一致し
  `source = 'manual'` かつ未紐付けの取引を候補にする。候補が複数ある場合は
  自動で紐付けず、ユーザーの選択が確定するまでインポートを確定しない。
- 確定処理はプレビュー後に候補条件をサーバー側で再評価し、渡された
  取引ID・カテゴリID・取込元IDが認証ユーザー所有か検証してから行を1件ずつ処理する。

## Lint/Format

biome（`biome.json`）でlint/formatを行う。`ignoreUnknown`、`organizeImports: "on"`。
shadcn/uiコンポーネントは `components.json`（`style: "radix-nova"`, baseColor
`neutral`, aliasは `@/components`, `@/lib`, `@/components/ui` 等）に従って追加する。
