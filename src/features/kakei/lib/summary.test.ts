import { describe, expect, it } from "vitest";
import type { Category, Transaction } from "../db/types";
import { categoryCashFlow } from "./summary";

function category(
  id: string,
  name: string,
  type: Category["type"],
  parentId: string | null = null,
): Category {
  return {
    id,
    user_id: "user",
    name,
    type,
    color: null,
    sort_order: 0,
    is_default: false,
    parent_id: parentId,
    import_keywords: null,
    created_at: "2026-08-01T00:00:00Z",
  };
}

function transaction(
  id: string,
  amount: number,
  type: Transaction["type"],
  categoryId: string | null,
): Transaction {
  return {
    id,
    user_id: "user",
    date: "2026-08-01",
    amount,
    type,
    category_id: categoryId,
    description: null,
    memo: null,
    source: "manual",
    import_source_id: null,
    created_at: "2026-08-01T00:00:00Z",
  };
}

describe("categoryCashFlow", () => {
  it("収支を親ジャンルと小ジャンルの2階層に集計する", () => {
    const categories = [
      category("income", "定期収入", "income"),
      category("salary", "給与", "income", "income"),
      category("living", "生活費", "expense"),
      category("food", "食費", "expense", "living"),
    ];
    const transactions = [
      transaction("1", 300_000, "income", "salary"),
      transaction("2", 20_000, "income", "income"),
      transaction("3", 100_000, "expense", "food"),
      transaction("4", 30_000, "expense", null),
    ];

    const result = categoryCashFlow(transactions, categories);

    expect(result.incomeTotal).toBe(320_000);
    expect(result.expenseTotal).toBe(130_000);
    expect(result.income[0]).toMatchObject({
      name: "定期収入",
      total: 320_000,
      ratio: 1,
      children: [
        { name: "給与", total: 300_000 },
        { name: "その他", total: 20_000 },
      ],
    });
    expect(result.expense).toMatchObject([
      {
        name: "生活費",
        total: 100_000,
        children: [{ name: "食費", total: 100_000 }],
      },
      {
        name: "未分類",
        total: 30_000,
        children: [{ name: "未分類", total: 30_000 }],
      },
    ]);
  });
});
