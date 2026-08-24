import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";

/**
 * Adapted from https://magicui.design/docs/components/animated-theme-toggler
 * (circle variant only, no extra dependency — driven by the native View Transitions API).
 *
 * Expands a circular reveal out from `originRef`'s element while `applyChange` flips the
 * theme, instead of an instant swap. Falls back to an instant swap in browsers without View
 * Transitions support, or when the user prefers reduced motion.
 *
 * `applyChange` must synchronously do two things: toggle `document.documentElement`'s `dark`
 * class to the target theme, and update whatever React state tracks it (e.g. via
 * `setThemeMode`) — the class toggle can't wait on a `useEffect`, since the View Transition's
 * "new" snapshot is captured right after this callback returns.
 */
export function useAnimatedThemeTransition<T extends HTMLElement = HTMLButtonElement>(duration = 400) {
  const originRef = useRef<T>(null);

  const runTransition = useCallback(
    (applyChange: () => void) => {
      const origin = originRef.current;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!origin || prefersReducedMotion || typeof document.startViewTransition !== "function") {
        applyChange();
        return;
      }

      const { top, left, width, height } = origin.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;
      const maxRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

      const transition = document.startViewTransition(() => {
        flushSync(applyChange);
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
            { duration, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
          );
        })
        .catch(() => {});
    },
    [duration],
  );

  return { originRef, runTransition };
}
