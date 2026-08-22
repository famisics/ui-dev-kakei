import type { Category } from "@/features/kakei/db/types";

export type CategoryTreeOption = {
  category: Category;
  label: string;
};

export function buildCategoryTreeOptions(
  categories: Category[],
): CategoryTreeOption[] {
  const roots = categories.filter((category) => !category.parent_id);
  return roots.flatMap((root) => {
    const children = categories.filter(
      (category) => category.parent_id === root.id,
    );
    return [
      { category: root, label: root.name },
      ...children.map((child, index) => ({
        category: child,
        label: `${index === children.length - 1 ? "└─" : "├─"} ${child.name}`,
      })),
    ];
  });
}
