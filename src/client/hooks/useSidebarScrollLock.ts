import { useEffect } from "react";
import { applySidebarScrollLock } from "../lib/scrollLock";

/** Applies body scroll lock + scrollbar-gap compensation while `locked` is true. */
export function useSidebarScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    return applySidebarScrollLock();
  }, [locked]);
}
