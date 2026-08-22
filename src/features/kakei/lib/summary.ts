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

export type CashFlowCategory = {
  categoryId: string;
  name: string;
  type: Category["type"];
  total: number;
  ratio: number;
  color: string;
  children: CashFlowCategoryItem[];
};

export type CashFlowCategoryItem = {
  categoryId: string;
  name: string;
  total: number;
  ratio: number;
  color: string;
};

export type CategoryCashFlow = {
  income: CashFlowCategory[];
  expense: CashFlowCategory[];
  incomeTotal: number;
  expenseTotal: number;
};

type CategoryTotal = {
  category: Category | null;
  total: number;
};

const UNCLASSIFIED_COLOR = "var(--muted-foreground)";

export function categoryCashFlow(
  transactions: Transaction[],
  categories: Category[],
): CategoryCashFlow {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const totalsByType = {
    income: new Map<string, CategoryTotal>(),
    expense: new Map<string, CategoryTotal>(),
  } satisfies Record<Category["type"], Map<string, CategoryTotal>>;

  for (const t of transactions) {
    const category = t.category_id
      ? (categoryById.get(t.category_id) ?? null)
      : null;
    const key = category?.id ?? `unclassified-${t.type}`;
    const current = totalsByType[t.type].get(key);
    totalsByType[t.type].set(key, {
      category,
      total: (current?.total ?? 0) + t.amount,
    });
  }

  const buildGroups = (type: Category["type"]) => {
    const totals = totalsByType[type];
    const grandTotal = [...totals.values()].reduce(
      (sum, item) => sum + item.total,
      0,
    );
    const groups = new Map<
      string,
      Omit<CashFlowCategory, "ratio"> & { directTotal: number }
    >();

    for (const [categoryId, item] of totals) {
      const parent = item.category?.parent_id
        ? categoryById.get(item.category.parent_id)
        : item.category;
      const parentId = parent?.id ?? `unclassified-${type}`;
      const group = groups.get(parentId) ?? {
        categoryId: parentId,
        name: parent?.name ?? "未分類",
        type,
        total: 0,
        color: parent?.color ?? UNCLASSIFIED_COLOR,
        directTotal: 0,
        children: [],
      };

      group.total += item.total;
      if (item.category?.parent_id && parent) {
        group.children.push({
          categoryId,
          name: item.category.name,
          total: item.total,
          ratio: grandTotal > 0 ? item.total / grandTotal : 0,
          color: item.category.color ?? group.color,
        });
      } else {
        group.directTotal += item.total;
      }
      groups.set(parentId, group);
    }

    const result = [...groups.values()].map(
      ({ directTotal, ...group }): CashFlowCategory => ({
        ...group,
        ratio: grandTotal > 0 ? group.total / grandTotal : 0,
        children: [
          ...group.children,
          ...(directTotal > 0
            ? [
                {
                  categoryId: `${group.categoryId}-direct`,
                  name: group.name === "未分類" ? "未分類" : "その他",
                  total: directTotal,
                  ratio: grandTotal > 0 ? directTotal / grandTotal : 0,
                  color: group.color,
                },
              ]
            : []),
        ].sort((a, b) => b.total - a.total),
      }),
    );

    return {
      groups: result.sort((a, b) => b.total - a.total),
      total: grandTotal,
    };
  };

  const income = buildGroups("income");
  const expense = buildGroups("expense");

  return {
    income: income.groups,
    expense: expense.groups,
    incomeTotal: income.total,
    expenseTotal: expense.total,
  };
}
