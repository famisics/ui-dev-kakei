import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatMonthLabel } from "@/features/kakei/lib/format";
import { cn } from "@/lib/utils";

function monthHref(year: number, month: number) {
  return `?month=${year}-${String(month).padStart(2, "0")}`;
}

export function MonthSelector({ month }: { month: string }) {
  const [selectedYear, selectedMonth] = month.split("-").map(Number);
  const thisYear = new Date().getFullYear();
  const years = [...new Set([thisYear - 1, thisYear, selectedYear])].sort(
    (a, b) => a - b,
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {years.map((year) => (
          <Link
            key={year}
            href={monthHref(year, selectedMonth)}
            className={cn(
              buttonVariants({
                variant: year === selectedYear ? "default" : "ghost",
                size: "sm",
              }),
            )}
          >
            {year}年
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <Link
            key={m}
            href={monthHref(selectedYear, m)}
            className={cn(
              buttonVariants({
                variant: m === selectedMonth ? "default" : "ghost",
                size: "sm",
              }),
              "min-w-9",
            )}
          >
            {m}月
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{formatMonthLabel(month)}</p>
    </div>
  );
}
