# 将来の拡張候補

`docs/plan.md` のスコープには含めない機能。優先度は未定。

## 資産管理

銀行・証券・現金などの資産の残高を記録し、純資産の推移を確認できる機能。
`../ui-z-cloud/src/features/payments`（このリポジトリからの相対パス）にある
`NetWorthCard` / `NetWorthAreaChart` の
見た目・情報設計（現在値・前月比・24ヶ月推移を1カードにまとめる構成）を参考にできる。

- 資産アカウント（銀行・証券・現金等）を登録できる。
- 資産アカウントごとに月次残高を記録できる（手入力、または CSV/PDF インポートの残高欄から取り込み）。
- 資産アカウント一覧と、純資産推移（直近ヶ月分のエリアチャート）を表示するダッシュボードを追加する。

想定テーブル（着手時に再検討する）:

- `accounts`: `id`, `user_id`, `name`, `kind`(bank/card/cash/investment 等), `color`, `sort_order`
- `account_balances`: `id`, `user_id`, `account_id`, `month`(YYYY-MM), `balance`

着手する場合、`transactions.source_name`（インポート元の識別用テキスト）を `accounts` への
外部キーに置き換えるかどうかも合わせて検討する。
