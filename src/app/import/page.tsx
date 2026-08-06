import { listCategories } from "@/features/kakei/actions/categories";
import { listImportSources } from "@/features/kakei/actions/import";
import { ImportSourceForm } from "@/features/kakei/components/ImportSourceForm";
import { ImportUploader } from "@/features/kakei/components/ImportUploader";

export default async function ImportPage() {
  const [importSources, categories] = await Promise.all([
    listImportSources(),
    listCategories(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">インポート</h1>
        <ImportSourceForm />
      </div>
      <ImportUploader importSources={importSources} categories={categories} />
    </div>
  );
}
