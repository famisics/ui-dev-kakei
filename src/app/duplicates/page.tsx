import { findDuplicateGroups } from "@/features/kakei/actions/duplicates";
import { DuplicateManager } from "@/features/kakei/components/DuplicateManager";

export default async function DuplicatesPage() {
  const groups = await findDuplicateGroups(false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-semibold">重複削除</h1>
      <DuplicateManager
        initialGroups={groups}
        initialMatchDescription={false}
      />
    </div>
  );
}
