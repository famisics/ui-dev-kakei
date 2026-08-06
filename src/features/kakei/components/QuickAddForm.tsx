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
  createTransactionFromForm,
  type TransactionFormState,
} from "@/features/kakei/actions/transactions";
import type { Category, CategoryType } from "@/features/kakei/db/types";
import { currentDate } from "@/features/kakei/lib/format";

const initialState: TransactionFormState = { status: "idle" };

export function QuickAddForm({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CategoryType>("expense");
  const [state, formAction, isPending] = useActionState(
    async (
      prevState: TransactionFormState,
      formData: FormData,
    ): Promise<TransactionFormState> => {
      const result = await createTransactionFromForm(prevState, formData);
      if (result.status === "success") {
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  const categoryOptions = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>登録</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>取引を登録</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">種別</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as CategoryType)}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">支出</SelectItem>
                <SelectItem value="income">収入</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="type" value={type} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">日付</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={currentDate()}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">金額</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={1}
              step={1}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoryId">ジャンル</Label>
            <Select key={type} name="categoryId">
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue placeholder="未分類" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="memo">メモ</Label>
            <Input id="memo" name="memo" type="text" />
          </div>
          {state.status === "error" && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
