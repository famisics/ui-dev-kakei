-- statement_entries導入前にインポートされた既存の取引には対応する明細エントリーが
-- 存在せず、再インポート時に常に新規作成予定と判定されてしまう。
-- source='import'の既存取引から、アプリと同じフィンガープリント/entry_key算出ロジックを
-- SQLで再現してstatement_entriesを遡って生成する。

create extension if not exists pgcrypto with schema extensions;

create or replace function pg_temp.normalize_payee_backfill(input text)
returns text
language sql
immutable
as $$
  select translate(
    translate(
      regexp_replace(
        regexp_replace(upper(normalize(input, nfkc)), '\s', '', 'g'),
        '[ー・･‐‑‒–—―−-]', '', 'g'
      ),
      (select string_agg(chr(x), '') from generate_series(12353, 12438) x),
      (select string_agg(chr(x + 96), '') from generate_series(12353, 12438) x)
    ),
    'ァィゥェォッャュョヮ',
    'アイウエオツヤユヨワ'
  );
$$;

with base as (
  select
    t.id as transaction_id,
    t.user_id,
    t.import_source_id,
    t.date,
    t.amount,
    t.type,
    coalesce(t.description, '') as description,
    t.created_at
  from public.transactions t
  where t.source = 'import'
    and t.import_source_id is not null
    and not exists (
      select 1 from public.statement_entries se where se.transaction_id = t.id
    )
),
fingerprinted as (
  select
    base.*,
    encode(
      extensions.digest(
        to_char(base.date, 'YYYY-MM-DD') || '|' || base.amount::text || '|' ||
          base.type || '|' || pg_temp.normalize_payee_backfill(base.description),
        'sha256'
      ),
      'hex'
    ) as fingerprint
  from base
),
occurrenced as (
  select
    fingerprinted.*,
    row_number() over (
      partition by user_id, import_source_id, fingerprint
      order by created_at, transaction_id
    ) as occurrence
  from fingerprinted
)
insert into public.statement_entries (
  user_id, import_source_id, transaction_id, entry_key, fingerprint, occurrence,
  date, amount, type, description
)
select
  user_id,
  import_source_id,
  transaction_id,
  encode(
    extensions.digest(import_source_id::text || '|' || fingerprint || '|' || occurrence::text, 'sha256'),
    'hex'
  ),
  fingerprint,
  occurrence,
  date,
  amount,
  type,
  description
from occurrenced;

drop function pg_temp.normalize_payee_backfill(text);
