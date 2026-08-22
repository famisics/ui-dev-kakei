"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type TransactionFormState,
  type TransactionWithImportSource,
  updateTransactionFromForm,
} from "@/features/kakei/actions/transactions";
import type { Category, CategoryType } from "@/features/kakei/db/types";
import { withToast } from "@/features/kakei/lib/toast-action";

const initialState: TransactionFormState = { status: "idle" };
const unclassified = "unclassified";

function TransactionEditForm({
  transaction,
  categories,
  onSaved,
}: {
  transaction: TransactionWithImportSource;
  categories: Category[];
  onSaved: () => void;
}) {
  const [type, setType] = useState<CategoryType>(transaction.type);
  const [categoryId, setCategoryId] = useState(
    transaction.category_id ?? unclassified,
  );
  const [state, formAction, isPending] = useActionState(
    withToast(updateTransactionFromForm, {
      loading: "更新しています…",
      success: "取引を更新しました。",
      error: "取引の更新に失敗しました。",
      onSuccess: onSaved,
    }),
    initialState,
  );

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  function changeType(value: string) {
    const nextType = value as CategoryType;
    setType(nextType);
    if (
      categoryId !== unclassified &&
      !categories.some(
        (category) => category.id === categoryId && category.type === nextType,
      )
    ) {
      setCategoryId(unclassified);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={transaction.id} />
      <input type="hidden" name="type" value={type} />
      <input
        type="hidden"
        name="categoryId"
        value={categoryId === unclassified ? "" : categoryId}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`type-${transaction.id}`}>種別</Label>
        <Select value={type} onValueChange={changeType}>
          <SelectTrigger id={`type-${transaction.id}`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">支出</SelectItem>
            <SelectItem value="income">収入</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`date-${transaction.id}`}>日付</Label>
        <Input
          id={`date-${transaction.id}`}
          name="date"
          type="date"
          defaultValue={transaction.date}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`amount-${transaction.id}`}>金額</Label>
        <Input
          id={`amount-${transaction.id}`}
          name="amount"
          type="number"
          min={1}
          step={1}
          defaultValue={transaction.amount}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`category-${transaction.id}`}>ジャンル</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id={`category-${transaction.id}`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={unclassified}>未分類</SelectItem>
            {categoryOptions.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`description-${transaction.id}`}>内容</Label>
        <Input
          id={`description-${transaction.id}`}
          name="description"
          type="text"
          defaultValue={transaction.description ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`memo-${transaction.id}`}>メモ</Label>
        <Input
          id={`memo-${transaction.id}`}
          name="memo"
          type="text"
          defaultValue={transaction.memo ?? ""}
        />
      </div>
      {transaction.importSourceName && (
        <div className="flex flex-col gap-2">
          <Label>取込元</Label>
          <p className="text-sm text-muted-foreground">
            {transaction.importSourceName}
          </p>
        </div>
      )}
      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          保存
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TransactionEditDialog({
  transaction,
  categories,
}: {
  transaction: TransactionWithImportSource;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          編集
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>取引を編集</DialogTitle>
        </DialogHeader>
        {open && (
          <TransactionEditForm
            transaction={transaction}
            categories={categories}
            onSaved={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
