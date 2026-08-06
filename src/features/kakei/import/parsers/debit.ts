import { pad, readCsvCp932, toInt, toParsedTransaction } from "../csv";
import type { ParsedTransaction } from "../types";

/**
 * デビットカードの CSV 明細（Shift_JIS）をパースする。
 * 1行目はヘッダ（先頭列が"1"）、データ行は先頭列が"2"。
 * 列: (区分), 日付, 内容, (未使用), 利用金額, ... 。
 * 元データの符号（利用金額）で収入/支出を判定し、amount は絶対値を格納する。
 */
export function parseDebit(fileBuffer: Buffer): ParsedTransaction[] {
  const rows = readCsvCp932(fileBuffer);
  const transactions: ParsedTransaction[] = [];
  for (const row of rows) {
    if (row.length === 0 || row[0].trim() !== "2") continue;
    const [, date, desc, , amt] = pad(row, 12);
    transactions.push(toParsedTransaction(date, desc, toInt(amt)));
  }
  return transactions;
}
