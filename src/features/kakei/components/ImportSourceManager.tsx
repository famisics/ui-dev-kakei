"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteImportSource,
  type ImportSourceFormState,
  updateImportSourceFromForm,
} from "@/features/kakei/actions/import";
import type { ImportSource } from "@/features/kakei/db/types";
import {
  runActionWithToast,
  withToast,
} from "@/features/kakei/lib/toast-action";
import { FORMAT_LABELS } from "./ImportSourceForm";

const initialState: ImportSourceFormState = { status: "idle" };

function ImportSourceRow({
  source,
  onDelete,
}: {
  source: ImportSource;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    withToast(updateImportSourceFromForm, {
      loading: "更新しています…",
      success: "カードを更新しました。",
      error: "カードの更新に失敗しました。",
      onSuccess: () => setEditing(false),
    }),
    initialState,
  );

  if (editing) {
    return (
      <li className="flex flex-col gap-2 border-b border-border py-2 last:border-b-0">
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={source.id} />
          <div className="flex flex-col gap-1">
            <Label htmlFor={`name-${source.id}`}>カード名</Label>
            <Input
              id={`name-${source.id}`}
              name="name"
              defaultValue={source.name}
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            保存
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
          >
            キャンセル
          </Button>
        </form>
        {state.status === "error" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
      </li>
    );
  }

  return (
    <li
      key={source.id}
      className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-b-0"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{source.name}</span>
        <Badge variant="outline">{FORMAT_LABELS[source.format_key]}</Badge>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
        >
          編集
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
        >
          削除
        </Button>
      </div>
    </li>
  );
}

export function ImportSourceManager({
  importSources,
}: {
  importSources: ImportSource[];
}) {
  const [target, setTarget] = useState<ImportSource | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleConfirmDelete() {
    if (!target) return;
    const source = target;
    startDeleteTransition(() =>
      runActionWithToast(() => deleteImportSource(source.id), {
        success: "カードを削除しました。",
        error: "カードの削除に失敗しました。",
      }).then(() => setTarget(null)),
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>カード一覧</CardTitle>
      </CardHeader>
      <CardContent>
        {importSources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            カードがまだありません。
          </p>
        ) : (
          <ul className="flex flex-col">
            {importSources.map((source) => (
              <ImportSourceRow
                key={source.id}
                source={source}
                onDelete={() => setTarget(source)}
              />
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カードを削除しますか？</DialogTitle>
            <DialogDescription>
              「{target?.name}」を削除すると、このカードから作成された取引と
              明細の紐付けもすべて削除されます。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
