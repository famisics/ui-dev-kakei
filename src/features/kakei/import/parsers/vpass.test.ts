import { describe, expect, it } from "vitest";
import { parseVpass } from "./vpass";

function toCp932Buffer(text: string): Buffer {
  // ASCII/半角数字のみのサンプルなので UTF-8 として書いても cp932 として読める。
  return Buffer.from(text, "utf-8");
}

describe("parseVpass", () => {
  it("日付・金額・種別を正しく抽出する", () => {
    const csv = [
      "利用日,利用店名,利用金額,支払方法,今後の予定,今回支払金額,備考",
      "2024/05/01,AMAZON.CO.JP,3000,1,,3000,",
      "2024/05/03,ANNAI RETURN,-1500,1,,-1500,返金",
      ",,,,,15000,",
    ].join("\n");

    const result = parseVpass(toCp932Buffer(csv));

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
