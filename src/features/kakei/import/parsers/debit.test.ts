import { describe, expect, it } from "vitest";
import { parseDebit } from "./debit";

function toCp932Buffer(text: string): Buffer {
  // ASCII/半角数字のみのサンプルなので UTF-8 として書いても cp932 として読める。
  return Buffer.from(text, "utf-8");
}

describe("parseDebit", () => {
  it("日付・金額・種別を正しく抽出する", () => {
    const csv = [
      "1,ヘッダ,,,,,,,,,,",
      "2,2024/05/01,AMAZON.CO.JP,,3000,,0,0,,,,",
      "2,2024/05/03,ANNAI RETURN,,-1500,,0,0,,,,",
    ].join("\n");

    const result = parseDebit(toCp932Buffer(csv));

    expect(result).toEqual([
      {
        date: "2024-05-01",
        description: "AMAZON.CO.JP",
        amount: 3000,
        type: "expense",
      },
      {
        date: "2024-05-03",
        description: "ANNAI RETURN",
        amount: 1500,
        type: "income",
      },
    ]);
  });
});
