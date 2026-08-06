import { describe, expect, it } from "vitest";
import { computeImportHash } from "./hash";

describe("computeImportHash", () => {
  it("同じ入力からは同じハッシュを算出する", () => {
    const a = computeImportHash("source-1", "2024-06-01", 1000, "テスト店舗");
    const b = computeImportHash("source-1", "2024-06-01", 1000, "テスト店舗");
    expect(a).toBe(b);
  });

  it("表記揺れのある店舗名でも同じハッシュになる", () => {
    const a = computeImportHash("source-1", "2024-06-01", 1000, "ﾃｽﾄ ﾃﾞﾊﾟｰﾄ");
    const b = computeImportHash(
      "source-1",
      "2024-06-01",
      1000,
      "テスト　デパート",
    );
    expect(a).toBe(b);
  });

  it("取込元IDが異なれば別のハッシュになる", () => {
    const a = computeImportHash("source-1", "2024-06-01", 1000, "テスト店舗");
    const b = computeImportHash("source-2", "2024-06-01", 1000, "テスト店舗");
    expect(a).not.toBe(b);
  });

  it("日付・金額・店舗名のいずれが異なっても別のハッシュになる", () => {
    const base = computeImportHash(
      "source-1",
      "2024-06-01",
      1000,
      "テスト店舗",
    );
    expect(
      computeImportHash("source-1", "2024-06-02", 1000, "テスト店舗"),
    ).not.toBe(base);
    expect(
      computeImportHash("source-1", "2024-06-01", 2000, "テスト店舗"),
    ).not.toBe(base);
    expect(
      computeImportHash("source-1", "2024-06-01", 1000, "他の店舗"),
    ).not.toBe(base);
  });
});
