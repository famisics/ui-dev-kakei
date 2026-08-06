import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Category, Transaction } from "@/features/kakei/db/types";
import { formatYen } from "@/features/kakei/lib/format";
import { cn } from "@/lib/utils";

export function TransactionList({
  transactions,
  categories,
  hasFilter,
}: {
  transactions: Transaction[];
  categories: Category[];
  hasFilter: boolean;
}) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>取引一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasFilter
              ? "条件に一致する取引がありません。"
              : "この月の取引はまだありません。"}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {transactions.map((t) => {
              const category = t.category_id
                ? categoryById.get(t.category_id)
                : undefined;
              return (
                <li
                  key={t.id}
                  className="flex flex-col gap-1 border-b border-border py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="tnum text-muted-foreground">{t.date}</span>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          category?.color ?? "var(--muted-foreground)",
                      }}
                    />
                    <span>{category?.name ?? "未分類"}</span>
                    {(t.description || t.memo) && (
                      <span className="text-muted-foreground">
                        {t.description ?? t.memo}
                      </span>
                    )}
                    {t.source === "import" && (
                      <Badge variant="outline">インポート</Badge>
                    )}
                  </div>
                  <span
                    className={cn(
                      "mf-num tnum text-sm",
                      t.type === "income" ? "text-success" : "text-destructive",
                    )}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatYen(t.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
