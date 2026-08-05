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

着手する場合、`accounts` と `import_sources`（`docs/plan.md` 4.3節）の関係（統合するか、
資産用と取込用で分けたままにするか）を合わせて検討する。

## 銀行口座（netbk・sbi・smtb 等）の CSV/PDF インポート

`docs/plan.md` の初期インポートスコープはカード明細（`jcb` / `debit` / `rakuten` / `vpass`）
のみで、銀行口座のインポートは対象外。着手する場合は次を検討する:

- `netbk`（ledger CSV）・`sbi`（ledger CSV, 複数口座分割）・`smtb_main`（PDF から ledger 抽出）
  など、`../ui-z-cloud/src/features/payments` の `converter` ごとのパース方針を参考にできる。
- 銀行 ledger は入金（給与等）と出金の両方を含むため、取り込み後の口座間振替の判定
  （`../ui-z-cloud/src/features/payments/README.md` の `rules.json` 相当）が必要かどうか。
- 資産管理（本ファイル上部）と合わせて実装すると、残高スナップショットを兼用できる。

## インポートの重複判定の厳密化

`docs/plan.md` 4.5節の現行ルールでは、同日・同じ明細名・同額の取引が複数回発生した場合に
同一取引として1件に統合される既知の制約がある。厳密に区別したい場合は次を検討する:

- 明細フォーマット側に連番・取引時刻等の一意キーがあれば、ハッシュに含める。
- ユーザーが「これは重複ではない」と手動で区別できる UI（インポート時の occurrence 指定等）
  を用意する。
