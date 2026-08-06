import { describe, expect, it } from "vitest";
import { normalizePayee } from "./normalize";

describe("normalizePayee", () => {
  it("同じ入力からは同じ結果になる", () => {
    expect(normalizePayee("テスト店舗")).toBe(normalizePayee("テスト店舗"));
  });

  it("空白・長音符・ハイフンを除去する", () => {
    expect(normalizePayee("テスト　店舗ー1")).toBe(
      normalizePayee("テスト店舗1"),
    );
  });

  it("ひらがなをカタカナに変換する", () => {
    expect(normalizePayee("てすと")).toBe("テスト");
  });

  it("小書きカタカナを大書きに変換する（ひらがな→カタカナ変換後も畳み込む）", () => {
    expect(normalizePayee("ぁぃぅぇぉ")).toBe("アイウエオ");
    expect(normalizePayee("ァィゥェォ")).toBe("アイウエオ");
  });

  it("大文字化する", () => {
    expect(normalizePayee("test shop")).toBe("TESTSHOP");
  });
});
