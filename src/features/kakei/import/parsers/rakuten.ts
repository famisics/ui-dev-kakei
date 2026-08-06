import { extractText } from "unpdf";
import { toInt, toParsedTransaction } from "../csv";
import type { CardParser, ParsedTransaction } from "../types";

// 楽天カードPDF明細の1行の列: 日付, 利用店名, 利用者(本人*/家族*), 支払方法,
// 利用金額, 手数料/利息, 支払総額, 今回支払金額, 翌月繰越残高。
// 返品等は先頭にマイナスが付くため、すべての数値列でマイナスを許容する。
const RAKUTEN_ROW =
  /^(\d{4}\/\d{2}\/\d{2})\s+(.+?)\s+(本人\S*|家族\S*)\s+(\S+)\s+(-?[\d,]+)\s+(-?[\d,]+)\s+(-?[\d,]+)\s+(-?[\d,]+)\s+(-?[\d,]+)\s*$/;
// 口座振替=請求金額の振替行、ポイント=ポイント利用行、請求確定日=集計欄の見出し行。
// いずれも取引明細ではないため除外する。
const RAKUTEN_NON_DETAIL = ["口座振替", "ポイント", "請求確定日"];

/**
 * 楽天カードPDF明細のテキストから取引を抽出する（unpdf での抽出後の文字列に対する純粋関数）。
 * 元データの符号（今回支払金額）から収入/支出を判定し、amount は絶対値を格納する。
 */
export function parseRakutenText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (const line of text.split("\n")) {
    if (!/^\s*\d{4}\/\d{2}\/\d{2}\b/.test(line)) continue;
    if (RAKUTEN_NON_DETAIL.some((k) => line.includes(k))) continue;
    const m = line.trim().match(RAKUTEN_ROW);
    if (!m) continue;
    const [, date, shop, , , , , , billedS] = m;
    transactions.push(toParsedTransaction(date, shop, toInt(billedS)));
  }
  return transactions;
}

/** 楽天カードPDF明細をunpdfでテキスト抽出し、取引としてパースする。 */
export const parseRakuten: CardParser = async (
  fileBuffer: Buffer,
): Promise<ParsedTransaction[]> => {
  const { text } = await extractText(new Uint8Array(fileBuffer), {
    mergePages: true,
  });
  return parseRakutenText(text);
};
