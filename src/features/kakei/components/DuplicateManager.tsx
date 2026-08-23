"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type DuplicateGroup,
  findDuplicateGroups,
  resolveDuplicateGroup,
} from "@/features/kakei/actions/duplicates";
import { runActionWithToast } from "@/features/kakei/lib/toast-action";

function defaultKeepId(group: DuplicateGroup): string {
  const manual = group.transactions.find((t) => t.source === "manual");
  return (manual ?? group.transactions[0]).id;
}

const MATCH_MODE_OPTIONS = [
  { value: false, label: "日付・金額・種別で判定" },
  { value: true, label: "摘要も含めて判定" },
] as const;

function DuplicateGroupCard({
  group,
  onResolved,
}: {
  group: DuplicateGroup;
  onResolved: (key: string) => void;
}) {
  const [keepId, setKeepId] = useState(() => defaultKeepId(group));
  const [isPending, startTransition] = useTransition();

  function handleResolve() {
    const deleteIds = group.transactions
      .map((t) => t.id)
      .filter((id) => id !== keepId);
    if (deleteIds.length === 0) return;
    if (
      !confirm(
        `選択した1件を残し、他${deleteIds.length}件を削除します。よろしいですか?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await resolveDuplicateGroup(keepId, deleteIds);
        toast.success("重複を解消しました。");
        onResolved(group.key);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "重複の解消に失敗しました。",
        );
      }
    });
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {group.transactions[0].date} ・{" "}
          {group.transactions[0].amount.toLocaleString()}円 ・
          {group.transactions[0].type === "income" ? "収入" : "支出"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {group.transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-center gap-2 border-b border-border py-2 last:border-b-0"
            >
              <input
                type="radio"
                name={`keep-${group.key}`}
                checked={keepId === transaction.id}
                onChange={() => setKeepId(transaction.id)}
                aria-label="この取引を残す"
              />
              <span className="text-sm">
                {transaction.description || "(摘要なし)"}
              </span>
              <Badge variant="outline">
                {transaction.source === "manual" ? "手入力" : "インポート"}
              </Badge>
              {transaction.importSourceName && (
                <Badge variant="secondary">
                  {transaction.importSourceName}
                </Badge>
              )}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="mt-2"
          onClick={handleResolve}
          disabled={isPending}
        >
          選択した1件を残して削除
        </Button>
      </CardContent>
    </Card>
  );
}

export function DuplicateManager({
  initialGroups,
  initialMatchDescription,
}: {
  initialGroups: DuplicateGroup[];
  initialMatchDescription: boolean;
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [matchDescription, setMatchDescription] = useState(
    initialMatchDescription,
  );
  const [isPending, startTransition] = useTransition();

  function handleToggleMatch(value: boolean) {
    setMatchDescription(value);
    startTransition(() =>
      runActionWithToast(
        async () => {
          setGroups(await findDuplicateGroups(value));
        },
        {
          success: "検索条件を更新しました。",
          error: "重複候補の取得に失敗しました。",
        },
      ),
    );
  }

  function handleResolved(key: string) {
    setGroups((current) => current.filter((group) => group.key !== key));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {MATCH_MODE_OPTIONS.map((option) => (
          <Button
            key={String(option.value)}
            type="button"
            variant={matchDescription === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleToggleMatch(option.value)}
            disabled={isPending}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          重複は見つかりませんでした。
        </p>
      ) : (
        groups.map((group) => (
          <DuplicateGroupCard
            key={group.key}
            group={group}
            onResolved={handleResolved}
          />
        ))
      )}
    </div>
  );
}
