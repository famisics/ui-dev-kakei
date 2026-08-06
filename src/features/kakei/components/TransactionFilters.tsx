"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/features/kakei/db/types";

const ALL = "all";

export function TransactionFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") ?? ALL;
  const categoryId = searchParams.get("category") ?? ALL;

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex gap-2">
      <Select
        value={type}
        onValueChange={(value) => updateParam("type", value)}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder="種別" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>すべての種別</SelectItem>
          <SelectItem value="income">収入</SelectItem>
          <SelectItem value="expense">支出</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={categoryId}
        onValueChange={(value) => updateParam("category", value)}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder="ジャンル" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>すべてのジャンル</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
