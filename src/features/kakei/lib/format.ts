const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function formatYen(amount: number): string {
  return yenFormatter.format(amount);
}

export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

const jstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function todayJst(): string {
  return jstDateFormatter.format(new Date());
}

export function currentYearMonth(): string {
  return todayJst().slice(0, 7);
}

export function currentDate(): string {
  return todayJst();
}
