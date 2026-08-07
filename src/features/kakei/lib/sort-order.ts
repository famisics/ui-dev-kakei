import type { getAuthedUserId } from "@/lib/supabase/auth";

type SupabaseClient = Awaited<ReturnType<typeof getAuthedUserId>>["supabase"];

/**
 * 指定した日付それぞれについて、その日付に属する取引の最小 sort_order を返す。
 * 該当行がない日付はマップに含まれない。
 */
export async function fetchMinSortOrderByDate(
  supabase: SupabaseClient,
  userId: string,
  dates: Iterable<string>,
): Promise<Map<string, number>> {
  const dateList = Array.from(new Set(dates));
  if (dateList.length === 0) return new Map();
  const { data, error } = await supabase
    .from("transactions")
    .select("date, sort_order")
    .eq("user_id", userId)
    .in("date", dateList);
  if (error) throw error;
  const minByDate = new Map<string, number>();
  for (const row of data) {
    const current = minByDate.get(row.date);
    if (current === undefined || row.sort_order < current) {
      minByDate.set(row.date, row.sort_order);
    }
  }
  return minByDate;
}

/** 指定した日付の取引の中で一番上（最小の sort_order より1つ小さい値）を返す。 */
export async function nextTopSortOrder(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<number> {
  const minByDate = await fetchMinSortOrderByDate(supabase, userId, [date]);
  const min = minByDate.get(date);
  return min === undefined ? 0 : min - 1;
}
