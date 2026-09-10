import { useEffect, useRef } from "react";

/**
 * Closes a popup (dialog, menu, flyout, popover) when Escape is pressed while it
 * is open. A single shared implementation so every dismissible surface behaves
 * the same. Call it unconditionally and pass `active` — it is inert when false.
 */
export function useCloseOnEscape(active: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active]);
}
