-- src/consts/default-categories.ts から自動生成。
-- 手動編集せず、定義ファイルを変更して
-- `bun scripts/generate-default-categories-migration.ts` を再実行すること。

-- protect_default_category トリガーはis_default行の内容変更を拒否するため、
-- このファイル自身によるデフォルトジャンルの同期中は一時的に無効化する。
alter table public.categories disable trigger protect_default_category;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key
)
select u.id, '生活費', 'expense', '#22c55e', 0, true, 'living'
from auth.users u
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  import_keywords = null;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key
)
select u.id, '娯楽', 'expense', '#ef4444', 1, true, 'entertainment'
from auth.users u
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  import_keywords = null;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key
)
select u.id, 'その他', 'expense', '#eab308', 2, true, 'other_expense'
from auth.users u
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  import_keywords = array['パルコ','ルミネ','ダイマル','ヘップ','キャナル','コピス','ウイングベイ','スクランブルスクエア','フードショー','AMAZON','アマゾン','楽天','ラクテン','メルカリ','MONOTARO','モノタロウ','RAKSUL','ラクスル','テンガ','スイッチボット','ラブメルシ','イラナイマクラ'];

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key
)
select u.id, '給与', 'income', null, 0, true, 'salary'
from auth.users u
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  import_keywords = null;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key
)
select u.id, '仕送り', 'income', null, 1, true, 'remittance'
from auth.users u
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  import_keywords = null;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key
)
select u.id, '臨時収入', 'income', null, 2, true, 'windfall'
from auth.users u
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  import_keywords = null;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
)
select u.id, '外食費', 'expense', '#22c55e', 0, true, 'dining_out', p.id, array['マクドナルド','ラーメン','チュウカソバ','ウドン','ヤマオカヤ','丸亀','マルガメ','ガスト','ジョナサン','バーガーキング','ヨシノヤ','吉野家','YOSHINOYA','サイゼリヤ','スシロー','はま寿司','HAMAZUSHI','ハマズシ','スターバックス','コメダ','コーヒー','食堂','ギュウカク','GYUKAKU','ケンタッキー','ビックリドンキ','ツケメン','松屋','マツヤ','ナカウ','ミスタードーナツ','ミスド','ピザハット','ドミノピザ','キッチンオリジン','マリオンクレープ','ウシノヤ','油堂','アブラトウ','ブブカ','チョップス','キッチンメープル','アラシヤマチャヤ','カンダダルマ','イチバンガイ','グランスタ','エキュート','旬味館','ケンバイキ']
from auth.users u
join public.categories p
  on p.user_id = u.id and p.default_key = 'living'
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  import_keywords = excluded.import_keywords;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
)
select u.id, '日用品', 'expense', '#22c55e', 1, true, 'daily_goods', p.id, array['セブン','ローソン','セイコーマート','ファミリーマート','FAMILYMART','ミニストップ','NEWDAYS','ナチュラルローソン','キヨスク','JRCROSS','自販機','ジハンキ','自動販売','ジドウハンバイ','ユウビン','サガワ','ドンキホーテ','ムジルシ','ニトリ','ダイソー','セリア','ツルハ','サンドラッグ','ドラッグ','マツモトキヨシ','ウエルシア','ココカラ','ヤッキョク','コクミン','アークス','ホクレン','イオン','ヨドバシ','セイユウ','コープ','セイキョウ','ビッグハウス','ハセガワストア','シャトレーゼ','ディーシーエム','ヒャッカテン','ハンズ','ヤクルト','オダキュウオ','ハマダデンキ']
from auth.users u
join public.categories p
  on p.user_id = u.id and p.default_key = 'living'
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  import_keywords = excluded.import_keywords;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
)
select u.id, '交通費', 'expense', '#22c55e', 2, true, 'transportation', p.id, array['スイカ','SUICA','パスモ','PASMO','タイムズカー','リパーク','タクシー','GOアプリ','ゴアプリ','バス','チカテツ','コウツウ','ジェイアール','イサリビ','ジョウシャ','モダセキユ']
from auth.users u
join public.categories p
  on p.user_id = u.id and p.default_key = 'living'
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  import_keywords = excluded.import_keywords;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
)
select u.id, '温泉', 'expense', '#22c55e', 3, true, 'hot_spring', p.id, array['オンセン']
from auth.users u
join public.categories p
  on p.user_id = u.id and p.default_key = 'living'
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  import_keywords = excluded.import_keywords;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
)
select u.id, '光熱費・通信費', 'expense', '#22c55e', 4, true, 'utilities_communication', p.id, array['POVO','ポヴォ','ニホンツウシン','JAPAN COMMUNICATIONS','ホッカイドウデンリ']
from auth.users u
join public.categories p
  on p.user_id = u.id and p.default_key = 'living'
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  import_keywords = excluded.import_keywords;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
)
select u.id, '医療', 'expense', '#22c55e', 5, true, 'medical', p.id, array['クリニック','ヒフカ','チョウザイ','インコウカ','ビョウイン','歯科','イイン']
from auth.users u
join public.categories p
  on p.user_id = u.id and p.default_key = 'living'
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  import_keywords = excluded.import_keywords;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
)
select u.id, 'サブスク', 'expense', '#ef4444', 0, true, 'subscription', p.id, array['CLAUDE','SPOTIFY','YOUTUBE','APPLE','アップル','GOOGLE','グーグル','CHATGPT','OPENAI','1PASSWORD','VERCEL','CURSOR','GITHUB','STEAM','HOYOVERSE','DISCORD','ADOBE','NETFLIX','CLOUDFLARE','TURSO','SURFSHARK','PADDLE','ITCH.IO','DMM','ディーエムエム','モリサワ','SQUARE ENIX','プライム','ネツトフリツクス','アベマ','ABEMA','UNCLUTTER','PIXIV','クリプトン']
from auth.users u
join public.categories p
  on p.user_id = u.id and p.default_key = 'entertainment'
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  import_keywords = excluded.import_keywords;

insert into public.categories (
  user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
)
select u.id, '旅行', 'expense', '#ef4444', 1, true, 'travel', p.id, array['JAL','ジャル','ANA','エーエヌエー','ジェットスター','エアドゥ','ピーチアビエ','空港','クウコウ','航空','コウクウ','スカイショップ','ニュースター','NEWSTAR','スカイライナー','エキネット','ホテル','キングダム','AGODA','ミチノエキ','ブッサンカン','ヤツハシ','ウミホタル','北彩館','レンガテラス','オミヤゲ','ミソギノサト']
from auth.users u
join public.categories p
  on p.user_id = u.id and p.default_key = 'entertainment'
on conflict (user_id, default_key) where default_key is not null do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  import_keywords = excluded.import_keywords;

alter table public.categories enable trigger protect_default_category;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cat_living uuid;
  cat_entertainment uuid;
  cat_other_expense uuid;
  cat_salary uuid;
  cat_remittance uuid;
  cat_windfall uuid;
  cat_dining_out uuid;
  cat_daily_goods uuid;
  cat_transportation uuid;
  cat_hot_spring uuid;
  cat_utilities_communication uuid;
  cat_medical uuid;
  cat_subscription uuid;
  cat_travel uuid;
begin
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '生活費', 'expense', '#22c55e', 0, true, 'living', null, null
  ) returning id into cat_living;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '娯楽', 'expense', '#ef4444', 1, true, 'entertainment', null, null
  ) returning id into cat_entertainment;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, 'その他', 'expense', '#eab308', 2, true, 'other_expense', null, array['パルコ','ルミネ','ダイマル','ヘップ','キャナル','コピス','ウイングベイ','スクランブルスクエア','フードショー','AMAZON','アマゾン','楽天','ラクテン','メルカリ','MONOTARO','モノタロウ','RAKSUL','ラクスル','テンガ','スイッチボット','ラブメルシ','イラナイマクラ']
  ) returning id into cat_other_expense;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '給与', 'income', null, 0, true, 'salary', null, null
  ) returning id into cat_salary;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '仕送り', 'income', null, 1, true, 'remittance', null, null
  ) returning id into cat_remittance;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '臨時収入', 'income', null, 2, true, 'windfall', null, null
  ) returning id into cat_windfall;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '外食費', 'expense', '#22c55e', 0, true, 'dining_out', cat_living, array['マクドナルド','ラーメン','チュウカソバ','ウドン','ヤマオカヤ','丸亀','マルガメ','ガスト','ジョナサン','バーガーキング','ヨシノヤ','吉野家','YOSHINOYA','サイゼリヤ','スシロー','はま寿司','HAMAZUSHI','ハマズシ','スターバックス','コメダ','コーヒー','食堂','ギュウカク','GYUKAKU','ケンタッキー','ビックリドンキ','ツケメン','松屋','マツヤ','ナカウ','ミスタードーナツ','ミスド','ピザハット','ドミノピザ','キッチンオリジン','マリオンクレープ','ウシノヤ','油堂','アブラトウ','ブブカ','チョップス','キッチンメープル','アラシヤマチャヤ','カンダダルマ','イチバンガイ','グランスタ','エキュート','旬味館','ケンバイキ']
  ) returning id into cat_dining_out;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '日用品', 'expense', '#22c55e', 1, true, 'daily_goods', cat_living, array['セブン','ローソン','セイコーマート','ファミリーマート','FAMILYMART','ミニストップ','NEWDAYS','ナチュラルローソン','キヨスク','JRCROSS','自販機','ジハンキ','自動販売','ジドウハンバイ','ユウビン','サガワ','ドンキホーテ','ムジルシ','ニトリ','ダイソー','セリア','ツルハ','サンドラッグ','ドラッグ','マツモトキヨシ','ウエルシア','ココカラ','ヤッキョク','コクミン','アークス','ホクレン','イオン','ヨドバシ','セイユウ','コープ','セイキョウ','ビッグハウス','ハセガワストア','シャトレーゼ','ディーシーエム','ヒャッカテン','ハンズ','ヤクルト','オダキュウオ','ハマダデンキ']
  ) returning id into cat_daily_goods;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '交通費', 'expense', '#22c55e', 2, true, 'transportation', cat_living, array['スイカ','SUICA','パスモ','PASMO','タイムズカー','リパーク','タクシー','GOアプリ','ゴアプリ','バス','チカテツ','コウツウ','ジェイアール','イサリビ','ジョウシャ','モダセキユ']
  ) returning id into cat_transportation;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '温泉', 'expense', '#22c55e', 3, true, 'hot_spring', cat_living, array['オンセン']
  ) returning id into cat_hot_spring;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '光熱費・通信費', 'expense', '#22c55e', 4, true, 'utilities_communication', cat_living, array['POVO','ポヴォ','ニホンツウシン','JAPAN COMMUNICATIONS','ホッカイドウデンリ']
  ) returning id into cat_utilities_communication;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '医療', 'expense', '#22c55e', 5, true, 'medical', cat_living, array['クリニック','ヒフカ','チョウザイ','インコウカ','ビョウイン','歯科','イイン']
  ) returning id into cat_medical;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, 'サブスク', 'expense', '#ef4444', 0, true, 'subscription', cat_entertainment, array['CLAUDE','SPOTIFY','YOUTUBE','APPLE','アップル','GOOGLE','グーグル','CHATGPT','OPENAI','1PASSWORD','VERCEL','CURSOR','GITHUB','STEAM','HOYOVERSE','DISCORD','ADOBE','NETFLIX','CLOUDFLARE','TURSO','SURFSHARK','PADDLE','ITCH.IO','DMM','ディーエムエム','モリサワ','SQUARE ENIX','プライム','ネツトフリツクス','アベマ','ABEMA','UNCLUTTER','PIXIV','クリプトン']
  ) returning id into cat_subscription;
  insert into public.categories (
    user_id, name, type, color, sort_order, is_default, default_key, parent_id, import_keywords
  ) values (
    new.id, '旅行', 'expense', '#ef4444', 1, true, 'travel', cat_entertainment, array['JAL','ジャル','ANA','エーエヌエー','ジェットスター','エアドゥ','ピーチアビエ','空港','クウコウ','航空','コウクウ','スカイショップ','ニュースター','NEWSTAR','スカイライナー','エキネット','ホテル','キングダム','AGODA','ミチノエキ','ブッサンカン','ヤツハシ','ウミホタル','北彩館','レンガテラス','オミヤゲ','ミソギノサト']
  ) returning id into cat_travel;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
