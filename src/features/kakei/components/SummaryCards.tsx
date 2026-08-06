import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatYen } from "@/features/kakei/lib/format";
import type { MonthlySummary } from "@/features/kakei/lib/summary";
import { cn } from "@/lib/utils";

export function SummaryCards({ summary }: { summary: MonthlySummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle>収入</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mf-num tnum text-2xl text-success">
            {formatYen(summary.income)}
          </p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>支出</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mf-num tnum text-2xl text-destructive">
            {formatYen(summary.expense)}
          </p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>差額</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "mf-num tnum text-2xl",
              summary.balance >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {formatYen(summary.balance)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
