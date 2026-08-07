export const IMPORT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 明細内での日付の並び順（昇順/降順）を判定し、同じ日付の行の中で
 * どれが「一番最新」かを示すランク（0が最新）を行インデックスごとに返す。
 * カード会社ごとにファイル内の並び順（新→旧か旧→新か）が異なるため、
 * 先頭行と末尾行の日付を比較して都度判定する。
 */
export function computeDateRanks(rows: { date: string }[]): number[] {
  const validDates = rows
    .map((row) => row.date)
    .filter((date) => IMPORT_DATE_RE.test(date));
  const ascending =
    validDates.length >= 2 &&
    validDates[0] <= validDates[validDates.length - 1];

  const ranks = new Array<number>(rows.length).fill(0);
  const countByDate = new Map<string, number>();
  const indices = ascending ? [...rows.keys()].reverse() : [...rows.keys()];
  for (const index of indices) {
    const date = rows[index].date;
    if (!IMPORT_DATE_RE.test(date)) continue;
    const rank = countByDate.get(date) ?? 0;
    ranks[index] = rank;
    countByDate.set(date, rank + 1);
  }
  return ranks;
}
