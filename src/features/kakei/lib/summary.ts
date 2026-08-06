import type { Category, Transaction } from "@/features/kakei/db/types";

export type MonthlySummary = {
  income: number;
  expense: number;
  balance: number;
};

export function monthlySummary(transactions: Transaction[]): MonthlySummary {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, balance: income - expense };
}

export type CategoryBreakdownItem = {
  categoryId: string;
  name: string;
  color: string | null;
  type: Category["type"];
  total: number;
  ratio: number;
};

export function categoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
): CategoryBreakdownItem[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const totalsByCategory = new Map<string, number>();

  for (const t of transactions) {
    if (!t.category_id) continue;
    totalsByCategory.set(
      t.category_id,
      (totalsByCategory.get(t.category_id) ?? 0) + t.amount,
    );
  }

  const grandTotal = [...totalsByCategory.values()].reduce(
    (sum, total) => sum + total,
    0,
  );

  const items: CategoryBreakdownItem[] = [];
  for (const [categoryId, total] of totalsByCategory) {
    const category = categoryById.get(categoryId);
    if (!category) continue;
    items.push({
      categoryId,
      name: category.name,
      color: category.color,
      type: category.type,
      total,
      ratio: grandTotal > 0 ? total / grandTotal : 0,
    });
  }

  return items.sort((a, b) => b.total - a.total);
}
