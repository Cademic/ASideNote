import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import { constrainFixedElementInPlace, nudgeAbsoluteElementIntoViewport } from "./dropdown-viewport";

/**
 * Keeps an absolutely positioned dropdown panel inside the viewport (mobile + desktop).
 * Re-runs on resize and scroll (capture) while open.
 */
export function useNudgeDropdownToViewport(
  isOpen: boolean,
  panelRef: RefObject<HTMLElement | null>,
): void {
  const nudge = useCallback(() => {
    const el = panelRef.current;
    if (!el || !isOpen) return;
    nudgeAbsoluteElementIntoViewport(el);
  }, [isOpen, panelRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    nudge();
    const raf = requestAnimationFrame(nudge);
    window.addEventListener("resize", nudge);
    window.addEventListener("scroll", nudge, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", nudge);
      window.removeEventListener("scroll", nudge, true);
    };
  }, [isOpen, nudge]);
}

/**
 * Keeps a `position: fixed` portal menu (e.g. context menu) inside the viewport.
 */
export function useFixedPortalInViewport(
  isOpen: boolean,
  panelRef: RefObject<HTMLElement | null>,
): void {
  const nudge = useCallback(() => {
    const el = panelRef.current;
    if (!el || !isOpen) return;
    constrainFixedElementInPlace(el);
  }, [isOpen, panelRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    nudge();
    const raf = requestAnimationFrame(nudge);
    window.addEventListener("resize", nudge);
    window.addEventListener("scroll", nudge, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", nudge);
      window.removeEventListener("scroll", nudge, true);
    };
  }, [isOpen, nudge]);
}

const SUBMENU_FLYOUT_GAP_PX = 4;

/**
 * Client coordinates for a fixed-position submenu flyout anchored to the right edge
 * of `anchorRef` (e.g. "Add to folder"). Updates on resize and scroll while open.
 */
export function useSubmenuFlyoutPosition(
  isOpen: boolean,
  anchorRef: RefObject<HTMLElement | null>,
): { top: number; left: number } | null {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el || !isOpen) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.top, left: r.right + SUBMENU_FLYOUT_GAP_PX });
  }, [isOpen, anchorRef]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPos(null);
      return;
    }
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, update]);

  return pos;
}
