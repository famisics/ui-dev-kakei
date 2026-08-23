import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/features/kakei/db/types";

export type ImportSourceLink = {
  importSourceId: string;
  importSourceName: string | null;
};

/**
 * 取引IDごとに、紐付くカード明細のインポート元ID・名前を引くマップを作る。
 * 明細に紐付かない取引はマップに含まれない。
 */
export async function buildImportSourceLinksByTransactionId(
  supabase: SupabaseClient<Database>,
  userId: string,
  transactionIds: string[],
): Promise<Map<string, ImportSourceLink>> {
  if (transactionIds.length === 0) return new Map();

  const [
    { data: entries, error: entriesError },
    { data: sources, error: sourcesError },
  ] = await Promise.all([
    supabase
      .from("statement_entries")
      .select("transaction_id, import_source_id")
      .eq("user_id", userId)
      .in("transaction_id", transactionIds),
    supabase.from("import_sources").select("id, name").eq("user_id", userId),
  ]);
  if (entriesError) throw entriesError;
  if (sourcesError) throw sourcesError;

  const sourceNameById = new Map(sources.map((s) => [s.id, s.name]));
  return new Map(
    entries.map((e) => [
      e.transaction_id,
      {
        importSourceId: e.import_source_id,
        importSourceName: sourceNameById.get(e.import_source_id) ?? null,
      },
    ]),
  );
}
