"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  type CategoryFormState,
  createCategoryFromForm,
  deleteCategory,
  reorderCategories,
  updateCategoryFromForm,
} from "@/features/kakei/actions/categories";
import type { Category, CategoryType } from "@/features/kakei/db/types";

const initialState: CategoryFormState = { status: "idle" };

function CategoryRow({
  category,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  category: Category;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (
      prevState: CategoryFormState,
      formData: FormData,
    ): Promise<CategoryFormState> => {
      const result = await updateCategoryFromForm(prevState, formData);
      if (result.status === "success") {
        setEditing(false);
      }
      return result;
    },
    initialState,
  );

  if (editing) {
    return (
      <li className="flex flex-col gap-2 border-b border-border py-2 last:border-b-0">
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={category.id} />
          <div className="flex flex-col gap-1">
            <Label htmlFor={`name-${category.id}`}>ジャンル名</Label>
            <Input
              id={`name-${category.id}`}
              name="name"
              defaultValue={category.name}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`type-${category.id}`}>種別</Label>
            <Select name="type" defaultValue={category.type}>
              <SelectTrigger id={`type-${category.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">支出</SelectItem>
                <SelectItem value="income">収入</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`color-${category.id}`}>色</Label>
            <Input
              id={`color-${category.id}`}
              name="color"
              type="color"
              defaultValue={category.color ?? "#888888"}
              className="h-8 w-12 p-1"
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
    <li className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-b-0">
      <div className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{
            backgroundColor: category.color ?? "var(--muted-foreground)",
          }}
        />
        <span className="text-sm">{category.name}</span>
        <Badge variant="outline">
          {category.type === "income" ? "収入" : "支出"}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label="上に移動"
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label="下に移動"
        >
          ↓
        </Button>
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
          onClick={() => deleteCategory(category.id)}
        >
          削除
        </Button>
      </div>
    </li>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [createType, setCreateType] = useState<CategoryType>("expense");
  const [createState, createFormAction, isCreating] = useActionState(
    createCategoryFromForm,
    initialState,
  );

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= categories.length) return;
    const orderedIds = categories.map((c) => c.id);
    [orderedIds[index], orderedIds[nextIndex]] = [
      orderedIds[nextIndex],
      orderedIds[index],
    ];
    reorderCategories(orderedIds);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle>ジャンルを追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createFormAction}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-name">ジャンル名</Label>
              <Input id="new-name" name="name" required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-type">種別</Label>
              <Select
                value={createType}
                onValueChange={(value) => setCreateType(value as CategoryType)}
              >
                <SelectTrigger id="new-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">収入</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="type" value={createType} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-color">色</Label>
              <Input
                id="new-color"
                name="color"
                type="color"
                defaultValue="#888888"
                className="h-8 w-12 p-1"
              />
            </div>
            <Button type="submit" disabled={isCreating}>
              追加
            </Button>
          </form>
          {createState.status === "error" && (
            <p className="mt-2 text-sm text-destructive">
              {createState.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>ジャンル一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              ジャンルがまだありません。
            </p>
          ) : (
            <ul className="flex flex-col">
              {categories.map((category, index) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  canMoveUp={index > 0}
                  canMoveDown={index < categories.length - 1}
                  onMoveUp={() => move(index, -1)}
                  onMoveDown={() => move(index, 1)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
