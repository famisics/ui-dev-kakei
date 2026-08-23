import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function FormSubmitButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      disabled={disabled}
      aria-keyshortcuts="Meta+Enter"
      className="cursor-pointer"
    >
      {children}
      <kbd className="rounded border border-white px-1 py-0.5 text-[10px] leading-none text-white">
        ⌘ Enter
      </kbd>
    </Button>
  );
}
