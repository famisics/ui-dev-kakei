"use server";

import { revalidatePath } from "next/cache";
import type { Category, CategoryType } from "@/features/kakei/db/types";
import { getAuthedUserId } from "@/lib/supabase/auth";

export async function listCategories(): Promise<Category[]> {
  const { supabase, userId } = await getAuthedUserId();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export type CreateCategoryInput = {
  name: string;
  type: CategoryType;
  color?: string;
  parentId?: string;
  importKeywords?: string[];
};

export async function createCategory(input: CreateCategoryInput) {
  const { supabase, userId } = await getAuthedUserId();
  const { error } = await supabase.from("categories").insert({
    user_id: userId,
    name: input.name,
    type: input.type,
    color: input.color ?? null,
    parent_id: input.parentId ?? null,
    import_keywords: input.importKeywords ?? null,
  });
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/categories");
}

export type UpdateCategoryInput = Partial<{
  name: string;
  type: CategoryType;
  color: string | null;
  parentId: string | null;
  importKeywords: string[] | null;
}>;

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const { supabase, userId } = await getAuthedUserId();
  const { error } = await supabase
    .from("categories")
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.parentId !== undefined && { parent_id: input.parentId }),
      ...(input.importKeywords !== undefined && {
        import_keywords: input.importKeywords,
      }),
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  const { supabase, userId } = await getAuthedUserId();
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("is_default")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (categoryError) throw categoryError;
  if (!category) throw new Error("ジャンルが見つかりません。");
  if (category.is_default) {
    throw new Error("デフォルトのジャンルは削除できません。");
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/categories");
}

export async function reorderCategories(orderedIds: string[]) {
  const { supabase, userId } = await getAuthedUserId();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("categories")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) throw error;
        }),
    ),
  );
  revalidatePath("/");
  revalidatePath("/categories");
}

export type CategoryFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createCategoryFromForm(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const name = formData.get("name");
  const type = formData.get("type");
  const color = formData.get("color");
  const parentId = formData.get("parentId");
  if (typeof name !== "string" || name.trim().length === 0) {
    return { status: "error", message: "ジャンル名を入力してください。" };
  }
  if (type !== "income" && type !== "expense") {
    return { status: "error", message: "種別を選択してください。" };
  }
  try {
    await createCategory({
      name: name.trim(),
      type,
      color: typeof color === "string" && color.length > 0 ? color : undefined,
      parentId:
        typeof parentId === "string" && parentId.length > 0
          ? parentId
          : undefined,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "作成に失敗しました。",
    };
  }
  return { status: "success" };
}

export async function updateCategoryFromForm(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const id = formData.get("id");
  const name = formData.get("name");
  const type = formData.get("type");
  const color = formData.get("color");
  const parentId = formData.get("parentId");
  if (typeof id !== "string" || id.length === 0) {
    return { status: "error", message: "不正なリクエストです。" };
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return { status: "error", message: "ジャンル名を入力してください。" };
  }
  if (type !== "income" && type !== "expense") {
    return { status: "error", message: "種別を選択してください。" };
  }
  try {
    await updateCategory(id, {
      name: name.trim(),
      type,
      color:
        typeof color === "string"
          ? color.length > 0
            ? color
            : null
          : undefined,
      parentId:
        typeof parentId === "string" && parentId.length > 0 ? parentId : null,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "更新に失敗しました。",
    };
  }
  return { status: "success" };
}
