"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTransaction } from "@/features/kakei/actions/transactions";
import { runActionWithToast } from "@/features/kakei/lib/toast-action";

export function TransactionDeleteButton({
  transactionId,
}: {
  transactionId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("この取引を削除しますか?")) return;
    startTransition(() =>
      runActionWithToast(() => deleteTransaction(transactionId), {
        success: "取引を削除しました。",
        error: "取引の削除に失敗しました。",
      }),
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      削除
    </Button>
  );
}
