import { listImportSources } from "@/features/kakei/actions/import";
import { ImportSourceForm } from "@/features/kakei/components/ImportSourceForm";
import { ImportSourceManager } from "@/features/kakei/components/ImportSourceManager";

export default async function ImportSourcesPage() {
  const importSources = await listImportSources();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">カード管理</h1>
        <ImportSourceForm />
      </div>
      <ImportSourceManager importSources={importSources} />
    </div>
  );
}
