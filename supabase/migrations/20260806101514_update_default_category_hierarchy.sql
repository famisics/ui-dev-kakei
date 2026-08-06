update public.categories child
set
  name = case child.name
    when '食費' then '外食費'
    else child.name
  end,
  color = parent.color,
  parent_id = parent.id
from public.categories parent
where child.user_id = parent.user_id
  and child.is_default
  and child.parent_id is null
  and child.name in ('食費', '日用品', '交通費')
  and parent.is_default
  and parent.parent_id is null
  and parent.name = '生活費';

update public.categories child
set color = parent.color
from public.categories parent
where child.parent_id = parent.id
  and child.is_default;

update public.categories child
set parent_id = null
from public.categories housing
where child.parent_id = housing.id
  and housing.is_default
  and housing.parent_id is null
  and housing.name = '住居費';

drop trigger protect_default_category on public.categories;

delete from public.categories
where is_default
  and parent_id is null
  and name = '住居費';

create trigger protect_default_category
  before update of is_default or delete on public.categories
  for each row execute function public.protect_default_category();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  life_category_id uuid;
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
  ) values
    (new.id, '通信費', 'expense', null, 1, true),
    (new.id, '娯楽', 'expense', '#ef4444', 2, true),
    (new.id, '医療', 'expense', null, 3, true),
    (new.id, 'その他', 'expense', null, 4, true),
    (new.id, '給与', 'income', null, 0, true);

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
    (new.id, '温泉', 'expense', '#22c55e', 3, true, life_category_id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
