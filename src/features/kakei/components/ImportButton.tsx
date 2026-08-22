"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImportUploader } from "@/features/kakei/components/ImportUploader";
import type { Category, ImportSource } from "@/features/kakei/db/types";

export function ImportButton({
  importSources,
  categories,
}: {
  importSources: ImportSource[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.defaultPrevented ||
        event.key.toLowerCase() !== "i" ||
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          aria-keyshortcuts="I"
          variant="outline"
          className="cursor-pointer"
        >
          インポート
          <kbd className="rounded border px-1 py-0.5 text-[10px] leading-none">
            I
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>インポート</DialogTitle>
        </DialogHeader>
        <ImportUploader importSources={importSources} categories={categories} />
      </DialogContent>
    </Dialog>
  );
}
