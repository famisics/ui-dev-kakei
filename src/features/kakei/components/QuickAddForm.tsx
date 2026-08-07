"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
import { withToast } from "@/features/kakei/lib/toast-action";

const initialState: TransactionFormState = { status: "idle" };

export function QuickAddForm({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CategoryType>("expense");
  const [state, formAction, isPending] = useActionState(
    withToast(createTransactionFromForm, {
      loading: "登録しています…",
      success: "取引を登録しました。",
      error: "取引の登録に失敗しました。",
      onSuccess: () => setOpen(false),
    }),
    initialState,
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.defaultPrevented ||
        event.key.toLowerCase() !== "n" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      setOpen(true);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const categoryOptions = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button aria-keyshortcuts="N" className="cursor-pointer">
          登録
          <kbd className="rounded border border-white px-1 py-0.5 text-[10px] leading-none text-white">
            N
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>取引を登録</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoryId">
              ジャンル
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Select key={type} name="categoryId" required>
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
            <Label htmlFor="amount">
              金額
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
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
            <Label htmlFor="memo">メモ</Label>
            <Input id="memo" name="memo" type="text" />
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
