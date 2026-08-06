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
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
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
const rootCategory = "root";

function orderByHierarchy(categories: Category[]) {
  const roots = categories.filter((category) => !category.parent_id);
  return roots.flatMap((root) => [
    root,
    ...categories.filter((category) => category.parent_id === root.id),
  ]);
}

function CategoryRow({
  category,
  categories,
}: {
  category: Category;
  categories: Category[];
}) {
  const [editing, setEditing] = useState(false);
  const [editType, setEditType] = useState(category.type);
  const [editParentId, setEditParentId] = useState(
    category.parent_id ?? rootCategory,
  );
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id, disabled: editing });
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
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const parentOptions = categories.filter(
    (candidate) =>
      !candidate.parent_id &&
      candidate.id !== category.id &&
      candidate.type === editType,
  );

  if (editing) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className="flex flex-col gap-2 border-b border-border py-2 last:border-b-0"
      >
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
            <Select
              value={editType}
              onValueChange={(value) => {
                setEditType(value as CategoryType);
                setEditParentId(rootCategory);
              }}
            >
              <SelectTrigger id={`type-${category.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">支出</SelectItem>
                <SelectItem value="income">収入</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="type" value={editType} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`parent-${category.id}`}>親ジャンル</Label>
            <Select value={editParentId} onValueChange={setEditParentId}>
              <SelectTrigger id={`parent-${category.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={rootCategory}>なし</SelectItem>
                {parentOptions.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              name="parentId"
              value={editParentId === rootCategory ? "" : editParentId}
            />
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
            onClick={() => {
              setEditing(false);
              setEditType(category.type);
              setEditParentId(category.parent_id ?? rootCategory);
            }}
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
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-b-0 data-[child]:pl-8 data-[dragging]:relative data-[dragging]:z-10 data-[dragging]:bg-muted"
      data-child={category.parent_id ? true : undefined}
      data-dragging={isDragging || undefined}
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="touch-none cursor-grab text-muted-foreground active:cursor-grabbing"
          aria-label={`${category.name}を並び替え`}
          {...attributes}
          {...listeners}
        >
          <GripVertical />
        </Button>
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
        <Badge variant="secondary">
          {category.parent_id ? "小ジャンル" : "親ジャンル"}
        </Badge>
        {category.is_default && <Badge>デフォルト</Badge>}
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
          onClick={() => deleteCategory(category.id)}
          disabled={category.is_default}
          title={
            category.is_default
              ? "デフォルトのジャンルは削除できません"
              : undefined
          }
        >
          削除
        </Button>
      </div>
    </li>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [createType, setCreateType] = useState<CategoryType>("expense");
  const [createParentId, setCreateParentId] = useState(rootCategory);
  const [orderedCategories, setOrderedCategories] = useState(() =>
    orderByHierarchy(categories),
  );
  const [createState, createFormAction, isCreating] = useActionState(
    createCategoryFromForm,
    initialState,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setOrderedCategories(orderByHierarchy(categories));
  }, [categories]);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;

    const activeCategory = orderedCategories.find(
      (category) => category.id === active.id,
    );
    const overCategory = orderedCategories.find(
      (category) => category.id === over.id,
    );
    if (activeCategory?.parent_id !== overCategory?.parent_id) return;

    const oldIndex = orderedCategories.findIndex(
      (category) => category.id === active.id,
    );
    const newIndex = orderedCategories.findIndex(
      (category) => category.id === over.id,
    );
    const reorderedCategories = arrayMove(
      orderedCategories,
      oldIndex,
      newIndex,
    );

    setOrderedCategories(reorderedCategories);
    toast.promise(
      reorderCategories(reorderedCategories.map((category) => category.id)),
      {
        loading: "更新しています…",
        success: "ジャンルの並び順を更新しました。",
        error: "ジャンルの並び順の更新に失敗しました。",
      },
    );
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
                onValueChange={(value) => {
                  setCreateType(value as CategoryType);
                  setCreateParentId(rootCategory);
                }}
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
              <Label htmlFor="new-parent">親ジャンル</Label>
              <Select value={createParentId} onValueChange={setCreateParentId}>
                <SelectTrigger id="new-parent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={rootCategory}>なし</SelectItem>
                  {categories
                    .filter(
                      (category) =>
                        !category.parent_id && category.type === createType,
                    )
                    .map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                name="parentId"
                value={createParentId === rootCategory ? "" : createParentId}
              />
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
          {orderedCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              ジャンルがまだありません。
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedCategories.map((category) => category.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col">
                  {orderedCategories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      categories={orderedCategories}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
