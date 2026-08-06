import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatYen } from "@/features/kakei/lib/format";
import type { CategoryBreakdownItem } from "@/features/kakei/lib/summary";

export function CategoryBreakdown({
  items,
}: {
  items: CategoryBreakdownItem[];
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>ジャンル別支出</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            この月の支出はまだ登録されていません。
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.categoryId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          item.color ?? "var(--muted-foreground)",
                      }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <div className="mf-num tnum flex items-center gap-2 text-muted-foreground">
                    <span className="text-foreground">
                      {formatYen(item.total)}
                    </span>
                    <span>{(item.ratio * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.ratio * 100}%`,
                      backgroundColor: item.color ?? "var(--muted-foreground)",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
