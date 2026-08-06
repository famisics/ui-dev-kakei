update public.categories
set name = '光熱費・通信費'
where is_default
  and name = '通信費';

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
    (new.id, '光熱費・通信費', 'expense', '#22c55e', 4, true, life_category_id),
    (new.id, '医療', 'expense', '#22c55e', 5, true, life_category_id),
    (new.id, 'サブスク', 'expense', '#ef4444', 0, true, entertainment_category_id),
    (new.id, '旅行', 'expense', '#ef4444', 1, true, entertainment_category_id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
