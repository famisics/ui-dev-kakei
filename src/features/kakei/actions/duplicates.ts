"use server";

import { revalidatePath } from "next/cache";
import type { Transaction } from "@/features/kakei/db/types";
import { normalizePayee } from "@/features/kakei/import/normalize";
import { buildImportSourceLinksByTransactionId } from "@/features/kakei/lib/import-source-map";
import { getAuthedUserId } from "@/lib/supabase/auth";

export type DuplicateTransaction = Transaction & {
  importSourceName: string | null;
};

export type DuplicateGroup = {
  key: string;
  transactions: DuplicateTransaction[];
};

export async function findDuplicateGroups(
  matchDescription: boolean,
): Promise<DuplicateGroup[]> {
  const { supabase, userId } = await getAuthedUserId();
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (transactions.length === 0) return [];

  const importSourceLinks = await buildImportSourceLinksByTransactionId(
    supabase,
    userId,
    transactions.map((t) => t.id),
  );

  const groups = new Map<string, DuplicateTransaction[]>();
  for (const transaction of transactions) {
    const keyParts: (string | number)[] = [
      transaction.date,
      transaction.amount,
      transaction.type,
    ];
    if (matchDescription) {
      keyParts.push(normalizePayee(transaction.description ?? ""));
    }
    const key = keyParts.join("|");

    const decorated: DuplicateTransaction = {
      ...transaction,
      importSourceName:
        importSourceLinks.get(transaction.id)?.importSourceName ?? null,
    };
    const group = groups.get(key);
    if (group) {
      group.push(decorated);
    } else {
      groups.set(key, [decorated]);
    }
  }

  return Array.from(groups.entries())
    .filter(([, txs]) => txs.length > 1)
    .map(([key, txs]) => ({ key, transactions: txs }))
    .sort((a, b) => (a.transactions[0].date < b.transactions[0].date ? 1 : -1));
}

export async function resolveDuplicateGroup(
  keepId: string,
  deleteIds: string[],
) {
  const { supabase, userId } = await getAuthedUserId();
  if (deleteIds.includes(keepId)) {
    throw new Error("残す取引が削除対象に含まれています。");
  }

  const { error: entryError } = await supabase
    .from("statement_entries")
    .delete()
    .in("transaction_id", deleteIds)
    .eq("user_id", userId);
  if (entryError) throw entryError;

  const { error: transactionError } = await supabase
    .from("transactions")
    .delete()
    .in("id", deleteIds)
    .eq("user_id", userId);
  if (transactionError) throw transactionError;

  revalidatePath("/duplicates");
  revalidatePath("/");
}
