import { describe, expect, it } from "vitest";
import { parseJcb } from "./jcb";

// UTF-8で書いた以下のCSV相当をSHIFT-JISでエンコードしたバイト列（iconvで変換して生成）。
// ご利用者,,,,,,,,,
// ,,2024/06/01,テスト店舗A,1000,1回,1,,1000,
// ,,2024/06/02,返金店舗B,500,1回,1,,-500,
const SAMPLE_HEX =
  "82b2979897708ed22c2c2c2c2c2c2c2c2c0a2c2c323032342f30362f30312c836583588367935895dc412c313030302c3189f12c312c2c313030302c0a2c2c323032342f30362f30322c95d48be0935895dc422c3530302c3189f12c312c2c2d3530302c0a";

describe("parseJcb", () => {
  it("利用明細行から日付・金額・種別を抽出する", () => {
    const buffer = Buffer.from(SAMPLE_HEX, "hex");
    const result = parseJcb(buffer);

    expect(result).toEqual([
      {
        date: "2024-06-01",
        description: "テスト店舗A",
        amount: 1000,
        type: "expense",
      },
      {
        date: "2024-06-02",
        description: "返金店舗B",
        amount: 500,
        type: "income",
      },
    ]);
  });
});
