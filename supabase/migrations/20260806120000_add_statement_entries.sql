-- カード明細エントリーの同一性管理と手入力取引への紐付け（docs/import-spec.md 参照）。

create table public.statement_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_source_id uuid not null references public.import_sources(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  entry_key text not null,
  fingerprint text not null,
  occurrence integer not null check (occurrence > 0),
  external_id text,
  date date not null,
  amount numeric not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  description text not null,
  created_at timestamptz not null default now(),
  unique (user_id, import_source_id, entry_key),
  unique (transaction_id)
);

create index statement_entries_user_fingerprint_idx
  on public.statement_entries (user_id, import_source_id, fingerprint);

-- import_hash による単純重複排除は statement_entries.entry_key に置き換える。
drop index public.transactions_user_import_hash_key;
alter table public.transactions drop column import_hash;

alter table public.import_batches
  rename column inserted_count to created_count;
alter table public.import_batches
  rename column skipped_count to duplicate_count;
alter table public.import_batches
  add column matched_count integer not null default 0;

alter table public.statement_entries enable row level security;

create policy "statement_entries_owner" on public.statement_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.statement_entries to authenticated;
