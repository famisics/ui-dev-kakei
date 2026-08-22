"use client";

import { useActionState, useState } from "react";
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
  createImportSourceFromForm,
  type ImportSourceFormState,
} from "@/features/kakei/actions/import";
import type { ImportFormatKey } from "@/features/kakei/db/types";

const initialState: ImportSourceFormState = { status: "idle" };

export const FORMAT_LABELS: Record<ImportFormatKey, string> = {
  jcb: "JCBカード（CSV）",
  debit: "住信SBIデビットカード（CSV）",
  rakuten: "楽天カード（PDF）",
  vpass: "三井住友カード Vpass（CSV）",
};

export function ImportSourceForm() {
  const [open, setOpen] = useState(false);
  const [formatKey, setFormatKey] = useState<ImportFormatKey>("jcb");
  const [state, formAction, isPending] = useActionState(
    async (
      prevState: ImportSourceFormState,
      formData: FormData,
    ): Promise<ImportSourceFormState> => {
      const result = await createImportSourceFromForm(prevState, formData);
      if (result.status === "success") {
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">カードを追加</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>カードを追加</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="source-name">表示名</Label>
            <Input
              id="source-name"
              name="name"
              placeholder="楽天カード"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source-format">フォーマット</Label>
            <Select
              value={formatKey}
              onValueChange={(value) => setFormatKey(value as ImportFormatKey)}
            >
              <SelectTrigger id="source-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FORMAT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="formatKey" value={formatKey} />
          </div>
          {state.status === "error" && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              追加
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
