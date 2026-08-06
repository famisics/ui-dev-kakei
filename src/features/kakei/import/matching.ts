import { normalizePayee } from "./normalize";

/**
 * ファイル内で同一フィンガープリントを持つ行に、出現順で1始まりの occurrence を採番する。
 * DB上の既存登録件数との突合は呼び出し側で行う。
 */
export function assignOccurrences<T extends { fingerprint: string }>(
  rows: T[],
): (T & { occurrence: number })[] {
  const counts = new Map<string, number>();
  return rows.map((row) => {
    const occurrence = (counts.get(row.fingerprint) ?? 0) + 1;
    counts.set(row.fingerprint, occurrence);
    return { ...row, occurrence };
  });
}

export type ManualTransactionCandidate = {
  id: string;
  date: string;
  amount: number;
  type: "income" | "expense";
  description: string | null;
  memo: string | null;
};

export type MatchResult =
  | { kind: "new" }
  | { kind: "link"; transactionId: string }
  | { kind: "ambiguous"; candidates: ManualTransactionCandidate[] };

/**
 * 未登録の明細1件について、手入力取引の候補を仕様5.2の優先順位で評価する。
 */
export function findCandidates(
  row: {
    date: string;
    amount: number;
    type: "income" | "expense";
    description: string;
  },
  manualTransactions: ManualTransactionCandidate[],
): MatchResult {
  const basicMatches = manualTransactions.filter(
    (t) =>
      t.date === row.date && t.amount === row.amount && t.type === row.type,
  );
  if (basicMatches.length === 0) {
    return { kind: "new" };
  }

  const normalizedRowDescription = normalizePayee(row.description);
  const descriptionMatches = basicMatches.filter(
    (t) =>
      t.description !== null &&
      normalizePayee(t.description) === normalizedRowDescription,
  );
  if (descriptionMatches.length === 1) {
    return { kind: "link", transactionId: descriptionMatches[0].id };
  }
  if (descriptionMatches.length === 0 && basicMatches.length === 1) {
    return { kind: "link", transactionId: basicMatches[0].id };
  }
  return { kind: "ambiguous", candidates: basicMatches };
}
