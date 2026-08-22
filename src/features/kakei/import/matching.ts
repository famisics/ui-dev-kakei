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

/**
 * 同じ取込元に複数の累積スナップショットファイルをまとめて取り込む際、
 * ファイルごとに occurrence を採番したうえで (fingerprint, occurrence) の
 * 組でファイル選択順に重複排除して1つの明細リストに統合する。
 * 各ファイル内の occurrence は 1 始まりの連番なので、この重複排除により
 * フィンガープリントごとの件数はファイル間の最大値（＝出現番号の和集合）になる。
 */
export function mergeSnapshotFiles<T extends { fingerprint: string }>(
  files: { fileName: string; rows: T[] }[],
): (T & { occurrence: number; fileName: string })[] {
  const seen = new Set<string>();
  const merged: (T & { occurrence: number; fileName: string })[] = [];
  for (const file of files) {
    const withOccurrence = assignOccurrences(file.rows);
    for (const row of withOccurrence) {
      const key = `${row.fingerprint}:${row.occurrence}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ ...row, fileName: file.fileName });
    }
  }
  return merged;
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
