update public.categories set import_keywords = array['セブン','ローソン','セイコーマート','ファミリーマート','FAMILYMART','ミニストップ','NEWDAYS','ナチュラルローソン','キヨスク','JRCROSS','自販機','ジハンキ','自動販売','ジドウハンバイ','ユウビン','サガワ','ドンキホーテ','ムジルシ','ニトリ','ダイソー','セリア','ツルハ','サンドラッグ','ドラッグ','マツモトキヨシ','ウエルシア','ココカラ','ヤッキョク','コクミン','アークス','ホクレン','イオン','ヨドバシ','セイユウ','コープ','セイキョウ','ビッグハウス','ハセガワストア','シャトレーゼ','ディーシーエム','ヒャッカテン','ハンズ','ヤクルト','オダキュウオ','ハマダデンキ'] where is_default and name = '日用品';

update public.categories set import_keywords = array['JAL','ジャル','ANA','エーエヌエー','ジェットスター','エアドゥ','ピーチアビエ','空港','クウコウ','航空','コウクウ','スカイショップ','ニュースター','NEWSTAR','スカイライナー','エキネット','ホテル','キングダム','AGODA','ミチノエキ','ブッサンカン','ヤツハシ','ウミホタル','北彩館','レンガテラス','オミヤゲ','ミソギノサト'] where is_default and name = '旅行';

update public.categories set import_keywords = array['スイカ','SUICA','パスモ','PASMO','タイムズカー','リパーク','タクシー','GOアプリ','ゴアプリ','バス','チカテツ','コウツウ','ジェイアール','イサリビ','ジョウシャ','モダセキユ'] where is_default and name = '交通費';

update public.categories set import_keywords = array['POVO','ポヴォ','ニホンツウシン','JAPAN COMMUNICATIONS','ホッカイドウデンリ'] where is_default and name = '光熱費・通信費';

update public.categories set import_keywords = array['クリニック','ヒフカ','チョウザイ','インコウカ','ビョウイン','歯科','イイン'] where is_default and name = '医療';

update public.categories set import_keywords = array['ABLETON','SPLICE','XFER','サウンドハウス','ボークス','コトブキヤ','アストップ','トレーダー','ソフマップ','ジーストア','ZSTORE','ブース','タワーレコード','エイチエムヴィ','シネマ','ディズニー','カラオケ','歌屋','ビジュツカン','ミュージアム','ハクブツカン','チケット','ライブポケット','イープラス','ZAIKO','ザイコ','ぴあ','バルトナイン','カイカツ'] where is_default and name = '娯楽';

update public.categories set import_keywords = array['オンセン'] where is_default and name = '温泉';

update public.categories set import_keywords = array['マクドナルド','ラーメン','チュウカソバ','ウドン','ヤマオカヤ','丸亀','マルガメ','ガスト','ジョナサン','バーガーキング','ヨシノヤ','吉野家','YOSHINOYA','サイゼリヤ','スシロー','はま寿司','HAMAZUSHI','ハマズシ','スターバックス','コメダ','コーヒー','食堂','ギュウカク','GYUKAKU','ケンタッキー','ビックリドンキ','ツケメン','松屋','マツヤ','ナカウ','ミスタードーナツ','ミスド','ピザハット','ドミノピザ','キッチンオリジン','マリオンクレープ','ウシノヤ','油堂','アブラトウ','ブブカ','チョップス','キッチンメープル','アラシヤマチャヤ','カンダダルマ','イチバンガイ','グランスタ','エキュート','旬味館','ケンバイキ'] where is_default and name = '外食費';

update public.categories set import_keywords = array['CLAUDE','SPOTIFY','YOUTUBE','APPLE','アップル','GOOGLE','グーグル','CHATGPT','OPENAI','1PASSWORD','VERCEL','CURSOR','GITHUB','STEAM','HOYOVERSE','DISCORD','ADOBE','NETFLIX','CLOUDFLARE','TURSO','SURFSHARK','PADDLE','ITCH.IO','DMM','ディーエムエム','モリサワ','SQUARE ENIX','プライム','ネツトフリツクス','アベマ','ABEMA','UNCLUTTER','PIXIV','クリプトン'] where is_default and name = 'サブスク';

update public.categories set import_keywords = array['パルコ','ルミネ','ダイマル','ヘップ','キャナル','コピス','ウイングベイ','スクランブルスクエア','フードショー','AMAZON','アマゾン','楽天','ラクテン','メルカリ','MONOTARO','モノタロウ','RAKSUL','ラクスル','テンガ','スイッチボット','ラブメルシ','イラナイマクラ'] where is_default and name = 'その他';

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
    is_default,
    import_keywords
  ) values (new.id, '娯楽', 'expense', '#ef4444', 1, true, array['ABLETON','SPLICE','XFER','サウンドハウス','ボークス','コトブキヤ','アストップ','トレーダー','ソフマップ','ジーストア','ZSTORE','ブース','タワーレコード','エイチエムヴィ','シネマ','ディズニー','カラオケ','歌屋','ビジュツカン','ミュージアム','ハクブツカン','チケット','ライブポケット','イープラス','ZAIKO','ザイコ','ぴあ','バルトナイン','カイカツ'])
  returning id into entertainment_category_id;

  insert into public.categories (
    user_id,
    name,
    type,
    color,
    sort_order,
    is_default,
    import_keywords
  ) values
    (new.id, 'その他', 'expense', null, 2, true, array['パルコ','ルミネ','ダイマル','ヘップ','キャナル','コピス','ウイングベイ','スクランブルスクエア','フードショー','AMAZON','アマゾン','楽天','ラクテン','メルカリ','MONOTARO','モノタロウ','RAKSUL','ラクスル','テンガ','スイッチボット','ラブメルシ','イラナイマクラ']),
    (new.id, '給与', 'income', null, 0, true, null),
    (new.id, '仕送り', 'income', null, 1, true, null),
    (new.id, '臨時収入', 'income', null, 2, true, null);

  insert into public.categories (
    user_id,
    name,
    type,
    color,
    sort_order,
    is_default,
    parent_id,
    import_keywords
  ) values
    (new.id, '外食費', 'expense', '#22c55e', 0, true, life_category_id, array['マクドナルド','ラーメン','チュウカソバ','ウドン','ヤマオカヤ','丸亀','マルガメ','ガスト','ジョナサン','バーガーキング','ヨシノヤ','吉野家','YOSHINOYA','サイゼリヤ','スシロー','はま寿司','HAMAZUSHI','ハマズシ','スターバックス','コメダ','コーヒー','食堂','ギュウカク','GYUKAKU','ケンタッキー','ビックリドンキ','ツケメン','松屋','マツヤ','ナカウ','ミスタードーナツ','ミスド','ピザハット','ドミノピザ','キッチンオリジン','マリオンクレープ','ウシノヤ','油堂','アブラトウ','ブブカ','チョップス','キッチンメープル','アラシヤマチャヤ','カンダダルマ','イチバンガイ','グランスタ','エキュート','旬味館','ケンバイキ']),
    (new.id, '日用品', 'expense', '#22c55e', 1, true, life_category_id, array['セブン','ローソン','セイコーマート','ファミリーマート','FAMILYMART','ミニストップ','NEWDAYS','ナチュラルローソン','キヨスク','JRCROSS','自販機','ジハンキ','自動販売','ジドウハンバイ','ユウビン','サガワ','ドンキホーテ','ムジルシ','ニトリ','ダイソー','セリア','ツルハ','サンドラッグ','ドラッグ','マツモトキヨシ','ウエルシア','ココカラ','ヤッキョク','コクミン','アークス','ホクレン','イオン','ヨドバシ','セイユウ','コープ','セイキョウ','ビッグハウス','ハセガワストア','シャトレーゼ','ディーシーエム','ヒャッカテン','ハンズ','ヤクルト','オダキュウオ','ハマダデンキ']),
    (new.id, '交通費', 'expense', '#22c55e', 2, true, life_category_id, array['スイカ','SUICA','パスモ','PASMO','タイムズカー','リパーク','タクシー','GOアプリ','ゴアプリ','バス','チカテツ','コウツウ','ジェイアール','イサリビ','ジョウシャ','モダセキユ']),
    (new.id, '温泉', 'expense', '#22c55e', 3, true, life_category_id, array['オンセン']),
    (new.id, '光熱費・通信費', 'expense', '#22c55e', 4, true, life_category_id, array['POVO','ポヴォ','ニホンツウシン','JAPAN COMMUNICATIONS','ホッカイドウデンリ']),
    (new.id, '医療', 'expense', '#22c55e', 5, true, life_category_id, array['クリニック','ヒフカ','チョウザイ','インコウカ','ビョウイン','歯科','イイン']),
    (new.id, 'サブスク', 'expense', '#ef4444', 0, true, entertainment_category_id, array['CLAUDE','SPOTIFY','YOUTUBE','APPLE','アップル','GOOGLE','グーグル','CHATGPT','OPENAI','1PASSWORD','VERCEL','CURSOR','GITHUB','STEAM','HOYOVERSE','DISCORD','ADOBE','NETFLIX','CLOUDFLARE','TURSO','SURFSHARK','PADDLE','ITCH.IO','DMM','ディーエムエム','モリサワ','SQUARE ENIX','プライム','ネツトフリツクス','アベマ','ABEMA','UNCLUTTER','PIXIV','クリプトン']),
    (new.id, '旅行', 'expense', '#ef4444', 1, true, entertainment_category_id, array['JAL','ジャル','ANA','エーエヌエー','ジェットスター','エアドゥ','ピーチアビエ','空港','クウコウ','航空','コウクウ','スカイショップ','ニュースター','NEWSTAR','スカイライナー','エキネット','ホテル','キングダム','AGODA','ミチノエキ','ブッサンカン','ヤツハシ','ウミホタル','北彩館','レンガテラス','オミヤゲ','ミソギノサト']);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
