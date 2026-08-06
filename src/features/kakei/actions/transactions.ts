"use server";

import { revalidatePath } from "next/cache";
import type { CategoryType, Transaction } from "@/features/kakei/db/types";
import { getAuthedUserId } from "@/lib/supabase/auth";

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
    .order("date", { ascending: false });
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
  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    date: input.date,
    amount: input.amount,
    type: input.type,
    category_id: input.categoryId ?? null,
    description: input.description ?? null,
    memo: input.memo ?? null,
    source: "manual",
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function deleteTransaction(id: string) {
  const { supabase, userId } = await getAuthedUserId();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
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
