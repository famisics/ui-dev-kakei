/**
 * src/consts/default-categories.ts の内容から、デフォルトカテゴリを
 * 既存ユーザーへ反映し `handle_new_user()` を再定義するマイグレーションSQLを生成する。
 *
 * 実行: `bun scripts/generate-default-categories-migration.ts`
 * （`npm run generate:categories-migration` からも呼べる）
 *
 * 生成したファイルは `supabase/migrations/` に追記されるだけで、DBには適用されない。
 * 適用は `npm run db:migrate` / `db:migrate:dry-run` で行う。
 *
 * 前提: `categories` テーブルに `default_key text` 列と、
 * `(user_id, default_key) where default_key is not null` の一意インデックスがあること
 * （`supabase/migrations/*_add_category_default_key.sql` で追加済み）。
 */

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_CATEGORIES,
  type DefaultCategoryDef,
} from "../src/consts/default-categories";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(rootDir, "supabase", "migrations");

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function sqlTextArray(values: string[] | undefined): string {
  if (!values || values.length === 0) return "null";
  return `array[${values.map((v) => `'${escapeSqlString(v)}'`).join(",")}]`;
}

function sqlNullableString(value: string | null | undefined): string {
  return value == null ? "null" : `'${escapeSqlString(value)}'`;
}

function topologicallyOrdered(
  defs: DefaultCategoryDef[],
): DefaultCategoryDef[] {
  const byKey = new Map(defs.map((def) => [def.key, def]));
  const ordered: DefaultCategoryDef[] = [];
  const visited = new Set<string>();

  function visit(def: DefaultCategoryDef) {
    if (visited.has(def.key)) return;
    if (def.parentKey) {
      const parent = byKey.get(def.parentKey);
      if (!parent) {
        throw new Error(
          `未知のparentKey "${def.parentKey}" を持つカテゴリ "${def.key}" があります。`,
        );
      }
      if (parent.type !== def.type) {
        throw new Error(
          `カテゴリ "${def.key}" の type ("${def.type}") が親 "${parent.key}" の type ("${parent.type}") と異なります。categories_parent_key制約に反するため一致させること。`,
        );
      }
      visit(parent);
    }
    visited.add(def.key);
    ordered.push(def);
  }

  for (const def of defs) visit(def);
  return ordered;
}

function withSortOrder(
  defs: DefaultCategoryDef[],
): (DefaultCategoryDef & { sortOrder: number })[] {
  const counters = new Map<string, number>();
  return defs.map((def) => {
    const groupKey = def.parentKey ?? "";
    const sortOrder = counters.get(groupKey) ?? 0;
    counters.set(groupKey, sortOrder + 1);
    return { ...def, sortOrder };
  });
}

function buildReconciliationSql(
  defs: (DefaultCategoryDef & { sortOrder: number })[],
): string {
  return defs
    .map((def) => {
      if (!def.parentKey) {
        return `insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key
)
select u.id, '${escapeSqlString(def.name)}', '${def.type}', ${sqlNullableString(def.color)}, ${def.sortOrder}, true, '${def.key}'
from auth.users u
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  import_keywords = ${sqlTextArray(def.importKeywords)};`;
      }
      return `insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
)
select u.id, '${escapeSqlString(def.name)}', '${def.type}', ${sqlNullableString(def.color)}, ${def.sortOrder}, true, '${def.key}', p.id, ${sqlTextArray(def.importKeywords)}
from auth.users u
join public.categories p
  on p.user_id = u.id and p.default_key = '${def.parentKey}'
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  import_keywords = excluded.import_keywords;`;
    })
    .join("\n\n");
}

function pgVarName(key: string): string {
  return `cat_${key}`;
}

function buildHandleNewUserSql(
  defs: (DefaultCategoryDef & { sortOrder: number })[],
): string {
  const declarations = defs
    .map((def) => `  ${pgVarName(def.key)} uuid;`)
    .join("\n");

  const inserts = defs
    .map((def) => {
      const parentIdExpr = def.parentKey ? pgVarName(def.parentKey) : "null";
      return `  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '${escapeSqlString(def.name)}', '${def.type}', ${sqlNullableString(def.color)}, ${def.sortOrder}, true, '${def.key}', ${parentIdExpr}, ${sqlTextArray(def.importKeywords)}
  ) returning id into ${pgVarName(def.key)};`;
    })
    .join("\n");

  return `create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
${declarations}
begin
${inserts}

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;`;
}

function nextTimestamp(): string {
  const existing = readdirSync(migrationsDir)
    .filter((name) => /^\d{14}_/.test(name))
    .map((name) => name.slice(0, 14))
    .sort();
  const latest = existing.at(-1);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  let candidate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  if (latest && candidate <= latest) {
    candidate = String(Number(latest) + 1).padStart(14, "0");
  }
  return candidate;
}

function main() {
  const ordered = withSortOrder(topologicallyOrdered(DEFAULT_CATEGORIES));

  const sql = `-- src/consts/default-categories.ts から自動生成。
-- 手動編集せず、定義ファイルを変更して
-- \`bun scripts/generate-default-categories-migration.ts\` を再実行すること。

-- protect_default_category トリガーはis_default行の内容変更を拒否するため、
-- このファイル自身によるデフォルトカテゴリの同期中は一時的に無効化する。
alter table public.categories disable trigger protect_default_category;

${buildReconciliationSql(ordered)}

alter table public.categories enable trigger protect_default_category;

${buildHandleNewUserSql(ordered)}
`;

  mkdirSync(migrationsDir, { recursive: true });
  const fileName = `${nextTimestamp()}_sync_default_categories.sql`;
  const filePath = join(migrationsDir, fileName);
  writeFileSync(filePath, sql);
  console.log(`generated: supabase/migrations/${fileName}`);
}

main();
