import { useCallback, useEffect, useRef } from "react";

const DEFAULT_ITEM_SELECTOR = [
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
  '[role="option"]',
].join(",");

export interface RovingFocusOptions {
  /** When false the handler is inert (e.g. the menu is closed). Default true. */
  active?: boolean;
  /** CSS selector for the navigable items inside the container. */
  itemSelector?: string;
  /** Wrap past the first / last item. Default true. */
  loop?: boolean;
  /** Arrow keys that move the roving focus. Default "vertical". */
  orientation?: "vertical" | "horizontal" | "both";
  /** Focus the first item when activated. Default true. */
  autoFocus?: boolean;
  /** Invoked on Tab (WAI-ARIA menus close and release focus on Tab). */
  onTabOut?: () => void;
  /** Restore focus to the pre-activation element on teardown. Default true. */
  restoreFocus?: boolean;
}

/**
 * Arrow-key roving focus for a hand-rolled `role="menu"` / `role="listbox"`
 * container: ArrowUp/Down (or Left/Right), Home, End, first-letter typeahead,
 * focus-first-item on open, and focus restoration to the trigger on close.
 * Escape and outside-click closing stay with the host component. The container
 * itself should carry `tabIndex={-1}` so it can hold focus before an item does.
 */
export function useRovingFocus(
  containerRef: React.RefObject<HTMLElement | null>,
  {
    active = true,
    itemSelector = DEFAULT_ITEM_SELECTOR,
    loop = true,
    orientation = "vertical",
    autoFocus = true,
    onTabOut,
    restoreFocus = true,
  }: RovingFocusOptions = {},
) {
  const onTabOutRef = useRef(onTabOut);
  useEffect(() => {
    onTabOutRef.current = onTabOut;
  }, [onTabOut]);

  const getItems = useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from(
      container.querySelectorAll<HTMLElement>(itemSelector),
    ).filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-disabled") !== "true" &&
        (el.offsetWidth > 0 || el.offsetHeight > 0),
    );
  }, [containerRef, itemSelector]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const typeahead = { buffer: "", timer: 0 };

    if (autoFocus) {
      const items = getItems();
      requestAnimationFrame(() => (items[0] ?? container).focus());
    }

    const forward = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    const backward = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const bothAxes = orientation === "both";

    const focusAt = (rawIndex: number, count: number) => {
      const index = loop
        ? ((rawIndex % count) + count) % count
        : Math.max(0, Math.min(count - 1, rawIndex));
      getItems()[index]?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        onTabOutRef.current?.();
        return;
      }
      const items = getItems();
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);

      const isForward =
        e.key === forward || (bothAxes && e.key === "ArrowRight");
      const isBackward =
        e.key === backward || (bothAxes && e.key === "ArrowLeft");

      if (isForward) {
        e.preventDefault();
        focusAt(current < 0 ? 0 : current + 1, items.length);
      } else if (isBackward) {
        e.preventDefault();
        focusAt(current < 0 ? items.length - 1 : current - 1, items.length);
      } else if (e.key === "Home") {
        e.preventDefault();
        focusAt(0, items.length);
      } else if (e.key === "End") {
        e.preventDefault();
        focusAt(items.length - 1, items.length);
      } else if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // First-letter typeahead.
        window.clearTimeout(typeahead.timer);
        typeahead.buffer += e.key.toLowerCase();
        typeahead.timer = window.setTimeout(() => (typeahead.buffer = ""), 500);
        const from = current + 1;
        const match = items
          .map((el, i) => ({ el, i }))
          .slice(from)
          .concat(items.map((el, i) => ({ el, i })).slice(0, from))
          .find(({ el }) =>
            (el.textContent ?? "").trim().toLowerCase().startsWith(typeahead.buffer),
          );
        if (match) {
          e.preventDefault();
          match.el.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(typeahead.timer);
      if (restoreFocus && previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, getItems, loop, orientation, autoFocus, restoreFocus]);
}
