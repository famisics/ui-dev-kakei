update public.categories child
set parent_id = life.id
from public.categories former_parent
join public.categories life
  on life.user_id = former_parent.user_id
  and life.is_default
  and life.parent_id is null
  and life.name = '生活費'
where child.parent_id = former_parent.id
  and former_parent.is_default
  and former_parent.parent_id is null
  and former_parent.name in ('通信費', '医療');

update public.categories child
set
  color = life.color,
  sort_order = case child.name
    when '通信費' then 4
    when '医療' then 5
  end,
  parent_id = life.id
from public.categories life
where child.user_id = life.user_id
  and child.is_default
  and child.parent_id is null
  and child.name in ('通信費', '医療')
  and life.is_default
  and life.parent_id is null
  and life.name = '生活費';

insert into public.categories (
  user_id,
  name,
  type,
  color,
  sort_order,
  is_default,
  parent_id
)
select user_id, 'サブスク', 'expense', color, 0, true, id
from public.categories
where is_default
  and parent_id is null
  and name = '娯楽';

insert into public.categories (
  user_id,
  name,
  type,
  color,
  sort_order,
  is_default,
  parent_id
)
select user_id, '旅行', 'expense', color, 1, true, id
from public.categories
where is_default
  and parent_id is null
  and name = '娯楽';

insert into public.categories (
  user_id,
  name,
  type,
  sort_order,
  is_default
)
select id, '仕送り', 'income', 1, true
from auth.users;

insert into public.categories (
  user_id,
  name,
  type,
  sort_order,
  is_default
)
select id, '臨時収入', 'income', 2, true
from auth.users;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  life_category_id uuid;
  entertainment_category_id uuid;
begin
  insert into public.categories (
    user_id,
    name,
    type,
    color,
    sort_order,
    is_default
  ) values (new.id, '生活費', 'expense', '#22c55e', 0, true)
  returning id into life_category_id;

  insert into public.categories (
    user_id,
    name,
    type,
    color,
    sort_order,
    is_default
  ) values (new.id, '娯楽', 'expense', '#ef4444', 1, true)
  returning id into entertainment_category_id;

  insert into public.categories (
    user_id,
    name,
    type,
    color,
    sort_order,
    is_default
  ) values
    (new.id, 'その他', 'expense', null, 2, true),
    (new.id, '給与', 'income', null, 0, true),
    (new.id, '仕送り', 'income', null, 1, true),
    (new.id, '臨時収入', 'income', null, 2, true);

  insert into public.categories (
    user_id,
    name,
    type,
    color,
    sort_order,
    is_default,
    parent_id
  ) values
    (new.id, '外食費', 'expense', '#22c55e', 0, true, life_category_id),
    (new.id, '日用品', 'expense', '#22c55e', 1, true, life_category_id),
    (new.id, '交通費', 'expense', '#22c55e', 2, true, life_category_id),
    (new.id, '温泉', 'expense', '#22c55e', 3, true, life_category_id),
    (new.id, '通信費', 'expense', '#22c55e', 4, true, life_category_id),
    (new.id, '医療', 'expense', '#22c55e', 5, true, life_category_id),
    (new.id, 'サブスク', 'expense', '#ef4444', 0, true, entertainment_category_id),
    (new.id, '旅行', 'expense', '#ef4444', 1, true, entertainment_category_id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
