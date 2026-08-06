# 将来の拡張候補

`docs/plan.md` のスコープには含めない機能。優先度は未定。

## 資産管理

銀行・証券・現金などの資産の残高を記録し、純資産の推移を確認できる機能。
`../ui-z-cloud/src/features/payments`（このリポジトリからの相対パス）にある
`NetWorthCard` / `NetWorthAreaChart` の
見た目・情報設計（現在値・前月比・24ヶ月推移を1カードにまとめる構成）を参考にできる。

- `docs/import-spec.md` の支払元 `accounts` を、銀行・証券を含む資産アカウントへ拡張する。
- 資産アカウントごとに月次残高を記録できる（手入力、または CSV/PDF インポートの残高欄から取り込み）。
- 資産アカウント一覧と、純資産推移（直近ヶ月分のエリアチャート）を表示するダッシュボードを追加する。

想定テーブル（着手時に再検討する）:

- `accounts.kind` に `bank` / `investment` 等を追加する。
- `account_balances`: `id`, `user_id`, `account_id`, `month`(YYYY-MM), `balance`

## 銀行口座（netbk・sbi・smtb 等）の CSV/PDF インポート

`docs/plan.md` の初期インポートスコープはカード明細（`jcb` / `debit` / `rakuten` / `vpass`）
のみで、銀行口座のインポートは対象外。着手する場合は次を検討する:

- `netbk`（ledger CSV）・`sbi`（ledger CSV, 複数口座分割）・`smtb_main`（PDF から ledger 抽出）
  など、`../ui-z-cloud/src/features/payments` の `converter` ごとのパース方針を参考にできる。
- 銀行 ledger は入金（給与等）と出金の両方を含むため、取り込み後の口座間振替の判定
  （`../ui-z-cloud/src/features/payments/README.md` の `rules.json` 相当）が必要かどうか。
- 資産管理（本ファイル上部）と合わせて実装すると、残高スナップショットを兼用できる。
