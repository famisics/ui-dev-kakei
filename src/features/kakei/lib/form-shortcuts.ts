import type { KeyboardEvent } from "react";

export function submitFormOnCmdEnter(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    event.currentTarget.requestSubmit();
  }
}
