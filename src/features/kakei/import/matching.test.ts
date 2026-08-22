import { describe, expect, it } from "vitest";
import {
  assignOccurrences,
  findCandidates,
  type ManualTransactionCandidate,
  mergeSnapshotFiles,
} from "./matching";

describe("assignOccurrences", () => {
  it("同じフィンガープリントに出現順で1始まりの番号を振る", () => {
    const rows = [
      { fingerprint: "a" },
      { fingerprint: "b" },
      { fingerprint: "a" },
      { fingerprint: "a" },
    ];
    expect(assignOccurrences(rows).map((r) => r.occurrence)).toEqual([
      1, 1, 2, 3,
    ]);
  });
});

describe("mergeSnapshotFiles", () => {
  it("重なりのある複数ファイルを統合し、フィンガープリントごとの件数はファイル間の最大値になる", () => {
    const midMonth = { fileName: "mid.csv", rows: [{ fingerprint: "a" }] };
    const endMonth = {
      fileName: "end.csv",
      rows: [{ fingerprint: "a" }, { fingerprint: "a" }],
    };
    const merged = mergeSnapshotFiles([midMonth, endMonth]);
    expect(
      merged.map((r) => ({ occurrence: r.occurrence, fileName: r.fileName })),
    ).toEqual([
      { occurrence: 1, fileName: "mid.csv" },
      { occurrence: 2, fileName: "end.csv" },
    ]);
  });

  it("重なりのない複数ファイルはそのまま両方残る", () => {
    const fileA = { fileName: "a.csv", rows: [{ fingerprint: "a" }] };
    const fileB = { fileName: "b.csv", rows: [{ fingerprint: "b" }] };
    const merged = mergeSnapshotFiles([fileA, fileB]);
    expect(merged).toEqual([
      { fingerprint: "a", occurrence: 1, fileName: "a.csv" },
      { fingerprint: "b", occurrence: 1, fileName: "b.csv" },
    ]);
  });

  it("同一ファイルを重複して選択した場合は完全に統合される", () => {
    const file = { fileName: "same.csv", rows: [{ fingerprint: "a" }] };
    const merged = mergeSnapshotFiles([file, file]);
    expect(merged).toEqual([
      { fingerprint: "a", occurrence: 1, fileName: "same.csv" },
    ]);
  });

  it("1ファイル内に重複フィンガープリントがあってもファイル内の出現順で採番される", () => {
    const file = {
      fileName: "dup.csv",
      rows: [{ fingerprint: "a" }, { fingerprint: "a" }],
    };
    const merged = mergeSnapshotFiles([file]);
    expect(merged.map((r) => r.occurrence)).toEqual([1, 2]);
  });
});

function candidate(
  id: string,
  overrides: Partial<ManualTransactionCandidate> = {},
): ManualTransactionCandidate {
  return {
    id,
    date: "2024-06-01",
    amount: 1000,
    type: "expense",
    description: null,
    memo: null,
    ...overrides,
  };
}

describe("findCandidates", () => {
  const row = {
    date: "2024-06-01",
    amount: 1000,
    type: "expense" as const,
    description: "テスト店舗",
  };

  it("候補がなければ新規作成にする", () => {
    expect(findCandidates(row, [])).toEqual({ kind: "new" });
  });

  it("明細名まで一致する候補が1件なら自動で紐付ける", () => {
    const match = candidate("1", { description: "テスト店舗" });
    const other = candidate("2", {
      date: "2024-06-01",
      amount: 1000,
      description: null,
    });
    const result = findCandidates(row, [match, other]);
    expect(result).toEqual({ kind: "link", transactionId: "1" });
  });

  it("明細名一致がなく基本条件一致が1件だけなら自動で紐付ける", () => {
    const only = candidate("1", { description: null });
    const result = findCandidates(row, [only]);
    expect(result).toEqual({ kind: "link", transactionId: "1" });
  });

  it("基本条件一致が複数あれば要確認にする", () => {
    const a = candidate("1", { description: null });
    const b = candidate("2", { description: null });
    const result = findCandidates(row, [a, b]);
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.candidates.map((c) => c.id).sort()).toEqual(["1", "2"]);
    }
  });

  it("日付・金額・種別が一致しない候補は対象外", () => {
    const other = candidate("1", { date: "2024-06-02" });
    expect(findCandidates(row, [other])).toEqual({ kind: "new" });
  });
});
