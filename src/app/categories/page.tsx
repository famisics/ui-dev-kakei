import { listCategories } from "@/features/kakei/actions/categories";
import { CategoryManager } from "@/features/kakei/components/CategoryManager";

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-semibold">ジャンル管理</h1>
      <CategoryManager categories={categories} />
    </div>
  );
}
