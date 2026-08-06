-- デフォルトジャンルを src/consts/default-categories.ts のキーと安定的に対応づける列。
-- リネームが発生しても既存ユーザーの行を名前ではなくこのキーで追跡できるようにする。
alter table public.categories
  add column default_key text;

create unique index categories_user_default_key_key
  on public.categories (user_id, default_key)
  where default_key is not null;

update public.categories
set default_key = case name
  when '生活費' then 'living'
  when '娯楽' then 'entertainment'
  when 'その他' then 'other_expense'
  when '給与' then 'salary'
  when '仕送り' then 'remittance'
  when '臨時収入' then 'windfall'
  when '外食費' then 'dining_out'
  when '日用品' then 'daily_goods'
  when '交通費' then 'transportation'
  when '温泉' then 'hot_spring'
  when '光熱費・通信費' then 'utilities_communication'
  when '医療' then 'medical'
  when 'サブスク' then 'subscription'
  when '旅行' then 'travel'
end
where is_default;

-- デフォルトジャンルの内容（名前・種別・色・親・自動振り分けキーワード）は
-- src/consts/default-categories.ts が正データであり、アプリからは編集できない。
-- is_default 行に対するこれらの変更をDB側でも拒否する。
create or replace function public.protect_default_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_default then
    raise exception 'デフォルトのジャンルは削除できません。';
  end if;

  if tg_op = 'UPDATE' and old.is_default then
    if not new.is_default then
      raise exception 'デフォルトのジャンルは通常のジャンルに変更できません。';
    end if;
    if new.name is distinct from old.name
      or new.type is distinct from old.type
      or new.color is distinct from old.color
      or new.parent_id is distinct from old.parent_id
      or new.import_keywords is distinct from old.import_keywords
      or new.default_key is distinct from old.default_key
    then
      raise exception 'デフォルトのジャンルの内容は変更できません。';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_default_category() from public, anon, authenticated;

-- 元のトリガーは is_default 列の更新時のみ発火するため、name/color/parent_id 等の
-- 更新でも発火するよう対象列を広げて再作成する。
drop trigger protect_default_category on public.categories;

create trigger protect_default_category
  before update of
    is_default, name, type, color, parent_id, import_keywords, default_key
    or delete
  on public.categories
  for each row execute function public.protect_default_category();
