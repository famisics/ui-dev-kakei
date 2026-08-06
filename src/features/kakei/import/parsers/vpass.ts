import { pad, readCsvCp932, toInt, toParsedTransaction } from "../csv";
import type { ParsedTransaction } from "../types";

/**
 * 三井住友カード Vpass の CSV 明細（Shift_JIS）をパースする。
 * 列: 日付, 内容, 利用金額, 支払区分(分割回数), (未使用), 今回支払金額, [メモ]。
 * 先頭行はヘッダ。日付が空の行はスキップ（末尾の合計行等）。
 * 元データの符号（今回支払金額）で収入/支出を判定し、amount は絶対値を格納する。
 */
export function parseVpass(fileBuffer: Buffer): ParsedTransaction[] {
  const rows = readCsvCp932(fileBuffer);
  const transactions: ParsedTransaction[] = [];
  for (const row of rows.slice(1)) {
    if (row.length === 0 || !row[0].trim()) continue;
    const [date, desc, , , , paid] = pad(row, 6);
    transactions.push(toParsedTransaction(date, desc, toInt(paid)));
  }
  return transactions;
}
