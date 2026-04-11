import { useCallback, useLayoutEffect, type RefObject } from "react";
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
