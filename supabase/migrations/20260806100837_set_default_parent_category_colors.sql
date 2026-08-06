update public.categories
set color = case name
  when '生活費' then '#22c55e'
  when '娯楽' then '#ef4444'
end
where is_default
  and parent_id is null
  and name in ('生活費', '娯楽');

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
  ) values
    (new.id, '食費', 'expense', null, 0, true),
    (new.id, '日用品', 'expense', null, 1, true),
    (new.id, '交通費', 'expense', null, 2, true),
    (new.id, '住居費', 'expense', null, 3, true),
    (new.id, '通信費', 'expense', null, 4, true),
    (new.id, '娯楽', 'expense', '#ef4444', 5, true),
    (new.id, '医療', 'expense', null, 6, true),
    (new.id, 'その他', 'expense', null, 7, true),
    (new.id, '給与', 'income', null, 0, true);

  insert into public.categories (
    user_id,
    name,
    type,
    color,
    sort_order,
    is_default
  ) values (new.id, '生活費', 'expense', '#22c55e', 8, true)
  returning id into life_category_id;

  insert into public.categories (
    user_id,
    name,
    type,
    sort_order,
    is_default,
    parent_id
  ) values (new.id, '温泉', 'expense', 0, true, life_category_id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
