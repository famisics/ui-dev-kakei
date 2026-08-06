import type { ParsedTransaction } from "./types";

/** RFC4180 準拠の CSV パース（クォート・カンマ・改行・"" エスケープに対応）。 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Shift_JIS(cp932) エンコーディングの CSV バッファを読み、RFC4180 パースした行を返す。 */
export function readCsvCp932(fileBuffer: Buffer): string[][] {
  const text = new TextDecoder("shift_jis").decode(fileBuffer);
  return parseCsv(text);
}

/** 固定列数 n に空文字で詰めて返す（不足列の参照を安全にする）。 */
export function pad(row: string[], n: number): string[] {
  return [...row, ...Array(n).fill("")].slice(0, n);
}

/** "1,234" のような数値文字列を整数に変換する。空文字は 0。 */
export function toInt(s: string): number {
  const trimmed = (s ?? "").trim().replace(/,/g, "");
  if (!trimmed) return 0;
  return trimmed.includes(".")
    ? Math.trunc(Number.parseFloat(trimmed))
    : Number.parseInt(trimmed, 10);
}

/** "YYYY/MM/DD" 等を "YYYY-MM-DD" に変換する。 */
export function isoDate(s: string): string {
  return (s ?? "").trim().replace(/\//g, "-");
}

/**
 * 元データの符号（rawAmount）から収入/支出を判定し、amount は絶対値にした取引を組み立てる。
 * jcb/debit/rakuten/vpass の各パーサーで共通の変換。
 */
export function toParsedTransaction(
  date: string,
  description: string,
  rawAmount: number,
): ParsedTransaction {
  return {
    date: isoDate(date),
    description: description.trim(),
    amount: Math.abs(rawAmount),
    type: rawAmount < 0 ? "income" : "expense",
  };
}
