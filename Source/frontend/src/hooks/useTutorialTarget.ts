import { useEffect, useState } from "react";

/** Resolves a CSS selector to a live DOM element, polling until it appears (e.g. a note that's still being created). */
export function useTutorialTarget(selector: string | null): HTMLElement | null {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!selector) {
      setElement(null);
      return;
    }
    let rafId = 0;
    let cancelled = false;

    function check() {
      if (cancelled) return;
      const found = document.querySelector<HTMLElement>(selector as string);
      if (found) {
        setElement(found);
      } else {
        setElement(null);
        rafId = requestAnimationFrame(check);
      }
    }

    check();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [selector]);

  return element;
}
