import { describe, expect, it } from "vitest";
import { parseRakutenText } from "./rakuten";

describe("parseRakutenText", () => {
  it("日付・金額・種別を正しく抽出し、口座振替行は除外する", () => {
    const text = [
      "2024/05/01 AMAZON.CO.JP 本人* 1回払い 3,000 0 3,000 3,000 0",
      "2024/05/03 ANNAI RETURN 本人* 1回払い -1,500 0 -1,500 -1,500 0",
      "2024/06/10 口座振替 3,000",
    ].join("\n");

    const result = parseRakutenText(text);

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
