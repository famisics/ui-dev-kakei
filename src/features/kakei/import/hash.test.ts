import { describe, expect, it } from "vitest";
import { computeEntryKey, computeFingerprint } from "./hash";

describe("computeFingerprint", () => {
  it("同じ入力からは同じフィンガープリントを算出する", () => {
    const a = computeFingerprint("2024-06-01", 1000, "expense", "テスト店舗");
    const b = computeFingerprint("2024-06-01", 1000, "expense", "テスト店舗");
    expect(a).toBe(b);
  });

  it("表記揺れのある店舗名でも同じフィンガープリントになる", () => {
    const a = computeFingerprint("2024-06-01", 1000, "expense", "ﾃｽﾄ ﾃﾞﾊﾟｰﾄ");
    const b = computeFingerprint(
      "2024-06-01",
      1000,
      "expense",
      "テスト　デパート",
    );
    expect(a).toBe(b);
  });

  it("日付・金額・種別・店舗名のいずれが異なっても別のフィンガープリントになる", () => {
    const base = computeFingerprint(
      "2024-06-01",
      1000,
      "expense",
      "テスト店舗",
    );
    expect(
      computeFingerprint("2024-06-02", 1000, "expense", "テスト店舗"),
    ).not.toBe(base);
    expect(
      computeFingerprint("2024-06-01", 2000, "expense", "テスト店舗"),
    ).not.toBe(base);
    expect(
      computeFingerprint("2024-06-01", 1000, "income", "テスト店舗"),
    ).not.toBe(base);
    expect(
      computeFingerprint("2024-06-01", 1000, "expense", "他の店舗"),
    ).not.toBe(base);
  });
});

describe("computeEntryKey", () => {
  it("externalIdがあれば取込元IDとexternalIdだけで決まる", () => {
    const a = computeEntryKey({
      importSourceId: "source-1",
      fingerprint: "fp-1",
      occurrence: 1,
      externalId: "ext-1",
    });
    const b = computeEntryKey({
      importSourceId: "source-1",
      fingerprint: "fp-2",
      occurrence: 2,
      externalId: "ext-1",
    });
    expect(a).toBe(b);
  });

  it("externalIdがなければ取込元ID・フィンガープリント・occurrenceで決まる", () => {
    const a = computeEntryKey({
      importSourceId: "source-1",
      fingerprint: "fp-1",
      occurrence: 1,
    });
    const b = computeEntryKey({
      importSourceId: "source-1",
      fingerprint: "fp-1",
      occurrence: 2,
    });
    expect(a).not.toBe(b);
  });
});
