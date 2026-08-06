import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** 認証ユーザーのSupabaseクライアントとuserIdを返す。同一リクエスト内での重複呼び出しはキャッシュされる。 */
export const getAuthedUserId = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("認証が必要です");
  }
  return { supabase, userId: data.user.id };
});
