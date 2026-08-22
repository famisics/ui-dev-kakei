"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reorderTransactions } from "@/features/kakei/actions/transactions";
import { TransactionDeleteButton } from "@/features/kakei/components/TransactionDeleteButton";
import { TransactionEditDialog } from "@/features/kakei/components/TransactionEditDialog";
import type { Category, Transaction } from "@/features/kakei/db/types";
import { formatYen } from "@/features/kakei/lib/format";
import { cn } from "@/lib/utils";

function TransactionRow({
  transaction,
  category,
  categories,
  sortable,
}: {
  transaction: Transaction;
  category: Category | undefined;
  categories: Category[];
  sortable: boolean;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: transaction.id, disabled: !sortable });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-1 border-b border-border py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3 data-[dragging]:relative data-[dragging]:z-10 data-[dragging]:bg-muted"
      data-dragging={isDragging || undefined}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {sortable && (
          <button
            type="button"
            className="touch-none cursor-grab text-muted-foreground active:cursor-grabbing"
            aria-label="並び替え"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <span className="tnum text-muted-foreground">{transaction.date}</span>
        <span
          className="size-2 shrink-0 rounded-full"
          style={{
            backgroundColor: category?.color ?? "var(--muted-foreground)",
          }}
        />
        <span>{category?.name ?? "未分類"}</span>
        {(transaction.description || transaction.memo) && (
          <span className="text-muted-foreground">
            {transaction.description ?? transaction.memo}
          </span>
        )}
        {transaction.source === "import" && (
          <Badge variant="outline">インポート</Badge>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span
          className={cn(
            "mf-num tnum text-sm",
            transaction.type === "income" ? "text-success" : "text-destructive",
          )}
        >
          {transaction.type === "income" ? "+" : "-"}
          {formatYen(transaction.amount)}
        </span>
        <TransactionEditDialog
          transaction={transaction}
          categories={categories}
        />
        <TransactionDeleteButton transactionId={transaction.id} />
      </div>
    </li>
  );
}

export function TransactionList({
  transactions,
  categories,
  hasFilter,
}: {
  transactions: Transaction[];
  categories: Category[];
  hasFilter: boolean;
}) {
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const [orderedTransactions, setOrderedTransactions] = useState(transactions);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setOrderedTransactions(transactions);
  }, [transactions]);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;

    const oldIndex = orderedTransactions.findIndex((t) => t.id === active.id);
    const newIndex = orderedTransactions.findIndex((t) => t.id === over.id);
    const activeTransaction = orderedTransactions[oldIndex];
    const overTransaction = orderedTransactions[newIndex];
    if (
      !activeTransaction ||
      !overTransaction ||
      activeTransaction.date !== overTransaction.date
    ) {
      return;
    }

    const reordered = arrayMove(orderedTransactions, oldIndex, newIndex);

    setOrderedTransactions(reordered);
    const sameDateIds = reordered
      .filter((t) => t.date === activeTransaction.date)
      .map((t) => t.id);
    toast.promise(reorderTransactions(sameDateIds), {
      loading: "更新しています…",
      success: "取引の並び順を更新しました。",
      error: "取引の並び順の更新に失敗しました。",
    });
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>取引一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {orderedTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasFilter
              ? "条件に一致する取引がありません。"
              : "この月の取引はまだありません。"}
          </p>
        ) : (
          <DndContext
            id="transaction-list"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedTransactions.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col">
                {orderedTransactions.map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    category={
                      t.category_id
                        ? categoryById.get(t.category_id)
                        : undefined
                    }
                    categories={categories}
                    sortable={!hasFilter}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
