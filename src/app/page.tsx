import { listCategories } from "@/features/kakei/actions/categories";
import { listImportSources } from "@/features/kakei/actions/import";
import { listTransactionsForMonth } from "@/features/kakei/actions/transactions";
import { CategoryCashFlow } from "@/features/kakei/components/CategoryCashFlow";
import { ImportButton } from "@/features/kakei/components/ImportButton";
import { MonthSelector } from "@/features/kakei/components/MonthSelector";
import { QuickAddForm } from "@/features/kakei/components/QuickAddForm";
import { SummaryCards } from "@/features/kakei/components/SummaryCards";
import { TransactionFilters } from "@/features/kakei/components/TransactionFilters";
import { TransactionList } from "@/features/kakei/components/TransactionList";
import { currentYearMonth } from "@/features/kakei/lib/format";
import { categoryCashFlow, monthlySummary } from "@/features/kakei/lib/summary";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    category?: string;
    type?: string;
    source?: string;
  }>;
}) {
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : currentYearMonth();

  const [categories, transactions, importSources] = await Promise.all([
    listCategories(),
    listTransactionsForMonth(month),
    listImportSources(),
  ]);

  const filteredTransactions = transactions.filter((t) => {
    if (params.category && t.category_id !== params.category) return false;
    if (params.type && t.type !== params.type) return false;
    if (params.source === "none" && t.importSourceId !== null) return false;
    if (
      params.source &&
      params.source !== "none" &&
      t.importSourceId !== params.source
    )
      return false;
    return true;
  });

  const summary = monthlySummary(transactions);
  const cashFlow = categoryCashFlow(transactions, categories);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">家計簿</h1>
        <div className="flex items-center gap-2">
          <ImportButton importSources={importSources} categories={categories} />
          <QuickAddForm categories={categories} />
        </div>
      </div>

      <MonthSelector month={month} />
      <SummaryCards summary={summary} />
      <CategoryCashFlow flow={cashFlow} />

      <div className="flex flex-col gap-2">
        <TransactionFilters
          categories={categories}
          importSources={importSources}
        />
        <TransactionList
          transactions={filteredTransactions}
          categories={categories}
          hasFilter={Boolean(params.category || params.type || params.source)}
        />
      </div>
    </div>
  );
}
