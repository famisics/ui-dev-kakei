"use server";

import { revalidatePath } from "next/cache";
import type { CategoryType, Transaction } from "@/features/kakei/db/types";
import { nextTopSortOrder } from "@/features/kakei/lib/sort-order";
import { getAuthedUserId } from "@/lib/supabase/auth";
import { POSTGRES_ERROR_CODE } from "@/lib/supabase/postgres-errors";

function monthRange(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const start = `${yearMonth}-01`;
  const nextMonth =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end: nextMonth };
}

export async function listTransactionsForMonth(
  yearMonth: string,
): Promise<Transaction[]> {
  const { supabase, userId } = await getAuthedUserId();
  const { start, end } = monthRange(yearMonth);
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export type CreateTransactionInput = {
  date: string;
  amount: number;
  type: CategoryType;
  categoryId?: string;
  description?: string;
  memo?: string;
};

export async function createTransaction(input: CreateTransactionInput) {
  const { supabase, userId } = await getAuthedUserId();
  const sortOrder = await nextTopSortOrder(supabase, userId, input.date);
  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    date: input.date,
    amount: input.amount,
    type: input.type,
    category_id: input.categoryId ?? null,
    description: input.description ?? null,
    memo: input.memo ?? null,
    source: "manual",
    sort_order: sortOrder,
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function updateTransaction(
  id: string,
  input: CreateTransactionInput,
) {
  const { supabase, userId } = await getAuthedUserId();
  if (input.categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", input.categoryId)
      .eq("user_id", userId)
      .eq("type", input.type)
      .maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) throw new Error("選択したジャンルが見つかりません。");
  }

  const { data: current, error: currentError } = await supabase
    .from("transactions")
    .select("date, amount, type")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) throw new Error("取引が見つかりません。");

  const dateChanged = current.date !== input.date;
  if (
    dateChanged ||
    current.amount !== input.amount ||
    current.type !== input.type
  ) {
    const { data: linkedEntry, error: linkedError } = await supabase
      .from("statement_entries")
      .select("id")
      .eq("transaction_id", id)
      .maybeSingle();
    if (linkedError) throw linkedError;
    if (linkedEntry) {
      throw new Error(
        "カード明細と紐付いた取引のため、日付・金額・種別は変更できません。",
      );
    }
  }

  const sortOrder = dateChanged
    ? await nextTopSortOrder(supabase, userId, input.date)
    : undefined;

  const { data, error } = await supabase
    .from("transactions")
    .update({
      date: input.date,
      amount: input.amount,
      type: input.type,
      category_id: input.categoryId ?? null,
      description: input.description ?? null,
      memo: input.memo ?? null,
      ...(sortOrder !== undefined && { sort_order: sortOrder }),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("取引が見つかりません。");
  revalidatePath("/");
}

export async function reorderTransactions(orderedIds: string[]) {
  const { supabase, userId } = await getAuthedUserId();
  await Promise.all(
    orderedIds.map(async (id, index) => {
      const { error } = await supabase
        .from("transactions")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    }),
  );
  revalidatePath("/");
}

export async function deleteTransaction(id: string) {
  const { supabase, userId } = await getAuthedUserId();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    if (error.code === POSTGRES_ERROR_CODE.FOREIGN_KEY_VIOLATION) {
      throw new Error(
        "カード明細と紐付いた取引のため削除できません。先に明細を削除してください。",
      );
    }
    throw error;
  }
  revalidatePath("/");
}

export type TransactionFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createTransactionFromForm(
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const date = formData.get("date");
  const amountRaw = formData.get("amount");
  const type = formData.get("type");
  const categoryId = formData.get("categoryId");
  const description = formData.get("description");
  const memo = formData.get("memo");

  if (typeof date !== "string" || date.length === 0) {
    return { status: "error", message: "日付を入力してください。" };
  }
  const amount = typeof amountRaw === "string" ? Number(amountRaw) : Number.NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "error", message: "金額を正しく入力してください。" };
  }
  if (type !== "income" && type !== "expense") {
    return { status: "error", message: "種別を選択してください。" };
  }

  try {
    await createTransaction({
      date,
      amount,
      type,
      categoryId:
        typeof categoryId === "string" && categoryId.length > 0
          ? categoryId
          : undefined,
      description:
        typeof description === "string" && description.length > 0
          ? description
          : undefined,
      memo: typeof memo === "string" && memo.length > 0 ? memo : undefined,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "登録に失敗しました。",
    };
  }
  return { status: "success" };
}

export async function updateTransactionFromForm(
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const id = formData.get("id");
  const date = formData.get("date");
  const amountRaw = formData.get("amount");
  const type = formData.get("type");
  const categoryId = formData.get("categoryId");
  const description = formData.get("description");
  const memo = formData.get("memo");

  if (typeof id !== "string" || id.length === 0) {
    return { status: "error", message: "不正なリクエストです。" };
  }
  if (typeof date !== "string" || date.length === 0) {
    return { status: "error", message: "日付を入力してください。" };
  }
  const amount = typeof amountRaw === "string" ? Number(amountRaw) : Number.NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "error", message: "金額を正しく入力してください。" };
  }
  if (type !== "income" && type !== "expense") {
    return { status: "error", message: "種別を選択してください。" };
  }

  try {
    await updateTransaction(id, {
      date,
      amount,
      type,
      categoryId:
        typeof categoryId === "string" && categoryId.length > 0
          ? categoryId
          : undefined,
      description:
        typeof description === "string" && description.length > 0
          ? description
          : undefined,
      memo: typeof memo === "string" && memo.length > 0 ? memo : undefined,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "更新に失敗しました。",
    };
  }
  return { status: "success" };
}
