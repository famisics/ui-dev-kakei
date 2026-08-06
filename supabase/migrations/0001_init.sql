-- 家計簿アプリ 初期スキーマ（categories / import_sources / transactions / import_batches）
-- 設計は docs/plan.md 4.3-4.5 を参照。

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text,
  sort_order integer not null default 0,
  is_default boolean not null default false,
  import_keywords text[],
  created_at timestamptz not null default now()
);

create table public.import_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  format_key text not null check (format_key in ('jcb', 'debit', 'rakuten', 'vpass')),
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  amount numeric not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category_id uuid references public.categories(id) on delete set null,
  description text,
  memo text,
  source text not null check (source in ('manual', 'import')),
  import_source_id uuid references public.import_sources(id) on delete set null,
  import_hash text,
  created_at timestamptz not null default now()
);

-- source = 'import' の行にのみ一意制約を適用する部分インデックス（重複インポート防止）。
create unique index transactions_user_import_hash_key
  on public.transactions (user_id, import_hash)
  where source = 'import';

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_source_id uuid not null references public.import_sources(id) on delete cascade,
  file_name text not null,
  source_type text not null check (source_type in ('csv', 'pdf')),
  imported_at timestamptz not null default now(),
  inserted_count integer not null default 0,
  skipped_count integer not null default 0
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index categories_user_sort_idx on public.categories (user_id, sort_order);

-- --- RLS -----------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.import_sources enable row level security;
alter table public.transactions enable row level security;
alter table public.import_batches enable row level security;

create policy "categories_owner" on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "import_sources_owner" on public.import_sources
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "transactions_owner" on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "import_batches_owner" on public.import_batches
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 2025-04 以降、public スキーマの新規テーブルは Data API に自動露出しないため明示的に許可する。
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.categories, public.import_sources, public.transactions, public.import_batches to authenticated;

-- --- 初回サインアップ時のデフォルトジャンル作成 ----------------------------
-- auth.users への insert トリガーは auth.uid() を持たない実行コンテキストのため security definer が必要。

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, sort_order, is_default) values
    (new.id, '食費', 'expense', 0, true),
    (new.id, '日用品', 'expense', 1, true),
    (new.id, '交通費', 'expense', 2, true),
    (new.id, '住居費', 'expense', 3, true),
    (new.id, '通信費', 'expense', 4, true),
    (new.id, '娯楽', 'expense', 5, true),
    (new.id, '医療', 'expense', 6, true),
    (new.id, 'その他', 'expense', 7, true),
    (new.id, '給与', 'income', 0, true);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
