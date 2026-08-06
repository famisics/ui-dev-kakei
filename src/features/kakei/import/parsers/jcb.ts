import { pad, readCsvCp932, toInt, toParsedTransaction } from "../csv";
import type { CardParser, ParsedTransaction } from "../types";

/**
 * JCB カード明細 CSV（cp932）のパーサー。[ご利用者] ヘッダ行の後、[ご利用明細]
 * セクションの行を取引として読む。列: _, _, 日付, 利用店名, 利用金額, 支払方法,
 * 今回回数, _, 今回回数分の金額, 海外利用区分。
 * 元データの符号（今回回数分の金額）から収入/支出を判定し、amount は絶対値で返す。
 */
export const parseJcb: CardParser = (
  fileBuffer: Buffer,
): ParsedTransaction[] => {
  const rows = readCsvCp932(fileBuffer);
  const transactions: ParsedTransaction[] = [];
  let inDetail = false;
  for (const row of rows) {
    if (row.length && row[0] === "ご利用者") {
      inDetail = true;
      continue;
    }
    if (!inDetail || row.length < 9 || !row[2]?.trim()) continue;
    const [, , date, shop, , , , , paid] = pad(row, 10);
    transactions.push(toParsedTransaction(date, shop, toInt(paid)));
  }
  return transactions;
};
