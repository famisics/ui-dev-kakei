alter table public.categories
  add column parent_id uuid,
  add constraint categories_id_user_type_key unique (id, user_id, type),
  add constraint categories_parent_not_self check (parent_id is distinct from id),
  add constraint categories_parent_key
    foreign key (parent_id, user_id, type)
    references public.categories (id, user_id, type)
    on delete restrict;

create index categories_parent_sort_idx
  on public.categories (parent_id, sort_order);

create or replace function public.validate_category_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and exists (
    select 1
    from public.categories parent
    where parent.id = new.parent_id
      and parent.parent_id is not null
  ) then
    raise exception '小ジャンルを親ジャンルには指定できません。';
  end if;

  if new.parent_id is not null and exists (
    select 1
    from public.categories child
    where child.parent_id = new.id
  ) then
    raise exception '小ジャンルを持つジャンルは小ジャンルに変更できません。';
  end if;

  return new;
end;
$$;

create trigger validate_category_hierarchy
  before insert or update of parent_id on public.categories
  for each row execute function public.validate_category_hierarchy();

create or replace function public.protect_default_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_default then
    raise exception 'デフォルトのジャンルは削除できません。';
  end if;

  if tg_op = 'UPDATE' and old.is_default and not new.is_default then
    raise exception 'デフォルトのジャンルは通常のジャンルに変更できません。';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger protect_default_category
  before update of is_default or delete on public.categories
  for each row execute function public.protect_default_category();

with life_categories as (
  insert into public.categories (user_id, name, type, sort_order, is_default)
  select id, '生活費', 'expense', 8, true
  from auth.users
  returning id, user_id
)
insert into public.categories (
  user_id,
  name,
  type,
  sort_order,
  is_default,
  parent_id
)
select user_id, '温泉', 'expense', 0, true, id
from life_categories;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  life_category_id uuid;
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

  insert into public.categories (user_id, name, type, sort_order, is_default)
  values (new.id, '生活費', 'expense', 8, true)
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
revoke execute on function public.validate_category_hierarchy() from public, anon, authenticated;
revoke execute on function public.protect_default_category() from public, anon, authenticated;
