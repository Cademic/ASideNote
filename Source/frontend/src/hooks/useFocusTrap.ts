import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
].join(",");

/** Visible, focusable descendants of `container`, in DOM order. */
function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      el === document.activeElement ||
      el.offsetWidth > 0 ||
      el.offsetHeight > 0 ||
      el.getClientRects().length > 0,
  );
}

export interface FocusTrapOptions {
  /** When false the trap is inert (e.g. the dialog is closed). Default true. */
  active?: boolean;
  /** Invoked when Escape is pressed anywhere inside the trap. */
  onEscape?: () => void;
  /** Freeze `body` scroll while the trap is active. Default true. */
  lockScroll?: boolean;
  /** Move focus into the trap on activate. Default true. */
  moveFocusIn?: boolean;
  /**
   * Element to focus first. Falls back to the first focusable descendant, then
   * the container itself. Only used when `moveFocusIn` is true.
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Traps keyboard focus inside `containerRef` while `active`: wraps Tab /
 * Shift+Tab at the edges, pulls focus back if it escapes, restores focus to the
 * element that was focused before activation on teardown, and optionally handles
 * Escape and body-scroll locking. Written for this app's hand-rolled dialogs
 * (there is no Radix / focus-trap dependency).
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  {
    active = true,
    onEscape,
    lockScroll = true,
    moveFocusIn = true,
    initialFocusRef,
  }: FocusTrapOptions = {},
) {
  // Track the latest onEscape without re-running the main effect on every render.
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    if (moveFocusIn) {
      const target =
        initialFocusRef?.current ?? getFocusable(container)[0] ?? container;
      // Defer a tick so it wins against any autoFocus in freshly-mounted children.
      requestAnimationFrame(() => target.focus());
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || !container.contains(activeEl))) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (activeEl === last || !container.contains(activeEl))
      ) {
        e.preventDefault();
        first.focus();
      }
    };

    // A click / programmatic focus can land outside the trap — reclaim it.
    const handleFocusIn = (e: FocusEvent) => {
      if (container.contains(e.target as Node)) return;
      (getFocusable(container)[0] ?? container).focus();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn);

    let restoreScroll: (() => void) | undefined;
    if (lockScroll) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      restoreScroll = () => {
        document.body.style.overflow = original;
      };
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn);
      restoreScroll?.();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [active, containerRef, lockScroll, moveFocusIn, initialFocusRef]);
}
