-- 同一日付内の取引の並び順を記録する。categories.sort_order と同様に
-- 昇順（小さいほど上）で扱い、一覧は date desc, sort_order asc で表示する。

alter table public.transactions
  add column sort_order integer not null default 0;

-- 既存データは記録済みの並び順情報がないため、created_at の新しい順を初期値とする。
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, date
      order by created_at desc
    ) - 1 as rank
  from public.transactions
)
update public.transactions as t
set sort_order = ranked.rank
from ranked
where t.id = ranked.id;

drop index public.transactions_user_date_idx;
create index transactions_user_date_idx
  on public.transactions (user_id, date desc, sort_order asc);
